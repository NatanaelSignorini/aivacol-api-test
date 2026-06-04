import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginInput } from './login.input';

const validPassword = 'Password1!';

async function validateLoginInput(payload: object) {
  const input = plainToInstance(LoginInput, payload);
  return validate(input, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('LoginInput', () => {
  it('accepts login with email and password', async () => {
    const errors = await validateLoginInput({
      email: 'admin@aivacol.com',
      password: validPassword,
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects when email is missing', async () => {
    const errors = await validateLoginInput({
      password: validPassword,
    });

    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('rejects unknown fields such as document', async () => {
    const errors = await validateLoginInput({
      email: 'admin@aivacol.com',
      document: '12345678901',
      password: validPassword,
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid email', async () => {
    const errors = await validateLoginInput({
      email: 'not-an-email',
      password: validPassword,
    });

    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('rejects weak password', async () => {
    const errors = await validateLoginInput({
      email: 'admin@aivacol.com',
      password: 'short',
    });

    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('rejects empty password', async () => {
    const errors = await validateLoginInput({
      email: 'admin@aivacol.com',
      password: '',
    });

    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });
});
