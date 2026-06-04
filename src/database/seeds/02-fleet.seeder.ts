import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NotFoundException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import type { Seeder, SeederFactoryManager } from 'typeorm-extension';
import type { EntityId } from '../../common/types/entity-id.type';
import {
  normalizeChassis,
  normalizeLicensePlate,
  normalizeRenavam,
} from '../../common/validators/vehicle-identifiers.validator';
import { Brand } from '../../modules/brands/entities/brand.entity';
import { Model } from '../../modules/models/entities/model.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Vehicle } from '../../modules/vehicles/entities/vehicle.entity';

const AIVACOL_EMAIL = 'admin@aivacol.com';
const FLEET_SEED_PATH = join(__dirname, '../seed-data/fleet.seed.json');

interface FleetMockFile {
  version: number;
  brands: Array<{ name: string }>;
  models: Array<{ name: string; brand: string }>;
  vehicles: Array<{
    licensePlate: string;
    chassis: string;
    renavam: string;
    year: number;
    model: string;
  }>;
}

export default class FleetSeeder implements Seeder {
  /**
   * Carrega marcas, models e veículos de `fleet.seed.json` de forma idempotente.
   * Exige admin criado pelo AivacolUserSeeder; normaliza identificadores BR.
   */
  public async run(
    dataSource: DataSource,
    _factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const mock = JSON.parse(
      readFileSync(FLEET_SEED_PATH, 'utf8'),
    ) as FleetMockFile;

    if (mock.version !== 1) {
      throw new Error(`Unsupported fleet mock version: ${mock.version}`);
    }

    const users = dataSource.getRepository(User);
    const brands = dataSource.getRepository(Brand);
    const models = dataSource.getRepository(Model);
    const vehicles = dataSource.getRepository(Vehicle);

    const admin = await users.findOne({ where: { email: AIVACOL_EMAIL } });

    if (!admin) {
      throw new NotFoundException(
        `User "${AIVACOL_EMAIL}" not found. Run AivacolUserSeeder first.`,
      );
    }

    const createdBy = admin.id;
    const brandIds = new Map<string, EntityId>();
    let brandsCreated = 0;
    let brandsSkipped = 0;
    let modelsCreated = 0;
    let modelsSkipped = 0;
    let vehiclesCreated = 0;
    let vehiclesSkipped = 0;

    for (const { name } of mock.brands) {
      const existing = await brands.findOne({ where: { name } });

      if (existing) {
        brandIds.set(name, existing.id);
        brandsSkipped += 1;
        continue;
      }

      const saved = await brands.save(brands.create({ name, createdBy }));
      brandIds.set(name, saved.id);
      brandsCreated += 1;
    }

    const modelIds = new Map<string, EntityId>();

    for (const entry of mock.models) {
      const existing = await models.findOne({ where: { name: entry.name } });

      if (existing) {
        modelIds.set(entry.name, existing.id);
        modelsSkipped += 1;
        continue;
      }

      const brandId = brandIds.get(entry.brand);

      if (!brandId) {
        throw new NotFoundException(
          `Brand "${entry.brand}" not found for model "${entry.name}"`,
        );
      }

      const saved = await models.save(
        models.create({ name: entry.name, brandId, createdBy }),
      );
      modelIds.set(entry.name, saved.id);
      modelsCreated += 1;
    }

    for (const entry of mock.vehicles) {
      const licensePlate = normalizeLicensePlate(entry.licensePlate);
      const existing = await vehicles.findOne({ where: { licensePlate } });

      if (existing) {
        vehiclesSkipped += 1;
        continue;
      }

      const modelId = modelIds.get(entry.model);

      if (!modelId) {
        throw new NotFoundException(
          `Model "${entry.model}" not found for plate ${licensePlate}`,
        );
      }

      await vehicles.save(
        vehicles.create({
          licensePlate,
          chassis: normalizeChassis(entry.chassis),
          renavam: normalizeRenavam(entry.renavam),
          year: entry.year,
          modelId,
          createdBy,
        }),
      );
      vehiclesCreated += 1;
    }

    console.log(
      'FleetSeeder:',
      JSON.stringify({
        brandsCreated,
        brandsSkipped,
        modelsCreated,
        modelsSkipped,
        vehiclesCreated,
        vehiclesSkipped,
      }),
    );
  }
}
