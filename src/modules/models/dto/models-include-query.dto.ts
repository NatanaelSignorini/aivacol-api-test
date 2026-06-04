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

export class ModelsIncludeQueryDto {
  @ApiPropertyOptional({
    description:
      'Include nested brand with all fields (same as GET /brands/:id)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  includeBrand?: boolean;
}

export type ModelIncludeOptions = {
  includeBrand: boolean;
};

/** Normaliza flags de include da query em opções booleanas para o service. */
export const resolveModelIncludeOptions = (
  query: ModelsIncludeQueryDto,
): ModelIncludeOptions => ({
  includeBrand: query.includeBrand === true,
});
