import { Test, TestingModule } from '@nestjs/testing';
import { UserRolesService } from './user-roles.service';
import { NocoDBService } from '../nocodb/nocodb.service';
import { PermissionsService } from '../permissions/permissions.service';
import { Logger } from '@nestjs/common';

describe('UserRolesService', () => {
  let service: UserRolesService;
  let nocoDBService: NocoDBService;
  let permissionsService: PermissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRolesService,
        {
          provide: NocoDBService,
          useValue: {
            getTableByName: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            list: jest.fn(),
            listAll: jest.fn(),
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
    permissionsService = module.get<PermissionsService>(PermissionsService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assignRole', () => {
    it('should assign a role if not already assigned', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'ur_table_id',
      });
      (nocoDBService.findOne as jest.Mock).mockResolvedValue(null);
      (nocoDBService.create as jest.Mock).mockResolvedValue({ id: 'new_id' });

      await service.assignRole({ userId: 1, roleId: 2 });

      expect(nocoDBService.findOne).toHaveBeenCalledWith(
        'ur_table_id',
        '(user_id,eq,1)~and(role_id,eq,2)',
      );
      expect(nocoDBService.create).toHaveBeenCalledWith(
        'ur_table_id',
        expect.objectContaining({
          user_id: 1,
          role_id: 2,
        }),
      );
      expect(permissionsService.clearCache).toHaveBeenCalledWith(1);
    });

    it('should throw ConflictException if role already assigned', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'ur_table_id',
      });
      (nocoDBService.findOne as jest.Mock).mockResolvedValue({
        id: 'existing_id',
      });

      await expect(
        service.assignRole({ userId: 1, roleId: 2 }),
      ).rejects.toThrow('already has role');
    });

    it('should throw NotFoundException if user_roles table not found', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);

      await expect(
        service.assignRole({ userId: 1, roleId: 2 }),
      ).rejects.toThrow('User_roles table not found');
    });
  });

  describe('removeRole', () => {
    it('should remove a role', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'ur_table_id',
      });
      (nocoDBService.findOne as jest.Mock).mockResolvedValue({ id: 10 });
      (nocoDBService.delete as jest.Mock).mockResolvedValue(undefined);

      await service.removeRole(1, 2);

      expect(nocoDBService.delete).toHaveBeenCalledWith('ur_table_id', 10);
      expect(permissionsService.clearCache).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if assignment not found', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'ur_table_id',
      });
      (nocoDBService.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.removeRole(1, 2)).rejects.toThrow(
        'not assigned to user',
      );
    });
  });

  describe('getUserRoles', () => {
    it('returns the role records of the user, paged by assignment', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockImplementation(
        (name: string) => Promise.resolve({ id: `${name}_id` }),
      );
      (nocoDBService.list as jest.Mock).mockResolvedValue({
        list: [
          { id: 1, role_id: 7 },
          { id: 2, role_id: 5 },
        ],
        pageInfo: { totalRows: 12 },
      });
      (nocoDBService.listAll as jest.Mock).mockResolvedValue([
        { id: 5, role_name: 'admin' },
        { id: 7, role_name: 'editor' },
      ]);

      const result = await service.getUserRoles(1, {
        take: 2,
        skip: 4,
      });

      expect(nocoDBService.list).toHaveBeenCalledWith('user_roles_id', {
        where: '(user_id,eq,1)',
        fields: ['role_id'],
        sort: 'role_id',
        limit: 2,
        offset: 4,
        withCount: true,
      });
      expect(nocoDBService.listAll).toHaveBeenCalledWith('roles_id', {
        where: '(Id,in,7,5)',
      });
      expect(result.data).toEqual([
        { id: 7, role_name: 'editor' },
        { id: 5, role_name: 'admin' },
      ]);
      expect(result.meta.itemCount).toBe(12);
    });

    it('skips assignments whose role no longer exists', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockImplementation(
        (name: string) => Promise.resolve({ id: `${name}_id` }),
      );
      (nocoDBService.list as jest.Mock).mockResolvedValue({
        list: [
          { id: 1, role_id: 7 },
          { id: 2, role_id: null },
        ],
        pageInfo: { totalRows: 2 },
      });
      (nocoDBService.listAll as jest.Mock).mockResolvedValue([]);

      const result = await service.getUserRoles(1);

      expect(nocoDBService.listAll).toHaveBeenCalledWith('roles_id', {
        where: '(Id,in,7)',
      });
      expect(result.data).toEqual([]);
    });

    it('should return empty page result if no user_roles table', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);

      const result = await service.getUserRoles(1);
      expect(result.data).toEqual([]);
      expect(result.meta.itemCount).toBe(0);
    });
  });

  describe('assignMultipleRoles', () => {
    it('should assign multiple roles, skipping already-assigned ones', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'ur_table_id',
      });
      (nocoDBService.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1 });
      (nocoDBService.create as jest.Mock).mockResolvedValue({ id: 'new_id' });

      const result = await service.assignMultipleRoles({
        userId: 1,
        roleIds: [2, 3],
      });

      expect(result.assignedCount).toBe(1);
      expect(nocoDBService.create).toHaveBeenCalledTimes(1);
    });
  });
});
