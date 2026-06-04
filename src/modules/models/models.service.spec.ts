import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Like, type Repository } from 'typeorm';
import { DEFAULT_PAGE_SIZE } from '../../common/dto/pagination-query.dto';
import { Brand } from '../brands/entities/brand.entity';
import { VehiclesService } from '../vehicles/vehicles.service';
import { Model } from './entities/model.entity';
import { ModelsService } from './models.service';

describe('ModelsService', () => {
  let service: ModelsService;
  let modelsRepository: jest.Mocked<
    Pick<
      Repository<Model>,
      | 'create'
      | 'save'
      | 'find'
      | 'findAndCount'
      | 'findOne'
      | 'remove'
      | 'count'
    >
  >;
  let brandsRepository: jest.Mocked<Pick<Repository<Brand>, 'findOne'>>;
  let vehiclesService: jest.Mocked<Pick<VehiclesService, 'countByModelId'>>;

  const userId = '018f1234-5678-7890-abcd-ef1234567890';
  const brandId = '018f1234-5678-7890-abcd-ef1234567891';
  const modelId = '018f1234-5678-7890-abcd-ef1234567892';

  const existingBrand: Brand = {
    id: brandId,
    name: 'Toyota',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdBy: userId,
    creator: undefined,
    assignId: jest.fn(),
  };

  const existingModel: Model = {
    id: modelId,
    name: 'Corolla',
    brandId,
    brand: existingBrand,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdBy: userId,
    creator: undefined,
    assignId: jest.fn(),
  };

  beforeEach(async () => {
    modelsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };

    brandsRepository = {
      findOne: jest.fn(),
    };

    vehiclesService = {
      countByModelId: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModelsService,
        {
          provide: getRepositoryToken(Model),
          useValue: modelsRepository,
        },
        {
          provide: getRepositoryToken(Brand),
          useValue: brandsRepository,
        },
        {
          provide: VehiclesService,
          useValue: vehiclesService,
        },
      ],
    }).compile();

    service = module.get(ModelsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates model with brandId and createdBy from authenticated user', async () => {
      brandsRepository.findOne.mockResolvedValue(existingBrand);
      modelsRepository.create.mockImplementation((data) =>
        Object.assign(new Model(), data),
      );
      modelsRepository.save.mockImplementation(async (model) => ({
        ...model,
        id: modelId,
        createdAt: existingModel.createdAt,
        updatedAt: existingModel.updatedAt,
      }));
      modelsRepository.findOne.mockResolvedValue(existingModel);

      const result = await service.create({ name: 'Corolla', brandId }, userId);

      expect(modelsRepository.create).toHaveBeenCalledWith({
        name: 'Corolla',
        brandId,
        createdBy: userId,
      });
      expect(result).toMatchObject({
        id: modelId,
        name: 'Corolla',
      });
      expect(result.brand).toBeUndefined();
      expect(result.createdAt).toEqual(existingModel.createdAt);
      expect(result.createdBy).toBe(userId);
    });

    it('includes brand when requested', async () => {
      brandsRepository.findOne.mockResolvedValue(existingBrand);
      modelsRepository.create.mockImplementation((data) =>
        Object.assign(new Model(), data),
      );
      modelsRepository.save.mockImplementation(async (model) => ({
        ...model,
        id: modelId,
        createdAt: existingModel.createdAt,
        updatedAt: existingModel.updatedAt,
      }));
      modelsRepository.findOne.mockResolvedValue(existingModel);

      const result = await service.create(
        { name: 'Corolla', brandId },
        userId,
        { includeBrand: true },
      );

      expect(result).toMatchObject({
        name: 'Corolla',
        createdAt: existingModel.createdAt,
        createdBy: userId,
        brand: {
          id: brandId,
          name: 'Toyota',
          createdAt: existingBrand.createdAt,
          updatedAt: existingBrand.updatedAt,
          createdBy: userId,
        },
      });
    });

    it('rejects non-existent brandId with NotFoundException', async () => {
      brandsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ name: 'Corolla', brandId }, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns paginated models without brand by default', async () => {
      modelsRepository.findAndCount.mockResolvedValue([[existingModel], 1]);

      const result = await service.findAll({
        first: DEFAULT_PAGE_SIZE,
        skip: 0,
      });

      expect(modelsRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        relations: undefined,
        order: { name: 'ASC' },
        skip: 0,
        take: DEFAULT_PAGE_SIZE,
      });
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].name).toBe('Corolla');
      expect(result.nodes[0].brand).toBeUndefined();
    });

    it('applies name and brandId filters', async () => {
      modelsRepository.findAndCount.mockResolvedValue([[existingModel], 1]);

      await service.findAll({
        first: DEFAULT_PAGE_SIZE,
        skip: 0,
        name: ' Corolla ',
        brandId,
      });

      expect(modelsRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          name: Like('%Corolla%'),
          brandId,
        },
        relations: undefined,
        order: { name: 'ASC' },
        skip: 0,
        take: DEFAULT_PAGE_SIZE,
      });
    });

    it('loads brand relation when includeBrand is true', async () => {
      modelsRepository.findAndCount.mockResolvedValue([[existingModel], 1]);

      const result = await service.findAll({
        first: DEFAULT_PAGE_SIZE,
        skip: 0,
        includeBrand: true,
      });

      expect(modelsRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: { brand: true },
        }),
      );
      expect(result.nodes[0]).toMatchObject({
        name: 'Corolla',
        createdAt: existingModel.createdAt,
        updatedAt: existingModel.updatedAt,
        createdBy: userId,
        brand: {
          id: brandId,
          name: 'Toyota',
          createdAt: existingBrand.createdAt,
          updatedAt: existingBrand.updatedAt,
          createdBy: userId,
        },
      });
    });
  });

  describe('findOne', () => {
    it('returns model by id', async () => {
      modelsRepository.findOne.mockResolvedValue(existingModel);

      const result = await service.findOne(modelId);

      expect(result.id).toBe(modelId);
      expect(result.name).toBe('Corolla');
      expect(result.brand).toBeUndefined();
    });

    it('throws NotFoundException for missing id', async () => {
      modelsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(modelId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates model name and brandId', async () => {
      const updatedBrand: Brand = {
        ...existingBrand,
        id: '018f1234-5678-7890-abcd-ef1234567893',
        name: 'Honda',
      };

      modelsRepository.findOne
        .mockResolvedValueOnce(existingModel)
        .mockResolvedValueOnce({
          ...existingModel,
          name: 'Civic',
          brandId: updatedBrand.id,
          brand: updatedBrand,
        });
      brandsRepository.findOne.mockResolvedValue(updatedBrand);
      modelsRepository.save.mockImplementation(async (model) => model);

      const result = await service.update(
        modelId,
        {
          name: 'Civic',
          brandId: updatedBrand.id,
        },
        { includeBrand: true },
      );

      expect(result.name).toBe('Civic');
      expect(result.brand).toEqual({
        id: updatedBrand.id,
        name: 'Honda',
        createdAt: updatedBrand.createdAt,
        updatedAt: updatedBrand.updatedAt,
        createdBy: updatedBrand.createdBy,
      });
    });

    it('rejects non-existent brandId on update with NotFoundException', async () => {
      modelsRepository.findOne.mockResolvedValue(existingModel);
      brandsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(modelId, {
          brandId: '018f1234-5678-7890-abcd-ef9999999999',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes model by id', async () => {
      modelsRepository.findOne.mockResolvedValue(existingModel);
      modelsRepository.remove.mockResolvedValue(existingModel);

      await service.remove(modelId);

      expect(modelsRepository.remove).toHaveBeenCalledWith(existingModel);
    });

    it('rejects remove when vehicles reference the model', async () => {
      modelsRepository.findOne.mockResolvedValue(existingModel);
      vehiclesService.countByModelId.mockResolvedValue(2);

      await expect(service.remove(modelId)).rejects.toThrow(ConflictException);
      expect(modelsRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('countByBrandId', () => {
    it('returns model count for brand', async () => {
      modelsRepository.count.mockResolvedValue(2);

      const count = await service.countByBrandId(brandId);

      expect(modelsRepository.count).toHaveBeenCalledWith({
        where: { brandId },
      });
      expect(count).toBe(2);
    });
  });
});
