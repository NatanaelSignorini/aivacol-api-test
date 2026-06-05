import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { UUID_V7_EXAMPLE } from '../../../common/swagger/swagger.constants';
import type { EntityId } from '../../../common/types/entity-id.type';
import { IsUuidV7Field } from '../../../common/validators/uuid-v7.validator';

export class CreateModelInput {
  @ApiProperty({ example: 'Corolla' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    example: UUID_V7_EXAMPLE,
    format: 'uuid',
    description: 'Brand that owns this model',
  })
  @IsUuidV7Field()
  brandId!: EntityId;
}
