import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CsrfProtectionMiddleware } from './common/middleware/csrf-protection.middleware';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { AuthModule } from './modules/auth';
import { AdminModule } from './modules/admin/admin.module';
import { FaqModule } from './modules/faq/faq.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  providers: [
    CsrfProtectionMiddleware,
    RequestLoggerMiddleware,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl:
              Number(config.get<string>('THROTTLE_TTL_SECONDS', '60')) * 1000,
            limit: Number(config.get<string>('THROTTLE_LIMIT', '120')),
          },
        ],
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const nodeEnv = (config.get<string>('NODE_ENV') ?? 'development')
          .toLowerCase();
        return {
          type: 'postgres' as const,
          host: config.get<string>('DB_HOST', 'localhost'),
          port: Number(config.get<string>('DB_PORT', '5432')),
          username: config.get<string>('DB_USERNAME', 'postgres'),
          password: config.get<string>('DB_PASSWORD', 'postgres'),
          database: config.get<string>('DB_NAME', 'nestjs_learning'),
          autoLoadEntities: true,
          synchronize: nodeEnv !== 'production',
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    AdminModule,
    FaqModule,
    RolesModule,
    UsersModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CsrfProtectionMiddleware, RequestLoggerMiddleware)
      .forRoutes('*');
  }
}
