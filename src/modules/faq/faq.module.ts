import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { FaqController } from './faq.controller';
import { Faq, FaqSchema } from './faq.schema';
import { FaqService } from './faq.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Faq.name, schema: FaqSchema }]),
    AuthModule,
    SettingsModule,
  ],
  controllers: [FaqController],
  providers: [FaqService],
  exports: [FaqService, MongooseModule],
})
export class FaqModule {}

