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
      findByDocument: jest
        .fn()
        .mockImplementation(async (document: string) =>
          document === mockUser.nickname ? mockUser : null,
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

  it('returns access token when logging in with document', async () => {
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        document: 'aivacol',
        password: 'Password1!',
      })
      .expect(200);

    expect(response.body.accessToken).toEqual(expect.any(String));
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
});
