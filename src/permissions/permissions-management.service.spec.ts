
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsManagementService } from './permissions-management.service';
import { NocoDBService } from '../nocodb/nocodb.service';
import { PermissionsService } from './permissions.service';
import { Logger } from '@nestjs/common';

describe('PermissionsManagementService', () => {
    let service: PermissionsManagementService;
    let nocoDBService: NocoDBService;
    let permissionsService: PermissionsService;
    let mockHttpClient: any;

    beforeEach(async () => {
        mockHttpClient = {
            get: jest.fn(),
            post: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn(),
            defaults: { baseURL: 'http://test-url' },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PermissionsManagementService,
                {
                    provide: NocoDBService,
                    useValue: {
                        getTableByName: jest.fn(),
                        getHttpClient: jest.fn().mockReturnValue(mockHttpClient),
                    },
                },
                {
                    provide: PermissionsService,
                    useValue: {
                        clearCache: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<PermissionsManagementService>(PermissionsManagementService);
        nocoDBService = module.get<NocoDBService>(NocoDBService);
        permissionsService = module.get<PermissionsService>(PermissionsService);

        // Suppress logs
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => { });
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('setTablePermissions', () => {
        const dto = {
            roleId: 1,
            tableName: 'test_table',
            canCreate: true,
            canRead: true,
            canUpdate: false,
            canDelete: false,
        };

        it('should update existing permissions', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'perm_table_id' });

            // Mock finding existing permission
            mockHttpClient.get.mockResolvedValue({
                data: {
                    list: [{ Id: 123 }]
                }
            });

            // Mock successful update
            mockHttpClient.patch.mockResolvedValue({ data: { success: true } });

            await service.setTablePermissions(dto);

            expect(mockHttpClient.patch).toHaveBeenCalledWith(
                '/api/v2/tables/perm_table_id/records/123',
                expect.objectContaining({
                    role: { Id: dto.roleId },
                    can_create: dto.canCreate,
                })
            );
            expect(permissionsService.clearCache).toHaveBeenCalled();
        });

        it('should create new permissions if not found', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'perm_table_id' });

            // Mock NOT finding existing permission
            mockHttpClient.get.mockResolvedValue({
                data: { list: [] }
            });

            // Mock successful creation
            mockHttpClient.post.mockResolvedValue({ data: { success: true } });

            await service.setTablePermissions(dto);

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                '/api/v2/tables/perm_table_id/records',
                expect.objectContaining({
                    role: { Id: dto.roleId },
                    table_name: dto.tableName,
                })
            );
        });
    });

    describe('deleteRolePermissions', () => {
        it('should delete all permissions for a role', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'perm_table_id' });

            // Mock finding records
            mockHttpClient.get.mockResolvedValue({
                data: {
                    list: [{ Id: 1 }, { Id: 2 }]
                }
            });

            mockHttpClient.delete.mockResolvedValue({});

            await service.deleteRolePermissions(99);

            expect(mockHttpClient.delete).toHaveBeenCalledTimes(2);
            expect(mockHttpClient.delete).toHaveBeenCalledWith('/api/v2/tables/perm_table_id/records/1');
            expect(mockHttpClient.delete).toHaveBeenCalledWith('/api/v2/tables/perm_table_id/records/2');
            expect(permissionsService.clearCache).toHaveBeenCalled();
        });
    });
});
