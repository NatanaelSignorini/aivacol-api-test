import type { INestApplication } from '@nestjs/common';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import appConfig from '../src/config/app.config';
import { AuthModule } from '../src/modules/auth/auth.module';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';

process.env.JWT_SECRET ??= 'test-jwt-secret-key-for-testing-only-32-chars';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
class E2eAppModule {}

export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [E2eAppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1');
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

export { request };
