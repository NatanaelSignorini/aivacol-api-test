import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateBrandInput } from './update-brand.input';

async function validateInput(payload: object) {
  const input = plainToInstance(UpdateBrandInput, payload);
  return validate(input, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('UpdateBrandInput', () => {
  it('accepts valid partial update', async () => {
    const errors = await validateInput({ name: 'Toyota Motor' });
    expect(errors).toHaveLength(0);
  });

  it('accepts empty payload', async () => {
    const errors = await validateInput({});
    expect(errors).toHaveLength(0);
  });

  it('rejects empty name when provided', async () => {
    const errors = await validateInput({ name: '' });
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });
});
