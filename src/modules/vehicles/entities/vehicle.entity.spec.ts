import { getMetadataArgsStorage } from 'typeorm';
import { validate as validateUuid } from 'uuid';
import { isUuidV7, toUuidV7 } from '../../../common/types/entity-id.type';
import { Model } from '../../models/entities/model.entity';
import { Vehicle } from './vehicle.entity';

describe('Vehicle', () => {
  const modelId = toUuidV7('018f1234-5678-7890-abcd-ef1234567891');

  describe('assignId', () => {
    it('generates a UUID v7 when id is not set', () => {
      const vehicle = new Vehicle();

      vehicle.assignId();

      expect(vehicle.id).toBeDefined();
      expect(validateUuid(vehicle.id)).toBe(true);
      expect(isUuidV7(vehicle.id)).toBe(true);
    });
  });

  describe('columns and relations', () => {
    it('maps identifiers, year, modelId and model relation', () => {
      const model = new Model();
      model.id = modelId;
      model.name = 'Corolla';

      const vehicle = new Vehicle();
      vehicle.licensePlate = 'ABC1D23';
      vehicle.chassis = '9BWZZZ377VT004251';
      vehicle.renavam = '12345678901';
      vehicle.year = 2024;
      vehicle.modelId = modelId;
      vehicle.model = model;

      expect(vehicle.licensePlate).toBe('ABC1D23');
      expect(vehicle.chassis).toBe('9BWZZZ377VT004251');
      expect(vehicle.renavam).toBe('12345678901');
      expect(vehicle.year).toBe(2024);
      expect(vehicle.modelId).toBe(modelId);
      expect(vehicle.model).toBe(model);
    });
  });

  describe('entity metadata', () => {
    it('registers model many-to-one relation', () => {
      const relation = getMetadataArgsStorage().relations.find(
        (entry) => entry.target === Vehicle && entry.propertyName === 'model',
      );

      expect(relation).toBeDefined();
      expect(relation?.type()).toBe(Model);
    });

    it('maps entity to vehicles table', () => {
      const table = getMetadataArgsStorage().tables.find(
        (entry) => entry.target === Vehicle,
      );

      expect(table?.name).toBe('vehicles');
    });

    it('registers model_id join column on model relation', () => {
      const joinColumn = getMetadataArgsStorage().joinColumns.find(
        (entry) => entry.target === Vehicle && entry.propertyName === 'model',
      );

      expect(joinColumn?.name).toBe('model_id');
    });
  });
});
