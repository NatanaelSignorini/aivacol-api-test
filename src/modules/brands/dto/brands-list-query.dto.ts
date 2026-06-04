import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class BrandsListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'Honda' })
  @IsOptional()
  @IsString()
  name?: string;
}
