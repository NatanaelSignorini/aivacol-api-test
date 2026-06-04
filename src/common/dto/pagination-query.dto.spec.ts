import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  PaginationQueryDto,
} from './pagination-query.dto';

async function validateQuery(payload: object) {
  const query = plainToInstance(PaginationQueryDto, payload);
  return validate(query);
}

describe('PaginationQueryDto', () => {
  it('uses default page size and skip', () => {
    const query = plainToInstance(PaginationQueryDto, {});

    expect(query.first).toBe(DEFAULT_PAGE_SIZE);
    expect(query.skip).toBe(0);
  });

  it('coerces string query params to numbers', async () => {
    const query = plainToInstance(PaginationQueryDto, {
      first: '10',
      skip: '5',
    });

    expect(query.first).toBe(10);
    expect(query.skip).toBe(5);
    expect(await validateQuery({ first: '10', skip: '5' })).toHaveLength(0);
  });

  it('rejects first below 1 or above max', async () => {
    const tooSmall = await validateQuery({ first: 0 });
    const tooLarge = await validateQuery({ first: MAX_PAGE_SIZE + 1 });

    expect(tooSmall.some((e) => e.property === 'first')).toBe(true);
    expect(tooLarge.some((e) => e.property === 'first')).toBe(true);
  });

  it('rejects negative skip', async () => {
    const errors = await validateQuery({ skip: -1 });

    expect(errors.some((e) => e.property === 'skip')).toBe(true);
  });
});
