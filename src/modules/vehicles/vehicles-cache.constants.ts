import type { EntityId } from '../../common/types/entity-id.type';

export const VEHICLES_LIST_CACHE_KEY = 'vehicles:list';

export const vehicleByIdCacheKey = (id: EntityId): string =>
  `vehicles:id:${id}`;
