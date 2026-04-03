import { ExecutionContext, Logger } from '@nestjs/common';
import { of } from 'rxjs';
import { CacheInterceptor } from './cache.interceptor';
import { NocoDBCacheService } from '../cache/nocodb-cache.service';

function makeContext(method: string, url: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, url }),
    }),
  } as unknown as ExecutionContext;
}

describe('CacheInterceptor', () => {
  let interceptor: CacheInterceptor;
  let cacheService: jest.Mocked<NocoDBCacheService>;

  beforeEach(() => {
    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    } as any;
    interceptor = new CacheInterceptor(cacheService);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should pass through non-GET requests without caching', async () => {
    const context = makeContext('POST', '/api/resource');
    const next = { handle: jest.fn().mockReturnValue(of({ id: 1 })) };

    const observable = await interceptor.intercept(context as any, next as any);
    expect(cacheService.get).not.toHaveBeenCalled();
    observable.subscribe();
    expect(next.handle).toHaveBeenCalled();
  });

  it('should return cached response for GET requests on cache hit', async () => {
    const cachedData = { id: 1, name: 'cached' };
    cacheService.get.mockResolvedValue(cachedData);
    const context = makeContext('GET', '/api/examples');
    const next = { handle: jest.fn() };

    const observable = await interceptor.intercept(context as any, next as any);
    const result = await new Promise((resolve) => observable.subscribe(resolve));

    expect(result).toEqual(cachedData);
    expect(next.handle).not.toHaveBeenCalled();
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      expect.stringContaining('Cache hit'),
    );
  });

  it('should cache response for GET requests on cache miss', async () => {
    cacheService.get.mockResolvedValue(null);
    cacheService.set.mockResolvedValue(undefined);
    const responseData = { id: 2, name: 'fresh' };
    const context = makeContext('GET', '/api/examples');
    const next = { handle: jest.fn().mockReturnValue(of(responseData)) };

    const observable = await interceptor.intercept(context as any, next as any);
    await new Promise<void>((resolve) => {
      observable.subscribe({
        next: () => {},
        complete: resolve,
      });
    });

    expect(cacheService.set).toHaveBeenCalledWith(
      'route:/api/examples',
      responseData,
      expect.any(Number),
    );
  });
});
