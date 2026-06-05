import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { UUID_V7_EXAMPLE } from '../../../common/swagger/swagger.constants';
import type { EntityId } from '../../../common/types/entity-id.type';
import { IsUuidV7Field } from '../../../common/validators/uuid-v7.validator';
import { VehiclesIncludeQueryDto } from './vehicles-include-query.dto';

class VehiclesListFiltersDto {
  @ApiPropertyOptional({ example: 'ABC1D23' })
  @IsOptional()
  @IsString()
  licensePlate?: string;

  @ApiPropertyOptional({ format: 'uuid', example: UUID_V7_EXAMPLE })
  @IsUuidV7Field({ optional: true })
  modelId?: EntityId;

  @ApiPropertyOptional({ format: 'uuid', example: UUID_V7_EXAMPLE })
  @IsUuidV7Field({ optional: true })
  brandId?: EntityId;

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
