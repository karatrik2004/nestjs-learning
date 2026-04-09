import {
  Injectable,
  MiddlewareConsumer,
  Module,
  NestMiddleware,
  NestModule,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { NextFunction, Request, Response } from 'express';
import { AuthModule } from './modules/auth';
import { AdminModule } from './modules/admin/admin.module';
import { FaqModule } from './modules/faq/faq.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, _: Response, next: NextFunction): void {
    const now = new Date().toISOString();
    console.log(`[${now}] ${req.method} ${req.originalUrl}`);
    next();
  }
}

@Injectable()
export class CsrfProtectionMiddleware implements NestMiddleware {
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

    // Only enforce strict origin checks for cookie-authenticated requests.
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
      process.env.CSRF_ALLOWED_ORIGINS?.split(',')
        .map((value) => value.trim())
        .filter(Boolean) ?? [];
    const allowedOrigins = new Set([expectedOrigin, ...envAllowed]);

    // Some browser form posts may omit Origin/Referer.
    // In that case, allow only if browser marks request as same-origin/site.
    if (!source) {
      const sameSiteRequest =
        secFetchSite === 'same-origin' ||
        secFetchSite === 'same-site' ||
        secFetchSite === 'none';
      const isLocalDev =
        (process.env.NODE_ENV ?? '').toLowerCase() !== 'production' &&
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

@Module({
  providers: [
    RequestLoggerMiddleware,
    CsrfProtectionMiddleware,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: Number(process.env.THROTTLE_TTL_SECONDS ?? 60) * 1000,
          limit: Number(process.env.THROTTLE_LIMIT ?? 120),
        },
      ],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'nestjs_learning',
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    AdminModule,
    FaqModule,
    RolesModule,
    UsersModule,
  ],
})
export class AppModule implements NestModule {
  constructor() {
    console.log('[2] AppModule initialized');
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CsrfProtectionMiddleware, RequestLoggerMiddleware)
      .forRoutes('*');
  }
}
