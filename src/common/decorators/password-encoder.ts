import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hashes and verifies passwords using bcrypt.
 * @see intermac pattern
 */
export const passwordEncoder = {
  async hash(password: string): Promise<string> {
    if (password.startsWith('$2a$') || password.startsWith('$2b$')) {
      return password;
    }
    if (password && password.length < 72) {
      return bcrypt.hash(password, SALT_ROUNDS);
    }
    throw new Error(
      'Password must be provided and be less than 72 characters.',
    );
  },

  async verify(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      throw new Error('Both password and hash must be provided.');
    }
    return bcrypt.compare(password, hash);
  },
};
