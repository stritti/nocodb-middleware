import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { NocoDBService } from '../nocodb/nocodb.service';
import { Logger } from '@nestjs/common';
import { CrudAction } from './enums/crud-action.enum';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let nocoDBService: NocoDBService;
  let mockHttpClient: any;

  beforeEach(async () => {
    jest.useFakeTimers();

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

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllWorkspaceTables', () => {
    it('should fetch tables using v3 meta API', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: {
          list: [{ table_name: 'users' }, { table_name: 'roles' }],
        },
      });

      const tables = await service.getAllWorkspaceTables();
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/api/v3/meta/bases/test-base-id/tables',
      );
      expect(tables).toEqual(['users', 'roles']);
    });
  });

  describe('getUserPermissions', () => {
    it('should return empty permissions if user has no roles', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockImplementation((name) => {
        return Promise.resolve({ id: `id_${name}`, title: name });
      });

      (nocoDBService.read as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'testuser',
      });
      (nocoDBService.list as jest.Mock).mockResolvedValue({ list: [] });

      const permissions = await service.getUserPermissions(1);
      expect(permissions.roles).toEqual([]);
      expect(permissions.permissions.size).toBe(0);
    });

    it('should aggregate permissions from multiple roles', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockImplementation((name) => {
        return Promise.resolve({ id: `id_${name}`, title: name });
      });

      (nocoDBService.read as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'testuser',
      });

      (nocoDBService.list as jest.Mock).mockImplementation((tableId) => {
        if (tableId === 'id_user_roles') {
          return Promise.resolve({
            list: [{ id: 1, role: [{ id: 10 }] }],
          });
        }
        if (tableId === 'id_roles') {
          return Promise.resolve({
            list: [{ id: 10, role_name: 'admin' }],
          });
        }
        if (tableId === 'id_table_permissions') {
          return Promise.resolve({
            list: [
              {
                id: 1,
                table_name: 'users',
                can_read: true,
                can_create: false,
                can_update: false,
                can_delete: false,
              },
            ],
          });
        }
        return Promise.resolve({ list: [] });
      });

      const permissions = await service.getUserPermissions(1);
      expect(permissions.roles).toEqual(['admin']);
      expect(permissions.permissions.get('users')?.has(CrudAction.READ)).toBe(
        true,
      );
      expect(permissions.permissions.get('users')?.has(CrudAction.CREATE)).toBe(
        false,
      );
    });
  });

  describe('clearCache', () => {
    it('should clear entire cache when no userId provided', () => {
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

  describe('canUserPerformAction', () => {
    it('should return true when user has the required permission', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockImplementation((name) =>
        Promise.resolve({ id: `id_${name}`, title: name }),
      );
      (nocoDBService.read as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'testuser',
      });
      (nocoDBService.list as jest.Mock).mockImplementation((tableId) => {
        if (tableId === 'id_user_roles') {
          return Promise.resolve({ list: [{ id: 1, role: [{ id: 10 }] }] });
        }
        if (tableId === 'id_roles') {
          return Promise.resolve({ list: [{ id: 10, role_name: 'admin' }] });
        }
        if (tableId === 'id_table_permissions') {
          return Promise.resolve({
            list: [
              {
                id: 1,
                table_name: 'users',
                can_read: true,
                can_create: true,
                can_update: false,
                can_delete: false,
              },
            ],
          });
        }
        return Promise.resolve({ list: [] });
      });

      const result = await service.canUserPerformAction(
        1,
        'users',
        CrudAction.READ,
      );
      expect(result).toBe(true);
    });

    it('should return false when table has no permissions entry', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockImplementation((name) =>
        Promise.resolve({ id: `id_${name}`, title: name }),
      );
      (nocoDBService.read as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'testuser',
      });
      (nocoDBService.list as jest.Mock).mockResolvedValue({ list: [] });

      const result = await service.canUserPerformAction(
        1,
        'nonexistent',
        CrudAction.READ,
      );
      expect(result).toBe(false);
    });

    it('should return cached permissions on second call', async () => {
      const cachedPerms = {
        userId: 1,
        username: 'testuser',
        roles: ['admin'],
        permissions: new Map([['users', new Set([CrudAction.READ])]]),
      };
      (service as any).permissionsCache.set(1, cachedPerms);

      const result = await service.canUserPerformAction(
        1,
        'users',
        CrudAction.READ,
      );
      expect(result).toBe(true);
      expect(nocoDBService.getTableByName).not.toHaveBeenCalled();
    });
  });

  describe('getUserPermissions - edge cases', () => {
    it('should return empty permissions when users table not found', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);
      const result = await service.getUserPermissions(99);
      expect(result.roles).toEqual([]);
      expect(result.permissions.size).toBe(0);
    });

    it('should return empty permissions when user_roles table not found', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockImplementation((name) => {
        if (name === 'users') return Promise.resolve({ id: 'id_users' });
        return Promise.resolve(null);
      });
      (nocoDBService.read as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'testuser',
      });

      const result = await service.getUserPermissions(1);
      expect(result.roles).toEqual([]);
    });

    it('should return empty permissions when roles table not found', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockImplementation((name) => {
        if (name === 'users') return Promise.resolve({ id: 'id_users' });
        if (name === 'user_roles')
          return Promise.resolve({ id: 'id_user_roles' });
        return Promise.resolve(null);
      });
      (nocoDBService.read as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'testuser',
      });
      (nocoDBService.list as jest.Mock).mockImplementation((tableId) => {
        if (tableId === 'id_user_roles') {
          return Promise.resolve({ list: [{ id: 1, role: [{ id: 10 }] }] });
        }
        return Promise.resolve({ list: [] });
      });

      const result = await service.getUserPermissions(1);
      expect(result.roles).toEqual([]);
    });

    it('should return empty permissions when table_permissions table not found', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockImplementation((name) => {
        if (name === 'users') return Promise.resolve({ id: 'id_users' });
        if (name === 'user_roles')
          return Promise.resolve({ id: 'id_user_roles' });
        if (name === 'roles') return Promise.resolve({ id: 'id_roles' });
        return Promise.resolve(null);
      });
      (nocoDBService.read as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'testuser',
      });
      (nocoDBService.list as jest.Mock).mockImplementation((tableId) => {
        if (tableId === 'id_user_roles') {
          return Promise.resolve({ list: [{ id: 1, role: [{ id: 10 }] }] });
        }
        if (tableId === 'id_roles') {
          return Promise.resolve({ list: [{ id: 10, role_name: 'admin' }] });
        }
        return Promise.resolve({ list: [] });
      });

      const result = await service.getUserPermissions(1);
      expect(result.roles).toEqual([]);
    });
  });

  describe('setTablePermissions', () => {
    it('should update existing permissions', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'id_table_permissions',
      });
      (nocoDBService.findOne as jest.Mock).mockResolvedValue({ id: 5 });
      (nocoDBService.update as jest.Mock).mockResolvedValue({});

      await service.setTablePermissions(1, 'users', {
        [CrudAction.READ]: true,
        [CrudAction.CREATE]: false,
      });

      expect(nocoDBService.update).toHaveBeenCalledWith(
        'id_table_permissions',
        5,
        expect.objectContaining({ can_read: true }),
      );
    });

    it('should create new permissions when none exist', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'id_table_permissions',
      });
      (nocoDBService.findOne as jest.Mock).mockResolvedValue(null);
      (nocoDBService.create as jest.Mock).mockResolvedValue({ id: 1 });

      await service.setTablePermissions(1, 'orders', {});

      expect(nocoDBService.create).toHaveBeenCalled();
    });

    it('should throw when table_permissions table not found', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);

      await expect(service.setTablePermissions(1, 'users', {})).rejects.toThrow(
        'Table_permissions table not found',
      );
    });
  });

  describe('getAllWorkspaceTables with prefix filter', () => {
    it('should filter tables by prefix when prefix is set', async () => {
      (nocoDBService.getTablePrefix as jest.Mock).mockReturnValue('nc_');
      mockHttpClient.get.mockResolvedValue({
        data: {
          list: [
            { table_name: 'nc_users' },
            { table_name: 'nc_roles' },
            { table_name: 'other_table' },
          ],
        },
      });

      const tables = await service.getAllWorkspaceTables();
      expect(tables).toEqual(['nc_users', 'nc_roles']);
    });
  });
});
