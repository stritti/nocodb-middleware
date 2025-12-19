
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

        // Suppress logs
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => { });
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

        it('should throw error on failure', async () => {
            mockHttpClient.post.mockRejectedValue(new Error('API Error'));
            await expect(service.create('t1', {})).rejects.toThrow('API Error');
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

        it('should throw error on failure', async () => {
            mockHttpClient.get.mockRejectedValue(new Error('API Error'));
            await expect(service.read('t1', 1)).rejects.toThrow('API Error');
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

        it('should throw error on failure', async () => {
            mockHttpClient.patch.mockRejectedValue(new Error('API Error'));
            await expect(service.update('t1', 1, {})).rejects.toThrow('API Error');
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

        it('should throw error on failure', async () => {
            mockHttpClient.delete.mockRejectedValue(new Error('API Error'));
            await expect(service.delete('t1', 1)).rejects.toThrow('API Error');
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

        it('should throw error on failure', async () => {
            mockHttpClient.get.mockRejectedValue(new Error('API Error'));
            await expect(service.list('t1', {})).rejects.toThrow('API Error');
        });
    });

    describe('Link Operations', () => {
        it('createWithLinks should format links correctly', async () => {
            mockHttpClient.post.mockResolvedValue({ data: { id: 1 } });
            await service.createWithLinks('t1', { name: 'A' }, [{ fieldName: 'rel', recordIds: [10, 20] }]);

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                expect.any(String),
                { name: 'A', rel: [{ id: 10 }, { id: 20 }] },
                expect.any(Object)
            );
        });

        it('updateLinks should format links correctly', async () => {
            mockHttpClient.patch.mockResolvedValue({ data: { id: 1 } });
            await service.updateLinks('t1', 1, [{ fieldName: 'rel', recordIds: [10] }]);

            expect(mockHttpClient.patch).toHaveBeenCalledWith(
                expect.any(String),
                { rel: [{ id: 10 }] }
            );
        });

        it('getWithLinks should call read with includeRelations', async () => {
            mockHttpClient.get.mockResolvedValue({ data: {} });
            await service.getWithLinks('t1', 1, ['rel1']);

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    params: expect.objectContaining({
                        nested: expect.stringContaining('rel1')
                    })
                })
            );
        });
    });

    describe('Batch Operations', () => {
        it('batchCreate should iterate records', async () => {
            mockHttpClient.post.mockResolvedValue({ data: { id: 'new' } });
            const results = await service.batchCreate('t1', [{ a: 1 }, { b: 2 }]);
            expect(results).toHaveLength(2);
            expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
        });

        it('batchCreate should handle errors gracefully', async () => {
            mockHttpClient.post
                .mockResolvedValueOnce({ data: { id: 1 } })
                .mockRejectedValueOnce(new Error('Fail'));

            const results = await service.batchCreate('t1', [{ a: 1 }, { b: 2 }]);
            expect(results[0]).toEqual({ id: 1 });
            expect(results[1]).toHaveProperty('error', 'Fail');
        });

        it('batchUpdate should iterate updates', async () => {
            mockHttpClient.patch.mockResolvedValue({ data: { id: 1 } });
            const results = await service.batchUpdate('t1', [{ id: 1, data: {} }]);
            expect(results).toHaveLength(1);
        });

        it('batchUpdate should handle errors', async () => {
            mockHttpClient.patch.mockRejectedValue(new Error('Fail'));
            const results = await service.batchUpdate('t1', [{ id: 1, data: {} }]);
            expect(results[0]).toHaveProperty('error', 'Fail');
        });
    });

    describe('Utility Methods', () => {
        it('findOne should return first item or null', async () => {
            mockHttpClient.get.mockResolvedValue({ data: { list: [{ id: 1 }] } });
            expect(await service.findOne('t1', 'cond')).toEqual({ id: 1 });

            mockHttpClient.get.mockResolvedValue({ data: { list: [] } });
            expect(await service.findOne('t1', 'cond')).toBeNull();
        });

        it('exists should return boolean', async () => {
            jest.spyOn(service, 'findOne').mockResolvedValue({ id: 1 });
            expect(await service.exists('t1', 'cond')).toBe(true);

            jest.spyOn(service, 'findOne').mockResolvedValue(null);
            expect(await service.exists('t1', 'cond')).toBe(false);
        });
    });
});
