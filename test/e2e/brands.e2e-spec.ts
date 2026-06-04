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
import { BrandsController } from '../../src/modules/brands/brands.controller';
import { BrandsService } from '../../src/modules/brands/brands.service';
import { Brand } from '../../src/modules/brands/entities/brand.entity';
import { UsersService } from '../../src/modules/users/users.service';
import { itemFrom, nodesFrom } from '../common/api-response.util';
import {
  createTestApp,
  mockOperatorUser,
  mockUser,
  request,
} from '../common/e2e-app';
import { createFindAndCount } from '../common/in-memory-repository.util';

type BrandRecord = Brand;

function createInMemoryBrandsRepository() {
  const store = new Map<string, BrandRecord>();

  return {
    create: jest.fn((data: Partial<BrandRecord>) =>
      Object.assign(new Brand(), data),
    ),
    save: jest.fn(async (brand: BrandRecord) => {
      if (!brand.id) {
        brand.id = uuidv7();
        brand.createdAt = new Date();
        brand.updatedAt = new Date();
      } else {
        brand.updatedAt = new Date();
      }

      store.set(brand.id, { ...brand });
      return { ...brand };
    }),
    find: jest.fn(async () =>
      [...store.values()].sort((a, b) => a.name.localeCompare(b.name)),
    ),
    findAndCount: createFindAndCount(
      () => [...store.values()],
      (a, b) => a.name.localeCompare(b.name),
    ),
    findOne: jest.fn(async ({ where }: { where: Partial<BrandRecord> }) => {
      if (where.id) {
        return store.get(where.id) ?? null;
      }

      if (where.name) {
        return (
          [...store.values()].find((brand) => brand.name === where.name) ?? null
        );
      }

      return null;
    }),
    remove: jest.fn(async (brand: BrandRecord) => {
      store.delete(brand.id);
      return brand;
    }),
    clear: () => store.clear(),
  };
}

async function createBrandsTestApp(
  usersServiceOverride?: Partial<UsersService>,
): Promise<INestApplication<App>> {
  const brandsRepository = createInMemoryBrandsRepository();

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
    controllers: [AuthController, BrandsController],
    providers: [
      AuthService,
      BrandsService,
      JwtStrategy,
      JwtAuthGuard,
      RolesGuard,
      {
        provide: UsersService,
        useValue: {
          findByEmail: jest.fn(),
          findByDocument: jest.fn(),
          findById: jest.fn(),
          ...usersServiceOverride,
        },
      },
      {
        provide: getRepositoryToken(Brand),
        useValue: brandsRepository,
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
  class BrandsE2eModule {}

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [BrandsE2eModule],
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
  compare: jest.fn().mockResolvedValue(true),
}));

describe('Brands (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createBrandsTestApp({
      findByEmail: jest.fn().mockImplementation(async (email: string) => {
        if (email === mockUser.email) {
          return mockUser;
        }

        if (email === mockOperatorUser.email) {
          return mockOperatorUser;
        }

        return null;
      }),
    });
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

  it('returns 401 for unauthenticated create request', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/brands')
      .send({ name: 'Toyota' })
      .expect(401);
  });

  it('creates brand for authenticated operator', async () => {
    const token = await login(mockOperatorUser.email);

    const response = await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Toyota' })
      .expect(201);

    const brand = itemFrom(response.body, 'brand');

    expect(brand).toMatchObject({
      name: 'Toyota',
      createdBy: mockOperatorUser.id,
    });
    expect(brand.id).toEqual(expect.any(String));
  });

  it('lists and retrieves brands', async () => {
    const token = await login(mockUser.email);

    const created = await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Honda' })
      .expect(201);

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/brands')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(nodesFrom(listResponse.body, 'brands')).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Honda' })]),
    );

    const createdBrand = itemFrom(created.body, 'brand');
    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/brands/${createdBrand.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(itemFrom(detailResponse.body, 'brand').name).toBe('Honda');
  });

  it('updates brand name', async () => {
    const token = await login(mockUser.email);

    const created = await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ford' })
      .expect(201);

    const createdBrand = itemFrom(created.body, 'brand');
    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/brands/${createdBrand.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ford Motor' })
      .expect(200);

    expect(itemFrom(updated.body, 'brand').name).toBe('Ford Motor');
  });

  it('returns 403 for operator on DELETE', async () => {
    const adminToken = await login(mockUser.email);

    const created = await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Chevrolet' })
      .expect(201);

    const operatorToken = await login(mockOperatorUser.email);

    await request(app.getHttpServer())
      .delete(`/api/v1/brands/${itemFrom(created.body, 'brand').id}`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(403);
  });

  it('allows admin to DELETE brand', async () => {
    const token = await login(mockUser.email);

    const created = await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fiat' })
      .expect(201);

    const createdBrand = itemFrom(created.body, 'brand');

    await request(app.getHttpServer())
      .delete(`/api/v1/brands/${createdBrand.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/v1/brands/${createdBrand.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('returns 409 for duplicate brand name with standardized envelope', async () => {
    const token = await login(mockUser.email);

    await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Volkswagen' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Volkswagen' })
      .expect(409);

    expect(response.body).toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('Volkswagen'),
      error: expect.any(String),
      timestamp: expect.any(String),
      path: '/api/v1/brands',
    });
  });
});

describe('Brands bootstrap (e2e)', () => {
  it('bootstraps main test app without brands module', async () => {
    const app = await createTestApp();
    await app.close();
  });
});
