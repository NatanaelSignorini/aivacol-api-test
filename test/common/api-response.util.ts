export function itemFrom<T, K extends string>(
  body: { data: Record<K, T> },
  key: K,
): T {
  return body.data[key];
}

export function nodesFrom<T, K extends string>(
  body: { data: Record<K, { nodes: T[] }> },
  key: K,
): T[] {
  return body.data[key].nodes;
}
