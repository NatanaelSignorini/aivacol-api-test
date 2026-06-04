import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BrandResponseDto } from '../../brands/dto/brand-response.dto';
import { BaseResponseDto } from '../../bases/dto/base-response.dto';

export class ModelResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'Corolla' })
  name!: string;

  @ApiPropertyOptional({ type: BrandResponseDto })
  brand?: BrandResponseDto | null;
}
