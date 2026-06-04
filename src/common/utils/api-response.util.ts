import type {
  ApiDataResponse,
  Connection,
} from '../interfaces/connection.interface';

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

export function buildListDataResponse<TKey extends string, T>(
  key: TKey,
  connection: Connection<T>,
): ApiDataResponse<TKey, Connection<T>> {
  return { data: { [key]: connection } as Record<TKey, Connection<T>> };
}

export function buildItemDataResponse<TKey extends string, T>(
  key: TKey,
  item: T,
): ApiDataResponse<TKey, T> {
  return { data: { [key]: item } as Record<TKey, T> };
}
