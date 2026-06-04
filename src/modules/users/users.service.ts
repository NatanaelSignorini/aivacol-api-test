import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type FindOptionsWhere, Like, Repository } from 'typeorm';
import { passwordEncoder } from '../../common/decorators/password-encoder';
import type { Connection } from '../../common/interfaces/connection.interface';
import type { EntityId } from '../../common/types/entity-id.type';
import { toConnection } from '../../common/utils/api-response.util';
import type { CreateUserInput } from './dto/create-user.input';
import type { UpdateUserInput } from './dto/update-user.input';
import { UserResponseDto } from './dto/user-response.dto';
import type { UsersListQueryDto } from './dto/users-list-query.dto';
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

  async create(
    input: CreateUserInput,
    createdBy: EntityId,
  ): Promise<UserResponseDto> {
    await this.assertNicknameIsUnique(input.nickname);
    await this.assertEmailIsUnique(input.email);

    const passwordHash = await passwordEncoder.hash(input.password);

    const user = this.usersRepository.create({
      nickname: input.nickname.trim(),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash,
      role: input.role,
      createdBy,
    });

    const saved = await this.usersRepository.save(user);

    return this.toResponse(saved);
  }

  async findAll(
    query: UsersListQueryDto,
  ): Promise<Connection<UserResponseDto>> {
    const where = this.buildListWhere(query);
    const [users, totalCount] = await this.usersRepository.findAndCount({
      where,
      order: { nickname: 'ASC' },
      skip: query.skip,
      take: query.first,
    });

    return toConnection(
      users.map((user) => this.toResponse(user)),
      totalCount,
      query.skip,
    );
  }

  private buildListWhere(
    query: UsersListQueryDto,
  ): FindOptionsWhere<User> | FindOptionsWhere<User>[] {
    const where: FindOptionsWhere<User> = {};

    if (query.email) {
      where.email = Like(`%${query.email.trim().toLowerCase()}%`);
    }

    if (query.name) {
      where.name = Like(`%${query.name.trim()}%`);
    }

    if (query.nickname) {
      where.nickname = Like(`%${query.nickname.trim()}%`);
    }

    if (query.role) {
      where.role = query.role;
    }

    return where;
  }

  async findOne(id: EntityId): Promise<UserResponseDto> {
    const user = await this.findEntityOrFail(id);

    return this.toResponse(user);
  }

  async update(id: EntityId, input: UpdateUserInput): Promise<UserResponseDto> {
    const user = await this.findEntityOrFail(id);

    if (input.nickname !== undefined) {
      await this.assertNicknameIsUnique(input.nickname, id);
      user.nickname = input.nickname.trim();
    }

    if (input.name !== undefined) {
      user.name = input.name.trim();
    }

    if (input.email !== undefined) {
      await this.assertEmailIsUnique(input.email, id);
      user.email = input.email.trim().toLowerCase();
    }

    if (input.password !== undefined) {
      user.passwordHash = await passwordEncoder.hash(input.password);
    }

    if (input.role !== undefined) {
      user.role = input.role;
    }

    const saved = await this.usersRepository.save(user);

    return this.toResponse(saved);
  }

  async remove(id: EntityId, requestingUserId: EntityId): Promise<void> {
    if (id === requestingUserId) {
      throw new BadRequestException('Cannot delete your own user account');
    }

    const user = await this.findEntityOrFail(id);
    await this.usersRepository.remove(user);
  }

  private async findEntityOrFail(id: EntityId): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    return user;
  }

  private async assertNicknameIsUnique(
    nickname: string,
    excludeId?: EntityId,
  ): Promise<void> {
    const normalized = nickname.trim();
    const existing = await this.usersRepository.findOne({
      where: { nickname: normalized },
    });

    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `User with nickname "${normalized}" already exists`,
      );
    }
  }

  private async assertEmailIsUnique(
    email: string,
    excludeId?: EntityId,
  ): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const existing = await this.usersRepository.findOne({
      where: { email: normalized },
    });

    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `User with email "${normalized}" already exists`,
      );
    }
  }

  private toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      nickname: user.nickname,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      createdBy: user.createdBy,
    };
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
