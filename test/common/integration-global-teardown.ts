import { unlinkSync } from 'node:fs';
import {
  E2E_INTEGRATION_FLAG_FILE,
  teardownIntegrationE2e,
} from './integration-bootstrap';

export default async function globalTeardown(): Promise<void> {
  await teardownIntegrationE2e();

  try {
    unlinkSync(E2E_INTEGRATION_FLAG_FILE);
  } catch {
    // flag file may not exist when infra was unavailable
  }
}
