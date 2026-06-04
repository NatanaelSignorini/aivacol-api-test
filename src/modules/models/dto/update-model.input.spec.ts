import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UUID_V7_EXAMPLE } from '../../../common/swagger/swagger.constants';
import { UpdateModelInput } from './update-model.input';

async function validateInput(payload: object) {
  const input = plainToInstance(UpdateModelInput, payload);
  return validate(input, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('UpdateModelInput', () => {
  it('accepts partial update', async () => {
    const errors = await validateInput({ name: 'Corolla XEi' });
    expect(errors).toHaveLength(0);
  });

  it('accepts brandId null to detach brand', async () => {
    const errors = await validateInput({ brandId: null });
    expect(errors).toHaveLength(0);
  });

  it('accepts valid brandId', async () => {
    const errors = await validateInput({ brandId: UUID_V7_EXAMPLE });
    expect(errors).toHaveLength(0);
  });

  it('rejects empty name when provided', async () => {
    const errors = await validateInput({ name: '' });
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });
});
