import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseInitializationService } from './database-initialization.service';
import { NocoDBService } from './nocodb.service';
import { NocoDBV3Service } from './nocodb-v3.service';
import { Logger } from '@nestjs/common';

describe('DatabaseInitializationService', () => {
    let service: DatabaseInitializationService;
    let nocoDBService: NocoDBService;
    let nocoDBV3Service: NocoDBV3Service;
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
                {
                    provide: NocoDBV3Service,
                    useValue: {
                        list: jest.fn(),
                        create: jest.fn(),
                        findOne: jest.fn(),
                        delete: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<DatabaseInitializationService>(DatabaseInitializationService);
        nocoDBService = module.get<NocoDBService>(NocoDBService);
        nocoDBV3Service = module.get<NocoDBV3Service>(NocoDBV3Service);

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

            // Mock table schema returning NO columns (so links are missing) - using v3 meta path
            mockHttpClient.get.mockImplementation((url) => {
                if (url.includes('/api/v3/meta/tables/')) {
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
                if (url.includes('/api/v3/meta/tables/id_user_roles')) {
                    return Promise.resolve({
                        data: {
                            columns: [
                                { column_name: 'user', uidt: 'LinkToAnotherRecord' },
                                { column_name: 'role', uidt: 'LinkToAnotherRecord' }
                            ]
                        }
                    });
                }
                if (url.includes('/api/v3/meta/tables/id_table_permissions')) {
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

    describe('seedDefaultUser', () => {
        it('should create admin user if not exists', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockImplementation((name) => {
                return Promise.resolve({ id: `id_${name}`, title: name });
            });

            (nocoDBV3Service.list as jest.Mock).mockResolvedValue({ list: [] });
            (nocoDBV3Service.create as jest.Mock).mockResolvedValue({ id: 1 });

            const seedDefaultUserString = 'seedDefaultUser';
            await (service as any)[seedDefaultUserString]();

            expect(nocoDBV3Service.create).toHaveBeenCalledWith(
                'id_users',
                expect.objectContaining({ username: 'admin' })
            );
        });

        it('should skip user creation if user already exists', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockImplementation((name) => {
                return Promise.resolve({ id: `id_${name}`, title: name });
            });

            (nocoDBV3Service.list as jest.Mock).mockImplementation((tableId) => {
                if (tableId === 'id_users') {
                    return Promise.resolve({ list: [{ id: 1, username: 'admin' }] });
                }
                if (tableId === 'id_roles') {
                    return Promise.resolve({ list: [{ id: 1, role_name: 'admin' }] });
                }
                return Promise.resolve({ list: [{ id: 1 }] }); // user already has role
            });

            const seedDefaultUserString = 'seedDefaultUser';
            await (service as any)[seedDefaultUserString]();

            // Should not create user since it exists
            expect(nocoDBV3Service.create).not.toHaveBeenCalled();
        });
    });
});
