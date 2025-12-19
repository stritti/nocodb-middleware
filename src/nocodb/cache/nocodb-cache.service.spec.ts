import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NocoDBCacheService } from './nocodb-cache.service';

describe('NocoDBCacheService', () => {
    let service: NocoDBCacheService;
    let cacheManager: any;

    beforeEach(async () => {
        const mockCacheManager = {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
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
        cacheManager = module.get(CACHE_MANAGER);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('get', () => {
        it('should get value from cache', async () => {
            const key = 'test-key';
            const value = { data: 'test' };

            cacheManager.get.mockResolvedValue(value);

            const result = await service.get(key);

            expect(cacheManager.get).toHaveBeenCalledWith(key);
            expect(result).toEqual(value);
        });
    });

    describe('set', () => {
        it('should set value in cache', async () => {
            const key = 'test-key';
            const value = { data: 'test' };
            const ttl = 60000;

            await service.set(key, value, ttl);

            expect(cacheManager.set).toHaveBeenCalledWith(key, value, ttl);
        });
    });

    describe('generateKey', () => {
        it('should generate cache key from prefix and params', () => {
            const prefix = 'test';
            const params = { id: 1, name: 'example' };

            const key = service.generateKey(prefix, params);

            expect(key).toBe('test:{"id":1,"name":"example"}');
        });
    });
});
