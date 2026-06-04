import type { INestApplication } from '@nestjs/common';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import type { JwtModuleOptions } from '@nestjs/jwt';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { App } from 'supertest/types';
import { v7 as uuidv7 } from 'uuid';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import appConfig from '../../src/config/app.config';
import { AuthController } from '../../src/modules/auth/auth.controller';
import { AuthService } from '../../src/modules/auth/auth.service';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/modules/auth/guards/roles.guard';
import { JwtStrategy } from '../../src/modules/auth/jwt.strategy';
import { User } from '../../src/modules/users/entities/user.entity';
import { UserRole } from '../../src/modules/users/enums/user-role.enum';
import { UsersController } from '../../src/modules/users/users.controller';
import { UsersService } from '../../src/modules/users/users.service';
import { itemFrom, nodesFrom } from '../common/api-response.util';
import { mockOperatorUser, mockUser, request } from '../common/e2e-app';
import { createFindAndCount } from '../common/in-memory-repository.util';

type UserRecord = User;

function createInMemoryUsersRepository() {
  const store = new Map<string, UserRecord>();

  return {
    create: jest.fn((data: Partial<UserRecord>) =>
      Object.assign(new User(), data),
    ),
    save: jest.fn(async (user: UserRecord) => {
      if (!user.id) {
        user.id = uuidv7();
        user.createdAt = new Date();
        user.updatedAt = new Date();
      } else {
        user.updatedAt = new Date();
      }

      store.set(user.id, { ...user });
      return { ...user };
    }),
    find: jest.fn(async () =>
      [...store.values()].sort((a, b) => a.nickname.localeCompare(b.nickname)),
    ),
    findAndCount: createFindAndCount(
      () => [...store.values()],
      (a, b) => a.nickname.localeCompare(b.nickname),
    ),
    findOne: jest.fn(async ({ where }: { where: Partial<UserRecord> }) => {
      if (where.id) {
        return store.get(where.id) ?? null;
      }

      if (where.email) {
        return (
          [...store.values()].find((user) => user.email === where.email) ?? null
        );
      }

      if (where.nickname) {
        return (
          [...store.values()].find(
            (user) => user.nickname === where.nickname,
          ) ?? null
        );
      }

      return null;
    }),
    remove: jest.fn(async (user: UserRecord) => {
      store.delete(user.id);
      return user;
    }),
    seed: (user: UserRecord) => {
      store.set(user.id, { ...user });
    },
    clear: () => store.clear(),
  };
}

async function createUsersTestApp(): Promise<INestApplication<App>> {
  const usersRepository = createInMemoryUsersRepository();
  usersRepository.seed({ ...mockUser });
  usersRepository.seed({ ...mockOperatorUser });

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
      UsersService,
      JwtStrategy,
      JwtAuthGuard,
      RolesGuard,
      {
        provide: getRepositoryToken(User),
        useValue: usersRepository,
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
  class UsersE2eModule {}

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [UsersE2eModule],
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

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('Users (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createUsersTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password1!' })
      .expect(200);

    return itemFrom(response.body, 'login').accessToken;
  }

  it('returns 401 for unauthenticated list request', async () => {
    await request(app.getHttpServer()).get('/api/v1/users').expect(401);
  });

  it('returns 403 for operator on admin-only users routes', async () => {
    const token = await login(mockOperatorUser.email);

    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nickname: 'newop',
        name: 'New Operator',
        email: 'newop@aivacol.com',
        password: 'Password1!',
        role: UserRole.Operator,
      })
      .expect(403);
  });

  it('returns current user profile for admin and operator on GET /users/me', async () => {
    const adminToken = await login(mockUser.email);
    const adminResponse = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(itemFrom(adminResponse.body, 'user')).toMatchObject({
      id: mockUser.id,
      email: mockUser.email,
      role: UserRole.Admin,
    });

    const operatorToken = await login(mockOperatorUser.email);
    const operatorResponse = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(200);

    expect(itemFrom(operatorResponse.body, 'user')).toMatchObject({
      id: mockOperatorUser.id,
      email: mockOperatorUser.email,
      role: UserRole.Operator,
    });
  });

  it('returns 401 for unauthenticated GET /users/me', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
  });

  it('admin creates, lists, retrieves, updates and deletes user', async () => {
    const token = await login(mockUser.email);

    const created = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nickname: 'fleetop2',
        name: 'Fleet Operator Two',
        email: 'fleetop2@aivacol.com',
        password: 'Password1!',
        role: UserRole.Operator,
      })
      .expect(201);

    const createdUser = itemFrom(created.body, 'user');

    expect(createdUser).toMatchObject({
      nickname: 'fleetop2',
      email: 'fleetop2@aivacol.com',
      role: UserRole.Operator,
      createdBy: mockUser.id,
    });
    expect(createdUser).not.toHaveProperty('passwordHash');
    expect(createdUser).not.toHaveProperty('password');

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(nodesFrom(listResponse.body, 'users')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nickname: 'fleetop2' }),
      ]),
    );
    expect(listResponse.body.data.users).toMatchObject({
      pageInfo: {
        hasNextPage: expect.any(Boolean),
        hasPreviousPage: false,
      },
      totalCount: expect.any(Number),
    });

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/users/${createdUser.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(itemFrom(detailResponse.body, 'user').name).toBe(
      'Fleet Operator Two',
    );

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/users/${createdUser.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fleet Operator Updated' })
      .expect(200);

    expect(itemFrom(updated.body, 'user').name).toBe('Fleet Operator Updated');

    await request(app.getHttpServer())
      .delete(`/api/v1/users/${createdUser.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/v1/users/${createdUser.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('returns 409 for duplicate email with standardized envelope', async () => {
    const token = await login(mockUser.email);

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nickname: 'dup1',
        name: 'Dup One',
        email: 'dup@aivacol.com',
        password: 'Password1!',
        role: UserRole.Operator,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nickname: 'dup2',
        name: 'Dup Two',
        email: 'dup@aivacol.com',
        password: 'Password1!',
        role: UserRole.Operator,
      })
      .expect(409);

    expect(response.body).toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('dup@aivacol.com'),
      error: expect.any(String),
      timestamp: expect.any(String),
      path: '/api/v1/users',
    });
  });

  it('returns 400 when admin tries to delete own account', async () => {
    const token = await login(mockUser.email);

    const response = await request(app.getHttpServer())
      .delete(`/api/v1/users/${mockUser.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(response.body.message).toContain('own user account');
  });
});
