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
            listAll: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: PermissionsService,
          useValue: {
            clearCache: jest.fn(),
            setTablePermissions: jest.fn(),
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

    it('should delegate the upsert to PermissionsService', async () => {
      (permissionsService.setTablePermissions as jest.Mock).mockResolvedValue({
        id: 123,
      });

      const result = await service.setTablePermissions(dto);

      expect(permissionsService.setTablePermissions).toHaveBeenCalledWith(
        dto.roleId,
        dto.tableName,
        { create: true, read: true, update: false, delete: false },
      );
      expect(result).toEqual({ id: 123 });
    });
  });

  describe('deleteRolePermissions', () => {
    it('should delete all permissions for a role', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'perm_table_id',
      });
      (nocoDBService.listAll as jest.Mock).mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);
      (nocoDBService.delete as jest.Mock).mockResolvedValue(undefined);

      await service.deleteRolePermissions(99);

      expect(nocoDBService.listAll).toHaveBeenCalledWith('perm_table_id', {
        where: '(role_id,eq,99)',
      });

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
        pageInfo: { totalRows: 1 },
      });

      const result = await service.getRolePermissions(1);
      expect(result.data).toHaveLength(1);
      expect(nocoDBService.list).toHaveBeenCalledWith(
        'perm_table_id',
        expect.objectContaining({ where: '(role_id,eq,1)', withCount: true }),
      );
    });

    it('should return empty page result if permissions table not found', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);
      const result = await service.getRolePermissions(1);
      expect(result.data).toEqual([]);
      expect(result.meta.itemCount).toBe(0);
    });
  });

  describe('batchSetPermissions', () => {
    it('should set permissions for multiple tables', async () => {
      (permissionsService.setTablePermissions as jest.Mock).mockResolvedValue({
        id: 1,
      });

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

      const result = await service.batchSetPermissions(dto);
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(permissionsService.setTablePermissions).toHaveBeenCalledTimes(2);
      expect(permissionsService.setTablePermissions).toHaveBeenCalledWith(
        1,
        'users',
        { create: true, read: true, update: false, delete: false },
      );
      expect(permissionsService.setTablePermissions).toHaveBeenCalledWith(
        1,
        'orders',
        { create: false, read: true, update: false, delete: false },
      );
    });
  });

  describe('copyPermissions', () => {
    it('should copy permissions from source to target role', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'perm_table_id',
      });
      (nocoDBService.listAll as jest.Mock).mockResolvedValue([
        {
          id: 1,
          table_name: 'users',
          can_create: true,
          can_read: true,
          can_update: false,
          can_delete: false,
        },
      ]);
      (permissionsService.setTablePermissions as jest.Mock).mockResolvedValue({
        id: 2,
      });

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

  describe('setTablePermissions - error propagation', () => {
    it('should propagate errors from PermissionsService', async () => {
      (permissionsService.setTablePermissions as jest.Mock).mockRejectedValue(
        new NotFoundException('Table_permissions table not found'),
      );

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
