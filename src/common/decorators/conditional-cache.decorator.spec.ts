import type { Cache } from 'cache-manager';
import { ConditionalCache } from './conditional-cache.decorator';

describe('ConditionalCache decorator', () => {
  const createCacheManager = (): jest.Mocked<Pick<Cache, 'get' | 'set'>> => ({
    get: jest.fn(),
    set: jest.fn(),
  });

  it('returns cached value on cache hit without executing the original method', async () => {
    const cacheManager = createCacheManager();
    cacheManager.get.mockResolvedValue({ cached: true });
    const original = jest.fn();

    class TestService {
      cacheManager = cacheManager as unknown as Cache;

      @ConditionalCache({
        shouldCache: () => true,
        cacheKey: 'test:key',
      })
      async fetch(): Promise<{ cached: boolean }> {
        return original();
      }
    }

    const service = new TestService();
    const result = await service.fetch();

    expect(result).toEqual({ cached: true });
    expect(cacheManager.get).toHaveBeenCalledWith('test:key');
    expect(original).not.toHaveBeenCalled();
    expect(cacheManager.set).not.toHaveBeenCalled();
  });

  it('executes the original method and stores the result on cache miss', async () => {
    const cacheManager = createCacheManager();
    cacheManager.get.mockResolvedValue(undefined);
    const freshValue = { value: 'fresh' };

    class TestService {
      cacheManager = cacheManager as unknown as Cache;

      @ConditionalCache({
        shouldCache: () => true,
        cacheKey: 'test:key',
      })
      async fetch(): Promise<{ value: string }> {
        return freshValue;
      }
    }

    const service = new TestService();
    const result = await service.fetch();

    expect(result).toEqual(freshValue);
    expect(cacheManager.get).toHaveBeenCalledWith('test:key');
    expect(cacheManager.set).toHaveBeenCalledWith('test:key', freshValue);
  });

  it('skips cache get and set when shouldCache returns false', async () => {
    const cacheManager = createCacheManager();

    class TestService {
      cacheManager = cacheManager as unknown as Cache;

      @ConditionalCache({
        shouldCache: () => false,
        cacheKey: 'test:key',
      })
      async fetch(): Promise<string> {
        return 'result';
      }
    }

    const service = new TestService();
    const result = await service.fetch();

    expect(result).toBe('result');
    expect(cacheManager.get).not.toHaveBeenCalled();
    expect(cacheManager.set).not.toHaveBeenCalled();
  });

  it('resolves dynamic cache keys from method arguments', async () => {
    const cacheManager = createCacheManager();
    cacheManager.get.mockResolvedValue(undefined);

    class TestService {
      cacheManager = cacheManager as unknown as Cache;

      @ConditionalCache({
        shouldCache: () => true,
        cacheKey: (id: string) => `entity:${id}`,
      })
      async fetch(id: string): Promise<string> {
        return `value:${id}`;
      }
    }

    const service = new TestService();
    await service.fetch('abc-123');

    expect(cacheManager.get).toHaveBeenCalledWith('entity:abc-123');
    expect(cacheManager.set).toHaveBeenCalledWith('entity:abc-123', 'value:abc-123');
  });

  it('does not store cache when the original method throws', async () => {
    const cacheManager = createCacheManager();
    cacheManager.get.mockResolvedValue(undefined);
    const error = new Error('not found');

    class TestService {
      cacheManager = cacheManager as unknown as Cache;

      @ConditionalCache({
        shouldCache: () => true,
        cacheKey: 'test:key',
      })
      async fetch(): Promise<never> {
        throw error;
      }
    }

    const service = new TestService();

    await expect(service.fetch()).rejects.toThrow(error);
    expect(cacheManager.set).not.toHaveBeenCalled();
  });

  it('evaluates shouldCache with the service instance as this', async () => {
    const cacheManager = createCacheManager();
    const shouldCache = jest.fn(function (this: { enabled: boolean }) {
      return this.enabled;
    });

    class TestService {
      enabled = false;
      cacheManager = cacheManager as unknown as Cache;

      @ConditionalCache({
        shouldCache,
        cacheKey: 'test:key',
      })
      async fetch(): Promise<string> {
        return 'result';
      }
    }

    const service = new TestService();
    await service.fetch();

    expect(shouldCache).toHaveBeenCalled();
    expect(cacheManager.get).not.toHaveBeenCalled();
  });
});
