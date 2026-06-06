import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

/** Converte query string em booleano opcional (`true`/`false`); ignora valores inválidos. */
const toOptionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return undefined;
};

export class VehiclesIncludeQueryDto {
  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Include nested model with all fields (same as GET /models/:id, without brand)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  includeModel?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Include nested brand with all fields inside model (implies includeModel)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  includeBrand?: boolean;
}

export type VehicleIncludeOptions = {
  includeModel: boolean;
  includeBrand: boolean;
};

/**
 * Normaliza includes da query: `includeBrand=true` implica `includeModel=true`.
 * Usado pelo VehiclesService para montar relações e decidir uso de cache.
 */
export const resolveVehicleIncludeOptions = (
  query: VehiclesIncludeQueryDto,
): VehicleIncludeOptions => {
  const includeBrand = query.includeBrand === true;

  return {
    includeModel: query.includeModel === true || includeBrand,
    includeBrand,
  };
};
