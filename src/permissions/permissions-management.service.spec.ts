import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsManagementService } from './permissions-management.service';
import { NocoDBService } from '../nocodb/nocodb.service';
import { NocoDBV3Service } from '../nocodb/nocodb-v3.service';
import { PermissionsService } from './permissions.service';
import { Logger } from '@nestjs/common';

describe('PermissionsManagementService', () => {
    let service: PermissionsManagementService;
    let nocoDBService: NocoDBService;
    let nocoDBV3Service: NocoDBV3Service;
    let permissionsService: PermissionsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PermissionsManagementService,
                {
                    provide: NocoDBService,
                    useValue: {
                        getTableByName: jest.fn(),
                    },
                },
                {
                    provide: NocoDBV3Service,
                    useValue: {
                        findOne: jest.fn(),
                        create: jest.fn(),
                        update: jest.fn(),
                        list: jest.fn(),
                        delete: jest.fn(),
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
        nocoDBV3Service = module.get<NocoDBV3Service>(NocoDBV3Service);
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

        it('should update existing permissions using v3 API', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'perm_table_id' });
            (nocoDBV3Service.findOne as jest.Mock).mockResolvedValue({ id: 123 });
            (nocoDBV3Service.update as jest.Mock).mockResolvedValue({ id: 123 });

            await service.setTablePermissions(dto);

            expect(nocoDBV3Service.findOne).toHaveBeenCalledWith(
                'perm_table_id',
                `(role.id,eq,${dto.roleId})~and(table_name,eq,${dto.tableName})`
            );
            expect(nocoDBV3Service.update).toHaveBeenCalledWith(
                'perm_table_id',
                123,
                expect.objectContaining({
                    role: [{ id: dto.roleId }],
                    can_create: dto.canCreate,
                })
            );
            expect(permissionsService.clearCache).toHaveBeenCalled();
        });

        it('should create new permissions if not found using v3 API', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'perm_table_id' });
            (nocoDBV3Service.findOne as jest.Mock).mockResolvedValue(null);
            (nocoDBV3Service.create as jest.Mock).mockResolvedValue({ id: 'new_id' });

            await service.setTablePermissions(dto);

            expect(nocoDBV3Service.create).toHaveBeenCalledWith(
                'perm_table_id',
                expect.objectContaining({
                    role: [{ id: dto.roleId }],
                    table_name: dto.tableName,
                })
            );
        });
    });

    describe('deleteRolePermissions', () => {
        it('should delete all permissions for a role using v3 API', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'perm_table_id' });
            (nocoDBV3Service.list as jest.Mock).mockResolvedValue({
                list: [{ id: 1 }, { id: 2 }]
            });
            (nocoDBV3Service.delete as jest.Mock).mockResolvedValue(undefined);

            await service.deleteRolePermissions(99);

            expect(nocoDBV3Service.delete).toHaveBeenCalledTimes(2);
            expect(nocoDBV3Service.delete).toHaveBeenCalledWith('perm_table_id', 1);
            expect(nocoDBV3Service.delete).toHaveBeenCalledWith('perm_table_id', 2);
            expect(permissionsService.clearCache).toHaveBeenCalled();
        });
    });

    describe('getRolePermissions', () => {
        it('should return permissions for a role using v3 API', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'perm_table_id' });
            (nocoDBV3Service.list as jest.Mock).mockResolvedValue({
                list: [{ id: 1, table_name: 'users', can_read: true }]
            });

            const perms = await service.getRolePermissions(1);
            expect(perms).toHaveLength(1);
            expect(nocoDBV3Service.list).toHaveBeenCalledWith(
                'perm_table_id',
                expect.objectContaining({ where: '(role.id,eq,1)' })
            );
        });

        it('should return empty array if permissions table not found', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);
            const perms = await service.getRolePermissions(1);
            expect(perms).toEqual([]);
        });
    });
});
