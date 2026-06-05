import { toUuidV7 } from '../../common/types/entity-id.type';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { DEFAULT_PAGE_SIZE } from '../../common/dto/pagination-query.dto';
import { ModelsService } from '../models/models.service';
import { BrandsService } from './brands.service';
import { Brand } from './entities/brand.entity';

describe('BrandsService', () => {
  let service: BrandsService;
  let repository: jest.Mocked<
    Pick<
      Repository<Brand>,
      'create' | 'save' | 'find' | 'findAndCount' | 'findOne' | 'remove'
    >
  >;
  let modelsService: jest.Mocked<Pick<ModelsService, 'countByBrandId'>>;

  const userId = toUuidV7('018f1234-5678-7890-abcd-ef1234567890');
  const brandId = toUuidV7('018f1234-5678-7890-abcd-ef1234567891');

  const existingBrand: Brand = {
    id: brandId,
    name: 'Toyota',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdBy: userId,
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

    modelsService = {
      countByBrandId: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsService,
        {
          provide: getRepositoryToken(Brand),
          useValue: repository,
        },
        {
          provide: ModelsService,
          useValue: modelsService,
        },
      ],
    }).compile();

    service = module.get(BrandsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates brand with createdBy from authenticated user', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockImplementation((data) =>
        Object.assign(new Brand(), data),
      );
      repository.save.mockImplementation(async (brand) => ({
        ...brand,
        id: brandId,
        createdAt: existingBrand.createdAt,
        updatedAt: existingBrand.updatedAt,
      }));

      const result = await service.create({ name: 'Toyota' }, userId);

      expect(repository.create).toHaveBeenCalledWith({
        name: 'Toyota',
        createdBy: userId,
      });
      expect(result).toEqual({
        id: brandId,
        name: 'Toyota',
        createdAt: existingBrand.createdAt,
        updatedAt: existingBrand.updatedAt,
        createdBy: userId,
      });
    });

    it('rejects duplicate name on create with ConflictException', async () => {
      repository.findOne.mockResolvedValue(existingBrand);

      await expect(service.create({ name: 'Toyota' }, userId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('returns paginated brands', async () => {
      repository.findAndCount.mockResolvedValue([[existingBrand], 1]);

      const result = await service.findAll({
        first: DEFAULT_PAGE_SIZE,
        skip: 0,
      });

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { name: 'ASC' },
        skip: 0,
        take: DEFAULT_PAGE_SIZE,
      });
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].name).toBe('Toyota');
    });
  });

  describe('findOne', () => {
    it('returns brand by id', async () => {
      repository.findOne.mockResolvedValue(existingBrand);

      const result = await service.findOne(brandId);

      expect(result.id).toBe(brandId);
      expect(result.name).toBe('Toyota');
    });

    it('throws NotFoundException for missing id', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(brandId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates brand name when unique', async () => {
      repository.findOne
        .mockResolvedValueOnce(existingBrand)
        .mockResolvedValueOnce(null);
      repository.save.mockImplementation(async (brand) => brand);

      const result = await service.update(brandId, { name: 'Honda' });

      expect(result.name).toBe('Honda');
      expect(repository.save).toHaveBeenCalled();
    });

    it('rejects duplicate name on update with ConflictException', async () => {
      const otherBrand: Brand = {
        ...existingBrand,
        id: toUuidV7('018f1234-5678-7890-abcd-ef1234567892'),
        name: 'Honda',
      };

      repository.findOne
        .mockResolvedValueOnce(existingBrand)
        .mockResolvedValueOnce(otherBrand);

      await expect(service.update(brandId, { name: 'Honda' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('removes brand by id', async () => {
      repository.findOne.mockResolvedValue(existingBrand);
      repository.remove.mockResolvedValue(existingBrand);

      await service.remove(brandId);

      expect(repository.remove).toHaveBeenCalledWith(existingBrand);
    });

    it('rejects remove when models reference the brand', async () => {
      repository.findOne.mockResolvedValue(existingBrand);
      modelsService.countByBrandId.mockResolvedValue(2);

      await expect(service.remove(brandId)).rejects.toThrow(ConflictException);
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });
});
