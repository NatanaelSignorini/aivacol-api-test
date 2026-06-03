import type { Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { passwordEncoder } from '../../common/decorators/password-encoder';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../modules/users/enums/user-role.enum';

export const AIVACOL_SEED_USER = {
  nickname: 'aivacol',
  name: 'Aivacol Admin',
  email: 'admin@aivacol.com',
} as const;

/** Senha fixa do usuário seed (atende regras de senha forte no login). */
export const AIVACOL_SEED_PASSWORD = 'Aivacol123!';

export interface SeedAivacolUserResult {
  created: boolean;
  user: User;
}

export async function seedAivacolUser(
  repository: Repository<User>,
  plainPassword: string,
): Promise<SeedAivacolUserResult> {
  const existing = await repository.findOne({
    where: { email: AIVACOL_SEED_USER.email },
  });

  if (existing) {
    return { created: false, user: existing };
  }

  const id = uuidv7();
  const passwordHash = await passwordEncoder.hash(plainPassword);

  const user = repository.create({
    id,
    nickname: AIVACOL_SEED_USER.nickname,
    name: AIVACOL_SEED_USER.name,
    email: AIVACOL_SEED_USER.email,
    passwordHash,
    role: UserRole.Admin,
    createdBy: id,
  });

  const saved = await repository.save(user);

  return { created: true, user: saved };
}
