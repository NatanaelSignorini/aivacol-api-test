import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/** Utilitário de hash e verificação de senhas com bcrypt (10 rounds). */
export const passwordEncoder = {
  /**
   * Gera hash bcrypt; retorna valor inalterado se já for hash bcrypt.
   * Rejeita senhas vazias ou com 72+ caracteres (limite bcrypt).
   */
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

  /** Compara senha em texto com hash bcrypt armazenado. */
  async verify(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      throw new Error('Both password and hash must be provided.');
    }
    return bcrypt.compare(password, hash);
  },
};
