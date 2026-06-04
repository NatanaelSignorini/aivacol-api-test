import { unlinkSync } from 'node:fs';
import {
  INTEGRATION_READY_FLAG_FILE,
  teardownIntegrationSuite,
} from './suite-setup';

export default async function globalTeardown(): Promise<void> {
  await teardownIntegrationSuite();

  try {
    unlinkSync(INTEGRATION_READY_FLAG_FILE);
  } catch {
    // flag file may not exist when infra was unavailable
  }
}
