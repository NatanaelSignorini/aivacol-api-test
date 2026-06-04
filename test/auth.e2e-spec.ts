import type { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createTestApp, mockUser, request } from './test-app';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({
      findByEmail: jest
        .fn()
        .mockImplementation(async (email: string) =>
          email === mockUser.email ? mockUser : null,
        ),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.mocked(bcrypt.compare).mockReset();
  });

  it('returns access token for valid credentials', async () => {
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@aivacol.com',
        password: 'Password1!',
      })
      .expect(200);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.accessToken.length).toBeGreaterThan(0);
  });

  it('returns 401 for invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'missing@aivacol.com',
        password: 'Password1!',
      })
      .expect(401);
  });

  it('returns 400 when extra fields are sent', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@aivacol.com',
        document: '12345678901',
        password: 'Password1!',
      })
      .expect(400);
  });

  it('returns success message on logout with valid token', async () => {
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@aivacol.com',
        password: 'Password1!',
      })
      .expect(200);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);

    expect(response.body).toEqual({ message: 'Logout successful' });
  });

  it('returns 401 on logout without token', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/logout').expect(401);
  });
});
