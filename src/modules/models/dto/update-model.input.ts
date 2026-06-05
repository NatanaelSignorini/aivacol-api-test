import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { UUID_V7_EXAMPLE } from '../../../common/swagger/swagger.constants';
import type { EntityId } from '../../../common/types/entity-id.type';
import { IsUuidV7Field } from '../../../common/validators/uuid-v7.validator';

export class UpdateModelInput {
  @ApiPropertyOptional({ example: 'Corolla XEi' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    example: UUID_V7_EXAMPLE,
    format: 'uuid',
    description: 'Reassign model to another brand',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsUuidV7Field()
  brandId?: EntityId;
}
