import { probeAndPrepareIntegrationE2e } from './integration-bootstrap';

export default async function globalSetup(): Promise<void> {
  await probeAndPrepareIntegrationE2e();
}
