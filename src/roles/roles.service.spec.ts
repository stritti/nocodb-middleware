
import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { NocoDBService } from '../nocodb/nocodb.service';
import { NocoDBV3Service } from '../nocodb/nocodb-v3.service';
import { Logger, NotFoundException, ConflictException } from '@nestjs/common';

describe('RolesService', () => {
    let service: RolesService;
    let nocoDBService: NocoDBService;
    let nocoDBV3Service: NocoDBV3Service;
    let mockHttpClient: any;

    beforeEach(async () => {
        mockHttpClient = {
            get: jest.fn(),
            post: jest.fn(),
            delete: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RolesService,
                {
                    provide: NocoDBService,
                    useValue: {
                        getTableByName: jest.fn(),
                        getHttpClient: jest.fn().mockReturnValue(mockHttpClient),
                    },
                },
                {
                    provide: NocoDBV3Service,
                    useValue: {
                        create: jest.fn(),
                        findOne: jest.fn(),
                        list: jest.fn(),
                        delete: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<RolesService>(RolesService);
        nocoDBService = module.get<NocoDBService>(NocoDBService);
        nocoDBV3Service = module.get<NocoDBV3Service>(NocoDBV3Service);

        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => { });
    });

    describe('createRole', () => {
        it('should create a role', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'roles_table' });
            mockHttpClient.get.mockResolvedValue({ data: { list: [] } }); // No existing
            mockHttpClient.post.mockResolvedValue({ data: { Id: 1, role_name: 'Admin' } });

            const result = await service.createRole({ roleName: 'Admin' });
            expect(result.role_name).toBe('Admin');
        });

        it('should throw Conflict if role exists', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'roles_table' });
            mockHttpClient.get.mockResolvedValue({ data: { list: [{ Id: 1 }] } });

            await expect(service.createRole({ roleName: 'Admin' })).rejects.toThrow(ConflictException);
        });

        it('should throw NotFound if table missing', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);
            await expect(service.createRole({ roleName: 'Admin' })).rejects.toThrow(NotFoundException);
        });
    });

    describe('findRoleByName', () => {
        it('should return role if found', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'roles_table' });
            mockHttpClient.get.mockResolvedValue({ data: { list: [{ Id: 1 }] } });

            const result = await service.findRoleByName('Admin');
            expect(result).toEqual({ Id: 1 });
        });

        it('should return null if table missing', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);
            const result = await service.findRoleByName('Admin');
            expect(result).toBeNull();
        });
    });

    describe('getAllRoles', () => {
        it('should return all roles', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'roles_table' });
            mockHttpClient.get.mockResolvedValue({ data: { list: [{ Id: 1 }] } });

            const result = await service.getAllRoles();
            expect(result).toHaveLength(1);
        });
        it('should return empty if table missing', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);
            expect(await service.getAllRoles()).toEqual([]);
        });
    });

    describe('deleteRole', () => {
        it('should delete role', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'roles_table' });
            mockHttpClient.delete.mockResolvedValue({});

            await service.deleteRole(1);
            expect(mockHttpClient.delete).toHaveBeenCalled();
        });
    });

    describe('createRoleV3', () => {
        it('should create role using V3', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'roles_table' });
            (nocoDBV3Service.findOne as jest.Mock).mockResolvedValue(null);
            (nocoDBV3Service.create as jest.Mock).mockResolvedValue({ id: 1, role_name: 'Admin' });

            const result = await service.createRoleV3({ roleName: 'Admin' });
            expect(result.id).toBe(1);
        });

        it('should throw Conflict if V3 role exists', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'roles_table' });
            (nocoDBV3Service.findOne as jest.Mock).mockResolvedValue({ id: 1 });

            await expect(service.createRoleV3({ roleName: 'Admin' })).rejects.toThrow(ConflictException);
        });
    });

    describe('getAllRolesV3', () => {
        it('should list roles using V3', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'roles_table' });
            (nocoDBV3Service.list as jest.Mock).mockResolvedValue({ list: [{ id: 1 }] });

            const result = await service.getAllRolesV3();
            expect(result).toHaveLength(1);
        });
    });

    describe('deleteRoleV3', () => {
        it('should delete role using V3', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'roles_table' });
            await service.deleteRoleV3(1);
            expect(nocoDBV3Service.delete).toHaveBeenCalled();
        });
    });
});
