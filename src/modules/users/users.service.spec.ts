import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Like, type Repository } from 'typeorm';
import { passwordEncoder } from '../../common/decorators/password-encoder';
import { DEFAULT_PAGE_SIZE } from '../../common/dto/pagination-query.dto';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { UsersService } from './users.service';

jest.mock('../../common/decorators/password-encoder', () => ({
  passwordEncoder: {
    hash: jest.fn().mockResolvedValue('$2a$10$newhash'),
    verify: jest.fn(),
  },
}));

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<
    Pick<
      Repository<User>,
      'create' | 'save' | 'find' | 'findAndCount' | 'findOne' | 'remove'
    >
  >;

  const adminId = '018f1234-5678-7890-abcd-ef1234567890';
  const userId = '018f1234-5678-7890-abcd-ef1234567891';

  const existingUser: User = {
    id: userId,
    nickname: 'operator1',
    name: 'Fleet Operator',
    email: 'operator1@aivacol.com',
    passwordHash: '$2a$10$hashedpassword',
    role: UserRole.Operator,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdBy: adminId,
    creator: undefined,
    assignId: jest.fn(),
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('delegates to repository with id filter', async () => {
      repository.findOne.mockResolvedValue(existingUser);

      const result = await service.findById(existingUser.id);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: existingUser.id },
      });
      expect(result).toBe(existingUser);
    });
  });

  describe('findByEmail', () => {
    it('includes password hash in select for auth lookup', async () => {
      repository.findOne.mockResolvedValue(existingUser);

      const result = await service.findByEmail(existingUser.email);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: existingUser.email },
        select: expect.objectContaining({
          passwordHash: true,
        }),
      });
      expect(result).toBe(existingUser);
    });
  });

  describe('create', () => {
    it('creates user with hashed password and createdBy', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockImplementation((data) =>
        Object.assign(new User(), data),
      );
      repository.save.mockImplementation(async (user) => ({
        ...user,
        id: userId,
        createdAt: existingUser.createdAt,
        updatedAt: existingUser.updatedAt,
      }));

      const result = await service.create(
        {
          nickname: 'operator1',
          name: 'Fleet Operator',
          email: 'operator1@aivacol.com',
          password: 'Password1!',
          role: UserRole.Operator,
        },
        adminId,
      );

      expect(passwordEncoder.hash).toHaveBeenCalledWith('Password1!');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nickname: 'operator1',
          email: 'operator1@aivacol.com',
          passwordHash: '$2a$10$newhash',
          createdBy: adminId,
        }),
      );
      expect(result).toEqual({
        id: userId,
        nickname: 'operator1',
        name: 'Fleet Operator',
        email: 'operator1@aivacol.com',
        role: UserRole.Operator,
        createdAt: existingUser.createdAt,
        updatedAt: existingUser.updatedAt,
        createdBy: adminId,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('rejects duplicate nickname on create', async () => {
      repository.findOne.mockResolvedValueOnce(existingUser);

      await expect(
        service.create(
          {
            nickname: 'operator1',
            name: 'Other',
            email: 'other@aivacol.com',
            password: 'Password1!',
            role: UserRole.Operator,
          },
          adminId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects duplicate email on create', async () => {
      repository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingUser);

      await expect(
        service.create(
          {
            nickname: 'other',
            name: 'Other',
            email: 'operator1@aivacol.com',
            password: 'Password1!',
            role: UserRole.Operator,
          },
          adminId,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('returns paginated users without password hash', async () => {
      repository.findAndCount.mockResolvedValue([[existingUser], 1]);

      const result = await service.findAll({
        first: DEFAULT_PAGE_SIZE,
        skip: 0,
      });

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { nickname: 'ASC' },
        skip: 0,
        take: DEFAULT_PAGE_SIZE,
      });
      expect(result.nodes[0]).not.toHaveProperty('passwordHash');
      expect(result.nodes[0].nickname).toBe('operator1');
      expect(result.totalCount).toBe(1);
    });

    it('applies list filters for email, name, nickname and role', async () => {
      repository.findAndCount.mockResolvedValue([[existingUser], 1]);

      await service.findAll({
        first: DEFAULT_PAGE_SIZE,
        skip: 0,
        email: ' Operator1@AIVACOL.com ',
        name: ' Fleet ',
        nickname: ' operator ',
        role: UserRole.Operator,
      });

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: {
          email: Like('%operator1@aivacol.com%'),
          name: Like('%Fleet%'),
          nickname: Like('%operator%'),
          role: UserRole.Operator,
        },
        order: { nickname: 'ASC' },
        skip: 0,
        take: DEFAULT_PAGE_SIZE,
      });
    });
  });

  describe('findOne', () => {
    it('returns user by id', async () => {
      repository.findOne.mockResolvedValue(existingUser);

      const result = await service.findOne(userId);

      expect(result.id).toBe(userId);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws NotFoundException for missing id', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates user fields and password when provided', async () => {
      repository.findOne
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      repository.save.mockImplementation(async (user) => user);

      const result = await service.update(userId, {
        name: 'Updated Name',
        password: 'NewPass1!',
      });

      expect(passwordEncoder.hash).toHaveBeenCalledWith('NewPass1!');
      expect(result.name).toBe('Updated Name');
      expect(repository.save).toHaveBeenCalled();
    });

    it('rejects duplicate email on update', async () => {
      const otherUser: User = {
        ...existingUser,
        id: '018f1234-5678-7890-abcd-ef1234567892',
        email: 'taken@aivacol.com',
      };

      repository.findOne
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(otherUser);

      await expect(
        service.update(userId, { email: 'taken@aivacol.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('updates nickname, email and role with normalization', async () => {
      repository.findOne
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      repository.save.mockImplementation(async (user) => user);

      const result = await service.update(userId, {
        nickname: ' new-nick ',
        email: ' NEW@AIVACOL.COM ',
        role: UserRole.Admin,
      });

      expect(result.nickname).toBe('new-nick');
      expect(result.email).toBe('new@aivacol.com');
      expect(result.role).toBe(UserRole.Admin);
    });

    it('rejects duplicate nickname on update', async () => {
      const otherUser: User = {
        ...existingUser,
        id: '018f1234-5678-7890-abcd-ef1234567892',
        nickname: 'taken',
      };

      repository.findOne
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(otherUser);

      await expect(
        service.update(userId, { nickname: 'taken' }),
      ).rejects.toThrow(ConflictException);
    });

    it('allows keeping the same nickname for the same user', async () => {
      repository.findOne
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(existingUser);
      repository.save.mockImplementation(async (user) => user);

      const result = await service.update(userId, {
        nickname: 'operator1',
      });

      expect(result.nickname).toBe('operator1');
    });
  });

  describe('remove', () => {
    it('removes user by id', async () => {
      repository.findOne.mockResolvedValue(existingUser);
      repository.remove.mockResolvedValue(existingUser);

      await service.remove(userId, adminId);

      expect(repository.remove).toHaveBeenCalledWith(existingUser);
    });

    it('rejects self-delete with BadRequestException', async () => {
      await expect(service.remove(adminId, adminId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when user does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(userId, adminId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
