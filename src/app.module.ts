import {
  Injectable,
  MiddlewareConsumer,
  Module,
  NestMiddleware,
  NestModule,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { NextFunction, Request, Response } from 'express';
import { AuthModule } from './modules/auth';
import { AdminModule } from './modules/admin/admin.module';
import { UsersModule } from './modules/users/users.module';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, _: Response, next: NextFunction): void {
    const now = new Date().toISOString();
    console.log(`[${now}] ${req.method} ${req.originalUrl}`);
    next();
  }
}

@Module({
  providers: [RequestLoggerMiddleware],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
    UsersModule,
  ],
})
export class AppModule implements NestModule {
  constructor() {
    console.log('[2] AppModule initialized');
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
