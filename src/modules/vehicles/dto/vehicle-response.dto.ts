import { ApiProperty } from '@nestjs/swagger';
import { UUID_V7_EXAMPLE } from '../../../common/swagger/swagger.constants';
import type { EntityId } from '../../../common/types/entity-id.type';
import { BaseResponseDto } from '../../bases/dto/base-response.dto';

export class VehicleResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'ABC1D23' })
  licensePlate!: string;

  @ApiProperty({ example: '9BWZZZ377VT004251' })
  chassis!: string;

  @ApiProperty({ example: '12345678901' })
  renavam!: string;

  @ApiProperty({ example: 2024 })
  year!: number;

  @ApiProperty({ example: UUID_V7_EXAMPLE, format: 'uuid' })
  modelId!: EntityId;

  @ApiProperty({ example: 'Corolla' })
  modelName!: string;
}
