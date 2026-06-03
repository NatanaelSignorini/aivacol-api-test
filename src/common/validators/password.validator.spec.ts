import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IsPasswordField, StrongPasswordValidator } from './password.validator';

export const VALID_TEST_PASSWORD = 'Password1!';

class PasswordFieldHolder {
  @IsPasswordField()
  password!: string;
}

describe('IsPasswordField', () => {
  it('accepts a strong password', async () => {
    const instance = plainToInstance(PasswordFieldHolder, {
      password: VALID_TEST_PASSWORD,
    });
    const errors = await validate(instance);

    expect(errors).toHaveLength(0);
  });

  it('rejects password without uppercase, symbol, or enough length', async () => {
    const instance = plainToInstance(PasswordFieldHolder, {
      password: 'password1',
    });
    const errors = await validate(instance);

    expect(errors.some((e) => e.property === 'password')).toBe(true);
    expect(errors[0]?.constraints).toEqual(
      expect.objectContaining({
        StrongPasswordValidator: expect.stringContaining(
          'Password must be 8-100 characters',
        ),
      }),
    );
  });

  it('rejects empty password', async () => {
    const instance = plainToInstance(PasswordFieldHolder, { password: '' });
    const errors = await validate(instance);

    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('rejects passwords with spaces', async () => {
    const instance = plainToInstance(PasswordFieldHolder, {
      password: 'Password 1!',
    });
    const errors = await validate(instance);

    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });
});

describe('StrongPasswordValidator', () => {
  const validator = new StrongPasswordValidator();

  it('validates strong passwords', () => {
    expect(validator.validate(VALID_TEST_PASSWORD)).toBe(true);
  });

  it('rejects weak passwords', () => {
    expect(validator.validate('password1')).toBe(false);
  });

  it('returns default message', () => {
    expect(validator.defaultMessage()).toContain('uppercase letter');
  });
});
