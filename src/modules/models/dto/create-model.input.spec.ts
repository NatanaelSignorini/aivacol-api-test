import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UUID_V7_EXAMPLE } from '../../../common/swagger/swagger.constants';
import { CreateModelInput } from './create-model.input';

async function validateInput(payload: object) {
  const input = plainToInstance(CreateModelInput, payload);
  return validate(input, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('CreateModelInput', () => {
  it('accepts model without brand', async () => {
    const errors = await validateInput({ name: 'Corolla' });
    expect(errors).toHaveLength(0);
  });

  it('accepts model with brandId', async () => {
    const errors = await validateInput({
      name: 'Corolla',
      brandId: UUID_V7_EXAMPLE,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects missing name', async () => {
    const errors = await validateInput({ brandId: UUID_V7_EXAMPLE });
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('rejects invalid brandId', async () => {
    const errors = await validateInput({
      name: 'Corolla',
      brandId: 'not-a-uuid',
    });
    expect(errors.some((e) => e.property === 'brandId')).toBe(true);
  });
});
