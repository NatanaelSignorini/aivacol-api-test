import type { INestApplication } from '@nestjs/common';
import { createTestApp } from '../common/e2e-app';

describe('Application (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('bootstraps successfully', () => {
    expect(app.getHttpServer()).toBeDefined();
  });
});
