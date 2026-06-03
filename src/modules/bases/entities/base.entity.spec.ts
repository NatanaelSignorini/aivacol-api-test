import { validate as validateUuid } from 'uuid';
import { isUuidV7 } from '../../../common/types/entity-id.type';
import { BaseEntity } from './base.entity';

class TestEntity extends BaseEntity {}

describe('BaseEntity', () => {
  describe('assignId', () => {
    it('generates a UUID v7 when id is not set', () => {
      const entity = new TestEntity();

      entity.assignId();

      expect(entity.id).toBeDefined();
      expect(validateUuid(entity.id)).toBe(true);
      expect(isUuidV7(entity.id)).toBe(true);
    });

    it('preserves a pre-assigned id', () => {
      const entity = new TestEntity();
      const existingId = '018f1234-5678-7890-abcd-ef1234567890';
      entity.id = existingId;

      entity.assignId();

      expect(entity.id).toBe(existingId);
    });

    it('generates unique ids across entities', () => {
      const first = new TestEntity();
      const second = new TestEntity();

      first.assignId();
      second.assignId();

      expect(first.id).not.toBe(second.id);
    });
  });
});
