import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { NocoDBService } from '../nocodb/nocodb.service';
import { NocoDBV3Service } from '../nocodb/nocodb-v3.service';
import { Logger } from '@nestjs/common';
import { CrudAction } from './enums/crud-action.enum';

describe('PermissionsService', () => {
    let service: PermissionsService;
    let nocoDBService: NocoDBService;
    let nocoDBV3Service: NocoDBV3Service;
    let mockHttpClient: any;

    beforeEach(async () => {
        mockHttpClient = {
            get: jest.fn(),
            defaults: { baseURL: 'http://test-url' },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PermissionsService,
                {
                    provide: NocoDBService,
                    useValue: {
                        getTableByName: jest.fn(),
                        getHttpClient: jest.fn().mockReturnValue(mockHttpClient),
                        getBaseId: jest.fn().mockReturnValue('test-base-id'),
                        getTablePrefix: jest.fn().mockReturnValue(''),
                    },
                },
                {
                    provide: NocoDBV3Service,
                    useValue: {
                        read: jest.fn(),
                        list: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        update: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<PermissionsService>(PermissionsService);
        nocoDBService = module.get<NocoDBService>(NocoDBService);
        nocoDBV3Service = module.get<NocoDBV3Service>(NocoDBV3Service);

        // Suppress logs
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => { });
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getAllWorkspaceTables', () => {
        it('should fetch tables using v3 meta API', async () => {
            mockHttpClient.get.mockResolvedValue({
                data: {
                    list: [
                        { table_name: 'users' },
                        { table_name: 'roles' },
                    ]
                }
            });

            const tables = await service.getAllWorkspaceTables();
            expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v3/meta/bases/test-base-id/tables');
            expect(tables).toEqual(['users', 'roles']);
        });
    });

    describe('getUserPermissions', () => {
        it('should return empty permissions if user has no roles', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockImplementation((name) => {
                return Promise.resolve({ id: `id_${name}`, title: name });
            });

            (nocoDBV3Service.read as jest.Mock).mockResolvedValue({ id: 1, username: 'testuser' });
            (nocoDBV3Service.list as jest.Mock).mockResolvedValue({ list: [] }); // No roles

            const permissions = await service.getUserPermissions(1);
            expect(permissions.roles).toEqual([]);
            expect(permissions.permissions.size).toBe(0);
        });

        it('should aggregate permissions from multiple roles', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockImplementation((name) => {
                return Promise.resolve({ id: `id_${name}`, title: name });
            });

            (nocoDBV3Service.read as jest.Mock).mockResolvedValue({ id: 1, username: 'testuser' });

            (nocoDBV3Service.list as jest.Mock).mockImplementation((tableId) => {
                if (tableId === 'id_user_roles') {
                    return Promise.resolve({
                        list: [{ id: 1, role: [{ id: 10 }] }]
                    });
                }
                if (tableId === 'id_roles') {
                    return Promise.resolve({
                        list: [{ id: 10, role_name: 'admin' }]
                    });
                }
                if (tableId === 'id_table_permissions') {
                    return Promise.resolve({
                        list: [{ id: 1, table_name: 'users', can_read: true, can_create: false, can_update: false, can_delete: false }]
                    });
                }
                return Promise.resolve({ list: [] });
            });

            const permissions = await service.getUserPermissions(1);
            expect(permissions.roles).toEqual(['admin']);
            expect(permissions.permissions.get('users')?.has(CrudAction.READ)).toBe(true);
            expect(permissions.permissions.get('users')?.has(CrudAction.CREATE)).toBe(false);
        });
    });

    describe('clearCache', () => {
        it('should clear entire cache when no userId provided', () => {
            // Add entry to cache first
            (service as any).permissionsCache.set(1, {});
            (service as any).permissionsCache.set(2, {});

            service.clearCache();
            expect((service as any).permissionsCache.size).toBe(0);
        });

        it('should clear only specific user cache when userId provided', () => {
            (service as any).permissionsCache.set(1, {});
            (service as any).permissionsCache.set(2, {});

            service.clearCache(1);
            expect((service as any).permissionsCache.has(1)).toBe(false);
            expect((service as any).permissionsCache.has(2)).toBe(true);
        });
    });
});
