import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateEnvironment } from './config/env.config';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  validateEnvironment(process.env as Record<string, unknown>);

  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('apiPrefix') ?? 'api/v1';
  const port = configService.get<number>('port') ?? 4000;

  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerPath = configService.get<string>('swagger.path') ?? 'api/docs';
  setupSwagger(app, swaggerPath);

  await app.listen(port, '0.0.0.0');
}
bootstrap();
