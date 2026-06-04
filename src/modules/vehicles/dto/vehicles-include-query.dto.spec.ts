import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  resolveVehicleIncludeOptions,
  VehiclesIncludeQueryDto,
} from './vehicles-include-query.dto';

async function validateQuery(payload: object) {
  const query = plainToInstance(VehiclesIncludeQueryDto, payload);
  return validate(query);
}

describe('VehiclesIncludeQueryDto', () => {
  it('accepts boolean and string flags for includeModel and includeBrand', async () => {
    await expect(
      validateQuery({ includeModel: 'true', includeBrand: 'false' }),
    ).resolves.toHaveLength(0);
  });

  it('treats empty values as undefined', () => {
    const query = plainToInstance(VehiclesIncludeQueryDto, {
      includeModel: '',
      includeBrand: null,
    });

    expect(query.includeModel).toBeUndefined();
    expect(query.includeBrand).toBeUndefined();
  });
});

describe('resolveVehicleIncludeOptions', () => {
  it('defaults both flags to false', () => {
    expect(resolveVehicleIncludeOptions({})).toEqual({
      includeModel: false,
      includeBrand: false,
    });
  });

  it('enables includeModel when includeBrand is true', () => {
    expect(resolveVehicleIncludeOptions({ includeBrand: true })).toEqual({
      includeModel: true,
      includeBrand: true,
    });
  });

  it('keeps includeBrand false when only includeModel is true', () => {
    expect(resolveVehicleIncludeOptions({ includeModel: true })).toEqual({
      includeModel: true,
      includeBrand: false,
    });
  });
});
