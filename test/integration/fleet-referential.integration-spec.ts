import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { itemFrom } from '../common/api-response.util';
import { createIntegrationApp } from '../common/integration/create-test-app';
import { describeIntegration } from '../common/integration/describe-if-ready';
import {
  AIVACOL_LOGIN,
  uniqueBrandName,
  uniqueModelName,
  uniqueRunId,
} from '../fixtures/fleet.fixture';

describeIntegration('Fleet referential rules (docker integration)', () => {
  let app: INestApplication<App>;
  let adminToken = '';
  const runId = uniqueRunId();

  beforeAll(async () => {
    app = await createIntegrationApp();

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(AIVACOL_LOGIN)
      .expect(200);

    adminToken = itemFrom(loginResponse.body, 'login').accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 400 when creating model without brandId', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/models')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: uniqueModelName(`${runId}-no-brand`) })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
    });
    expect(response.body.message).toEqual(
      expect.arrayContaining(['brandId should not be empty']),
    );
  });

  it('returns 409 when deleting brand with linked models', async () => {
    const brandResponse = await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: uniqueBrandName(`${runId}-linked`) })
      .expect(201);

    const brandId = itemFrom(brandResponse.body, 'brand').id;

    await request(app.getHttpServer())
      .post('/api/v1/models')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: uniqueModelName(`${runId}-linked`),
        brandId,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .delete(`/api/v1/brands/${brandId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);

    expect(response.body).toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('models reference it'),
    });
  });
});
