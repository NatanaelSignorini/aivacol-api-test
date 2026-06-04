import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadIntegrationTestEnv } from '../test-env';
import { prepareIntegrationDatabase } from './db-setup';
import { isIntegrationInfraReachable } from './infra-probe';

export const INTEGRATION_READY_FLAG_FILE = resolve(
  process.cwd(),
  'test/common/integration/.integration-ready',
);

export async function prepareIntegrationSuite(): Promise<boolean> {
  loadIntegrationTestEnv();

  const available = await isIntegrationInfraReachable();
  writeFileSync(INTEGRATION_READY_FLAG_FILE, available ? '1' : '0', 'utf8');

  if (!available) {
    return false;
  }

  await prepareIntegrationDatabase();
  return true;
}

export function isIntegrationSuiteReady(): boolean {
  try {
    return readFileSync(INTEGRATION_READY_FLAG_FILE, 'utf8').trim() === '1';
  } catch {
    return false;
  }
}

export async function teardownIntegrationSuite(): Promise<void> {
  // Nest closes DB connections in each spec; migrations/seeds stay applied.
}
