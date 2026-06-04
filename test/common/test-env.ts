import { resolve } from 'node:path';
import { config } from 'dotenv';

const DEFAULT_JWT_SECRET =
  'test-jwt-secret-key-for-integration-e2e-only-32-chars';

export function loadTestEnv(): void {
  config({ path: resolve(process.cwd(), '.env'), quiet: true });

  process.env.NODE_ENV ??= 'development';
  process.env.API_PREFIX ??= 'api/v1';
  process.env.JWT_SECRET ??= DEFAULT_JWT_SECRET;
  process.env.DB_HOST ??= 'localhost';
  process.env.DB_PORT ??= '1433';
  process.env.REDIS_HOST ??= 'localhost';
  process.env.REDIS_PORT ??= '6379';
  process.env.RABBITMQ_URL ??= 'amqp://guest:guest@localhost:5672';
  process.env.RABBITMQ_EXCHANGE ??= 'aivacol.vehicles';
  process.env.MONGODB_URI ??= 'mongodb://localhost:27017';
  process.env.MONGODB_DATABASE ??= 'aivacol_audit';
}

/** Integration tests run on the host against published Docker ports. */
export function loadIntegrationTestEnv(): void {
  loadTestEnv();
  process.env.DB_HOST = 'localhost';
  process.env.REDIS_HOST = 'localhost';
}
