import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from '../../bases/dto/base-response.dto';

export class BrandResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'Toyota' })
  name!: string;
}
