import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

@Injectable()
export class AuthCookieService {
  constructor(private readonly config: ConfigService) {}

  setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const base = this.baseCookieOptions();
    res.cookie('accessToken', accessToken, {
      ...base,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', refreshToken, {
      ...base,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  clearAuthCookies(res: Response): void {
    const base = this.baseCookieOptions();
    res.clearCookie('accessToken', base);
    res.clearCookie('refreshToken', base);
  }

  private baseCookieOptions(): CookieOptions {
    const isProd =
      (this.config.get<string>('NODE_ENV') ?? '').toLowerCase() ===
      'production';
    return {
      path: '/',
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
    };
  }
}
