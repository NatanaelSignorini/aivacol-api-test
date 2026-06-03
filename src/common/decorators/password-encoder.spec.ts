import * as bcrypt from 'bcryptjs';
import { passwordEncoder } from './password-encoder';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('passwordEncoder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hash', () => {
    it('returns password unchanged when already bcrypt-hashed', async () => {
      const hashed = '$2a$10$existinghashvalue';

      await expect(passwordEncoder.hash(hashed)).resolves.toBe(hashed);
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('hashes plain passwords under 72 characters', async () => {
      jest.mocked(bcrypt.hash).mockResolvedValue('$2b$10$newhash' as never);

      await expect(passwordEncoder.hash('secret')).resolves.toBe(
        '$2b$10$newhash',
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('secret', 10);
    });

    it('rejects empty or too long passwords', async () => {
      await expect(passwordEncoder.hash('')).rejects.toThrow(
        'Password must be provided and be less than 72 characters.',
      );
      await expect(passwordEncoder.hash('a'.repeat(72))).rejects.toThrow(
        'Password must be provided and be less than 72 characters.',
      );
    });
  });

  describe('verify', () => {
    it('compares password and hash', async () => {
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await expect(
        passwordEncoder.verify('secret', '$2a$10$hash'),
      ).resolves.toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('secret', '$2a$10$hash');
    });

    it('requires password and hash', async () => {
      await expect(passwordEncoder.verify('', '$2a$10$hash')).rejects.toThrow(
        'Both password and hash must be provided.',
      );
      await expect(passwordEncoder.verify('secret', '')).rejects.toThrow(
        'Both password and hash must be provided.',
      );
    });
  });
});
