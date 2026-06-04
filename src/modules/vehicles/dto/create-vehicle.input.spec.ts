import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UUID_V7_EXAMPLE } from '../../../common/swagger/swagger.constants';
import { CreateVehicleInput } from './create-vehicle.input';

const validPayload = {
  licensePlate: 'ABC1D23',
  chassis: '9BWZZZ377VT004251',
  renavam: '12345678901',
  year: 2024,
  modelId: UUID_V7_EXAMPLE,
};

async function validateInput(payload: object) {
  const input = plainToInstance(CreateVehicleInput, payload);
  return validate(input, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('CreateVehicleInput', () => {
  it('accepts valid vehicle payload', async () => {
    const errors = await validateInput(validPayload);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid license plate', async () => {
    const errors = await validateInput({
      ...validPayload,
      licensePlate: 'INVALID',
    });
    expect(errors.some((e) => e.property === 'licensePlate')).toBe(true);
  });

  it('rejects invalid modelId', async () => {
    const errors = await validateInput({
      ...validPayload,
      modelId: 'bad-id',
    });
    expect(errors.some((e) => e.property === 'modelId')).toBe(true);
  });

  it('rejects year below minimum', async () => {
    const errors = await validateInput({ ...validPayload, year: 1800 });
    expect(errors.some((e) => e.property === 'year')).toBe(true);
  });
});
