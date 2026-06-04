import type { INestApplication } from '@nestjs/common';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import type { JwtModuleOptions } from '@nestjs/jwt';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import appConfig from '../../src/config/app.config';
import { AuthController } from '../../src/modules/auth/auth.controller';
import { AuthService } from '../../src/modules/auth/auth.service';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/modules/auth/guards/roles.guard';
import { JwtStrategy } from '../../src/modules/auth/jwt.strategy';
import { UserRole } from '../../src/modules/users/enums/user-role.enum';
import { UsersController } from '../../src/modules/users/users.controller';
import { UsersService } from '../../src/modules/users/users.service';

process.env.JWT_SECRET ??= 'test-jwt-secret-key-for-testing-only-32-chars';

const mockUser = {
  id: '018f1234-5678-7890-abcd-ef1234567890',
  nickname: 'aivacol',
  name: 'Aivacol Admin',
  email: 'admin@aivacol.com',
  passwordHash: '$2a$10$hashedpassword',
  role: UserRole.Admin,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: '018f1234-5678-7890-abcd-ef1234567890',
};

const mockOperatorUser = {
  id: '018f1234-5678-7890-abcd-ef1234567891',
  nickname: 'operator',
  name: 'Fleet Operator',
  email: 'operator@aivacol.com',
  passwordHash: '$2a$10$hashedpassword',
  role: UserRole.Operator,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: '018f1234-5678-7890-abcd-ef1234567890',
};

function createE2eAppModule(usersService: Partial<UsersService>) {
  @Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [appConfig],
      }),
      PassportModule.register({ defaultStrategy: 'jwt' }),
      JwtModule.registerAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService): JwtModuleOptions => {
          const secret = configService.get<string>('jwt.secret');
          if (!secret) {
            throw new Error('JWT_SECRET is not configured');
          }

          return {
            secret,
            signOptions: {
              expiresIn: configService.get('jwt.expiresIn') ?? '1h',
            },
          };
        },
      }),
    ],
    controllers: [AuthController, UsersController],
    providers: [
      AuthService,
      JwtStrategy,
      JwtAuthGuard,
      RolesGuard,
      {
        provide: UsersService,
        useValue: {
          findAll: jest.fn().mockResolvedValue([]),
          findOne: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          remove: jest.fn(),
          findByEmail: jest.fn(),
          findById: jest.fn(),
          ...usersService,
        },
      },
      {
        provide: APP_FILTER,
        useClass: HttpExceptionFilter,
      },
      {
        provide: APP_GUARD,
        useClass: JwtAuthGuard,
      },
      {
        provide: APP_GUARD,
        useClass: RolesGuard,
      },
    ],
  })
  class E2eAppModule {}

  return E2eAppModule;
}

export async function createTestApp(
  usersServiceOverride?: Partial<UsersService>,
): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [createE2eAppModule(usersServiceOverride ?? {})],
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

export { mockOperatorUser, mockUser, request };
