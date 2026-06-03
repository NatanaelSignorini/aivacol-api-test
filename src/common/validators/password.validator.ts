import { applyDecorators } from '@nestjs/common';
import {
  IsNotEmpty,
  IsString,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import PasswordValidator from 'password-validator';

@ValidatorConstraint({ name: 'StrongPasswordValidator', async: false })
export class StrongPasswordValidator implements ValidatorConstraintInterface {
  private readonly schema: PasswordValidator;

  constructor() {
    this.schema = new PasswordValidator();
    this.schema
      .is()
      .min(8)
      .is()
      .max(100)
      .has()
      .uppercase()
      .has()
      .lowercase()
      .has()
      .digits(1)
      .has()
      .symbols(1)
      .has()
      .not()
      .spaces();
  }

  validate(password: string): boolean {
    const result = this.schema.validate(password, { details: true });
    return Array.isArray(result) ? result.length === 0 : Boolean(result);
  }

  defaultMessage(): string {
    return 'Password must be 8-100 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*). Spaces are not allowed.';
  }
}

export function IsPasswordField() {
  return applyDecorators(
    IsString({ message: 'password must be a string' }),
    IsNotEmpty({ message: 'password must not be empty' }),
    Validate(StrongPasswordValidator),
  );
}
