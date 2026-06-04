import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { UUID_V7_EXAMPLE } from '../../../common/swagger/swagger.constants';
import { VehiclesIncludeQueryDto } from './vehicles-include-query.dto';

class VehiclesListFiltersDto {
  @ApiPropertyOptional({ example: 'ABC1D23' })
  @IsOptional()
  @IsString()
  licensePlate?: string;

  @ApiPropertyOptional({ format: 'uuid', example: UUID_V7_EXAMPLE })
  @IsOptional()
  @IsUUID('all')
  modelId?: string;

  @ApiPropertyOptional({ format: 'uuid', example: UUID_V7_EXAMPLE })
  @IsOptional()
  @IsUUID('all')
  brandId?: string;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;
}

export class VehiclesListQueryDto extends IntersectionType(
  PaginationQueryDto,
  VehiclesIncludeQueryDto,
  VehiclesListFiltersDto,
) {}
