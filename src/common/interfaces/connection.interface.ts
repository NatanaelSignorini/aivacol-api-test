export type PageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type Connection<T> = {
  nodes: T[];
  pageInfo: PageInfo;
  totalCount: number;
};

export type ApiDataResponse<TKey extends string, TValue> = {
  data: Record<TKey, TValue>;
};
