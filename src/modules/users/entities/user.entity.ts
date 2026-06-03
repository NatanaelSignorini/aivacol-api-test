import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../bases/entities/base.entity';
import { UserRole } from '../enums/user-role.enum';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  nickname: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password', select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20 })
  role: UserRole;
}
