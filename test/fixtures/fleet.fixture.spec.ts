import { LicensePlateValidator } from '../../src/common/validators/vehicle-identifiers.validator';
import {
  AIVACOL_LOGIN,
  uniqueBrandName,
  uniqueModelName,
  uniqueRunId,
  uniqueVehicleIdentifiers,
} from './fleet.fixture';

describe('fleet.fixture', () => {
  const plateValidator = new LicensePlateValidator();

  it('generates unique run and entity names', () => {
    const runId = uniqueRunId();

    expect(runId).toMatch(/^\d{13,}$/);
    expect(uniqueBrandName(runId)).toBe(`E2E Brand ${runId}`);
    expect(uniqueModelName(runId)).toBe(`E2E Model ${runId}`);
  });

  it('generates valid Brazilian vehicle identifiers', () => {
    const ids = uniqueVehicleIdentifiers('1749061200123');

    expect(plateValidator.validate(ids.licensePlate)).toBe(true);
    expect(ids.chassis).toHaveLength(17);
    expect(ids.renavam).toMatch(/^[0-9]{11}$/);
  });

  it('exposes default login credentials for e2e flows', () => {
    expect(AIVACOL_LOGIN.email).toBe('admin@aivacol.com');
    expect(AIVACOL_LOGIN.password).toBe('Aivacol123!');
  });
});
