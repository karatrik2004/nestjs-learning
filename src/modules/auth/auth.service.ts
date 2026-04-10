import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { Repository } from 'typeorm';
import { Role } from '../roles/role.entity';
import { User } from '../users/user.entity';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type JwtPayload = {
  sub: number;
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
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUserCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    this.logger.debug(`Validating credentials for email=${email}`);
    const user = await this.usersRepository.findOne({
      where: { email },
      relations: { roleMaster: true },
    });

    if (!user) {
      this.logger.debug('User not found');
      return null;
    }

    const isMatch = await compare(password, user.password);
    this.logger.debug(
      `Password comparison result=${isMatch ? 'MATCH' : 'NO_MATCH'}`,
    );
    return isMatch ? user : null;
  }

  async isBackendRole(role: string): Promise<boolean> {
    const normalized = this.normalizeRoleName(role);
    if (!normalized) {
      return false;
    }

    const roles = await this.rolesRepository.find({
      select: { name: true, canAccessBackend: true },
    });
    const matchedRole = roles.find(
      (existingRole) => this.normalizeRoleName(existingRole.name) === normalized,
    );
    return Boolean(matchedRole?.canAccessBackend);
  }

  async generateTokens(user: User): Promise<AuthTokens> {
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

  async storeRefreshToken(userId: number, refreshToken: string): Promise<void> {
    const refreshTokenHash = await hash(refreshToken, 10);
    await this.usersRepository.update(userId, { refreshTokenHash });
  }

  async clearRefreshToken(userId: number): Promise<void> {
    await this.usersRepository.update(userId, { refreshTokenHash: null });
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

      const user = await this.usersRepository.findOne({
        where: { id: payload.sub },
        relations: { roleMaster: true },
      });

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
      return this.generateTokens(user);
    } catch {
      this.logger.debug('Refresh token verification threw error');
      return null;
    }
  }

  async getUserIdFromRefreshToken(token: string): Promise<number | null> {
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

  async getUserRoleName(user: User): Promise<string> {
    return this.resolveRoleName(user);
  }

  private async resolveRoleName(user: User): Promise<string> {
    if (user.roleMaster?.name) {
      return user.roleMaster.name;
    }
    if (user.roleId) {
      const role = await this.rolesRepository.findOne({ where: { id: user.roleId } });
      if (role?.name) {
        return role.name;
      }
    }
    return 'unknown';
  }
}
