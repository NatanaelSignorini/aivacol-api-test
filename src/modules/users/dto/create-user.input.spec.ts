import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { CreateUserInput } from './create-user.input';

const validPassword = 'Password1!';

const validPayload = {
  nickname: 'jdoe',
  name: 'John Doe',
  email: 'john.doe@aivacol.com',
  password: validPassword,
  role: UserRole.Operator,
};

async function validateInput(payload: object) {
  const input = plainToInstance(CreateUserInput, payload);
  return validate(input, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('CreateUserInput', () => {
  it('accepts valid user payload', async () => {
    const errors = await validateInput(validPayload);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid email', async () => {
    const errors = await validateInput({
      ...validPayload,
      email: 'not-an-email',
    });
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('rejects weak password', async () => {
    const errors = await validateInput({
      ...validPayload,
      password: 'weak',
    });
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('rejects invalid role', async () => {
    const errors = await validateInput({
      ...validPayload,
      role: 'superadmin',
    });
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it('rejects missing nickname', async () => {
    const { nickname: _nickname, ...payload } = validPayload;
    const errors = await validateInput(payload);
    expect(errors.some((e) => e.property === 'nickname')).toBe(true);
  });
});
