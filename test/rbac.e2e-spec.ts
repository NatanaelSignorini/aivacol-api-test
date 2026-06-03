import type { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createTestApp, mockOperatorUser, mockUser, request } from './test-app';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

describe('RBAC (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({
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

  beforeEach(() => {
    jest.mocked(bcrypt.compare).mockReset();
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
  });

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password1!' })
      .expect(200);

    return response.body.accessToken as string;
  }

  it('allows admin to access admin-only DELETE route', async () => {
    const token = await login(mockUser.email);

    await request(app.getHttpServer())
      .delete('/api/v1/rbac-probe/admin-only')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('returns 403 for operator on admin-only DELETE route', async () => {
    const token = await login(mockOperatorUser.email);

    await request(app.getHttpServer())
      .delete('/api/v1/rbac-probe/admin-only')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('allows operator to access shared route', async () => {
    const token = await login(mockOperatorUser.email);

    await request(app.getHttpServer())
      .get('/api/v1/rbac-probe/shared')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('returns authenticated user via @CurrentUser()', async () => {
    const token = await login(mockOperatorUser.email);

    const response = await request(app.getHttpServer())
      .get('/api/v1/rbac-probe/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      id: mockOperatorUser.id,
      email: mockOperatorUser.email,
      role: mockOperatorUser.role,
    });
  });
});
