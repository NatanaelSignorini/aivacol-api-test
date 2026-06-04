import { type FindOptionsWhere, Like, type ObjectLiteral } from 'typeorm';

type FindAndCountOptions<T extends ObjectLiteral> = {
  where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  skip?: number;
  take?: number;
  order?: Record<string, 'ASC' | 'DESC'>;
};

function matchesWhere<T extends ObjectLiteral>(
  item: T,
  where: FindOptionsWhere<T>,
): boolean {
  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) {
      continue;
    }

    const field = item[key as keyof T];

    if (
      typeof value === 'object' &&
      value !== null &&
      '_type' in value &&
      (value as Like<string> & { _type: string })._type === 'like'
    ) {
      const pattern = String(
        (value as Like<string> & { _value: string })._value ?? '',
      ).replace(/%/g, '');
      const haystack = String(field ?? '').toLowerCase();
      if (!haystack.includes(pattern.toLowerCase())) {
        return false;
      }
      continue;
    }

    if (field !== value) {
      return false;
    }
  }

  return true;
}

export function createFindAndCount<T extends ObjectLiteral>(
  getItems: () => T[],
  defaultOrder: (a: T, b: T) => number,
): (options?: FindAndCountOptions<T>) => Promise<[T[], number]> {
  return async (options) => {
    let items = getItems().sort(defaultOrder);

    if (options?.where) {
      const clauses = Array.isArray(options.where)
        ? options.where
        : [options.where];

      items = items.filter((item) =>
        clauses.some((where) => matchesWhere(item, where)),
      );
    }

    const totalCount = items.length;
    const skip = options?.skip ?? 0;
    const take = options?.take ?? items.length;

    return [items.slice(skip, skip + take), totalCount];
  };
}
