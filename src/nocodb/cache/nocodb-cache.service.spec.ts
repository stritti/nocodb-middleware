import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { NocoDBCacheService } from './nocodb-cache.service';

type CacheManagerMock = {
  get: jest.Mock<Promise<unknown>, [string]>;
  set: jest.Mock<Promise<void>, [string, unknown, number?]>;
  del: jest.Mock<Promise<void>, [string]>;
};

describe('NocoDBCacheService', () => {
  let service: NocoDBCacheService;
  let cacheManager: CacheManagerMock;

  beforeEach(async () => {
    const mockCacheManager: CacheManagerMock = {
      get: jest.fn<Promise<unknown>, [string]>(),
      set: jest.fn<Promise<void>, [string, unknown, number?]>(),
      del: jest.fn<Promise<void>, [string]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NocoDBCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<NocoDBCacheService>(NocoDBCacheService);
    cacheManager = module.get<Cache>(CACHE_MANAGER) as CacheManagerMock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should get value from cache', async () => {
      const key = 'test-key';
      const value = { data: 'test' } as const;

      cacheManager.get.mockResolvedValue(value);

      const result = await service.get<typeof value>(key);

      expect(cacheManager.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(value);
    });
  });

  describe('set', () => {
    it('should set value in cache', async () => {
      const key = 'test-key';
      const value = { data: 'test' } as const;
      const ttl = 60000;

      await service.set(key, value, ttl);

      expect(cacheManager.set).toHaveBeenCalledWith(key, value, ttl);
    });
  });

  describe('generateKey', () => {
    it('should generate cache key from prefix and params', () => {
      const prefix = 'test';
      const params = { id: 1, name: 'example' } as const;

      const key = service.generateKey(prefix, params);

      expect(key).toBe('test:{"id":1,"name":"example"}');
    });
  });
});
