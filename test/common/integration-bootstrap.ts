import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDockerInfraAvailable } from './docker-infra';
import { prepareIntegrationDatabase } from './integration-database';
import { loadTestEnv } from './load-test-env';

export const E2E_INTEGRATION_FLAG_FILE = resolve(
  process.cwd(),
  'test/common/.integration-ready',
);

export async function probeAndPrepareIntegrationE2e(): Promise<boolean> {
  loadTestEnv();

  const available = await isDockerInfraAvailable();
  writeFileSync(E2E_INTEGRATION_FLAG_FILE, available ? '1' : '0', 'utf8');

  if (!available) {
    return false;
  }

  await prepareIntegrationDatabase();
  return true;
}

export function readIntegrationE2eReady(): boolean {
  try {
    return readFileSync(E2E_INTEGRATION_FLAG_FILE, 'utf8').trim() === '1';
  } catch {
    return false;
  }
}

export async function teardownIntegrationE2e(): Promise<void> {
  // Nest closes DB connections in each spec; migrations/seeds stay applied.
}
