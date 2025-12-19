
import { Test, TestingModule } from '@nestjs/testing';
import { UserRolesService } from './user-roles.service';
import { NocoDBService } from '../nocodb/nocodb.service';
import { NocoDBV3Service } from '../nocodb/nocodb-v3.service';
import { PermissionsService } from '../permissions/permissions.service';
import { Logger, NotFoundException, ConflictException } from '@nestjs/common';

describe('UserRolesService', () => {
    let service: UserRolesService;
    let nocoDBService: NocoDBService;
    let nocoDBV3Service: NocoDBV3Service;
    let permissionsService: PermissionsService;
    let mockHttpClient: any;

    beforeEach(async () => {
        mockHttpClient = {
            get: jest.fn(),
            post: jest.fn(),
            delete: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserRolesService,
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
                        findOne: jest.fn(),
                        create: jest.fn(),
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

        service = module.get<UserRolesService>(UserRolesService);
        nocoDBService = module.get<NocoDBService>(NocoDBService);
        nocoDBV3Service = module.get<NocoDBV3Service>(NocoDBV3Service);
        permissionsService = module.get<PermissionsService>(PermissionsService);

        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => { });
    });

    describe('assignRole', () => {
        it('should assign role if not exists', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'ur_id' });
            mockHttpClient.get.mockResolvedValue({ data: { list: [] } });
            mockHttpClient.post.mockResolvedValue({ data: { Id: 1 } });

            await service.assignRole({ userId: 1, roleId: 2 });
            expect(mockHttpClient.post).toHaveBeenCalled();
        });

        it('should throw Conflict if assigned', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'ur_id' });
            mockHttpClient.get.mockResolvedValue({ data: { list: [{ Id: 1 }] } });

            await expect(service.assignRole({ userId: 1, roleId: 2 })).rejects.toThrow(ConflictException);
        });

        it('should handle errors', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockRejectedValue(new Error('Fail'));
            await expect(service.assignRole({ userId: 1, roleId: 2 })).rejects.toThrow('Fail');
        });
    });

    describe('assignRoleV3', () => {
        it('should assign role V3', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'ur_id' });
            (nocoDBV3Service.findOne as jest.Mock).mockResolvedValue(null);
            (nocoDBV3Service.create as jest.Mock).mockResolvedValue({ id: 1 });

            await service.assignRoleV3({ userId: 1, roleId: 2 });
            expect(nocoDBV3Service.create).toHaveBeenCalled();
        });

        it('should throw Conflict V3', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'ur_id' });
            (nocoDBV3Service.findOne as jest.Mock).mockResolvedValue({ id: 1 });

            await expect(service.assignRoleV3({ userId: 1, roleId: 2 })).rejects.toThrow(ConflictException);
        });
    });

    describe('assignMultipleRoles', () => {
        it('should assign multiple roles and handle conflicts', async () => {
            jest.spyOn(service, 'assignRole')
                .mockResolvedValueOnce({ success: true }) // First success
                .mockRejectedValueOnce(new ConflictException()); // Second conflict

            const result = await service.assignMultipleRoles({ userId: 1, roleIds: [10, 11] });

            expect(result.assignedCount).toBe(1);
            expect(result.results.length).toBe(1);
            expect(service.assignRole).toHaveBeenCalledTimes(2);
        });

        it('should throw non-conflict errors', async () => {
            jest.spyOn(service, 'assignRole').mockRejectedValue(new Error('Random Error'));
            await expect(service.assignMultipleRoles({ userId: 1, roleIds: [10] }))
                .rejects.toThrow('Random Error');
        });
    });

    describe('removeRole (v2)', () => {
        it('should delete role assignment', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'ur_id' });
            mockHttpClient.get.mockResolvedValue({
                data: { list: [{ Id: 99 }] }
            });
            mockHttpClient.delete.mockResolvedValue({});

            await service.removeRole(1, 2);

            expect(mockHttpClient.delete).toHaveBeenCalledWith('/api/v2/tables/ur_id/records/99');
            expect(permissionsService.clearCache).toHaveBeenCalledWith(1);
        });

        it('should throw NotFound if role not assigned', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'ur_id' });
            mockHttpClient.get.mockResolvedValue({ data: { list: [] } });

            await expect(service.removeRole(1, 2)).rejects.toThrow(NotFoundException);
        });
    });

    describe('getUserRoles (v2)', () => {
        it('should return list of roles', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 't_id' });
            const mockRoles = [
                { role: { Id: 1, role_name: 'Admin' } },
                { role: { Id: 2, role_name: 'User' } }
            ];
            mockHttpClient.get.mockResolvedValue({ data: { list: mockRoles } });

            const result = await service.getUserRoles(1);
            expect(result).toHaveLength(2);
            expect(result[0].role_name).toBe('Admin');
        });
    });

    describe('getUserRolesV3', () => {
        it('should return list of roles from V3 API', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 't_id' });
            const mockList = {
                list: [
                    { role: [{ Id: 1, role_name: 'V3Admin' }] }
                ]
            };
            (nocoDBV3Service.list as jest.Mock).mockResolvedValue(mockList);

            const result = await service.getUserRolesV3(1);
            expect(result).toHaveLength(1);
            expect(result[0].role_name).toBe('V3Admin');
        });
    });

    describe('removeRoleV3', () => {
        it('should remove role using V3 API', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 't_id' });
            (nocoDBV3Service.findOne as jest.Mock).mockResolvedValue({ id: 88 });
            (nocoDBV3Service.delete as jest.Mock).mockResolvedValue({});

            await service.removeRoleV3(1, 2);

            expect(nocoDBV3Service.delete).toHaveBeenCalledWith('t_id', 88);
            expect(permissionsService.clearCache).toHaveBeenCalledWith(1);
        });

        it('should handle errors in removeRoleV3', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockRejectedValue(new Error('FailDelete'));
            await expect(service.removeRoleV3(1, 2)).rejects.toThrow('FailDelete');
        });
    });
});
