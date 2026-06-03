import type { EntityId } from '../../../common/types/entity-id.type';

export class BrandResponseDto {
  id!: EntityId;
  name!: string;
  createdAt!: Date;
  updatedAt!: Date;
  createdBy!: EntityId;
}
