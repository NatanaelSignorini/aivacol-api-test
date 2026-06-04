import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { UUID_V7_EXAMPLE } from '../../../common/swagger/swagger.constants';

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
  @IsNotEmpty()
  @IsUUID()
  brandId?: string;
}
