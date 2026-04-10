import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { compare, hash } from 'bcrypt';
import { Model } from 'mongoose';
import { RoleDocumentModel } from '../roles/role.schema';
import { UserDocumentModel } from '../users/user.schema';
import type { UserRecord } from '../users/user.types';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshInFlight = new Map<
    string,
    Promise<AuthTokens | null>
  >();

  constructor(
    @InjectModel(RoleDocumentModel.name)
    private readonly rolesModel: Model<RoleDocumentModel>,
    @InjectModel(UserDocumentModel.name)
    private readonly usersModel: Model<UserDocumentModel>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUserCredentials(
    email: string,
    password: string,
  ): Promise<UserRecord | null> {
    this.logger.debug(`Validating credentials for email=${email}`);
    const user = await this.usersModel.findOne({ email }).lean().exec();

    if (!user) {
      this.logger.debug('User not found');
      return null;
    }

    const isMatch = await compare(password, user.password);
    this.logger.debug(
      `Password comparison result=${isMatch ? 'MATCH' : 'NO_MATCH'}`,
    );
    if (!isMatch) {
      return null;
    }
    return this.toUserRecord(user);
  }

  async isBackendRole(role: string): Promise<boolean> {
    const normalized = this.normalizeRoleName(role);
    if (!normalized) {
      return false;
    }

    const roles = await this.rolesModel
      .find({ deletedAt: null }, { name: 1, canAccessBackend: 1 })
      .lean()
      .exec();
    const matchedRole = roles.find(
      (existingRole) => this.normalizeRoleName(existingRole.name) === normalized,
    );
    return Boolean(matchedRole?.canAccessBackend);
  }

  async generateTokens(user: UserRecord): Promise<AuthTokens> {
    this.logger.debug(`Generating tokens for userId=${user.id}`);
    const roleName = await this.resolveRoleName(user);
    const payload = {
      sub: user.id,
      email: user.email,
      role: roleName,
    };

    const accessToken = await this.jwtService.signAsync(
      { ...payload, type: 'access' satisfies JwtPayload['type'] },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET', 'access-secret'),
        expiresIn: this.config.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
          '15m',
        ) as JwtSignOptions['expiresIn'],
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { ...payload, type: 'refresh' satisfies JwtPayload['type'] },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET', 'refresh-secret'),
        expiresIn: this.config.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ) as JwtSignOptions['expiresIn'],
      },
    );

    await this.storeRefreshToken(user.id, refreshToken);
    this.logger.debug('Refresh token hash stored');

    return { accessToken, refreshToken };
  }

  async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const refreshTokenHash = await hash(refreshToken, 10);
    await this.usersModel
      .updateOne({ _id: userId }, { $set: { refreshTokenHash } })
      .exec();
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await this.usersModel
      .updateOne({ _id: userId }, { $set: { refreshTokenHash: null } })
      .exec();
  }

  async verifyAccessToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET', 'access-secret'),
      });
      return payload.type === 'access' ? payload : null;
    } catch {
      this.logger.debug('Access token verification failed');
      return null;
    }
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
    const existingTask = this.refreshInFlight.get(refreshToken);
    if (existingTask) {
      this.logger.debug('Reusing in-flight refresh request');
      return existingTask;
    }

    const newTask = this.refreshTokensInternal(refreshToken);
    this.refreshInFlight.set(refreshToken, newTask);

    try {
      return await newTask;
    } finally {
      this.refreshInFlight.delete(refreshToken);
    }
  }

  private async refreshTokensInternal(
    refreshToken: string,
  ): Promise<AuthTokens | null> {
    this.logger.debug('Attempting refresh token flow');
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: this.config.get<string>('JWT_REFRESH_SECRET', 'refresh-secret'),
        },
      );

      if (payload.type !== 'refresh') {
        this.logger.debug('Token type is not refresh');
        return null;
      }

      const user = await this.usersModel.findOne({ _id: payload.sub }).lean().exec();

      if (!user || !user.refreshTokenHash) {
        this.logger.debug('User missing or no refresh hash in DB');
        return null;
      }

      const isRefreshTokenValid = await compare(
        refreshToken,
        user.refreshTokenHash,
      );
      if (!isRefreshTokenValid) {
        this.logger.debug('Refresh token hash mismatch');
        return null;
      }

      this.logger.debug('Refresh token valid, issuing new tokens');
      return this.generateTokens(this.toUserRecord(user));
    } catch {
      this.logger.debug('Refresh token verification threw error');
      return null;
    }
  }

  async getUserIdFromRefreshToken(token: string): Promise<string | null> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET', 'refresh-secret'),
      });
      return payload.type === 'refresh' ? payload.sub : null;
    } catch {
      return null;
    }
  }

  private normalizeRoleName(value: string): string {
    return value.trim().toLowerCase().replaceAll('_', ' ').replace(/\s+/g, ' ');
  }

  async getUserRoleName(user: UserRecord): Promise<string> {
    return this.resolveRoleName(user);
  }

  private async resolveRoleName(user: UserRecord): Promise<string> {
    if (user.roleMaster?.name) {
      return user.roleMaster.name;
    }
    if (user.roleId) {
      const role = await this.rolesModel
        .findOne({ _id: user.roleId, deletedAt: null }, { name: 1 })
        .lean()
        .exec();
      if (role?.name) {
        return role.name;
      }
    }
    return 'unknown';
  }

  private toUserRecord(user: {
    _id: unknown;
    email: string;
    password: string;
    name?: string | null;
    phone?: string | null;
    profileImage?: string | null;
    roleId?: string | null;
    refreshTokenHash?: string | null;
    roleMaster?: { name: string } | null;
  }): UserRecord {
    return {
      id: String(user._id),
      email: user.email,
      password: user.password,
      name: user.name ?? null,
      phone: user.phone ?? null,
      profileImage: user.profileImage ?? null,
      roleId: user.roleId ?? null,
      refreshTokenHash: user.refreshTokenHash ?? null,
      roleMaster: user.roleMaster ?? null,
    };
  }
}
