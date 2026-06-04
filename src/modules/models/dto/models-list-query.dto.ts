import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { UUID_V7_EXAMPLE } from '../../../common/swagger/swagger.constants';
import { ModelsIncludeQueryDto } from './models-include-query.dto';

class ModelsListFiltersDto {
  @ApiPropertyOptional({ example: 'Civic' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ format: 'uuid', example: UUID_V7_EXAMPLE })
  @IsOptional()
  @IsUUID('all')
  brandId?: string;
}

export class ModelsListQueryDto extends IntersectionType(
  PaginationQueryDto,
  ModelsIncludeQueryDto,
  ModelsListFiltersDto,
) {}
