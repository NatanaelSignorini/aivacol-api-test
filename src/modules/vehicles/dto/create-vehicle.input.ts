import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { UUID_V7_EXAMPLE } from '../../../common/swagger/swagger.constants';
import type { EntityId } from '../../../common/types/entity-id.type';
import { IsUuidV7Field } from '../../../common/validators/uuid-v7.validator';
import {
  IsChassis,
  IsLicensePlate,
  IsRenavam,
} from '../../../common/validators/vehicle-identifiers.validator';

const MIN_VEHICLE_YEAR = 1900;
const MAX_VEHICLE_YEAR = new Date().getFullYear() + 1;

export class CreateVehicleInput {
  @ApiProperty({ example: 'ABC1D23' })
  @IsLicensePlate()
  licensePlate!: string;

  @ApiProperty({ example: '9BWZZZ377VT004251' })
  @IsChassis()
  chassis!: string;

  @ApiProperty({ example: '12345678901' })
  @IsRenavam()
  renavam!: string;

  @ApiProperty({
    example: 2024,
    minimum: MIN_VEHICLE_YEAR,
    maximum: MAX_VEHICLE_YEAR,
  })
  @IsInt()
  @Min(MIN_VEHICLE_YEAR)
  @Max(MAX_VEHICLE_YEAR)
  year!: number;

  @ApiProperty({ example: UUID_V7_EXAMPLE, format: 'uuid' })
  @IsUuidV7Field()
  modelId!: EntityId;
}
