import { getMetadataArgsStorage } from 'typeorm';
import { validate as validateUuid } from 'uuid';
import { isUuidV7, toUuidV7 } from '../../../common/types/entity-id.type';
import { Brand } from '../../brands/entities/brand.entity';
import { Model } from './model.entity';

describe('Model', () => {
  const brandId = toUuidV7('018f1234-5678-7890-abcd-ef1234567890');

  describe('assignId', () => {
    it('generates a UUID v7 when id is not set', () => {
      const model = new Model();

      model.assignId();

      expect(model.id).toBeDefined();
      expect(validateUuid(model.id)).toBe(true);
      expect(isUuidV7(model.id)).toBe(true);
    });
  });

  describe('columns and relations', () => {
    it('maps name, brandId and brand relation', () => {
      const brand = new Brand();
      brand.id = brandId;
      brand.name = 'Toyota';

      const model = new Model();
      model.name = 'Corolla';
      model.brandId = brandId;
      model.brand = brand;

      expect(model.name).toBe('Corolla');
      expect(model.brandId).toBe(brandId);
      expect(model.brand).toBe(brand);
    });
  });

  describe('entity metadata', () => {
    it('registers brand many-to-one relation', () => {
      const relation = getMetadataArgsStorage().relations.find(
        (entry) => entry.target === Model && entry.propertyName === 'brand',
      );

      expect(relation).toBeDefined();
      expect(relation?.type()).toBe(Brand);
    });

    it('maps entity to models table', () => {
      const table = getMetadataArgsStorage().tables.find(
        (entry) => entry.target === Model,
      );

      expect(table?.name).toBe('models');
    });

    it('registers brand_id join column on brand relation', () => {
      const joinColumn = getMetadataArgsStorage().joinColumns.find(
        (entry) => entry.target === Model && entry.propertyName === 'brand',
      );

      expect(joinColumn?.name).toBe('brand_id');
    });
  });
});
