import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { Repository } from 'typeorm';
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
  private readonly refreshInFlight = new Map<
    string,
    Promise<AuthTokens | null>
  >();

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUserCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    console.log(
      `[AUTH SERVICE][STEP A1] Validating credentials for email=${email}`,
    );
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (!user) {
      console.log('[AUTH SERVICE][STEP A2] User not found');
      return null;
    }

    const isMatch = await compare(password, user.password);
    console.log(
      `[AUTH SERVICE][STEP A2] Password comparison result=${isMatch ? 'MATCH' : 'NO_MATCH'}`,
    );
    return isMatch ? user : null;
  }

  async generateTokens(user: User): Promise<AuthTokens> {
    console.log(
      `[AUTH SERVICE][STEP A3] Generating tokens for userId=${user.id}`,
    );
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(
      { ...payload, type: 'access' satisfies JwtPayload['type'] },
      {
        secret: process.env.JWT_ACCESS_SECRET ?? 'access-secret',
        expiresIn: '15m',
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { ...payload, type: 'refresh' satisfies JwtPayload['type'] },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? 'refresh-secret',
        expiresIn: '7d',
      },
    );

    await this.storeRefreshToken(user.id, refreshToken);
    console.log('[AUTH SERVICE][STEP A4] Refresh token hash stored');

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
        secret: process.env.JWT_ACCESS_SECRET ?? 'access-secret',
      });
      return payload.type === 'access' ? payload : null;
    } catch {
      console.log('[AUTH SERVICE][STEP V1] Access token verification failed');
      return null;
    }
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
    const existingTask = this.refreshInFlight.get(refreshToken);
    if (existingTask) {
      console.log('[AUTH SERVICE][STEP R0] Reusing in-flight refresh request');
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
    console.log('[AUTH SERVICE][STEP R1] Attempting refresh token flow');
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: process.env.JWT_REFRESH_SECRET ?? 'refresh-secret',
        },
      );

      if (payload.type !== 'refresh') {
        console.log('[AUTH SERVICE][STEP R2] Token type is not refresh');
        return null;
      }

      const user = await this.usersRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshTokenHash) {
        console.log(
          '[AUTH SERVICE][STEP R2] User missing or no refresh hash in DB',
        );
        return null;
      }

      const isRefreshTokenValid = await compare(
        refreshToken,
        user.refreshTokenHash,
      );
      if (!isRefreshTokenValid) {
        console.log('[AUTH SERVICE][STEP R2] Refresh token hash mismatch');
        return null;
      }

      console.log(
        '[AUTH SERVICE][STEP R3] Refresh token valid, issuing new tokens',
      );
      return this.generateTokens(user);
    } catch {
      console.log(
        '[AUTH SERVICE][STEP R2] Refresh token verification threw error',
      );
      return null;
    }
  }

  async getUserIdFromRefreshToken(token: string): Promise<number | null> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'refresh-secret',
      });
      return payload.type === 'refresh' ? payload.sub : null;
    } catch {
      return null;
    }
  }
}
