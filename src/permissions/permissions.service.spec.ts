import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { NocoDBService } from '../nocodb/nocodb.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Logger } from '@nestjs/common';
import { CrudAction } from './enums/crud-action.enum';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let nocoDBService: NocoDBService;
  let mockHttpClient: {
    get: jest.Mock<
      Promise<{ data?: { list?: unknown[] } }>,
      [string, { params?: Record<string, unknown> }?]
    >;
    post: jest.Mock<Promise<{ data?: unknown }>, [string, unknown?]>;
    patch: jest.Mock<Promise<{ data?: unknown }>, [string, unknown?]>;
    delete: jest.Mock<Promise<unknown>, [string]>;
  };

  beforeEach(async () => {
    mockHttpClient = {
      get: jest.fn<
        Promise<{ data?: { list?: unknown[] } }>,
        [string, { params?: Record<string, unknown> }?]
      >(),
      post: jest.fn<Promise<{ data?: unknown }>, [string, unknown?]>(),
      patch: jest.fn<Promise<{ data?: unknown }>, [string, unknown?]>(),
      delete: jest.fn<Promise<unknown>, [string]>(),
    } satisfies {
      get: jest.Mock<
        Promise<{ data?: { list?: unknown[] } }>,
        [string, { params?: Record<string, unknown> }?]
      >;
      post: jest.Mock<Promise<{ data?: unknown }>, [string, unknown?]>;
      patch: jest.Mock<Promise<{ data?: unknown }>, [string, unknown?]>;
      delete: jest.Mock<Promise<unknown>, [string]>;
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: NocoDBService,
          useValue: {
            getTableByName: jest.fn(),
            getHttpClient: jest.fn().mockReturnValue(mockHttpClient),
            getBaseId: jest.fn().mockReturnValue('base_id'),
            getTablePrefix: jest.fn().mockReturnValue(''),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    nocoDBService = module.get<NocoDBService>(NocoDBService);

    // Suppress logs
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllWorkspaceTables', () => {
    it('should return table names filtered by prefix', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: {
          list: [{ table_name: 'nc_table1' }, { table_name: 'other_table' }],
        },
      });
      (nocoDBService.getTablePrefix as jest.Mock).mockReturnValue('nc_');

      const tables = await service.getAllWorkspaceTables();
      expect(tables).toEqual(['nc_table1']);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/api/v2/meta/bases/base_id/tables',
      );
    });
  });

  describe('getUserPermissions', () => {
    const userId = 1;
    const mockUser = { username: 'testuser' };

    beforeEach(() => {
      // Setup mocking for table lookups
      (nocoDBService.getTableByName as jest.Mock).mockImplementation(
        (name: string) => {
          return Promise.resolve({ id: `id_${name}`, title: name });
        },
      );
    });

    it('should return cached permissions if available', async () => {
      const cachedPerms = {
        userId,
        username: 'cached',
        roles: [],
        permissions: new Map<string, Set<CrudAction>>(),
      };

      (service as any).permissionsCache.set(userId, cachedPerms);

      const result = await service.getUserPermissions(userId);
      expect(result).toBe(cachedPerms);
      expect(nocoDBService.getHttpClient).not.toHaveBeenCalled();
    });

    it('should fetch and calculate permissions if not cached', async () => {
      // 1. Get User
      mockHttpClient.get.mockResolvedValueOnce({
        data: mockUser,
      } as unknown as { data?: { list?: unknown[] } });

      // 2. Get User Roles
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          list: [{ role: { Id: 10, role_name: 'Admin' } }],
        },
      });

      // 3. Get Roles Info
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          list: [{ Id: 10, role_name: 'Admin' }],
        },
      });

      // 4. Get Table Permissions
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          list: [
            {
              table_name: 'test_table',
              can_create: true,
              can_read: true,
              can_update: false,
              can_delete: false,
            },
          ],
        },
      });

      (service as any).permissionsCache.clear();

      const result = await service.getUserPermissions(userId);

      expect(result.userId).toBe(userId);
      expect(result.username).toBe('testuser');
      expect(result.roles).toEqual(['Admin']);
      expect(result.permissions.get('test_table')).toBeDefined();
      expect(result.permissions.get('test_table')?.has(CrudAction.CREATE)).toBe(
        true,
      );
      expect(result.permissions.get('test_table')?.has(CrudAction.DELETE)).toBe(
        false,
      );

      // Verify cache was set

      expect((service as any).permissionsCache.has(userId)).toBe(true);
    });

    it('should return empty permissions if user has no roles', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: mockUser,
      } as unknown as { data?: { list?: unknown[] } }); // User
      mockHttpClient.get.mockResolvedValueOnce({ data: { list: [] } }); // No roles

      const result = await service.getUserPermissions(userId);
      expect(result.roles).toEqual([]);
      expect(result.permissions.size).toBe(0);
    });
  });

  describe('canUserPerformAction', () => {
    it('should return true if user has permission', async () => {
      const perms = new Map<string, Set<CrudAction>>();
      perms.set('table1', new Set([CrudAction.READ]));

      jest.spyOn(service, 'getUserPermissions').mockResolvedValue({
        userId: 1,
        username: 'user',
        roles: [] as string[],
        permissions: perms,
      });

      expect(
        await service.canUserPerformAction(1, 'table1', CrudAction.READ),
      ).toBe(true);
    });

    it('should return false if user does not have permission', async () => {
      const perms = new Map<string, Set<CrudAction>>();
      perms.set('table1', new Set([CrudAction.READ]));

      jest.spyOn(service, 'getUserPermissions').mockResolvedValue({
        userId: 1,
        username: 'user',
        roles: [] as string[],
        permissions: perms,
      });

      expect(
        await service.canUserPerformAction(1, 'table1', CrudAction.CREATE),
      ).toBe(false);
      expect(
        await service.canUserPerformAction(1, 'other_table', CrudAction.READ),
      ).toBe(false);
    });
  });

  describe('setTablePermissions', () => {
    it('should create permissions if not existing', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'perm_table',
      });
      mockHttpClient.get.mockResolvedValue({ data: { list: [] } }); // Not found

      await service.setTablePermissions(1, 'table1', {
        [CrudAction.READ]: true,
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/api/v2/tables/perm_table/records',
        expect.objectContaining({
          role: { Id: 1 },
          table_name: 'table1',
          can_read: true,
        }),
      );
      expect(
        (service as unknown as { permissionsCache: Map<number, unknown> })
          .permissionsCache.size,
      ).toBe(0);
    });
  });

  describe('initializePermissionsForRole', () => {
    it('should iterate all tables and set permissions', async () => {
      jest
        .spyOn(service, 'getAllWorkspaceTables')
        .mockResolvedValue(['t1', 't2']);
      const setPermSpy = jest
        .spyOn(service, 'setTablePermissions')
        .mockResolvedValue(undefined);

      await service.initializePermissionsForRole(1, 'Role', {});

      expect(setPermSpy).toHaveBeenCalledTimes(2);
      expect(setPermSpy).toHaveBeenCalledWith(1, 't1', {});
      expect(setPermSpy).toHaveBeenCalledWith(1, 't2', {});
    });
  });
});
