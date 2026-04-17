import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { engine as hbsEngine } from 'express-handlebars';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { NotFoundFilter } from './common/filters/not-found.filter';
import { RequestMetricsInterceptor } from './common/interceptors/request-metrics.interceptor';

const viewsRoot = join(process.cwd(), 'views');

async function bootstrap() {
  console.log('[1] bootstrap() started');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(process.cwd(), 'public'));
  app.engine(
    'hbs',
    hbsEngine({
      extname: '.hbs',
      defaultLayout: 'admin',
      layoutsDir: join(viewsRoot, 'layouts'),
      partialsDir: join(viewsRoot, 'partials'),
    }),
  );
  app.setViewEngine('hbs');
  app.setBaseViewsDir(viewsRoot);

  app.use(
    helmet({
      referrerPolicy: { policy: 'same-origin' },
    }),
  );
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS Learning API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDocument);

  console.log('[4] Nest application created');
  await app.listen(process.env.PORT ?? 3000);
  console.log('[5] Server is listening');
}
void bootstrap();
