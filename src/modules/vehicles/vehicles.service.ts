import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import type { EntityId } from '../../common/types/entity-id.type';
import {
  normalizeChassis,
  normalizeLicensePlate,
  normalizeRenavam,
} from '../../common/validators/vehicle-identifiers.validator';
import { Model } from '../models/entities/model.entity';
import type { CreateVehicleInput } from './dto/create-vehicle.input';
import type { UpdateVehicleInput } from './dto/update-vehicle.input';
import { VehicleResponseDto } from './dto/vehicle-response.dto';
import { Vehicle } from './entities/vehicle.entity';
import {
  VEHICLES_LIST_CACHE_KEY,
  vehicleByIdCacheKey,
} from './vehicles-cache.constants';

type VehicleUniqueField = 'licensePlate' | 'chassis' | 'renavam';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(Model)
    private readonly modelsRepository: Repository<Model>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create(
    input: CreateVehicleInput,
    createdBy: EntityId,
  ): Promise<VehicleResponseDto> {
    await this.assertModelExists(input.modelId);

    const licensePlate = normalizeLicensePlate(input.licensePlate);
    const chassis = normalizeChassis(input.chassis);
    const renavam = normalizeRenavam(input.renavam);

    await this.assertUniqueIdentifiers(
      { licensePlate, chassis, renavam },
      undefined,
    );

    const vehicle = this.vehiclesRepository.create({
      licensePlate,
      chassis,
      renavam,
      year: input.year,
      modelId: input.modelId,
      createdBy,
    });

    const saved = await this.vehiclesRepository.save(vehicle);
    await this.invalidateVehicleCache();

    return this.toResponse(await this.findEntityWithModelOrFail(saved.id));
  }

  async findAll(): Promise<VehicleResponseDto[]> {
    const cached = await this.cacheManager.get<VehicleResponseDto[]>(
      VEHICLES_LIST_CACHE_KEY,
    );

    if (cached) {
      return cached;
    }

    const vehicles = await this.vehiclesRepository.find({
      relations: { model: true },
      order: { licensePlate: 'ASC' },
    });

    const response = vehicles.map((vehicle) => this.toResponse(vehicle));
    await this.cacheManager.set(VEHICLES_LIST_CACHE_KEY, response);

    return response;
  }

  async findOne(id: EntityId): Promise<VehicleResponseDto> {
    const cacheKey = vehicleByIdCacheKey(id);
    const cached = await this.cacheManager.get<VehicleResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const vehicle = await this.findEntityWithModelOrFail(id);
    const response = this.toResponse(vehicle);
    await this.cacheManager.set(cacheKey, response);

    return response;
  }

  async update(
    id: EntityId,
    input: UpdateVehicleInput,
  ): Promise<VehicleResponseDto> {
    const vehicle = await this.findEntityWithModelOrFail(id);

    if (input.modelId !== undefined) {
      await this.assertModelExists(input.modelId);
      vehicle.modelId = input.modelId;
    }

    if (input.year !== undefined) {
      vehicle.year = input.year;
    }

    const identifiers: Partial<Record<VehicleUniqueField, string | undefined>> =
      {};

    if (input.licensePlate !== undefined) {
      identifiers.licensePlate = normalizeLicensePlate(input.licensePlate);
      vehicle.licensePlate = identifiers.licensePlate;
    }

    if (input.chassis !== undefined) {
      identifiers.chassis = normalizeChassis(input.chassis);
      vehicle.chassis = identifiers.chassis;
    }

    if (input.renavam !== undefined) {
      identifiers.renavam = normalizeRenavam(input.renavam);
      vehicle.renavam = identifiers.renavam;
    }

    if (
      identifiers.licensePlate !== undefined ||
      identifiers.chassis !== undefined ||
      identifiers.renavam !== undefined
    ) {
      await this.assertUniqueIdentifiers(
        {
          licensePlate: vehicle.licensePlate,
          chassis: vehicle.chassis,
          renavam: vehicle.renavam,
        },
        id,
      );
    }

    await this.vehiclesRepository.save(vehicle);
    await this.invalidateVehicleCache(id);

    return this.toResponse(await this.findEntityWithModelOrFail(id));
  }

  async remove(id: EntityId): Promise<void> {
    const vehicle = await this.findEntityOrFail(id);
    await this.vehiclesRepository.remove(vehicle);
    await this.invalidateVehicleCache(id);
  }

  async countByModelId(modelId: EntityId): Promise<number> {
    return this.vehiclesRepository.count({ where: { modelId } });
  }

  private async findEntityOrFail(id: EntityId): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOne({ where: { id } });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with id "${id}" not found`);
    }

    return vehicle;
  }

  private async findEntityWithModelOrFail(id: EntityId): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id },
      relations: { model: true },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with id "${id}" not found`);
    }

    return vehicle;
  }

  private async assertModelExists(modelId: EntityId): Promise<void> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
    });

    if (!model) {
      throw new NotFoundException(`Model with id "${modelId}" not found`);
    }
  }

  private async assertUniqueIdentifiers(
    identifiers: {
      licensePlate: string;
      chassis: string;
      renavam: string;
    },
    excludeId?: EntityId,
  ): Promise<void> {
    const checks: Array<{
      field: VehicleUniqueField;
      value: string;
      label: string;
    }> = [
      {
        field: 'licensePlate',
        value: identifiers.licensePlate,
        label: 'license plate',
      },
      { field: 'chassis', value: identifiers.chassis, label: 'chassis' },
      { field: 'renavam', value: identifiers.renavam, label: 'renavam' },
    ];

    for (const { field, value, label } of checks) {
      const existing = await this.vehiclesRepository.findOne({
        where: { [field]: value },
      });

      if (existing && existing.id !== excludeId) {
        throw new ConflictException(
          `Vehicle with ${label} "${value}" already exists`,
        );
      }
    }
  }

  private async invalidateVehicleCache(id?: EntityId): Promise<void> {
    await this.cacheManager.del(VEHICLES_LIST_CACHE_KEY);

    if (id) {
      await this.cacheManager.del(vehicleByIdCacheKey(id));
    }
  }

  private toResponse(vehicle: Vehicle): VehicleResponseDto {
    return {
      id: vehicle.id,
      licensePlate: vehicle.licensePlate,
      chassis: vehicle.chassis,
      renavam: vehicle.renavam,
      year: vehicle.year,
      modelId: vehicle.modelId,
      modelName: vehicle.model?.name ?? '',
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
      createdBy: vehicle.createdBy,
    };
  }
}
