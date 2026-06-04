import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UUID_V7_EXAMPLE } from '../../../common/swagger/swagger.constants';
import { UpdateVehicleInput } from './update-vehicle.input';

async function validateInput(payload: object) {
  const input = plainToInstance(UpdateVehicleInput, payload);
  return validate(input, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('UpdateVehicleInput', () => {
  it('accepts empty payload', async () => {
    const errors = await validateInput({});
    expect(errors).toHaveLength(0);
  });

  it('accepts partial update', async () => {
    const errors = await validateInput({ year: 2025 });
    expect(errors).toHaveLength(0);
  });

  it('accepts valid license plate when provided', async () => {
    const errors = await validateInput({ licensePlate: 'ABC1D23' });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid license plate', async () => {
    const errors = await validateInput({ licensePlate: 'INVALID' });
    expect(errors.some((e) => e.property === 'licensePlate')).toBe(true);
  });

  it('rejects invalid modelId', async () => {
    const errors = await validateInput({ modelId: 'not-uuid' });
    expect(errors.some((e) => e.property === 'modelId')).toBe(true);
  });

  it('accepts valid modelId', async () => {
    const errors = await validateInput({ modelId: UUID_V7_EXAMPLE });
    expect(errors).toHaveLength(0);
  });
});
