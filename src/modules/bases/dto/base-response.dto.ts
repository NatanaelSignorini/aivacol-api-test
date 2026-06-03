import type { EntityId } from '../../../common/types/entity-id.type';

export class BaseResponseDto {
  id!: EntityId;
  createdAt!: Date;
  updatedAt!: Date;
  createdBy!: EntityId;
}
