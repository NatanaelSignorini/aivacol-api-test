import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type FindOptionsWhere, Like, Repository } from 'typeorm';
import type { Connection } from '../../common/interfaces/connection.interface';
import type { EntityId } from '../../common/types/entity-id.type';
import { toConnection } from '../../common/utils/api-response.util';
import { ModelsService } from '../models/models.service';
import { BrandResponseDto } from './dto/brand-response.dto';
import type { BrandsListQueryDto } from './dto/brands-list-query.dto';
import type { CreateBrandInput } from './dto/create-brand.input';
import type { UpdateBrandInput } from './dto/update-brand.input';
import { Brand } from './entities/brand.entity';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandsRepository: Repository<Brand>,
    private readonly modelsService: ModelsService,
  ) {}

  async create(
    input: CreateBrandInput,
    createdBy: EntityId,
  ): Promise<BrandResponseDto> {
    await this.assertNameIsUnique(input.name);

    const brand = this.brandsRepository.create({
      name: input.name.trim(),
      createdBy,
    });

    const saved = await this.brandsRepository.save(brand);

    return this.toResponse(saved);
  }

  async findAll(
    query: BrandsListQueryDto,
  ): Promise<Connection<BrandResponseDto>> {
    const where: FindOptionsWhere<Brand> = {};

    if (query.name) {
      where.name = Like(`%${query.name.trim()}%`);
    }

    const [brands, totalCount] = await this.brandsRepository.findAndCount({
      where,
      order: { name: 'ASC' },
      skip: query.skip,
      take: query.first,
    });

    return toConnection(
      brands.map((brand) => this.toResponse(brand)),
      totalCount,
      query.skip,
    );
  }

  async findOne(id: EntityId): Promise<BrandResponseDto> {
    const brand = await this.findEntityOrFail(id);

    return this.toResponse(brand);
  }

  async update(
    id: EntityId,
    input: UpdateBrandInput,
  ): Promise<BrandResponseDto> {
    const brand = await this.findEntityOrFail(id);

    if (input.name !== undefined) {
      await this.assertNameIsUnique(input.name, id);
      brand.name = input.name.trim();
    }

    const saved = await this.brandsRepository.save(brand);

    return this.toResponse(saved);
  }

  async remove(id: EntityId): Promise<void> {
    const brand = await this.findEntityOrFail(id);
    const modelCount = await this.modelsService.countByBrandId(id);

    if (modelCount > 0) {
      throw new ConflictException(
        `Brand with id "${id}" cannot be removed while models reference it`,
      );
    }

    await this.brandsRepository.remove(brand);
  }

  private async findEntityOrFail(id: EntityId): Promise<Brand> {
    const brand = await this.brandsRepository.findOne({ where: { id } });

    if (!brand) {
      throw new NotFoundException(`Brand with id "${id}" not found`);
    }

    return brand;
  }

  private async assertNameIsUnique(
    name: string,
    excludeId?: EntityId,
  ): Promise<void> {
    const normalizedName = name.trim();
    const existing = await this.brandsRepository.findOne({
      where: { name: normalizedName },
    });

    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `Brand with name "${normalizedName}" already exists`,
      );
    }
  }

  private toResponse(brand: Brand): BrandResponseDto {
    return {
      id: brand.id,
      name: brand.name,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
      createdBy: brand.createdBy,
    };
  }
}
