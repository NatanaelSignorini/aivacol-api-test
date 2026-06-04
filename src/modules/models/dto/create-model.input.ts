import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { UUID_V7_EXAMPLE } from '../../../common/swagger/swagger.constants';

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
  @IsUUID()
  @IsNotEmpty()
  brandId!: string;
}
