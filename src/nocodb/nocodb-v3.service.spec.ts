
import { Test, TestingModule } from '@nestjs/testing';
import { NocoDBV3Service } from './nocodb-v3.service';
import { NocoDBService } from './nocodb.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

describe('NocoDBV3Service', () => {
    let service: NocoDBV3Service;
    let nocoDBService: NocoDBService;
    let mockHttpClient: any;

    const mockBaseId = 'test-base-id';

    beforeEach(async () => {
        mockHttpClient = {
            post: jest.fn(),
            get: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn(),
            defaults: { baseURL: 'http://test-url' },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NocoDBV3Service,
                {
                    provide: NocoDBService,
                    useValue: {
                        getHttpClient: jest.fn().mockReturnValue(mockHttpClient),
                        getBaseId: jest.fn().mockReturnValue(mockBaseId),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<NocoDBV3Service>(NocoDBV3Service);
        nocoDBService = module.get<NocoDBService>(NocoDBService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a record', async () => {
            const tableId = 'mUsers';
            const data = { name: 'Test User' };
            const responseData = { id: 1, ...data };
            mockHttpClient.post.mockResolvedValue({ data: responseData });

            const result = await service.create(tableId, data);

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                `/api/v3/tables/${tableId}/records`,
                data,
                { params: {} },
            );
            expect(result).toEqual(responseData);
        });

        it('should include specific fields if requested', async () => {
            const tableId = 'mUsers';
            const data = { name: 'Test User' };
            const options = { includeFields: ['id', 'name'] };
            mockHttpClient.post.mockResolvedValue({ data: { id: 1 } });

            await service.create(tableId, data, options);

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                expect.any(String),
                data,
                { params: { fields: 'id,name' } },
            );
        });
    });

    describe('read', () => {
        it('should read a record', async () => {
            const tableId = 'mUsers';
            const recordId = 1;
            const responseData = { id: 1, name: 'Test User' };
            mockHttpClient.get.mockResolvedValue({ data: responseData });

            const result = await service.read(tableId, recordId);

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                `/api/v3/tables/${tableId}/records/${recordId}`,
                { params: {} },
            );
            expect(result).toEqual(responseData);
        });

        it('should include relations if requested', async () => {
            const tableId = 'mUsers';
            const recordId = 1;
            const options = { includeRelations: ['posts'] };
            mockHttpClient.get.mockResolvedValue({ data: {} });

            await service.read(tableId, recordId, options);

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                expect.any(String),
                {
                    params: {
                        nested: JSON.stringify({ posts: { fields: ['*'] } }),
                    },
                },
            );
        });
    });

    describe('update', () => {
        it('should update a record', async () => {
            const tableId = 'mUsers';
            const recordId = 1;
            const data = { name: 'Updated' };
            mockHttpClient.patch.mockResolvedValue({ data: { id: 1, ...data } });

            await service.update(tableId, recordId, data);

            expect(mockHttpClient.patch).toHaveBeenCalledWith(
                `/api/v3/tables/${tableId}/records/${recordId}`,
                data,
            );
        });
    });

    describe('delete', () => {
        it('should delete a record', async () => {
            const tableId = 'mUsers';
            const recordId = 1;
            mockHttpClient.delete.mockResolvedValue({});

            await service.delete(tableId, recordId);

            expect(mockHttpClient.delete).toHaveBeenCalledWith(
                `/api/v3/tables/${tableId}/records/${recordId}`,
            );
        });
    });

    describe('list', () => {
        it('should list records with options', async () => {
            const tableId = 'mUsers';
            const options = { where: '(name,eq,Test)', limit: 10 };
            const responseData = { list: [], pageInfo: {} };
            mockHttpClient.get.mockResolvedValue({ data: responseData });

            const result = await service.list(tableId, options);

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                `/api/v3/tables/${tableId}/records`,
                {
                    params: {
                        where: options.where,
                        limit: options.limit,
                    },
                },
            );
            expect(result).toEqual(responseData);
        });
    });

    describe('Rate Limiting', () => {
        it('should enforce rate limit between requests', async () => {
            // Mock setTimeout to fast-forward time
            jest.useFakeTimers();
            const start = Date.now();

            mockHttpClient.post.mockResolvedValue({ data: {} });

            // Fire two requests immediately
            const p1 = service.create('t1', {});
            const p2 = service.create('t1', {});

            // First one should go through immediately (or very close)
            // Second one should be delayed by ~200ms (1000ms / 5 req/sec)

            jest.advanceTimersByTime(200);

            await Promise.all([p1, p2]);

            expect(mockHttpClient.post).toHaveBeenCalledTimes(2);

            jest.useRealTimers();
        });
    });
});
