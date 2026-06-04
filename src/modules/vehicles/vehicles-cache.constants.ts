import type { EntityId } from '../../common/types/entity-id.type';

/** Chave Redis para listagem padrão de veículos (sem filtros/includes). */
export const VEHICLES_LIST_CACHE_KEY = 'vehicles:list';

/** Monta chave Redis de cache por id de veículo. */
export const vehicleByIdCacheKey = (id: EntityId): string =>
  `vehicles:id:${id}`;
