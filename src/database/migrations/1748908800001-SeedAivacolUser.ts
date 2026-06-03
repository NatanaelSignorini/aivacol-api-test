import type { MigrationInterface, QueryRunner } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import {
  AIVACOL_SEED_PASSWORD,
  AIVACOL_SEED_USER,
  seedAivacolUser,
} from '../seeds/aivacol-user.seed';

export class SeedAivacolUser1748908800001 implements MigrationInterface {
  name = 'SeedAivacolUser1748908800001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const repository = queryRunner.manager.getRepository(User);

    await seedAivacolUser(repository, AIVACOL_SEED_PASSWORD);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.delete(User, {
      email: AIVACOL_SEED_USER.email,
    });
  }
}
