import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { UUID_V7_EXAMPLE } from '../../../common/swagger/swagger.constants';
import {
  IsChassis,
  IsLicensePlate,
  IsRenavam,
} from '../../../common/validators/vehicle-identifiers.validator';

const MIN_VEHICLE_YEAR = 1900;
const MAX_VEHICLE_YEAR = new Date().getFullYear() + 1;

export class UpdateVehicleInput {
  @ApiPropertyOptional({ example: 'ABC1D23' })
  @IsOptional()
  @IsLicensePlate()
  licensePlate?: string;

  @ApiPropertyOptional({ example: '9BWZZZ377VT004251' })
  @IsOptional()
  @IsChassis()
  chassis?: string;

  @ApiPropertyOptional({ example: '12345678901' })
  @IsOptional()
  @IsRenavam()
  renavam?: string;

  @ApiPropertyOptional({
    example: 2024,
    minimum: MIN_VEHICLE_YEAR,
    maximum: MAX_VEHICLE_YEAR,
  })
  @IsOptional()
  @IsInt()
  @Min(MIN_VEHICLE_YEAR)
  @Max(MAX_VEHICLE_YEAR)
  year?: number;

  @ApiPropertyOptional({ example: UUID_V7_EXAMPLE, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  modelId?: string;
}
