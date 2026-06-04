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
import { Brand } from '../brands/entities/brand.entity';
import { VehiclesService } from '../vehicles/vehicles.service';
import type { CreateModelInput } from './dto/create-model.input';
import { BrandResponseDto } from '../brands/dto/brand-response.dto';
import { ModelResponseDto } from './dto/model-response.dto';
import {
  resolveModelIncludeOptions,
  type ModelIncludeOptions,
  type ModelsIncludeQueryDto,
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

  async create(
    input: CreateModelInput,
    createdBy: EntityId,
    includeQuery: ModelsIncludeQueryDto = {},
  ): Promise<ModelResponseDto> {
    if (input.brandId !== undefined) {
      await this.assertBrandExists(input.brandId);
    }

    const model = this.modelsRepository.create({
      name: input.name.trim(),
      brandId: input.brandId ?? null,
      createdBy,
    });

    const saved = await this.modelsRepository.save(model);
    const includeOptions = resolveModelIncludeOptions(includeQuery);

    return this.toResponse(
      await this.findEntityOrFail(saved.id, includeOptions),
      includeOptions,
    );
  }

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

  async findOne(
    id: EntityId,
    includeQuery: ModelsIncludeQueryDto = {},
  ): Promise<ModelResponseDto> {
    const includeOptions = resolveModelIncludeOptions(includeQuery);
    const model = await this.findEntityOrFail(id, includeOptions);

    return this.toResponse(model, includeOptions);
  }

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
      if (input.brandId !== null) {
        await this.assertBrandExists(input.brandId);
      }

      model.brandId = input.brandId;
    }

    await this.modelsRepository.save(model);

    return this.toResponse(
      await this.findEntityOrFail(id, includeOptions),
      includeOptions,
    );
  }

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

  private buildRelations(
    includeOptions: ModelIncludeOptions,
  ): FindOptionsRelations<Model> | undefined {
    if (!includeOptions.includeBrand) {
      return undefined;
    }

    return { brand: true };
  }

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

  private async assertBrandExists(brandId: EntityId): Promise<void> {
    const brand = await this.brandsRepository.findOne({
      where: { id: brandId },
    });

    if (!brand) {
      throw new NotFoundException(`Brand with id "${brandId}" not found`);
    }
  }

  private toBrandResponse(brand: Brand): BrandResponseDto {
    return {
      id: brand.id,
      name: brand.name,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
      createdBy: brand.createdBy,
    };
  }

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
      response.brand = model.brand ? this.toBrandResponse(model.brand) : null;
    }

    return response;
  }
}
