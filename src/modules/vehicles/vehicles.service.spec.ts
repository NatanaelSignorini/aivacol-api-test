import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Cache } from 'cache-manager';
import type { Repository } from 'typeorm';
import { DEFAULT_PAGE_SIZE } from '../../common/dto/pagination-query.dto';
import { Brand } from '../brands/entities/brand.entity';
import { VehicleEventsPublisher } from '../messaging/publishers/vehicle-events.publisher';
import { Model } from '../models/entities/model.entity';
import { Vehicle } from './entities/vehicle.entity';
import { VehiclesService } from './vehicles.service';
import {
  VEHICLES_LIST_CACHE_KEY,
  vehicleByIdCacheKey,
} from './vehicles-cache.constants';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let vehiclesRepository: jest.Mocked<
    Pick<
      Repository<Vehicle>,
      | 'create'
      | 'save'
      | 'find'
      | 'findAndCount'
      | 'findOne'
      | 'remove'
      | 'count'
    >
  >;
  let modelsRepository: jest.Mocked<Pick<Repository<Model>, 'findOne'>>;
  let cacheManager: jest.Mocked<Pick<Cache, 'get' | 'set' | 'del'>>;
  let vehicleEventsPublisher: jest.Mocked<
    Pick<
      VehicleEventsPublisher,
      'publishCreated' | 'publishUpdated' | 'publishDeleted'
    >
  >;

  const userId = '018f1234-5678-7890-abcd-ef1234567890';
  const brandId = '018f1234-5678-7890-abcd-ef1234567893';
  const modelId = '018f1234-5678-7890-abcd-ef1234567891';
  const vehicleId = '018f1234-5678-7890-abcd-ef1234567892';

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

  const existingVehicle: Vehicle = {
    id: vehicleId,
    licensePlate: 'ABC1D23',
    chassis: '9BWZZZ377VT004251',
    renavam: '12345678901',
    year: 2024,
    modelId,
    model: existingModel,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdBy: userId,
    creator: undefined,
    assignId: jest.fn(),
  };

  const vehicleResponseBase = {
    id: vehicleId,
    licensePlate: 'ABC1D23',
    chassis: '9BWZZZ377VT004251',
    renavam: '12345678901',
    year: 2024,
    createdAt: existingVehicle.createdAt,
    updatedAt: existingVehicle.updatedAt,
    createdBy: userId,
  };

  const vehicleResponseWithModel = {
    ...vehicleResponseBase,
    model: {
      id: modelId,
      name: 'Corolla',
      createdAt: existingModel.createdAt,
      updatedAt: existingModel.updatedAt,
      createdBy: userId,
    },
  };

  const vehicleResponseWithBrand = {
    ...vehicleResponseBase,
    model: {
      id: modelId,
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
    },
  };

  beforeEach(async () => {
    vehiclesRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };

    modelsRepository = {
      findOne: jest.fn(),
    };

    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    vehicleEventsPublisher = {
      publishCreated: jest.fn().mockResolvedValue(undefined),
      publishUpdated: jest.fn().mockResolvedValue(undefined),
      publishDeleted: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        {
          provide: getRepositoryToken(Vehicle),
          useValue: vehiclesRepository,
        },
        {
          provide: getRepositoryToken(Model),
          useValue: modelsRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: VehicleEventsPublisher,
          useValue: vehicleEventsPublisher,
        },
      ],
    }).compile();

    service = module.get(VehiclesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates vehicle with normalized identifiers and createdBy', async () => {
      modelsRepository.findOne.mockResolvedValue(existingModel);
      vehiclesRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingVehicle);
      vehiclesRepository.create.mockImplementation((data) =>
        Object.assign(new Vehicle(), data),
      );
      vehiclesRepository.save.mockImplementation(async (vehicle) => ({
        ...vehicle,
        id: vehicleId,
        createdAt: existingVehicle.createdAt,
        updatedAt: existingVehicle.updatedAt,
      }));

      const result = await service.create(
        {
          licensePlate: 'abc-1d23',
          chassis: '9bwzzz377vt004251',
          renavam: '12345678901',
          year: 2024,
          modelId,
        },
        userId,
      );

      expect(modelsRepository.findOne).toHaveBeenCalledWith({
        where: { id: modelId },
      });
      expect(vehiclesRepository.create).toHaveBeenCalledWith({
        licensePlate: 'ABC1D23',
        chassis: '9BWZZZ377VT004251',
        renavam: '12345678901',
        year: 2024,
        modelId,
        createdBy: userId,
      });
      expect(result).toMatchObject({
        id: vehicleId,
        licensePlate: 'ABC1D23',
      });
      expect(result.model).toBeUndefined();
    });

    it('includes model and brand when requested', async () => {
      modelsRepository.findOne.mockResolvedValue(existingModel);
      vehiclesRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingVehicle);
      vehiclesRepository.create.mockImplementation((data) =>
        Object.assign(new Vehicle(), data),
      );
      vehiclesRepository.save.mockImplementation(async (vehicle) => ({
        ...vehicle,
        id: vehicleId,
        createdAt: existingVehicle.createdAt,
        updatedAt: existingVehicle.updatedAt,
      }));

      const result = await service.create(
        {
          licensePlate: 'ABC1D23',
          chassis: '9BWZZZ377VT004251',
          renavam: '12345678901',
          year: 2024,
          modelId,
        },
        userId,
        { includeBrand: true },
      );

      expect(result).toMatchObject(vehicleResponseWithBrand);
      expect(cacheManager.del).toHaveBeenCalledWith(VEHICLES_LIST_CACHE_KEY);
      expect(vehicleEventsPublisher.publishCreated).toHaveBeenCalledWith(
        expect.objectContaining({ id: vehicleId }),
      );
    });

    it('rejects non-existent modelId with NotFoundException', async () => {
      modelsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          {
            licensePlate: 'ABC1D23',
            chassis: '9BWZZZ377VT004251',
            renavam: '12345678901',
            year: 2024,
            modelId,
          },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects duplicate license plate with ConflictException', async () => {
      modelsRepository.findOne.mockResolvedValue(existingModel);
      vehiclesRepository.findOne.mockResolvedValue(existingVehicle);

      await expect(
        service.create(
          {
            licensePlate: 'ABC1D23',
            chassis: '9BWZZZ377VT004252',
            renavam: '98765432109',
            year: 2024,
            modelId,
          },
          userId,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    const defaultQuery = { first: DEFAULT_PAGE_SIZE, skip: 0 };
    const cachedConnection = {
      nodes: [vehicleResponseBase],
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
      totalCount: 1,
    };

    it('returns cached vehicles on cache hit', async () => {
      cacheManager.get.mockResolvedValue(cachedConnection);

      const result = await service.findAll(defaultQuery);

      expect(cacheManager.get).toHaveBeenCalledWith(VEHICLES_LIST_CACHE_KEY);
      expect(vehiclesRepository.findAndCount).not.toHaveBeenCalled();
      expect(result).toEqual(cachedConnection);
    });

    it('returns all vehicles and caches on miss', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      vehiclesRepository.findAndCount.mockResolvedValue([[existingVehicle], 1]);

      const result = await service.findAll(defaultQuery);

      expect(vehiclesRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        relations: undefined,
        order: { licensePlate: 'ASC' },
        skip: 0,
        take: DEFAULT_PAGE_SIZE,
      });
      expect(cacheManager.set).toHaveBeenCalledWith(
        VEHICLES_LIST_CACHE_KEY,
        expect.objectContaining({
          nodes: [vehicleResponseBase],
          totalCount: 1,
        }),
      );
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].licensePlate).toBe('ABC1D23');
      expect(result.nodes[0].model).toBeUndefined();
    });

    it('loads model relation when includeModel is true', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      vehiclesRepository.findAndCount.mockResolvedValue([[existingVehicle], 1]);

      await service.findAll({
        first: DEFAULT_PAGE_SIZE,
        skip: 0,
        includeModel: true,
      });

      expect(vehiclesRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: { model: true },
        }),
      );
      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('does not use cache when list filters are applied', async () => {
      vehiclesRepository.findAndCount.mockResolvedValue([[existingVehicle], 1]);

      await service.findAll({
        first: DEFAULT_PAGE_SIZE,
        skip: 0,
        licensePlate: 'ABC',
      });

      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('does not use cache when pagination skip is non-zero', async () => {
      vehiclesRepository.findAndCount.mockResolvedValue([[existingVehicle], 1]);

      await service.findAll({
        first: DEFAULT_PAGE_SIZE,
        skip: 10,
      });

      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('applies modelId, year and brandId filters', async () => {
      vehiclesRepository.findAndCount.mockResolvedValue([[existingVehicle], 1]);

      await service.findAll({
        first: DEFAULT_PAGE_SIZE,
        skip: 0,
        modelId,
        year: 2024,
        brandId,
      });

      expect(vehiclesRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            modelId,
            year: 2024,
            model: { brandId },
          },
        }),
      );
      expect(cacheManager.get).not.toHaveBeenCalled();
    });

    it('loads nested brand relation when includeBrand is true', async () => {
      vehiclesRepository.findAndCount.mockResolvedValue([[existingVehicle], 1]);

      await service.findAll({
        first: DEFAULT_PAGE_SIZE,
        skip: 0,
        includeBrand: true,
      });

      expect(vehiclesRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: { model: { brand: true } },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns cached vehicle on cache hit', async () => {
      cacheManager.get.mockResolvedValue(vehicleResponseBase);

      const result = await service.findOne(vehicleId);

      expect(cacheManager.get).toHaveBeenCalledWith(
        vehicleByIdCacheKey(vehicleId),
      );
      expect(vehiclesRepository.findOne).not.toHaveBeenCalled();
      expect(result).toEqual(vehicleResponseBase);
    });

    it('returns vehicle by id and caches on miss', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      vehiclesRepository.findOne.mockResolvedValue(existingVehicle);

      const result = await service.findOne(vehicleId);

      expect(result.id).toBe(vehicleId);
      expect(cacheManager.set).toHaveBeenCalledWith(
        vehicleByIdCacheKey(vehicleId),
        vehicleResponseBase,
      );
    });

    it('returns vehicle with model when includeModel is true without caching', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      vehiclesRepository.findOne.mockResolvedValue(existingVehicle);

      const result = await service.findOne(vehicleId, {
        includeModel: true,
      });

      expect(result).toMatchObject({
        ...vehicleResponseWithModel,
        createdAt: existingVehicle.createdAt,
        updatedAt: existingVehicle.updatedAt,
        createdBy: userId,
      });
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('returns full vehicle when includeBrand is true without caching', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      vehiclesRepository.findOne.mockResolvedValue(existingVehicle);

      const result = await service.findOne(vehicleId, { includeBrand: true });

      expect(result).toMatchObject(vehicleResponseWithBrand);
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for missing id', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      vehiclesRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(vehicleId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates vehicle fields', async () => {
      vehiclesRepository.findOne
        .mockResolvedValueOnce(existingVehicle)
        .mockResolvedValueOnce({
          ...existingVehicle,
          year: 2025,
        });
      vehiclesRepository.save.mockImplementation(async (vehicle) => vehicle);

      const result = await service.update(vehicleId, { year: 2025 });

      expect(result.year).toBe(2025);
      expect(cacheManager.del).toHaveBeenCalledWith(VEHICLES_LIST_CACHE_KEY);
      expect(cacheManager.del).toHaveBeenCalledWith(
        vehicleByIdCacheKey(vehicleId),
      );
      expect(vehicleEventsPublisher.publishUpdated).toHaveBeenCalledWith(
        expect.objectContaining({ id: vehicleId, year: 2025 }),
      );
    });

    it('rejects duplicate chassis on update', async () => {
      const otherVehicle: Vehicle = {
        ...existingVehicle,
        id: '018f1234-5678-7890-abcd-ef9999999999',
        chassis: '9BWZZZ377VT004999',
      };

      vehiclesRepository.findOne
        .mockResolvedValueOnce(existingVehicle)
        .mockResolvedValueOnce(otherVehicle);

      await expect(
        service.update(vehicleId, { chassis: '9BWZZZ377VT004999' }),
      ).rejects.toThrow(ConflictException);
    });

    it('updates modelId after validating model exists', async () => {
      const newModelId = '018f1234-5678-7890-abcd-ef8888888888';
      modelsRepository.findOne.mockResolvedValue({
        ...existingModel,
        id: newModelId,
      });
      vehiclesRepository.findOne
        .mockResolvedValueOnce(existingVehicle)
        .mockResolvedValueOnce({
          ...existingVehicle,
          modelId: newModelId,
        });
      vehiclesRepository.save.mockImplementation(async (vehicle) => vehicle);

      const result = await service.update(vehicleId, { modelId: newModelId });

      expect(modelsRepository.findOne).toHaveBeenCalledWith({
        where: { id: newModelId },
      });
      expect(vehiclesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ modelId: newModelId }),
      );
      expect(result.id).toBe(vehicleId);
    });

    it('updates normalized license plate and renavam', async () => {
      vehiclesRepository.findOne
        .mockResolvedValueOnce(existingVehicle)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...existingVehicle,
          licensePlate: 'XYZ9K88',
          renavam: '98765432109',
        });
      vehiclesRepository.save.mockImplementation(async (vehicle) => vehicle);

      const result = await service.update(vehicleId, {
        licensePlate: 'xyz-9k88',
        renavam: '98765432109',
      });

      expect(vehiclesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          licensePlate: 'XYZ9K88',
          renavam: '98765432109',
        }),
      );
      expect(result.licensePlate).toBe('XYZ9K88');
      expect(result.renavam).toBe('98765432109');
    });

    it('rejects update when new modelId does not exist', async () => {
      modelsRepository.findOne.mockResolvedValue(null);
      vehiclesRepository.findOne.mockResolvedValueOnce(existingVehicle);

      await expect(
        service.update(vehicleId, {
          modelId: '018f1234-5678-7890-abcd-ef7777777777',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes vehicle by id', async () => {
      vehiclesRepository.findOne.mockResolvedValue(existingVehicle);
      vehiclesRepository.remove.mockResolvedValue(existingVehicle);

      await service.remove(vehicleId);

      expect(vehiclesRepository.remove).toHaveBeenCalledWith(existingVehicle);
      expect(cacheManager.del).toHaveBeenCalledWith(VEHICLES_LIST_CACHE_KEY);
      expect(cacheManager.del).toHaveBeenCalledWith(
        vehicleByIdCacheKey(vehicleId),
      );
      expect(vehicleEventsPublisher.publishDeleted).toHaveBeenCalledWith(
        expect.objectContaining({ id: vehicleId }),
      );
    });
  });

  describe('countByModelId', () => {
    it('returns vehicle count for model', async () => {
      vehiclesRepository.count.mockResolvedValue(3);

      const count = await service.countByModelId(modelId);

      expect(vehiclesRepository.count).toHaveBeenCalledWith({
        where: { modelId },
      });
      expect(count).toBe(3);
    });
  });
});
