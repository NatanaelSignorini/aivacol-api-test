import { readIntegrationE2eReady } from './integration-bootstrap';

export function describeIntegration(name: string, factory: () => void): void {
  const run = readIntegrationE2eReady();
  const runner = run ? describe : describe.skip;

  if (!run) {
    console.warn(
      `[integration e2e] Skipping "${name}": SQL Server/Redis not reachable. ` +
        'Start: docker compose up sqlserver redis -d',
    );
  }

  runner(name, factory);
}
