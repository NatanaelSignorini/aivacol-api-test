import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { EntityId } from '../../common/types/entity-id.type';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findById(id: EntityId): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: this.authLookupSelect,
    });
  }

  findByDocument(document: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { nickname: document },
      select: this.authLookupSelect,
    });
  }

  private readonly authLookupSelect = {
    id: true,
    nickname: true,
    name: true,
    email: true,
    role: true,
    passwordHash: true,
    createdAt: true,
    updatedAt: true,
    createdBy: true,
  } as const;
}
