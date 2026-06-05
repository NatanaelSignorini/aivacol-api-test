import {
  createUuidV7,
  isUuidV7,
  toUuidV7,
  type UUIDv7,
} from './entity-id.type';

describe('UUIDv7 branded type', () => {
  const validUuidV7 = toUuidV7('018f1234-5678-7890-abcd-ef1234567890');

  it('isUuidV7 accepts valid v7 and narrows type', () => {
    expect(isUuidV7(validUuidV7)).toBe(true);

    if (isUuidV7(validUuidV7)) {
      const id: UUIDv7 = validUuidV7;
      expect(id).toBe(validUuidV7);
    }
  });

  it('isUuidV7 rejects invalid values', () => {
    expect(isUuidV7('not-a-uuid')).toBe(false);
    expect(isUuidV7('018f1234-5678-4890-abcd-ef1234567890')).toBe(false);
  });

  it('toUuidV7 returns branded value for valid input', () => {
    expect(toUuidV7(validUuidV7)).toBe(validUuidV7);
  });

  it('toUuidV7 throws for invalid input', () => {
    expect(() => toUuidV7('bad-id')).toThrow(/Invalid UUID v7/);
  });

  it('createUuidV7 generates valid branded ids', () => {
    const id = createUuidV7();

    expect(isUuidV7(id)).toBe(true);
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
