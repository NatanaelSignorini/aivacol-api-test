import { ApiProperty } from '@nestjs/swagger';
import { UUID_V7_EXAMPLE } from '../../../common/swagger/swagger.constants';
import type { EntityId } from '../../../common/types/entity-id.type';
import { BaseResponseDto } from '../../bases/dto/base-response.dto';

export class ModelResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'Corolla' })
  name!: string;

  @ApiProperty({
    example: UUID_V7_EXAMPLE,
    format: 'uuid',
    nullable: true,
  })
  brandId!: EntityId | null;

  @ApiProperty({ example: 'Toyota', nullable: true })
  brandName!: string | null;
}
