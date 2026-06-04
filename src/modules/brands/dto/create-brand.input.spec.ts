import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBrandInput } from './create-brand.input';

async function validateInput(payload: object) {
  const input = plainToInstance(CreateBrandInput, payload);
  return validate(input, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('CreateBrandInput', () => {
  it('accepts valid brand name', async () => {
    const errors = await validateInput({ name: 'Toyota' });
    expect(errors).toHaveLength(0);
  });

  it('rejects empty name', async () => {
    const errors = await validateInput({ name: '' });
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('rejects unknown fields', async () => {
    const errors = await validateInput({ name: 'Toyota', id: 1 });
    expect(errors.length).toBeGreaterThan(0);
  });
});
