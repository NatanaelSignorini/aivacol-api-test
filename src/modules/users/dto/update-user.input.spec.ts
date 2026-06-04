import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { UpdateUserInput } from './update-user.input';

const validPassword = 'Password1!';

async function validateInput(payload: object) {
  const input = plainToInstance(UpdateUserInput, payload);
  return validate(input, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('UpdateUserInput', () => {
  it('accepts empty payload', async () => {
    const errors = await validateInput({});
    expect(errors).toHaveLength(0);
  });

  it('accepts partial update', async () => {
    const errors = await validateInput({ name: 'Jane Doe' });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid email when provided', async () => {
    const errors = await validateInput({ email: 'bad-email' });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('rejects weak password when provided', async () => {
    const errors = await validateInput({ password: '123' });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('accepts valid password when provided', async () => {
    const errors = await validateInput({ password: validPassword });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid role', async () => {
    const errors = await validateInput({ role: 'invalid' as UserRole });
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });
});
