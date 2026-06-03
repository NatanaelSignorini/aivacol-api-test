import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Pick<Repository<User>, 'findOne'>>;

  const mockUser: User = {
    id: '018f1234-5678-7890-abcd-ef1234567890',
    nickname: 'aivacol',
    name: 'Aivacol Admin',
    email: 'admin@aivacol.com',
    passwordHash: '$2a$10$hashedpassword',
    role: UserRole.Admin,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: '018f1234-5678-7890-abcd-ef1234567890',
    creator: undefined,
    assignId: jest.fn(),
  };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
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
  });

  describe('findById', () => {
    it('delegates to repository with id filter', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(mockUser.id);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toBe(mockUser);
    });
  });

  describe('findByEmail', () => {
    it('includes password hash in select for auth lookup', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: mockUser.email },
        select: expect.objectContaining({
          passwordHash: true,
        }),
      });
      expect(result).toBe(mockUser);
    });
  });

  describe('findByDocument', () => {
    it('looks up user by nickname for document login', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByDocument('aivacol');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { nickname: 'aivacol' },
        select: expect.objectContaining({
          passwordHash: true,
        }),
      });
      expect(result).toBe(mockUser);
    });
  });
});
