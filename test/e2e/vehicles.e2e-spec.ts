import { CACHE_MANAGER } from '@nestjs/cache-manager';
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
import { VehicleEventsPublisher } from '../../src/modules/messaging/publishers/vehicle-events.publisher';
import { Model } from '../../src/modules/models/entities/model.entity';
import { ModelsController } from '../../src/modules/models/models.controller';
import { ModelsService } from '../../src/modules/models/models.service';
import { UsersService } from '../../src/modules/users/users.service';
import { Vehicle } from '../../src/modules/vehicles/entities/vehicle.entity';
import { VehiclesController } from '../../src/modules/vehicles/vehicles.controller';
import { VehiclesService } from '../../src/modules/vehicles/vehicles.service';
import { itemFrom, nodesFrom } from '../common/api-response.util';
import { mockOperatorUser, mockUser, request } from '../common/e2e/create-test-app';
import { createFindAndCount } from '../common/e2e/in-memory-repository.util';

type ModelRecord = Model;
type VehicleRecord = Vehicle;

function createInMemoryBrandsRepository() {
  const store = new Map<string, Brand>();

  return {
    create: jest.fn((data: Partial<Brand>) => Object.assign(new Brand(), data)),
    save: jest.fn(async (brand: Brand) => {
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
    findOne: jest.fn(async ({ where }: { where: Partial<Brand> }) => {
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
    remove: jest.fn(async (brand: Brand) => {
      store.delete(brand.id);
      return brand;
    }),
    clear: () => store.clear(),
  };
}

function createInMemoryModelsRepository() {
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
    find: jest.fn(async () =>
      [...store.values()].sort((a, b) => a.name.localeCompare(b.name)),
    ),
    findAndCount: createFindAndCount(
      () => [...store.values()],
      (a, b) => a.name.localeCompare(b.name),
    ),
    findOne: jest.fn(async ({ where }: { where: Partial<ModelRecord> }) => {
      if (where.id) {
        return store.get(where.id) ?? null;
      }

      return null;
    }),
    count: jest.fn(
      async ({ where }: { where: Partial<ModelRecord> }) =>
        [...store.values()].filter((model) => model.brandId === where.brandId)
          .length,
    ),
    remove: jest.fn(async (model: ModelRecord) => {
      store.delete(model.id);
      return model;
    }),
    clear: () => store.clear(),
  };
}

function createInMemoryVehiclesRepository(
  modelsRepository: ReturnType<typeof createInMemoryModelsRepository>,
) {
  const store = new Map<string, VehicleRecord>();

  return {
    create: jest.fn((data: Partial<VehicleRecord>) =>
      Object.assign(new Vehicle(), data),
    ),
    save: jest.fn(async (vehicle: VehicleRecord) => {
      if (!vehicle.id) {
        vehicle.id = uuidv7();
        vehicle.createdAt = new Date();
        vehicle.updatedAt = new Date();
      } else {
        vehicle.updatedAt = new Date();
      }

      store.set(vehicle.id, { ...vehicle });
      return { ...vehicle };
    }),
    find: jest.fn(async () => {
      const vehicles = [...store.values()].sort((a, b) =>
        a.licensePlate.localeCompare(b.licensePlate),
      );

      for (const vehicle of vehicles) {
        vehicle.model =
          (await modelsRepository.findOne({
            where: { id: vehicle.modelId },
          })) ?? undefined;
      }

      return vehicles;
    }),
    findAndCount: jest.fn(async (options) => {
      const vehicles = [...store.values()].sort((a, b) =>
        a.licensePlate.localeCompare(b.licensePlate),
      );

      for (const vehicle of vehicles) {
        vehicle.model =
          (await modelsRepository.findOne({
            where: { id: vehicle.modelId },
          })) ?? undefined;
      }

      let items = vehicles;

      if (options?.where?.licensePlate) {
        const raw = options.where.licensePlate as { _value?: string } | string;
        const pattern = String(
          typeof raw === 'object' && raw !== null && '_value' in raw
            ? raw._value
            : raw,
        ).replace(/%/g, '');
        items = items.filter((vehicle) =>
          vehicle.licensePlate.toLowerCase().includes(pattern.toLowerCase()),
        );
      }

      if (options?.where?.modelId) {
        items = items.filter(
          (vehicle) => vehicle.modelId === options.where.modelId,
        );
      }

      if (options?.where?.year !== undefined) {
        items = items.filter((vehicle) => vehicle.year === options.where.year);
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
        where: Partial<VehicleRecord>;
        relations?: { model?: boolean };
      }) => {
        let vehicle: VehicleRecord | null = null;

        if (where.id) {
          vehicle = store.get(where.id) ?? null;
        } else if (where.licensePlate) {
          vehicle =
            [...store.values()].find(
              (item) => item.licensePlate === where.licensePlate,
            ) ?? null;
        } else if (where.chassis) {
          vehicle =
            [...store.values()].find(
              (item) => item.chassis === where.chassis,
            ) ?? null;
        } else if (where.renavam) {
          vehicle =
            [...store.values()].find(
              (item) => item.renavam === where.renavam,
            ) ?? null;
        }

        if (!vehicle) {
          return null;
        }

        if (relations?.model) {
          vehicle.model =
            (await modelsRepository.findOne({
              where: { id: vehicle.modelId },
            })) ?? undefined;
        }

        return { ...vehicle };
      },
    ),
    remove: jest.fn(async (vehicle: VehicleRecord) => {
      store.delete(vehicle.id);
      return vehicle;
    }),
    count: jest.fn(
      async ({ where }: { where: Partial<VehicleRecord> }) =>
        [...store.values()].filter((item) => item.modelId === where.modelId)
          .length,
    ),
    clear: () => store.clear(),
  };
}

async function createVehiclesTestApp(): Promise<INestApplication<App>> {
  const brandsRepository = createInMemoryBrandsRepository();
  const modelsRepository = createInMemoryModelsRepository();
  const vehiclesRepository = createInMemoryVehiclesRepository(modelsRepository);

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
    controllers: [
      AuthController,
      BrandsController,
      ModelsController,
      VehiclesController,
    ],
    providers: [
      AuthService,
      BrandsService,
      ModelsService,
      VehiclesService,
      JwtStrategy,
      JwtAuthGuard,
      RolesGuard,
      {
        provide: UsersService,
        useValue: {
          findByEmail: jest.fn().mockImplementation(async (email: string) => {
            if (email === mockUser.email) {
              return mockUser;
            }

            if (email === mockOperatorUser.email) {
              return mockOperatorUser;
            }

            return null;
          }),
          findByDocument: jest.fn(),
          findById: jest.fn(),
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
        provide: getRepositoryToken(Vehicle),
        useValue: vehiclesRepository,
      },
      {
        provide: CACHE_MANAGER,
        useValue: {
          get: jest.fn(),
          set: jest.fn(),
          del: jest.fn(),
        },
      },
      {
        provide: VehicleEventsPublisher,
        useValue: {
          publishCreated: jest.fn(),
          publishUpdated: jest.fn(),
          publishDeleted: jest.fn(),
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
  class VehiclesE2eModule {}

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [VehiclesE2eModule],
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

describe('Vehicles (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createVehiclesTestApp();
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

  async function createBrand(
    token: string,
    name = `Brand-${uuidv7()}`,
  ): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Authorization', `Bearer ${token}`)
      .send({ name })
      .expect(201);

    return itemFrom(response.body, 'brand').id;
  }

  async function createModel(token: string, name = 'Corolla'): Promise<string> {
    const brandId = await createBrand(token);
    const response = await request(app.getHttpServer())
      .post('/api/v1/models')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, brandId })
      .expect(201);

    return itemFrom(response.body, 'model').id;
  }

  it('returns 401 for unauthenticated create request', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .send({
        licensePlate: 'ABC1D23',
        chassis: '9BWZZZ377VT004251',
        renavam: '12345678901',
        year: 2024,
        modelId: '018f1234-5678-7890-abcd-ef9999999999',
      })
      .expect(401);
  });

  it('creates vehicle for authenticated operator', async () => {
    const token = await login(mockOperatorUser.email);
    const modelId = await createModel(token);

    const response = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        licensePlate: 'abc-1d23',
        chassis: '9BWZZZ377VT004251',
        renavam: '12345678901',
        year: 2024,
        modelId,
      })
      .expect(201);

    const vehicle = itemFrom(response.body, 'vehicle');

    expect(vehicle).toMatchObject({
      licensePlate: 'ABC1D23',
      chassis: '9BWZZZ377VT004251',
      renavam: '12345678901',
      year: 2024,
    });
    expect(vehicle.model).toBeUndefined();
    expect(vehicle.id).toEqual(expect.any(String));
  });

  it('returns 404 for invalid modelId on create', async () => {
    const token = await login(mockUser.email);

    const response = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        licensePlate: 'ABC1D23',
        chassis: '9BWZZZ377VT004251',
        renavam: '12345678901',
        year: 2024,
        modelId: '018f1234-5678-7890-abcd-ef9999999999',
      })
      .expect(404);

    expect(response.body.message).toEqual(expect.stringContaining('Model'));
  });

  it('returns 409 for duplicate license plate', async () => {
    const token = await login(mockUser.email);
    const modelId = await createModel(token, 'Hilux');

    await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        licensePlate: 'DUP1A23',
        chassis: '9BWZZZ377VT004299',
        renavam: '55544433322',
        year: 2024,
        modelId,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        licensePlate: 'DUP1A23',
        chassis: '9BWZZZ377VT004298',
        renavam: '55544433321',
        year: 2023,
        modelId,
      })
      .expect(409);

    expect(response.body.message).toEqual(
      expect.stringContaining('license plate'),
    );
  });

  it('lists and retrieves vehicles', async () => {
    const token = await login(mockUser.email);
    const modelId = await createModel(token, 'Civic');

    const created = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        licensePlate: 'XYZ9A87',
        chassis: '9BWZZZ377VT004253',
        renavam: '11122233344',
        year: 2022,
        modelId,
      })
      .expect(201);

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(nodesFrom(listResponse.body, 'vehicles')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ licensePlate: 'XYZ9A87' }),
      ]),
    );

    const createdVehicle = itemFrom(created.body, 'vehicle');
    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/vehicles/${createdVehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(itemFrom(detailResponse.body, 'vehicle').licensePlate).toBe(
      'XYZ9A87',
    );
  });

  it('updates vehicle year', async () => {
    const token = await login(mockUser.email);
    const modelId = await createModel(token, 'Fit');

    const created = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        licensePlate: 'QWE1A23',
        chassis: '9BWZZZ377VT004254',
        renavam: '55566677788',
        year: 2020,
        modelId,
      })
      .expect(201);

    const createdVehicle = itemFrom(created.body, 'vehicle');
    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/vehicles/${createdVehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ year: 2021 })
      .expect(200);

    expect(itemFrom(updated.body, 'vehicle').year).toBe(2021);
  });

  it('returns 403 for operator on DELETE vehicle', async () => {
    const adminToken = await login(mockUser.email);
    const modelId = await createModel(adminToken, 'Delete Me');

    const created = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        licensePlate: 'DEL1A23',
        chassis: '9BWZZZ377VT004255',
        renavam: '99988877766',
        year: 2019,
        modelId,
      })
      .expect(201);

    const operatorToken = await login(mockOperatorUser.email);

    await request(app.getHttpServer())
      .delete(`/api/v1/vehicles/${itemFrom(created.body, 'vehicle').id}`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(403);
  });

  it('allows admin to DELETE vehicle', async () => {
    const token = await login(mockUser.email);
    const modelId = await createModel(token, 'Disposable Car');

    const created = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        licensePlate: 'RMV1A23',
        chassis: '9BWZZZ377VT004256',
        renavam: '44433322211',
        year: 2018,
        modelId,
      })
      .expect(201);

    const createdVehicle = itemFrom(created.body, 'vehicle');

    await request(app.getHttpServer())
      .delete(`/api/v1/vehicles/${createdVehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/v1/vehicles/${createdVehicle.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('returns 409 when deleting model referenced by vehicles', async () => {
    const token = await login(mockUser.email);
    const modelId = await createModel(token, 'Referenced');

    await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        licensePlate: 'REF1A23',
        chassis: '9BWZZZ377VT004257',
        renavam: '33322211100',
        year: 2017,
        modelId,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .delete(`/api/v1/models/${modelId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);

    expect(response.body.message).toEqual(
      expect.stringContaining('vehicles reference'),
    );
  });
});
