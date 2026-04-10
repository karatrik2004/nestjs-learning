import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RoleDocumentModel, RoleSchema } from '../roles/role.schema';
import { UserDocumentModel, UserSchema } from '../users/user.schema';
import { AuthCookieService } from './auth-cookie.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RoleDocumentModel.name, schema: RoleSchema }]),
    MongooseModule.forFeature([{ name: UserDocumentModel.name, schema: UserSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET', 'access-secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthCookieService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, AuthCookieService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
