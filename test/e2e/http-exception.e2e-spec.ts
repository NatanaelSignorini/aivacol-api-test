import type { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AUTH_MESSAGE } from '../../src/common/constants/message.constants';
import {
  createTestApp,
  mockOperatorUser,
  mockUser,
  request,
} from '../common/e2e-app';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

function expectErrorEnvelope(
  body: Record<string, unknown>,
  expectedStatus: number,
  expectedPath: string,
): void {
  expect(body).toEqual(
    expect.objectContaining({
      statusCode: expectedStatus,
      message: expect.anything(),
      error: expect.any(String),
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      path: expectedPath,
    }),
  );
  expect(body).not.toHaveProperty('stack');
}

describe('HttpExceptionFilter (e2e)', () => {
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

  it('returns standardized envelope on 401 login failure', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'missing@aivacol.com',
        password: 'Password1!',
      })
      .expect(401);

    expectErrorEnvelope(response.body, 401, '/api/v1/auth/login');
    expect(response.body.message).toBe(AUTH_MESSAGE.INVALID_CREDENTIALS);
  });

  it('returns standardized envelope on 400 validation failure', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'not-an-email',
        password: '',
      })
      .expect(400);

    expectErrorEnvelope(response.body, 400, '/api/v1/auth/login');
    expect(response.body.message).toEqual(expect.any(Array));
  });

  it('returns standardized envelope on 403 RBAC failure', async () => {
    const token = await login(mockOperatorUser.email);

    const response = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expectErrorEnvelope(response.body, 403, '/api/v1/users');
    expect(response.body.message).toBe('Insufficient permissions');
  });
});
