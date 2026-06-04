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
import { Model } from '../../src/modules/models/entities/model.entity';
import { ModelsController } from '../../src/modules/models/models.controller';
import { ModelsService } from '../../src/modules/models/models.service';
import { UsersService } from '../../src/modules/users/users.service';
import { VehiclesService } from '../../src/modules/vehicles/vehicles.service';
import { itemFrom, nodesFrom } from '../common/api-response.util';
import {
  createTestApp,
  mockOperatorUser,
  mockUser,
  request,
} from '../common/e2e-app';
import { createFindAndCount } from '../common/in-memory-repository.util';

type BrandRecord = Brand;
type ModelRecord = Model;

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

function createInMemoryModelsRepository(
  brandsRepository: ReturnType<typeof createInMemoryBrandsRepository>,
) {
  const store = new Map<string, ModelRecord>();

  return {
    create: jest.fn((data: Partial<ModelRecord>) =>
      Object.assign(new Model(), data),
    ),
    save: jest.fn(async (model: ModelRecord) => {
      if (!model.id) {
        model.id = uuidv7();
        model.createdAt = new Date();
        model.updatedAt = new Date();
      } else {
        model.updatedAt = new Date();
      }

      store.set(model.id, { ...model });
      return { ...model };
    }),
    find: jest.fn(async () => {
      const models = [...store.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      for (const model of models) {
        if (model.brandId) {
          model.brand =
            (await brandsRepository.findOne({
              where: { id: model.brandId },
            })) ?? null;
        } else {
          model.brand = null;
        }
      }

      return models;
    }),
    findAndCount: jest.fn(async (options) => {
      const models = [...store.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      for (const model of models) {
        if (model.brandId) {
          model.brand =
            (await brandsRepository.findOne({
              where: { id: model.brandId },
            })) ?? null;
        } else {
          model.brand = null;
        }
      }

      let items = models;

      if (options?.where?.name) {
        const raw = options.where.name as { _value?: string } | string;
        const pattern = String(
          typeof raw === 'object' && raw !== null && '_value' in raw
            ? raw._value
            : raw,
        ).replace(/%/g, '');
        items = items.filter((model) =>
          model.name.toLowerCase().includes(pattern.toLowerCase()),
        );
      }

      if (options?.where?.brandId) {
        items = items.filter(
          (model) => model.brandId === options.where.brandId,
        );
      }

      const totalCount = items.length;
      const skip = options?.skip ?? 0;
      const take = options?.take ?? items.length;

      return [items.slice(skip, skip + take), totalCount];
    }),
    findOne: jest.fn(
      async ({
        where,
        relations,
      }: {
        where: Partial<ModelRecord>;
        relations?: { brand?: boolean };
      }) => {
        let model: ModelRecord | null = null;

        if (where.id) {
          model = store.get(where.id) ?? null;
        }

        if (!model) {
          return null;
        }

        if (relations?.brand && model.brandId) {
          model.brand =
            (await brandsRepository.findOne({
              where: { id: model.brandId },
            })) ?? null;
        } else if (relations?.brand) {
          model.brand = null;
        }

        return { ...model };
      },
    ),
    remove: jest.fn(async (model: ModelRecord) => {
      store.delete(model.id);
      return model;
    }),
    clear: () => store.clear(),
  };
}

async function createModelsTestApp(
  usersServiceOverride?: Partial<UsersService>,
): Promise<INestApplication<App>> {
  const brandsRepository = createInMemoryBrandsRepository();
  const modelsRepository = createInMemoryModelsRepository(brandsRepository);

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
    controllers: [AuthController, BrandsController, ModelsController],
    providers: [
      AuthService,
      BrandsService,
      ModelsService,
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
        provide: getRepositoryToken(Model),
        useValue: modelsRepository,
      },
      {
        provide: VehiclesService,
        useValue: {
          countByModelId: jest.fn().mockResolvedValue(0),
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
  class ModelsE2eModule {}

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [ModelsE2eModule],
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

describe('Models (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createModelsTestApp({
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
      .post('/api/v1/models')
      .send({ name: 'Corolla' })
      .expect(401);
  });

  it('creates model for authenticated operator', async () => {
    const token = await login(mockOperatorUser.email);

    const response = await request(app.getHttpServer())
      .post('/api/v1/models')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Corolla' })
      .expect(201);

    const model = itemFrom(response.body, 'model');

    expect(model).toMatchObject({
      name: 'Corolla',
    });
    expect(model.brand).toBeUndefined();
    expect(model.id).toEqual(expect.any(String));
  });

  it('associates model to brand when brandId is provided', async () => {
    const token = await login(mockUser.email);

    const brand = await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Toyota' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/models')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hilux', brandId: itemFrom(brand.body, 'brand').id })
      .expect(201);

    expect(itemFrom(response.body, 'model')).toMatchObject({
      name: 'Hilux',
    });
    expect(itemFrom(response.body, 'model').brand).toBeUndefined();
  });

  it('returns 404 for invalid brandId on create', async () => {
    const token = await login(mockUser.email);

    const response = await request(app.getHttpServer())
      .post('/api/v1/models')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Invalid Model',
        brandId: '018f1234-5678-7890-abcd-ef9999999999',
      })
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      message: expect.stringContaining('Brand'),
      error: expect.any(String),
      timestamp: expect.any(String),
      path: '/api/v1/models',
    });
  });

  it('lists and retrieves models', async () => {
    const token = await login(mockUser.email);

    const created = await request(app.getHttpServer())
      .post('/api/v1/models')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Civic' })
      .expect(201);

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/models')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(nodesFrom(listResponse.body, 'models')).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Civic' })]),
    );

    const createdModel = itemFrom(created.body, 'model');
    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/models/${createdModel.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(itemFrom(detailResponse.body, 'model').name).toBe('Civic');
  });

  it('updates model name and brandId', async () => {
    const token = await login(mockUser.email);

    const brand = await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Honda' })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post('/api/v1/models')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Fit' })
      .expect(201);

    const createdModel = itemFrom(created.body, 'model');
    const brandItem = itemFrom(brand.body, 'brand');
    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/models/${createdModel.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'City', brandId: brandItem.id })
      .expect(200);

    const updatedModel = await request(app.getHttpServer())
      .get(`/api/v1/models/${createdModel.id}`)
      .query({ includeBrand: true })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(itemFrom(updated.body, 'model')).toMatchObject({ name: 'City' });
    expect(itemFrom(updatedModel.body, 'model')).toMatchObject({
      name: 'City',
      brand: {
        id: brandItem.id,
        name: 'Honda',
        createdAt: brandItem.createdAt,
        updatedAt: brandItem.updatedAt,
        createdBy: brandItem.createdBy,
      },
    });
  });

  it('returns 403 for operator on DELETE', async () => {
    const adminToken = await login(mockUser.email);

    const created = await request(app.getHttpServer())
      .post('/api/v1/models')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'To Delete' })
      .expect(201);

    const operatorToken = await login(mockOperatorUser.email);

    await request(app.getHttpServer())
      .delete(`/api/v1/models/${itemFrom(created.body, 'model').id}`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(403);
  });

  it('allows admin to DELETE model', async () => {
    const token = await login(mockUser.email);

    const created = await request(app.getHttpServer())
      .post('/api/v1/models')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Disposable' })
      .expect(201);

    const createdModel = itemFrom(created.body, 'model');

    await request(app.getHttpServer())
      .delete(`/api/v1/models/${createdModel.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/v1/models/${createdModel.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});

describe('Models bootstrap (e2e)', () => {
  it('bootstraps main test app without models module', async () => {
    const app = await createTestApp();
    await app.close();
  });
});
