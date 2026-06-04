import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { EntityId } from '../../common/types/entity-id.type';
import { Brand } from '../brands/entities/brand.entity';
import { VehiclesService } from '../vehicles/vehicles.service';
import type { CreateModelInput } from './dto/create-model.input';
import { ModelResponseDto } from './dto/model-response.dto';
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
    return this.toResponse(await this.findEntityWithBrandOrFail(saved.id));
  }

  async findAll(): Promise<ModelResponseDto[]> {
    const models = await this.modelsRepository.find({
      relations: { brand: true },
      order: { name: 'ASC' },
    });

    return models.map((model) => this.toResponse(model));
  }

  async findOne(id: EntityId): Promise<ModelResponseDto> {
    const model = await this.findEntityWithBrandOrFail(id);
    return this.toResponse(model);
  }

  async update(
    id: EntityId,
    input: UpdateModelInput,
  ): Promise<ModelResponseDto> {
    const model = await this.findEntityWithBrandOrFail(id);

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
    return this.toResponse(await this.findEntityWithBrandOrFail(id));
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

  private async findEntityOrFail(id: EntityId): Promise<Model> {
    const model = await this.modelsRepository.findOne({ where: { id } });

    if (!model) {
      throw new NotFoundException(`Model with id "${id}" not found`);
    }

    return model;
  }

  private async findEntityWithBrandOrFail(id: EntityId): Promise<Model> {
    const model = await this.modelsRepository.findOne({
      where: { id },
      relations: { brand: true },
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

  private toResponse(model: Model): ModelResponseDto {
    return {
      id: model.id,
      name: model.name,
      brandId: model.brandId,
      brandName: model.brand?.name ?? null,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      createdBy: model.createdBy,
    };
  }
}
