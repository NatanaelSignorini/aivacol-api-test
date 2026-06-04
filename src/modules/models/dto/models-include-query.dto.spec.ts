import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ModelsIncludeQueryDto,
  resolveModelIncludeOptions,
} from './models-include-query.dto';

async function validateQuery(payload: object) {
  const query = plainToInstance(ModelsIncludeQueryDto, payload);
  return validate(query);
}

describe('ModelsIncludeQueryDto', () => {
  it('accepts boolean and string true/false for includeBrand', async () => {
    await expect(validateQuery({ includeBrand: true })).resolves.toHaveLength(0);
    await expect(validateQuery({ includeBrand: 'true' })).resolves.toHaveLength(0);
    await expect(validateQuery({ includeBrand: 'false' })).resolves.toHaveLength(0);
  });

  it('treats empty or invalid values as undefined', async () => {
    const empty = plainToInstance(ModelsIncludeQueryDto, { includeBrand: '' });
    const invalid = plainToInstance(ModelsIncludeQueryDto, {
      includeBrand: 'maybe',
    });

    expect(empty.includeBrand).toBeUndefined();
    expect(invalid.includeBrand).toBeUndefined();
    expect(await validateQuery({ includeBrand: '' })).toHaveLength(0);
    expect(await validateQuery({ includeBrand: 'maybe' })).toHaveLength(0);
  });
});

describe('resolveModelIncludeOptions', () => {
  it('defaults includeBrand to false unless explicitly true', () => {
    expect(resolveModelIncludeOptions({})).toEqual({ includeBrand: false });
    expect(resolveModelIncludeOptions({ includeBrand: false })).toEqual({
      includeBrand: false,
    });
    expect(resolveModelIncludeOptions({ includeBrand: true })).toEqual({
      includeBrand: true,
    });
  });
});
