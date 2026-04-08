import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';
import { NotFoundFilter } from './common/filters/not-found.filter';
import { RequestMetricsInterceptor } from './common/interceptors/request-metrics.interceptor';

async function bootstrap() {
  console.log('[1] bootstrap() started');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new NotFoundFilter());
  app.useGlobalInterceptors(new RequestMetricsInterceptor());
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });
  console.log('[4] Nest application created');
  await app.listen(process.env.PORT ?? 3000);
  console.log('[5] Server is listening');
}
void bootstrap();
