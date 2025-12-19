
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
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DatabaseInitializationService,
                {
                    provide: NocoDBService,
                    useValue: {
                        getTablePrefix: jest.fn().mockReturnValue('nc_'),
                        getTableByName: jest.fn(),
                        createTable: jest.fn(),
                        createColumn: jest.fn(),
                        getHttpClient: jest.fn().mockReturnValue(mockHttpClient),
                        getBaseId: jest.fn().mockReturnValue('base_id'),
                    },
                },
            ],
        }).compile();

        service = module.get<DatabaseInitializationService>(
            DatabaseInitializationService,
        );
        nocoDBService = module.get<NocoDBService>(NocoDBService);

        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => { });

        // Bypass delay for tests
        (service as any).delay = jest.fn().mockResolvedValue(undefined);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('onModuleInit', () => {
        it('should initialize tables', async () => {
            const initSpy = jest.spyOn(service as any, 'initializeTables').mockResolvedValue(undefined);
            await service.onModuleInit();
            expect(initSpy).toHaveBeenCalled();
        });
    });

    describe('initializeTables', () => {
        it('should ensure base tables and seed data', async () => {
            // Mock ensureTableExists to return IDs
            jest.spyOn(service as any, 'ensureTableExists').mockResolvedValue('table_id');
            // Mock verify to succeed
            jest.spyOn(service as any, 'verifyLinkColumnsExist').mockResolvedValue(undefined);
            // Mock seeding
            const seedPermSpy = jest.spyOn(service as any, 'seedDefaultPermissions').mockResolvedValue(undefined);
            const seedUserSpy = jest.spyOn(service as any, 'seedDefaultUser').mockResolvedValue(undefined);

            await (service as any).initializeTables();

            expect(seedPermSpy).toHaveBeenCalled();
            expect(seedUserSpy).toHaveBeenCalled();
        });
    });

    describe('ensureTableExists', () => {
        it('should create table and columns', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null); // Table not exists
            (nocoDBService.createTable as jest.Mock).mockResolvedValue({ id: 'new_id' });

            // Mock ensureColumnsExist by spying? Or let it run?
            // It calls nocoDBService.createColumn, which is mocked.
            // But ensureColumnsExist internal logic does a GET for columns.
            mockHttpClient.get.mockResolvedValue({ data: { columns: [] } });

            const tableDef = {
                tableName: 'test',
                title: 'Test',
                columns: [{ name: 'col1', title: 'Col1', type: 'Text' }]
            };

            await (service as any).ensureTableExists(tableDef);

            expect(nocoDBService.createTable).toHaveBeenCalled();
        });
    });

    describe('verifyLinkColumnsExist', () => {
        it('should warn on missing links', async () => {
            // Setup: Table exists, but has no columns
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'rel_table' });
            mockHttpClient.get.mockResolvedValue({ data: { columns: [] } });

            await expect((service as any).verifyLinkColumnsExist()).rejects.toThrow();
        });
    });

    describe('seedDefaultUser', () => {
        it('should create admin user/role if missing', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'tid' });

            // Admin user missing
            mockHttpClient.get.mockResolvedValueOnce({ data: { list: [] } });
            // Create Admin User details
            mockHttpClient.post.mockResolvedValueOnce({ data: { Id: 100 } });

            // Get Admin Role
            mockHttpClient.get.mockResolvedValueOnce({ data: { list: [{ Id: 99 }] } });

            // Check user role assignment
            mockHttpClient.get.mockResolvedValueOnce({ data: { list: [] } });
            // Create assignment
            mockHttpClient.post.mockResolvedValueOnce({ data: { Id: 200 } });

            await (service as any).seedDefaultUser();

            // Verify create user call
            expect(mockHttpClient.post).toHaveBeenCalledWith(
                expect.stringContaining('/records'),
                expect.objectContaining({ username: 'admin' })
            );
        });
    });

    describe('seedDefaultPermissions', () => {
        it('should create admin role if missing', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'tid' });

            // Role missing
            mockHttpClient.get.mockResolvedValueOnce({ data: { list: [] } });
            // Create Role
            mockHttpClient.post.mockResolvedValueOnce({ data: { Id: 99 } });

            await (service as any).seedDefaultPermissions();

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                expect.stringContaining('/records'),
                expect.objectContaining({ role_name: 'admin' })
            );
        });
    });
});
