import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { INestApplication } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  VEHICLES_LIST_CACHE_KEY,
  vehicleByIdCacheKey,
} from '../../src/modules/vehicles/vehicles-cache.constants';
import { createIntegrationApp } from '../common/integration-app';
import { describeIntegration } from '../common/integration-gate';
import {
  AIVACOL_LOGIN,
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
  const vehicleIds = uniqueVehicleIdentifiers(runId);

  beforeAll(async () => {
    app = await createIntegrationApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('warms list cache on GET and invalidates on PATCH', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(AIVACOL_LOGIN)
      .expect(200);

    adminToken = loginResponse.body.accessToken as string;

    const modelResponse = await request(app.getHttpServer())
      .post('/api/v1/models')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: uniqueModelName(runId) })
      .expect(201);

    modelId = modelResponse.body.id as string;

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...vehicleIds,
        year: 2024,
        modelId,
      })
      .expect(201);

    vehicleId = createResponse.body.id as string;

    const cacheManager = app.get<Cache>(CACHE_MANAGER);
    await cacheManager.del(VEHICLES_LIST_CACHE_KEY);
    await cacheManager.del(vehicleByIdCacheKey(vehicleId));

    await request(app.getHttpServer())
      .get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const listCached = await cacheManager.get(VEHICLES_LIST_CACHE_KEY);
    expect(listCached).toBeDefined();

    await request(app.getHttpServer())
      .get(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const idCached = await cacheManager.get(vehicleByIdCacheKey(vehicleId));
    expect(idCached).toBeDefined();

    await request(app.getHttpServer())
      .patch(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ year: 2025 })
      .expect(200);

    const listCachedAfterPatch = await cacheManager.get(
      VEHICLES_LIST_CACHE_KEY,
    );
    expect(listCachedAfterPatch).toBeUndefined();

    await request(app.getHttpServer())
      .delete(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/api/v1/models/${modelId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });
});
