import { execSync } from 'node:child_process';
import { loadIntegrationTestEnv } from '../test-env';

let preparePromise: Promise<void> | null = null;

export async function prepareIntegrationDatabase(): Promise<void> {
  if (!preparePromise) {
    preparePromise = (async () => {
      loadIntegrationTestEnv();

      execSync('yarn db:create', {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: process.env,
      });
      execSync('yarn migration:run', {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: process.env,
      });
      execSync('yarn seed', {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: process.env,
      });
    })();
  }

  return preparePromise;
}

export async function resetIntegrationDatabaseSetup(): Promise<void> {
  preparePromise = null;
}
