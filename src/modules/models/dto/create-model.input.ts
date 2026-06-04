import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { UUID_V7_EXAMPLE } from '../../../common/swagger/swagger.constants';

export class CreateModelInput {
  @ApiProperty({ example: 'Corolla' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    example: UUID_V7_EXAMPLE,
    format: 'uuid',
    description: 'Optional brand association',
  })
  @IsOptional()
  @IsUUID()
  brandId?: string;
}
