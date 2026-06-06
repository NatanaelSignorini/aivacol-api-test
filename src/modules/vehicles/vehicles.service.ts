import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Cache } from 'cache-manager';
import {
  type FindOptionsRelations,
  type FindOptionsWhere,
  Like,
  Repository,
} from 'typeorm';
import { ConditionalCache } from '../../common/decorators/conditional-cache.decorator';
import { DEFAULT_PAGE_SIZE } from '../../common/dto/pagination-query.dto';
import type { Connection } from '../../common/interfaces/connection.interface';
import type { EntityId } from '../../common/types/entity-id.type';
import { toConnection } from '../../common/utils/api-response.util';
import {
  normalizeChassis,
  normalizeLicensePlate,
  normalizeRenavam,
} from '../../common/validators/vehicle-identifiers.validator';
import { BrandResponseDto } from '../brands/dto/brand-response.dto';
import { Brand } from '../brands/entities/brand.entity';
import { ModelResponseDto } from '../models/dto/model-response.dto';
import { Model } from '../models/entities/model.entity';
import type { CreateVehicleInput } from './dto/create-vehicle.input';
import type { UpdateVehicleInput } from './dto/update-vehicle.input';
import { VehicleResponseDto } from './dto/vehicle-response.dto';
import {
  resolveVehicleIncludeOptions,
  type VehicleIncludeOptions,
  type VehiclesIncludeQueryDto,
} from './dto/vehicles-include-query.dto';
import type { VehiclesListQueryDto } from './dto/vehicles-list-query.dto';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleEventsPublisher } from './publishers/vehicle-events.publisher';
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
    private readonly vehicleEventsPublisher: VehicleEventsPublisher,
  ) {}

  /**
   * Cria veículo após validar model, normalizar identificadores BR e garantir unicidade.
   * Invalida cache de listagem, publica evento `vehicle.created` e retorna com includes opcionais.
   */
  async create(
    input: CreateVehicleInput,
    createdBy: EntityId,
    includeQuery: VehiclesIncludeQueryDto = {},
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

    const includeOptions = resolveVehicleIncludeOptions(includeQuery);
    const response = this.toResponse(
      await this.findEntityOrFail(saved.id, includeOptions),
      includeOptions,
    );
    await this.vehicleEventsPublisher.publishCreated(response);

    return response;
  }

  /**
   * Lista veículos com filtros, paginação e includes opcionais.
   * Usa cache Redis apenas na consulta padrão (sem filtros/includes/paginação customizada).
   */
  @ConditionalCache({
    shouldCache: function (
      this: VehiclesService,
      query: VehiclesListQueryDto,
    ) {
      const includeOptions = resolveVehicleIncludeOptions(query);
      return this.canUseListCache(query, includeOptions);
    },
    cacheKey: VEHICLES_LIST_CACHE_KEY,
  })
  async findAll(
    query: VehiclesListQueryDto,
  ): Promise<Connection<VehicleResponseDto>> {
    const includeOptions = resolveVehicleIncludeOptions(query);
    const where = this.buildListWhere(query);
    const [vehicles, totalCount] = await this.vehiclesRepository.findAndCount({
      where,
      relations: this.buildRelations(includeOptions),
      order: { licensePlate: 'ASC' },
      skip: query.skip,
      take: query.first,
    });

    return toConnection(
      vehicles.map((vehicle) => this.toResponse(vehicle, includeOptions)),
      totalCount,
      query.skip,
    );
  }

  /** Indica se a listagem padrão (sem filtros/includes) pode ser servida pelo cache Redis. */
  private canUseListCache(
    query: VehiclesListQueryDto,
    includeOptions: VehicleIncludeOptions,
  ): boolean {
    return (
      !includeOptions.includeModel &&
      !includeOptions.includeBrand &&
      query.skip === 0 &&
      query.first === DEFAULT_PAGE_SIZE &&
      !query.licensePlate &&
      !query.modelId &&
      !query.brandId &&
      query.year === undefined
    );
  }

  /** Monta filtros WHERE para listagem (placa parcial, modelId, brandId, ano). */
  private buildListWhere(
    query: VehiclesListQueryDto,
  ): FindOptionsWhere<Vehicle> {
    const where: FindOptionsWhere<Vehicle> = {};

    if (query.licensePlate) {
      where.licensePlate = Like(
        `%${normalizeLicensePlate(query.licensePlate)}%`,
      );
    }

    if (query.modelId) {
      where.modelId = query.modelId;
    }

    if (query.year !== undefined) {
      where.year = query.year;
    }

    if (query.brandId) {
      where.model = { brandId: query.brandId };
    }

    return where;
  }

  /**
   * Busca veículo por id com includes opcionais.
   * Cacheia resposta por id quando não há includes de model/brand.
   */
  @ConditionalCache({
    shouldCache: function (
      this: VehiclesService,
      _id: EntityId,
      includeQuery: VehiclesIncludeQueryDto = {},
    ) {
      return this.canUseItemCache(resolveVehicleIncludeOptions(includeQuery));
    },
    cacheKey: (id: EntityId) => vehicleByIdCacheKey(id),
  })
  async findOne(
    id: EntityId,
    includeQuery: VehiclesIncludeQueryDto = {},
  ): Promise<VehicleResponseDto> {
    const includeOptions = resolveVehicleIncludeOptions(includeQuery);
    const vehicle = await this.findEntityOrFail(id, includeOptions);

    return this.toResponse(vehicle, includeOptions);
  }

  /** Indica se a consulta por id pode usar cache (sem includes aninhados). */
  private canUseItemCache(includeOptions: VehicleIncludeOptions): boolean {
    return !includeOptions.includeModel && !includeOptions.includeBrand;
  }

  /**
   * Atualiza campos parciais do veículo, revalidando model e unicidade de identificadores.
   * Invalida cache (list + id), publica evento `vehicle.updated`.
   */
  async update(
    id: EntityId,
    input: UpdateVehicleInput,
    includeQuery: VehiclesIncludeQueryDto = {},
  ): Promise<VehicleResponseDto> {
    const includeOptions = resolveVehicleIncludeOptions(includeQuery);
    const vehicle = await this.findEntityOrFail(id, includeOptions);

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

    const response = this.toResponse(
      await this.findEntityOrFail(id, includeOptions),
      includeOptions,
    );
    await this.vehicleEventsPublisher.publishUpdated(response);

    return response;
  }

  /**
   * Remove veículo, invalida cache e publica evento `vehicle.deleted` com snapshot pré-remoção.
   */
  async remove(
    id: EntityId,
    includeQuery: VehiclesIncludeQueryDto = {},
  ): Promise<void> {
    const includeOptions = resolveVehicleIncludeOptions(includeQuery);
    const vehicle = await this.findEntityOrFail(id, includeOptions);
    const snapshot = this.toResponse(vehicle, includeOptions);
    await this.vehiclesRepository.remove(vehicle);
    await this.invalidateVehicleCache(id);
    await this.vehicleEventsPublisher.publishDeleted(snapshot);
  }

  /** Conta veículos vinculados a um model (usado para bloquear delete de model). */
  async countByModelId(modelId: EntityId): Promise<number> {
    return this.vehiclesRepository.count({ where: { modelId } });
  }

  /** Define relações TypeORM (model e brand aninhada) conforme includes solicitados. */
  private buildRelations(
    includeOptions: VehicleIncludeOptions,
  ): FindOptionsRelations<Vehicle> | undefined {
    if (!includeOptions.includeModel) {
      return undefined;
    }

    if (includeOptions.includeBrand) {
      return { model: { brand: true } };
    }

    return { model: true };
  }

  /** Carrega entidade Vehicle com relações opcionais ou lança NotFoundException. */
  private async findEntityOrFail(
    id: EntityId,
    includeOptions: VehicleIncludeOptions = {
      includeModel: false,
      includeBrand: false,
    },
  ): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id },
      relations: this.buildRelations(includeOptions),
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with id "${id}" not found`);
    }

    return vehicle;
  }

  /** Verifica existência do model referenciado; lança 404 se ausente. */
  private async assertModelExists(modelId: EntityId): Promise<void> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
    });

    if (!model) {
      throw new NotFoundException(`Model with id "${modelId}" not found`);
    }
  }

  /**
   * Garante unicidade de placa, chassis e renavam.
   * Ignora o registro atual quando `excludeId` é informado (update).
   */
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

  /** Remove entradas de cache da listagem e, opcionalmente, do veículo por id. */
  private async invalidateVehicleCache(id?: EntityId): Promise<void> {
    await this.cacheManager.del(VEHICLES_LIST_CACHE_KEY);

    if (id) {
      await this.cacheManager.del(vehicleByIdCacheKey(id));
    }
  }

  /** Converte entidade Brand em DTO aninhado na resposta do veículo. */
  private toBrandResponse(brand: Brand): BrandResponseDto {
    return {
      id: brand.id,
      name: brand.name,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
      createdBy: brand.createdBy,
    };
  }

  /** Converte entidade Model em DTO, incluindo brand quando solicitado. */
  private toModelResponse(
    model: Model,
    includeOptions: VehicleIncludeOptions,
  ): ModelResponseDto {
    const response: ModelResponseDto = {
      id: model.id,
      name: model.name,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      createdBy: model.createdBy,
    };

    if (includeOptions.includeBrand) {
      response.brand = model.brand ? this.toBrandResponse(model.brand) : null;
    }

    return response;
  }

  /** Converte entidade Vehicle em DTO, incluindo model/brand conforme includes. */
  private toResponse(
    vehicle: Vehicle,
    includeOptions: VehicleIncludeOptions,
  ): VehicleResponseDto {
    const response: VehicleResponseDto = {
      id: vehicle.id,
      licensePlate: vehicle.licensePlate,
      chassis: vehicle.chassis,
      renavam: vehicle.renavam,
      year: vehicle.year,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
      createdBy: vehicle.createdBy,
    };

    if (includeOptions.includeModel && vehicle.model) {
      response.model = this.toModelResponse(vehicle.model, includeOptions);
    }

    return response;
  }
}
