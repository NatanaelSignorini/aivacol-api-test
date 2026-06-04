import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

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
    description: 'Include nested model with all fields (same as GET /models/:id, without brand)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  includeModel?: boolean;

  @ApiPropertyOptional({
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

export const resolveVehicleIncludeOptions = (
  query: VehiclesIncludeQueryDto,
): VehicleIncludeOptions => {
  const includeBrand = query.includeBrand === true;

  return {
    includeModel: query.includeModel === true || includeBrand,
    includeBrand,
  };
};
