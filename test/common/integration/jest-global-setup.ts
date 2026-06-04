import { prepareIntegrationSuite } from './suite-setup';

export default async function globalSetup(): Promise<void> {
  await prepareIntegrationSuite();
}
