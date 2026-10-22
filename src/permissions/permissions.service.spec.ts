import { Logger } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { NocoDBService } from '../nocodb/nocodb.service';
import { CrudAction } from './enums/crud-action.enum';
import { NocoRecord } from '../nocodb/nocodb.types';

type Tables = Partial<
  Record<'users' | 'user_roles' | 'roles' | 'table_permissions', NocoRecord[]>
>;

/**
 * NocoDBService stub backed by per-table records. `listAll` returns all
 * records of a table and remembers the filter, so tests can assert the
 * lookups the service performs.
 */
function createNocoDB(tables: Tables, prefix = '') {
  const tableIds: Record<string, string> = {
    users: 'tbl_users',
    user_roles: 'tbl_user_roles',
    roles: 'tbl_roles',
    table_permissions: 'tbl_permissions',
  };
  const byId = Object.fromEntries(
    Object.entries(tableIds).map(([name, id]) => [id, name]),
  );

  return {
    getTablePrefix: jest.fn().mockReturnValue(prefix),
    getBaseId: jest.fn().mockReturnValue('base'),
    listBaseTables: jest.fn(),
    getTableByName: jest.fn((name: string) =>
      Promise.resolve(
        name in tables ? { id: tableIds[name], title: name } : null,
      ),
    ),
    read: jest.fn((_tableId: string, id: number) =>
      Promise.resolve(
        (tables.users ?? []).find((u) => Number(u.id) === id) ?? null,
      ),
    ),
    listAll: jest.fn((tableId: string) =>
      Promise.resolve(tables[byId[tableId] as keyof Tables] ?? []),
    ),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
}

const alice = { id: 1, username: 'alice' };

describe('PermissionsService', () => {
  beforeEach(() => {
    // Fake timers also fake Date.now(), which drives the cache expiry.
    jest.useFakeTimers();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function serviceFor(nocodb: ReturnType<typeof createNocoDB>) {
    return new PermissionsService(nocodb as unknown as NocoDBService);
  }

  describe('getUserPermissions', () => {
    it('aggregates the permissions of all roles of the user', async () => {
      const nocodb = createNocoDB({
        users: [alice],
        user_roles: [
          { id: 1, user_id: 1, role_id: 10 },
          { id: 2, user_id: 1, role_id: 20 },
        ],
        roles: [
          { id: 10, role_name: 'editor' },
          { id: 20, role_name: 'auditor' },
        ],
        table_permissions: [
          { id: 1, role_id: 10, table_name: 'orders', can_create: true },
          { id: 2, role_id: 20, table_name: 'orders', can_read: true },
          { id: 3, role_id: 20, table_name: 'users', can_read: true },
        ],
      });

      const result = await serviceFor(nocodb).getUserPermissions(1);

      expect(result.roles).toEqual(['editor', 'auditor']);
      expect([...result.permissions.get('orders')!].sort()).toEqual(
        [CrudAction.CREATE, CrudAction.READ].sort(),
      );
      expect([...result.permissions.get('users')!]).toEqual([CrudAction.READ]);
    });

    it('looks up roles and permissions by numeric id fields', async () => {
      const nocodb = createNocoDB({
        users: [alice],
        user_roles: [
          { id: 1, user_id: 1, role_id: 10 },
          { id: 2, user_id: 1, role_id: 10 },
        ],
        roles: [{ id: 10, role_name: 'editor' }],
        table_permissions: [],
      });

      await serviceFor(nocodb).getUserPermissions(1);

      expect(nocodb.listAll).toHaveBeenCalledWith('tbl_user_roles', {
        where: '(user_id,eq,1)',
        fields: ['role_id'],
      });
      expect(nocodb.listAll).toHaveBeenCalledWith('tbl_roles', {
        where: '(Id,in,10)',
      });
      expect(nocodb.listAll).toHaveBeenCalledWith('tbl_permissions', {
        where: '(role_id,in,10)',
      });
    });

    it('ignores assignments and permissions of deleted roles', async () => {
      // role 20 was deleted; its assignment and permission rows remain
      const nocodb = createNocoDB({
        users: [alice],
        user_roles: [
          { id: 1, user_id: 1, role_id: 10 },
          { id: 2, user_id: 1, role_id: 20 },
        ],
        roles: [{ id: 10, role_name: 'viewer' }],
        table_permissions: [
          { role_id: 10, table_name: 'customers', can_read: true },
          { role_id: 20, table_name: 'customers', can_delete: true },
        ],
      });

      const result = await serviceFor(nocodb).getUserPermissions(1);

      expect(nocodb.listAll).toHaveBeenCalledWith('tbl_permissions', {
        where: '(role_id,in,10)',
      });
      expect(result.roles).toEqual(['viewer']);
      expect([...result.permissions.get('customers')!]).toEqual([
        CrudAction.READ,
      ]);
    });

    it('returns no permissions when all assigned roles were deleted', async () => {
      const nocodb = createNocoDB({
        users: [alice],
        user_roles: [{ id: 1, user_id: 1, role_id: 20 }],
        roles: [],
        table_permissions: [
          { role_id: 20, table_name: 'customers', can_delete: true },
        ],
      });

      const result = await serviceFor(nocodb).getUserPermissions(1);

      expect(result.permissions.size).toBe(0);
    });

    it('returns no permissions for a user without roles', async () => {
      const nocodb = createNocoDB({
        users: [alice],
        user_roles: [],
        roles: [],
        table_permissions: [],
      });

      const result = await serviceFor(nocodb).getUserPermissions(1);

      expect(result.roles).toEqual([]);
      expect(result.permissions.size).toBe(0);
    });

    it.each(['users', 'user_roles', 'roles', 'table_permissions'] as const)(
      'returns no permissions when the %s table is missing',
      async (missing) => {
        const tables: Tables = {
          users: [alice],
          user_roles: [{ id: 1, user_id: 1, role_id: 10 }],
          roles: [{ id: 10, role_name: 'editor' }],
          table_permissions: [
            { id: 1, role_id: 10, table_name: 'orders', can_read: true },
          ],
        };
        delete tables[missing];

        const result = await serviceFor(
          createNocoDB(tables),
        ).getUserPermissions(1);

        expect(result.permissions.size).toBe(0);
      },
    );
  });

  describe('canUserPerformAction', () => {
    const tables: Tables = {
      users: [alice],
      user_roles: [{ id: 1, user_id: 1, role_id: 10 }],
      roles: [{ id: 10, role_name: 'editor' }],
      table_permissions: [
        { id: 1, role_id: 10, table_name: 'orders', can_read: true },
      ],
    };

    it('allows a granted action', async () => {
      await expect(
        serviceFor(createNocoDB(tables)).canUserPerformAction(
          1,
          'orders',
          CrudAction.READ,
        ),
      ).resolves.toBe(true);
    });

    it('denies an action that is not granted', async () => {
      await expect(
        serviceFor(createNocoDB(tables)).canUserPerformAction(
          1,
          'orders',
          CrudAction.DELETE,
        ),
      ).resolves.toBe(false);
    });

    it('denies a table without permission entry', async () => {
      await expect(
        serviceFor(createNocoDB(tables)).canUserPerformAction(
          1,
          'invoices',
          CrudAction.READ,
        ),
      ).resolves.toBe(false);
    });

    it('serves repeated checks from the cache', async () => {
      const nocodb = createNocoDB(tables);
      const service = serviceFor(nocodb);

      await service.canUserPerformAction(1, 'orders', CrudAction.READ);
      await service.canUserPerformAction(1, 'orders', CrudAction.READ);

      expect(nocodb.listAll).toHaveBeenCalledTimes(3);
    });
  });

  describe('cache expiry', () => {
    const tables: Tables = {
      users: [alice],
      user_roles: [{ id: 1, user_id: 1, role_id: 10 }],
      roles: [{ id: 10, role_name: 'editor' }],
      table_permissions: [
        { id: 1, role_id: 10, table_name: 'orders', can_read: true },
      ],
    };
    // one uncached load reads user_roles, roles and table_permissions
    const LOOKUPS_PER_LOAD = 3;

    it('reloads permissions once the cache entry is older than 5 minutes', async () => {
      const nocodb = createNocoDB(tables);
      const service = serviceFor(nocodb);

      await service.getUserPermissions(1);
      jest.advanceTimersByTime(4 * 60 * 1000);
      await service.getUserPermissions(1);
      expect(nocodb.listAll).toHaveBeenCalledTimes(LOOKUPS_PER_LOAD);

      jest.advanceTimersByTime(2 * 60 * 1000);
      await service.getUserPermissions(1);
      expect(nocodb.listAll).toHaveBeenCalledTimes(2 * LOOKUPS_PER_LOAD);
    });

    it('does not keep timers running, so the process can shut down', async () => {
      await serviceFor(createNocoDB(tables)).getUserPermissions(1);

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('clearCache', () => {
    it('reloads permissions after the cache is cleared', async () => {
      const nocodb = createNocoDB({
        users: [alice],
        user_roles: [],
        roles: [],
        table_permissions: [],
      });
      const service = serviceFor(nocodb);

      await service.getUserPermissions(1);
      service.clearCache(1);
      await service.getUserPermissions(1);

      expect(nocodb.listAll).toHaveBeenCalledTimes(2);
    });
  });

  describe('setTablePermissions', () => {
    const nocodb = () =>
      createNocoDB({ table_permissions: [], users: [], roles: [] });

    it('updates an existing permission entry of the role', async () => {
      const stub = nocodb();
      stub.findOne.mockResolvedValue({ id: 5 });

      await serviceFor(stub).setTablePermissions(1, 'orders', {
        [CrudAction.READ]: true,
      });

      expect(stub.findOne).toHaveBeenCalledWith(
        'tbl_permissions',
        '(role_id,eq,1)~and(table_name,eq,"orders")',
      );
      expect(stub.update).toHaveBeenCalledWith('tbl_permissions', 5, {
        role_id: 1,
        table_name: 'orders',
        can_create: false,
        can_read: true,
        can_update: false,
        can_delete: false,
      });
    });

    it('creates a permission entry when none exists', async () => {
      const stub = nocodb();
      stub.findOne.mockResolvedValue(null);

      await serviceFor(stub).setTablePermissions(2, 'orders', {});

      expect(stub.create).toHaveBeenCalledWith(
        'tbl_permissions',
        expect.objectContaining({ role_id: 2, table_name: 'orders' }),
      );
    });

    it('throws when the table_permissions table is missing', async () => {
      await expect(
        serviceFor(createNocoDB({})).setTablePermissions(1, 'orders', {}),
      ).rejects.toThrow('Table_permissions table not found');
    });
  });

  describe('getAllWorkspaceTables', () => {
    it('returns table names', async () => {
      const stub = createNocoDB({});
      stub.listBaseTables.mockResolvedValue([
        { id: 't1', title: 'users' },
        { id: 't2', title: 'orders' },
      ]);

      await expect(serviceFor(stub).getAllWorkspaceTables()).resolves.toEqual([
        'users',
        'orders',
      ]);
    });

    it('returns logical names of the prefixed tables only', async () => {
      const stub = createNocoDB({}, 'nc_');
      stub.listBaseTables.mockResolvedValue([
        { id: 't1', title: 'nc_users' },
        { id: 't2', title: 'nc_orders' },
        { id: 't3', title: 'other_table' },
      ]);

      await expect(serviceFor(stub).getAllWorkspaceTables()).resolves.toEqual([
        'users',
        'orders',
      ]);
    });
  });
});
