import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseResponseDto } from '../../bases/dto/base-response.dto';
import { ModelResponseDto } from '../../models/dto/model-response.dto';

export class VehicleResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'ABC1D23' })
  licensePlate!: string;

  @ApiProperty({ example: '9BWZZZ377VT004251' })
  chassis!: string;

  @ApiProperty({ example: '12345678901' })
  renavam!: string;

  @ApiProperty({ example: 2024 })
  year!: number;

  @ApiPropertyOptional({ type: ModelResponseDto })
  model?: ModelResponseDto;
}
