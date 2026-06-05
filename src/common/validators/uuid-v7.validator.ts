import { applyDecorators } from '@nestjs/common';
import type { ValidatorConstraintInterface } from 'class-validator';
import {
  IsNotEmpty,
  IsOptional,
  Validate,
  ValidateIf,
  ValidatorConstraint,
} from 'class-validator';
import { isUuidV7 } from '../types/entity-id.type';

@ValidatorConstraint({ name: 'UuidV7Validator', async: false })
export class UuidV7Validator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isUuidV7(value);
  }

  defaultMessage(): string {
    return 'must be a valid UUID v7';
  }
}

/** Valida formato UUID v7 em campos de entrada (DTO/query). */
export function IsUuidV7Field(options?: { optional?: boolean }) {
  if (options?.optional) {
    return applyDecorators(
      IsOptional(),
      ValidateIf(
        (_, value) => value !== undefined && value !== null && value !== '',
      ),
      Validate(UuidV7Validator),
    );
  }

  return applyDecorators(IsNotEmpty(), Validate(UuidV7Validator));
}
