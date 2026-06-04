import { isIntegrationSuiteReady } from './suite-setup';

export function describeIntegration(name: string, factory: () => void): void {
  const run = isIntegrationSuiteReady();
  const runner = run ? describe : describe.skip;

  if (!run) {
    console.warn(
      `[integration] Skipping "${name}": SQL Server/Redis not reachable. ` +
        'Start: docker compose up sqlserver redis -d',
    );
  }

  runner(name, factory);
}
