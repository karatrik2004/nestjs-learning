import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [JwtAuthGuard],
})
export class AdminModule {}
