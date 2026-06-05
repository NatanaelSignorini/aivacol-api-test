import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { UUID_V7_EXAMPLE } from '../../../common/swagger/swagger.constants';
import type { EntityId } from '../../../common/types/entity-id.type';
import { IsUuidV7Field } from '../../../common/validators/uuid-v7.validator';
import { ModelsIncludeQueryDto } from './models-include-query.dto';

class ModelsListFiltersDto {
  @ApiPropertyOptional({ example: 'Civic' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ format: 'uuid', example: UUID_V7_EXAMPLE })
  @IsUuidV7Field({ optional: true })
  brandId?: EntityId;
}

export class ModelsListQueryDto extends IntersectionType(
  PaginationQueryDto,
  ModelsIncludeQueryDto,
  ModelsListFiltersDto,
) {}
