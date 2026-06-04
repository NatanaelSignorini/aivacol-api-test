import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { App } from 'supertest/types';
import { AppModule } from '../../../src/app.module';
import { loadIntegrationTestEnv } from '../test-env';

export async function createIntegrationApp(): Promise<INestApplication<App>> {
  loadIntegrationTestEnv();

  const app = await NestFactory.create(AppModule, { logger: false });
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('apiPrefix') ?? 'api/v1';

  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  return app;
}
