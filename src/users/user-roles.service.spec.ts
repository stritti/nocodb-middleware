
import { Test, TestingModule } from '@nestjs/testing';
import { UserRolesService } from './user-roles.service';
import { NocoDBService } from '../nocodb/nocodb.service';
import { NocoDBV3Service } from '../nocodb/nocodb-v3.service';
import { PermissionsService } from '../permissions/permissions.service';
import { Logger } from '@nestjs/common';

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
            defaults: { baseURL: 'http://test-url' },
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

        // Suppress logs
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => { });
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('assignRole (v2)', () => {
        it('should assign a role if not already assigned', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'ur_table_id' });

            mockHttpClient.get.mockResolvedValue({ data: { list: [] } }); // No existing assignment
            mockHttpClient.post.mockResolvedValue({ data: { Id: 'new_id' } });

            await service.assignRole({ userId: 1, roleId: 2 });

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                '/api/v2/tables/ur_table_id/records',
                expect.objectContaining({
                    user: { Id: 1 },
                    role: { Id: 2 },
                })
            );
            expect(permissionsService.clearCache).toHaveBeenCalledWith(1);
        });
    });

    describe('assignRoleV3', () => {
        it('should assign a role using V3 service', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({ id: 'ur_table_id' });

            (nocoDBV3Service.findOne as jest.Mock).mockResolvedValue(null); // No existing
            (nocoDBV3Service.create as jest.Mock).mockResolvedValue({ id: 'new_id' });

            await service.assignRoleV3({ userId: 1, roleId: 2 });

            expect(nocoDBV3Service.create).toHaveBeenCalledWith(
                'ur_table_id',
                expect.objectContaining({
                    user: [{ id: 1 }],
                    role: [{ id: 2 }],
                })
            );
            expect(permissionsService.clearCache).toHaveBeenCalledWith(1);
        });
    });
});
