import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class CsrfProtectionMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const method = req.method.toUpperCase();
    const isUnsafeMethod =
      method === 'POST' ||
      method === 'PUT' ||
      method === 'PATCH' ||
      method === 'DELETE';

    if (!isUnsafeMethod) {
      next();
      return;
    }

    const cookieHeader = req.headers.cookie ?? '';
    const hasAuthCookie =
      cookieHeader.includes('accessToken=') ||
      cookieHeader.includes('refreshToken=');

    if (!hasAuthCookie) {
      next();
      return;
    }

    const protocol =
      (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] ||
      req.protocol;
    const host = req.get('host');
    const expectedOrigin = `${protocol}://${host}`;

    const origin = req.get('origin');
    const referer = req.get('referer');
    const secFetchSite = req.get('sec-fetch-site')?.toLowerCase();
    const source =
      origin ??
      (referer
        ? (() => {
            try {
              return new URL(referer).origin;
            } catch {
              return null;
            }
          })()
        : null);

    const envAllowed =
      this.config.get<string>('CSRF_ALLOWED_ORIGINS')?.split(',') ??
      ([] as string[]);
    const allowedOrigins = new Set([
      expectedOrigin,
      ...envAllowed.map((value) => value.trim()).filter(Boolean),
    ]);

    if (!source) {
      const sameSiteRequest =
        secFetchSite === 'same-origin' ||
        secFetchSite === 'same-site' ||
        secFetchSite === 'none';
      const isLocalDev =
        (this.config.get<string>('NODE_ENV') ?? '').toLowerCase() !==
          'production' &&
        (host?.startsWith('localhost') || host?.startsWith('127.0.0.1'));
      if (!sameSiteRequest) {
        if (isLocalDev) {
          next();
          return;
        }
        res.status(403).send('Forbidden (CSRF protection)');
        return;
      }
      next();
      return;
    }

    if (!allowedOrigins.has(source)) {
      res.status(403).send('Forbidden (CSRF protection)');
      return;
    }

    next();
  }
}
