import { applyDecorators } from '@nestjs/common';
import {
  IsNotEmpty,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { validate as validateEmail } from 'email-validator';

@ValidatorConstraint({ name: 'EmailValidatorCustom', async: false })
export class EmailValidatorCustom implements ValidatorConstraintInterface {
  validate(email: string): boolean {
    if (!email) {
      return false;
    }
    return validateEmail(email);
  }

  defaultMessage(): string {
    return 'Invalid email format';
  }
}

export function IsEmailField() {
  return applyDecorators(
    IsNotEmpty({ message: 'email must not be empty' }),
    Validate(EmailValidatorCustom),
  );
}
