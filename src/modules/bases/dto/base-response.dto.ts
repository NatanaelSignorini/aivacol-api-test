import { ApiProperty } from '@nestjs/swagger';
import {
  SWAGGER_DATE_EXAMPLE,
  UUID_V7_EXAMPLE,
} from '../../../common/swagger/swagger.constants';
import type { EntityId } from '../../../common/types/entity-id.type';

export class BaseResponseDto {
  @ApiProperty({ example: UUID_V7_EXAMPLE, format: 'uuid' })
  id!: EntityId;

  @ApiProperty({ example: SWAGGER_DATE_EXAMPLE })
  createdAt!: Date;

  @ApiProperty({ example: SWAGGER_DATE_EXAMPLE })
  updatedAt!: Date;

  @ApiProperty({ example: UUID_V7_EXAMPLE, format: 'uuid' })
  createdBy!: EntityId;
}
