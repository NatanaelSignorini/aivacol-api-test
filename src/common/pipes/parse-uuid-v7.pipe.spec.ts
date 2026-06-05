import { BadRequestException } from '@nestjs/common';
import { toUuidV7 } from '../types/entity-id.type';
import { ParseUuidV7Pipe } from './parse-uuid-v7.pipe';

describe('ParseUuidV7Pipe', () => {
  const pipe = new ParseUuidV7Pipe();

  it('returns branded EntityId for valid UUID v7', () => {
    const id = toUuidV7('018f1234-5678-7890-abcd-ef1234567890');

    expect(pipe.transform(id)).toBe(id);
  });

  it('throws BadRequestException for invalid value', () => {
    expect(() => pipe.transform('not-a-uuid')).toThrow(BadRequestException);
  });
});
