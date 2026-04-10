import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { RoleDocumentModel, RoleSchema } from '../roles/role.schema';
import { RolesModule } from '../roles/roles.module';
import { UserDocumentModel, UserSchema } from './user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RoleDocumentModel.name, schema: RoleSchema }]),
    MongooseModule.forFeature([{ name: UserDocumentModel.name, schema: UserSchema }]),
    AuthModule,
    RolesModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
