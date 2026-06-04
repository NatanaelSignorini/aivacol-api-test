import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createIntegrationApp } from '../common/integration-app';
import { describeIntegration } from '../common/integration-gate';
import {
  AIVACOL_LOGIN,
  uniqueBrandName,
  uniqueModelName,
  uniqueRunId,
  uniqueVehicleIdentifiers,
} from '../fixtures/fleet.fixture';

describeIntegration('Fleet flow (docker integration)', () => {
  let app: INestApplication<App>;
  let adminToken = '';
  const runId = uniqueRunId();
  let brandId = '';
  let modelId = '';
  let vehicleId = '';
  const vehicleIds = uniqueVehicleIdentifiers(runId);

  beforeAll(async () => {
    app = await createIntegrationApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 for protected route without token', async () => {
    await request(app.getHttpServer()).get('/api/v1/brands').expect(401);
  });

  it('logs in with aivacol seed credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(AIVACOL_LOGIN)
      .expect(200);

    expect(response.body.accessToken).toEqual(expect.any(String));
    adminToken = response.body.accessToken as string;
  });

  it('creates brand, model, and vehicle', async () => {
    const brandResponse = await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: uniqueBrandName(runId) })
      .expect(201);

    brandId = brandResponse.body.id as string;
    expect(brandResponse.body.createdBy).toEqual(expect.any(String));

    const modelResponse = await request(app.getHttpServer())
      .post('/api/v1/models')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: uniqueModelName(runId), brandId })
      .expect(201);

    modelId = modelResponse.body.id as string;

    const vehicleResponse = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...vehicleIds,
        year: 2024,
        modelId,
      })
      .expect(201);

    vehicleId = vehicleResponse.body.id as string;
    expect(vehicleResponse.body.licensePlate).toBe(
      vehicleIds.licensePlate.toUpperCase(),
    );
    expect(vehicleResponse.body.modelId).toBe(modelId);
  });

  it('lists and fetches the created vehicle', async () => {
    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      listResponse.body.some(
        (vehicle: { id: string }) => vehicle.id === vehicleId,
      ),
    ).toBe(true);

    const getResponse = await request(app.getHttpServer())
      .get(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(getResponse.body.id).toBe(vehicleId);
    expect(getResponse.body.modelName).toBe(uniqueModelName(runId));
  });

  it('updates and removes the vehicle (admin)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ year: 2025 })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('cleans up model and brand', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/models/${modelId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/api/v1/brands/${brandId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });
});
