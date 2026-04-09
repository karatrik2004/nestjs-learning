import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { FaqController } from './faq.controller';
import { Faq } from './faq.entity';
import { FaqService } from './faq.service';

@Module({
  imports: [TypeOrmModule.forFeature([Faq]), AuthModule],
  controllers: [FaqController],
  providers: [FaqService, JwtAuthGuard, RolesGuard],
  exports: [FaqService, TypeOrmModule],
})
export class FaqModule {}

