import type {
  ApiDataResponse,
  Connection,
} from '../interfaces/connection.interface';

/** Monta objeto de conexão paginada (nodes, pageInfo, totalCount). */
export function toConnection<T>(
  nodes: T[],
  totalCount: number,
  skip: number,
): Connection<T> {
  return {
    nodes,
    pageInfo: {
      hasNextPage: skip + nodes.length < totalCount,
      hasPreviousPage: skip > 0,
    },
    totalCount,
  };
}

/** Envelopa conexão paginada em `{ data: { [key]: connection } }`. */
export function buildListDataResponse<TKey extends string, T>(
  key: TKey,
  connection: Connection<T>,
): ApiDataResponse<TKey, Connection<T>> {
  return { data: { [key]: connection } as Record<TKey, Connection<T>> };
}

/** Envelopa item único em `{ data: { [key]: item } }`. */
export function buildItemDataResponse<TKey extends string, T>(
  key: TKey,
  item: T,
): ApiDataResponse<TKey, T> {
  return { data: { [key]: item } as Record<TKey, T> };
}
