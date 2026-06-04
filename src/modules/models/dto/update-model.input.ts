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
    nullable: true,
    description: 'Set null to detach brand',
  })
  @ValidateIf((input: UpdateModelInput) => input.brandId !== null)
  @IsOptional()
  @IsUUID()
  brandId?: string | null;
}
