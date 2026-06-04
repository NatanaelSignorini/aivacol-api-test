import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  type FindOptionsRelations,
  type FindOptionsWhere,
  Like,
  Repository,
} from 'typeorm';
import type { Connection } from '../../common/interfaces/connection.interface';
import type { EntityId } from '../../common/types/entity-id.type';
import { toConnection } from '../../common/utils/api-response.util';
import { BrandResponseDto } from '../brands/dto/brand-response.dto';
import { Brand } from '../brands/entities/brand.entity';
import { VehiclesService } from '../vehicles/vehicles.service';
import type { CreateModelInput } from './dto/create-model.input';
import { ModelResponseDto } from './dto/model-response.dto';
import {
  type ModelIncludeOptions,
  type ModelsIncludeQueryDto,
  resolveModelIncludeOptions,
} from './dto/models-include-query.dto';
import type { ModelsListQueryDto } from './dto/models-list-query.dto';
import type { UpdateModelInput } from './dto/update-model.input';
import { Model } from './entities/model.entity';

@Injectable()
export class ModelsService {
  constructor(
    @InjectRepository(Model)
    private readonly modelsRepository: Repository<Model>,
    @InjectRepository(Brand)
    private readonly brandsRepository: Repository<Brand>,
    private readonly vehiclesService: VehiclesService,
  ) {}

  /**
   * Cria um model vinculado a uma brand existente (`brandId` obrigatório).
   * Suporta includes opcionais de brand na resposta via query string.
   */
  async create(
    input: CreateModelInput,
    createdBy: EntityId,
    includeQuery: ModelsIncludeQueryDto = {},
  ): Promise<ModelResponseDto> {
    await this.assertBrandExists(input.brandId);

    const model = this.modelsRepository.create({
      name: input.name.trim(),
      brandId: input.brandId,
      createdBy,
    });

    const saved = await this.modelsRepository.save(model);
    const includeOptions = resolveModelIncludeOptions(includeQuery);

    return this.toResponse(
      await this.findEntityOrFail(saved.id, includeOptions),
      includeOptions,
    );
  }

  /**
   * Lista models com paginação e filtros opcionais por nome e brandId.
   * Carrega relação brand quando solicitado via includes.
   */
  async findAll(
    query: ModelsListQueryDto,
  ): Promise<Connection<ModelResponseDto>> {
    const includeOptions = resolveModelIncludeOptions(query);
    const where: FindOptionsWhere<Model> = {};

    if (query.name) {
      where.name = Like(`%${query.name.trim()}%`);
    }

    if (query.brandId) {
      where.brandId = query.brandId;
    }

    const [models, totalCount] = await this.modelsRepository.findAndCount({
      where,
      relations: this.buildRelations(includeOptions),
      order: { name: 'ASC' },
      skip: query.skip,
      take: query.first,
    });

    return toConnection(
      models.map((model) => this.toResponse(model, includeOptions)),
      totalCount,
      query.skip,
    );
  }

  /** Busca model por id com includes opcionais; lança 404 se não existir. */
  async findOne(
    id: EntityId,
    includeQuery: ModelsIncludeQueryDto = {},
  ): Promise<ModelResponseDto> {
    const includeOptions = resolveModelIncludeOptions(includeQuery);
    const model = await this.findEntityOrFail(id, includeOptions);

    return this.toResponse(model, includeOptions);
  }

  /**
   * Atualiza nome e/ou brandId do model.
   * Revalida existência da brand quando `brandId` é alterado.
   */
  async update(
    id: EntityId,
    input: UpdateModelInput,
    includeQuery: ModelsIncludeQueryDto = {},
  ): Promise<ModelResponseDto> {
    const includeOptions = resolveModelIncludeOptions(includeQuery);
    const model = await this.findEntityOrFail(id, includeOptions);

    if (input.name !== undefined) {
      model.name = input.name.trim();
    }

    if (input.brandId !== undefined) {
      await this.assertBrandExists(input.brandId);
      model.brandId = input.brandId;
    }

    await this.modelsRepository.save(model);

    return this.toResponse(
      await this.findEntityOrFail(id, includeOptions),
      includeOptions,
    );
  }

  /** Conta models vinculados a uma brand (usado para bloquear delete de brand). */
  async countByBrandId(brandId: EntityId): Promise<number> {
    return this.modelsRepository.count({ where: { brandId } });
  }

  /**
   * Remove o model se não houver veículos vinculados.
   * Lança 409 Conflict quando existem vehicles referenciando o model.
   */
  async remove(id: EntityId): Promise<void> {
    const model = await this.findEntityOrFail(id);
    const vehicleCount = await this.vehiclesService.countByModelId(id);

    if (vehicleCount > 0) {
      throw new ConflictException(
        `Model with id "${id}" cannot be removed while vehicles reference it`,
      );
    }

    await this.modelsRepository.remove(model);
  }

  /** Monta relações TypeORM conforme opções de include da query. */
  private buildRelations(
    includeOptions: ModelIncludeOptions,
  ): FindOptionsRelations<Model> | undefined {
    if (!includeOptions.includeBrand) {
      return undefined;
    }

    return { brand: true };
  }

  /** Carrega entidade Model com relações opcionais ou lança NotFoundException. */
  private async findEntityOrFail(
    id: EntityId,
    includeOptions: ModelIncludeOptions = {
      includeBrand: false,
    },
  ): Promise<Model> {
    const model = await this.modelsRepository.findOne({
      where: { id },
      relations: this.buildRelations(includeOptions),
    });

    if (!model) {
      throw new NotFoundException(`Model with id "${id}" not found`);
    }

    return model;
  }

  /** Verifica se a brand referenciada existe; lança 404 caso contrário. */
  private async assertBrandExists(brandId: EntityId): Promise<void> {
    const brand = await this.brandsRepository.findOne({
      where: { id: brandId },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with id "${brandId}" not found`);
    }
  }

  /** Converte entidade Brand em DTO aninhado na resposta do model. */
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
  private toResponse(
    model: Model,
    includeOptions: ModelIncludeOptions,
  ): ModelResponseDto {
    const response: ModelResponseDto = {
      id: model.id,
      name: model.name,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      createdBy: model.createdBy,
    };

    if (includeOptions.includeBrand) {
      response.brand = this.toBrandResponse(model.brand);
    }

    return response;
  }
}
