import { validate as validateUuid } from 'uuid';
import { isUuidV7 } from '../../../common/types/entity-id.type';
import { UserRole } from '../enums/user-role.enum';
import { User } from './user.entity';

describe('User', () => {
  describe('assignId', () => {
    it('generates a UUID v7 when id is not set', () => {
      const user = new User();

      user.assignId();

      expect(user.id).toBeDefined();
      expect(validateUuid(user.id)).toBe(true);
      expect(isUuidV7(user.id)).toBe(true);
    });

    it('preserves a pre-assigned id', () => {
      const user = new User();
      const existingId = '018f1234-5678-7890-abcd-ef1234567890';
      user.id = existingId;

      user.assignId();

      expect(user.id).toBe(existingId);
    });
  });

  describe('columns', () => {
    it('maps role and credential fields', () => {
      const user = new User();
      user.nickname = 'aivacol';
      user.name = 'Aivacol Admin';
      user.email = 'admin@aivacol.com';
      user.passwordHash = '$2a$10$hashedpassword';
      user.role = UserRole.Admin;

      expect(user.nickname).toBe('aivacol');
      expect(user.email).toBe('admin@aivacol.com');
      expect(user.role).toBe(UserRole.Admin);
      expect(user.passwordHash).toBe('$2a$10$hashedpassword');
    });
  });
});
