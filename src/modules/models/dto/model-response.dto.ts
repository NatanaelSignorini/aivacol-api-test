import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseResponseDto } from '../../bases/dto/base-response.dto';
import { BrandResponseDto } from '../../brands/dto/brand-response.dto';

export class ModelResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'Corolla' })
  name!: string;

  @ApiPropertyOptional({ type: BrandResponseDto })
  brand?: BrandResponseDto | null;
}
