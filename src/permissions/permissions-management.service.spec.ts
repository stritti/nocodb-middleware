import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsManagementService } from './permissions-management.service';
import { NocoDBService } from '../nocodb/nocodb.service';
import { PermissionsService } from './permissions.service';
import { Logger, NotFoundException } from '@nestjs/common';

describe('PermissionsManagementService', () => {
  let service: PermissionsManagementService;
  let nocoDBService: NocoDBService;
  let permissionsService: PermissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsManagementService,
        {
          provide: NocoDBService,
          useValue: {
            getTableByName: jest.fn(),
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

    service = module.get<PermissionsManagementService>(
      PermissionsManagementService,
    );
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
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'perm_table_id',
      });
      (nocoDBService.findOne as jest.Mock).mockResolvedValue({ id: 123 });
      (nocoDBService.update as jest.Mock).mockResolvedValue({ id: 123 });

      await service.setTablePermissions(dto);

      expect(nocoDBService.findOne).toHaveBeenCalledWith(
        'perm_table_id',
        `(role.id,eq,${dto.roleId})~and(table_name,eq,${dto.tableName})`,
      );
      expect(nocoDBService.update).toHaveBeenCalledWith(
        'perm_table_id',
        123,
        expect.objectContaining({
          role: [{ id: dto.roleId }],
          can_create: dto.canCreate,
        }),
      );
      expect(permissionsService.clearCache).toHaveBeenCalled();
    });

    it('should create new permissions if not found', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'perm_table_id',
      });
      (nocoDBService.findOne as jest.Mock).mockResolvedValue(null);
      (nocoDBService.create as jest.Mock).mockResolvedValue({ id: 'new_id' });

      await service.setTablePermissions(dto);

      expect(nocoDBService.create).toHaveBeenCalledWith(
        'perm_table_id',
        expect.objectContaining({
          role: [{ id: dto.roleId }],
          table_name: dto.tableName,
        }),
      );
    });
  });

  describe('deleteRolePermissions', () => {
    it('should delete all permissions for a role', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'perm_table_id',
      });
      (nocoDBService.list as jest.Mock).mockResolvedValue({
        list: [{ id: 1 }, { id: 2 }],
      });
      (nocoDBService.delete as jest.Mock).mockResolvedValue(undefined);

      await service.deleteRolePermissions(99);

      expect(nocoDBService.delete).toHaveBeenCalledTimes(2);
      expect(nocoDBService.delete).toHaveBeenCalledWith('perm_table_id', 1);
      expect(nocoDBService.delete).toHaveBeenCalledWith('perm_table_id', 2);
      expect(permissionsService.clearCache).toHaveBeenCalled();
    });
  });

  describe('getRolePermissions', () => {
    it('should return permissions for a role', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'perm_table_id',
      });
      (nocoDBService.list as jest.Mock).mockResolvedValue({
        list: [{ id: 1, table_name: 'users', can_read: true }],
      });

      const perms = await service.getRolePermissions(1);
      expect(perms).toHaveLength(1);
      expect(nocoDBService.list).toHaveBeenCalledWith(
        'perm_table_id',
        expect.objectContaining({ where: '(role.id,eq,1)' }),
      );
    });

    it('should return empty array if permissions table not found', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);
      const perms = await service.getRolePermissions(1);
      expect(perms).toEqual([]);
    });
  });

  describe('batchSetPermissions', () => {
    it('should set permissions for multiple tables', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'perm_table_id',
      });
      (nocoDBService.findOne as jest.Mock).mockResolvedValue(null);
      (nocoDBService.create as jest.Mock).mockResolvedValue({ id: 1 });

      const dto = {
        roleId: 1,
        permissions: [
          {
            tableName: 'users',
            canCreate: true,
            canRead: true,
            canUpdate: false,
            canDelete: false,
          },
          {
            tableName: 'orders',
            canCreate: false,
            canRead: true,
            canUpdate: false,
            canDelete: false,
          },
        ],
      };

      const result = await service.batchSetPermissions(dto as any);
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(nocoDBService.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('copyPermissions', () => {
    it('should copy permissions from source to target role', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'perm_table_id',
      });
      (nocoDBService.list as jest.Mock).mockResolvedValue({
        list: [
          {
            id: 1,
            table_name: 'users',
            can_create: true,
            can_read: true,
            can_update: false,
            can_delete: false,
          },
        ],
      });
      (nocoDBService.findOne as jest.Mock).mockResolvedValue(null);
      (nocoDBService.create as jest.Mock).mockResolvedValue({ id: 2 });

      const result = await service.copyPermissions(1, 2);
      expect(result.success).toBe(true);
      expect(result.copiedCount).toBe(1);
    });

    it('should throw NotFoundException when permissions table not found', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);

      await expect(service.copyPermissions(1, 2)).rejects.toThrow(
        'Table_permissions table not found',
      );
    });
  });

  describe('setTablePermissions - NotFoundException', () => {
    it('should throw NotFoundException when table_permissions not found', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);

      await expect(
        service.setTablePermissions({
          roleId: 1,
          tableName: 'users',
          canCreate: false,
          canRead: false,
          canUpdate: false,
          canDelete: false,
        }),
      ).rejects.toThrow('Table_permissions table not found');
    });
  });

  describe('deleteRolePermissions - NotFoundException', () => {
    it('should throw NotFoundException when table_permissions not found', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteRolePermissions(1)).rejects.toThrow(
        'Table_permissions table not found',
      );
    });
  });
});
