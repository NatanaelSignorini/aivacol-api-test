import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { INestApplication } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  VEHICLES_LIST_CACHE_KEY,
  vehicleByIdCacheKey,
} from '../../src/modules/vehicles/vehicles-cache.constants';
import { itemFrom } from '../common/api-response.util';
import { createIntegrationApp } from '../common/integration/create-test-app';
import { describeIntegration } from '../common/integration/describe-if-ready';
import {
  AIVACOL_LOGIN,
  uniqueBrandName,
  uniqueModelName,
  uniqueRunId,
  uniqueVehicleIdentifiers,
} from '../fixtures/fleet.fixture';

describeIntegration('Vehicles cache (docker integration)', () => {
  let app: INestApplication<App>;
  let adminToken = '';
  let modelId = '';
  let vehicleId = '';
  const runId = uniqueRunId();

  beforeAll(async () => {
    app = await createIntegrationApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeAll(async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(AIVACOL_LOGIN)
      .expect(200);

    adminToken = itemFrom(loginResponse.body, 'login').accessToken;

    const brandResponse = await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: uniqueBrandName(runId) })
      .expect(201);

    const brandId = itemFrom(brandResponse.body, 'brand').id;

    const modelResponse = await request(app.getHttpServer())
      .post('/api/v1/models')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: uniqueModelName(runId), brandId })
      .expect(201);

    modelId = itemFrom(modelResponse.body, 'model').id;
  });

  afterAll(async () => {
    if (vehicleId) {
      await request(app.getHttpServer())
        .delete(`/api/v1/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    if (modelId) {
      await request(app.getHttpServer())
        .delete(`/api/v1/models/${modelId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
  });

  it('warms list and id cache on GET', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...uniqueVehicleIdentifiers(uniqueRunId()),
        year: 2024,
        modelId,
      })
      .expect(201);

    vehicleId = itemFrom(createResponse.body, 'vehicle').id;

    const cacheManager = app.get<Cache>(CACHE_MANAGER);
    await cacheManager.del(VEHICLES_LIST_CACHE_KEY);
    await cacheManager.del(vehicleByIdCacheKey(vehicleId));

    await request(app.getHttpServer())
      .get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(await cacheManager.get(VEHICLES_LIST_CACHE_KEY)).toBeDefined();

    await request(app.getHttpServer())
      .get(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      await cacheManager.get(vehicleByIdCacheKey(vehicleId)),
    ).toBeDefined();
  });

  it('invalidates list cache on POST create', async () => {
    const cacheManager = app.get<Cache>(CACHE_MANAGER);

    await request(app.getHttpServer())
      .get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(await cacheManager.get(VEHICLES_LIST_CACHE_KEY)).toBeDefined();

    await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...uniqueVehicleIdentifiers(uniqueRunId()),
        year: 2024,
        modelId,
      })
      .expect(201);

    expect(await cacheManager.get(VEHICLES_LIST_CACHE_KEY)).toBeUndefined();
  });

  it('invalidates list cache on PATCH and id cache on DELETE', async () => {
    const cacheManager = app.get<Cache>(CACHE_MANAGER);
    await cacheManager.del(VEHICLES_LIST_CACHE_KEY);
    await cacheManager.del(vehicleByIdCacheKey(vehicleId));

    await request(app.getHttpServer())
      .get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(await cacheManager.get(VEHICLES_LIST_CACHE_KEY)).toBeDefined();
    expect(
      await cacheManager.get(vehicleByIdCacheKey(vehicleId)),
    ).toBeDefined();

    await request(app.getHttpServer())
      .patch(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ year: 2025 })
      .expect(200);

    expect(await cacheManager.get(VEHICLES_LIST_CACHE_KEY)).toBeUndefined();

    await request(app.getHttpServer())
      .get(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      await cacheManager.get(vehicleByIdCacheKey(vehicleId)),
    ).toBeDefined();

    await request(app.getHttpServer())
      .delete(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    expect(
      await cacheManager.get(vehicleByIdCacheKey(vehicleId)),
    ).toBeUndefined();
    vehicleId = '';
  });
});
