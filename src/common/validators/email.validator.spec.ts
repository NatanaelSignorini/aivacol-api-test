import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EmailValidatorCustom, IsEmailField } from './email.validator';

class EmailFieldHolder {
  @IsEmailField()
  email!: string;
}

describe('IsEmailField', () => {
  it('accepts a valid email', async () => {
    const instance = plainToInstance(EmailFieldHolder, {
      email: 'admin@aivacol.com',
    });
    const errors = await validate(instance);

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid email format', async () => {
    const instance = plainToInstance(EmailFieldHolder, {
      email: 'not-an-email',
    });
    const errors = await validate(instance);

    expect(errors.some((e) => e.property === 'email')).toBe(true);
    expect(errors[0]?.constraints).toEqual(
      expect.objectContaining({
        EmailValidatorCustom: 'Invalid email format',
      }),
    );
  });

  it('rejects empty email', async () => {
    const instance = plainToInstance(EmailFieldHolder, { email: '' });
    const errors = await validate(instance);

    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });
});

describe('EmailValidatorCustom', () => {
  const validator = new EmailValidatorCustom();

  it('validates correct emails', () => {
    expect(validator.validate('admin@aivacol.com')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validator.validate('not-an-email')).toBe(false);
  });

  it('rejects empty value', () => {
    expect(validator.validate('')).toBe(false);
  });

  it('returns default message', () => {
    expect(validator.defaultMessage()).toBe('Invalid email format');
  });
});
