import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { FaqController } from './faq.controller';
import { Faq } from './faq.entity';
import { FaqService } from './faq.service';

@Module({
  imports: [TypeOrmModule.forFeature([Faq]), AuthModule],
  controllers: [FaqController],
  providers: [FaqService],
  exports: [FaqService, TypeOrmModule],
})
export class FaqModule {}

