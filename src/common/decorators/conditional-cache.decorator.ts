import type { Cache } from 'cache-manager';

export interface ConditionalCacheOptions {
  /** Avalia se o resultado deve ser lido/gravado no cache para esta chamada. */
  shouldCache: (this: object, ...args: unknown[]) => boolean;
  /** Chave fixa ou função que monta a chave a partir dos argumentos do método. */
  cacheKey: string | ((...args: unknown[]) => string);
  /** Nome da propriedade de instância que expõe o Cache do Nest (padrão: cacheManager). */
  cacheManagerKey?: string;
}

interface CacheHost {
  [key: string]: Cache | unknown;
}

/**
 * Method decorator que aplica o padrão cache-aside em serviços NestJS.
 * Lê do cache antes de executar o método; grava o retorno somente quando
 * `shouldCache` é verdadeiro. Erros propagam sem gravar cache.
 */
export function ConditionalCache(
  options: ConditionalCacheOptions,
): MethodDecorator {
  const cacheManagerKey = options.cacheManagerKey ?? 'cacheManager';

  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>;

    descriptor.value = async function (
      this: CacheHost,
      ...args: unknown[]
    ): Promise<unknown> {
      const shouldCache = options.shouldCache.apply(this, args);

      if (!shouldCache) {
        return originalMethod.apply(this, args);
      }

      const cacheKey =
        typeof options.cacheKey === 'function'
          ? options.cacheKey(...args)
          : options.cacheKey;

      const cacheManager = this[cacheManagerKey] as Cache;
      const cached = await cacheManager.get(cacheKey);

      if (cached !== undefined && cached !== null) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      await cacheManager.set(cacheKey, result);

      return result;
    };

    return descriptor;
  };
}
