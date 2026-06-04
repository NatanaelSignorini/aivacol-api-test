import type { DataSource } from 'typeorm';
import type { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { v7 as uuidv7 } from 'uuid';
import { passwordEncoder } from '../../common/decorators/password-encoder';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../modules/users/enums/user-role.enum';

const AIVACOL_EMAIL = 'admin@aivacol.com';
const AIVACOL_PASSWORD = 'Aivacol123!';

export default class AivacolUserSeeder implements Seeder {
  /**
   * Cria usuário admin padrão (`admin@aivacol.com`) se ainda não existir.
   * Auto-referencia `created_by` com o próprio id do admin.
   */
  public async run(
    dataSource: DataSource,
    _factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const repository = dataSource.getRepository(User);
    const existing = await repository.findOne({
      where: { email: AIVACOL_EMAIL },
    });

    if (existing) {
      console.log(`AivacolUserSeeder: ${AIVACOL_EMAIL} already exists`);
      return;
    }

    const id = uuidv7();
    const user = repository.create({
      id,
      nickname: 'aivacol',
      name: 'Aivacol Admin',
      email: AIVACOL_EMAIL,
      passwordHash: await passwordEncoder.hash(AIVACOL_PASSWORD),
      role: UserRole.Admin,
      createdBy: id,
    });

    await repository.save(user);
    console.log(`AivacolUserSeeder: created ${AIVACOL_EMAIL}`);
  }
}
