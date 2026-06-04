import { applyDecorators } from '@nestjs/common';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

const LEGACY_PLATE_PATTERN = /^[A-Z]{3}[0-9]{4}$/;
const MERCOSUL_PLATE_PATTERN = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
const CHASSIS_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/i;
const RENAVAM_PATTERN = /^[0-9]{11}$/;

export function normalizeLicensePlate(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export function normalizeChassis(value: string): string {
  return value.replace(/\s/g, '').toUpperCase();
}

export function normalizeRenavam(value: string): string {
  return value.replace(/\D/g, '');
}

@ValidatorConstraint({ name: 'LicensePlateValidator', async: false })
export class LicensePlateValidator implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (!value) {
      return false;
    }

    const normalized = normalizeLicensePlate(value);
    return (
      LEGACY_PLATE_PATTERN.test(normalized) ||
      MERCOSUL_PLATE_PATTERN.test(normalized)
    );
  }

  defaultMessage(): string {
    return 'licensePlate must be a valid Brazilian plate (legacy or Mercosul)';
  }
}

@ValidatorConstraint({ name: 'ChassisValidator', async: false })
export class ChassisValidator implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (!value) {
      return false;
    }

    return CHASSIS_PATTERN.test(normalizeChassis(value));
  }

  defaultMessage(): string {
    return 'chassis must be 17 alphanumeric characters (VIN format)';
  }
}

@ValidatorConstraint({ name: 'RenavamValidator', async: false })
export class RenavamValidator implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (!value) {
      return false;
    }

    return RENAVAM_PATTERN.test(normalizeRenavam(value));
  }

  defaultMessage(): string {
    return 'renavam must be exactly 11 digits';
  }
}

export function IsLicensePlate() {
  return applyDecorators(
    IsString(),
    IsNotEmpty(),
    MaxLength(10),
    Validate(LicensePlateValidator),
  );
}

export function IsChassis() {
  return applyDecorators(
    IsString(),
    IsNotEmpty(),
    MaxLength(17),
    Validate(ChassisValidator),
  );
}

export function IsRenavam() {
  return applyDecorators(
    IsString(),
    IsNotEmpty(),
    MaxLength(11),
    Matches(/^[0-9]+$/, { message: 'renavam must contain only digits' }),
    Validate(RenavamValidator),
  );
}
