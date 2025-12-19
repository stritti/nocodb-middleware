
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseInitializationService } from './database-initialization.service';
import { NocoDBService } from './nocodb.service';
import { Logger } from '@nestjs/common';

describe('DatabaseInitializationService', () => {
    let service: DatabaseInitializationService;
    let nocoDBService: NocoDBService;
    let mockHttpClient: any;

    beforeEach(async () => {
        mockHttpClient = {
            get: jest.fn(),
            post: jest.fn(),
            defaults: { baseURL: 'http://test-url' },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DatabaseInitializationService,
                {
                    provide: NocoDBService,
                    useValue: {
                        getTablePrefix: jest.fn().mockReturnValue(''),
                        getTableByName: jest.fn(),
                        createTable: jest.fn(),
                        createColumn: jest.fn(),
                        getHttpClient: jest.fn().mockReturnValue(mockHttpClient),
                    },
                },
            ],
        }).compile();

        service = module.get<DatabaseInitializationService>(DatabaseInitializationService);
        nocoDBService = module.get<NocoDBService>(NocoDBService);

        // Suppress logs during tests
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => { });
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('ensureTableExists', () => {
        it('should create table if it does not exist', async () => {
            // Mock table not found
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);

            // Mock successful creation
            (nocoDBService.createTable as jest.Mock).mockResolvedValue({ id: 'new-table-id' });

            // Expose private method for testing
            const ensureTableExistsString = 'ensureTableExists';
            const result = await (service as any)[ensureTableExistsString]({
                tableName: 'test_table',
                title: 'Test Table',
                columns: [{ name: 'col1', title: 'Col 1', type: 'SingleLineText' }]
            });

            expect(nocoDBService.createTable).toHaveBeenCalledWith(
                'test_table',
                'Test Table',
                expect.arrayContaining([
                    expect.objectContaining({ column_name: 'col1' })
                ])
            );
            expect(result).toBe('new-table-id');
        });

        it('should return existing table ID if found', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'existing-id' });
            mockHttpClient.get.mockResolvedValue({ data: { columns: [] } }); // Mock getting columns for existing table

            const ensureTableExistsString = 'ensureTableExists';
            const result = await (service as any)[ensureTableExistsString]({
                tableName: 'test_table',
                title: 'Test Table',
                columns: []
            });

            expect(nocoDBService.createTable).not.toHaveBeenCalled();
            expect(result).toBe('existing-id');
        });
    });

    describe('verifyLinkColumnsExist', () => {
        it('should throw error if required link columns are missing', async () => {
            // Mock tables existing
            (nocoDBService.getTableByName as jest.Mock).mockImplementation((name) => {
                return Promise.resolve({ id: `id_${name}`, title: name });
            });

            // Mock table schema returning NO columns (so links are missing)
            mockHttpClient.get.mockImplementation((url) => {
                if (url.includes('/api/v2/meta/tables/')) {
                    return Promise.resolve({ data: { columns: [] } });
                }
                return Promise.resolve({ data: {} });
            });

            const verifyLinkColumnsExistString = 'verifyLinkColumnsExist';

            await expect((service as any)[verifyLinkColumnsExistString]())
                .rejects.toThrow(/Missing \d+ required link column/);
        });

        it('should pass if all link columns exist', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockImplementation((name) => {
                return Promise.resolve({ id: `id_${name}`, title: name });
            });

            mockHttpClient.get.mockImplementation((url) => {
                if (url.includes('/api/v2/meta/tables/id_user_roles')) {
                    return Promise.resolve({
                        data: {
                            columns: [
                                { column_name: 'user', uidt: 'LinkToAnotherRecord' },
                                { column_name: 'role', uidt: 'LinkToAnotherRecord' }
                            ]
                        }
                    });
                }
                if (url.includes('/api/v2/meta/tables/id_table_permissions')) {
                    return Promise.resolve({
                        data: {
                            columns: [
                                { column_name: 'role', uidt: 'LinkToAnotherRecord' }
                            ]
                        }
                    });
                }
                return Promise.resolve({ data: { columns: [] } });
            });

            const verifyLinkColumnsExistString = 'verifyLinkColumnsExist';
            await expect((service as any)[verifyLinkColumnsExistString]()).resolves.not.toThrow();
        });
    });
});
