import { Injectable, Logger } from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { andFilters, filterEq, filterIn } from '../nocodb/nocodb-filter.util';
import { CrudAction } from './enums/crud-action.enum';
import { UserPermissions } from './interfaces/permission.interface';
import { extractNumericId } from '../common/utils/nocodb-utils';
import { SYSTEM_TABLE_NAMES } from '../common/system-table-names';

/** In-memory permission cache TTL (5 minutes). */
const PERMISSIONS_CACHE_TTL_MS = 5 * 60 * 1000;
export const PERMISSIONS_CACHE_MAX_ENTRIES = 1000;

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  /**
   * Cached permissions with their expiry time. Expiry is checked on read
   * instead of with timers, which would keep the process alive on shutdown.
   */
  private permissionsCache = new Map<
    number,
    { value: UserPermissions; expiresAt: number }
  >();
  private readonly CACHE_TTL = PERMISSIONS_CACHE_TTL_MS;

  constructor(private nocoDBService: NocoDBService) {}

  async canAnonymousRead(tableName: string): Promise<boolean> {
    const tables = await this.nocoDBService.listTables();
    const rolesTable = await this.nocoDBService.getTableByName(
      SYSTEM_TABLE_NAMES.ROLES,
      tables,
    );
    const permissionsTable = await this.nocoDBService.getTableByName(
      SYSTEM_TABLE_NAMES.TABLE_PERMISSIONS,
      tables,
    );
    if (!rolesTable || !permissionsTable) return false;
    const roles = await this.nocoDBService.list(rolesTable.id, {
      where: filterEq('role_name', 'anonymous'),
      limit: 2,
      page: 1,
    });
    if (roles.list.length === 0) return false;
    if (roles.list.length !== 1) throw new Error('Ambiguous anonymous role');
    const roleId = extractNumericId(roles.list[0]);
    const permissions = await this.nocoDBService.list(permissionsTable.id, {
      where: andFilters(
        filterEq('role_id', roleId),
        filterEq('table_name', tableName),
      ),
      limit: 2,
      page: 1,
    });
    if (permissions.list.length > 1)
      throw new Error('Ambiguous anonymous permissions');
    return permissions.list[0]?.can_read === true;
  }

  /**
   * Load all permissions for a user
   */
  async getUserPermissions(userId: number): Promise<UserPermissions> {
    const cached = this.permissionsCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const usersTable = await this.nocoDBService.getTableByName(
        SYSTEM_TABLE_NAMES.USERS,
      );
      if (!usersTable) {
        this.logger.warn('Users table not found');
        return this.createEmptyPermissions(userId, 'unknown');
      }

      const user = await this.nocoDBService.read(usersTable.id, userId);
      const username = (user?.username as string | undefined) ?? 'unknown';

      const userRolesTable = await this.nocoDBService.getTableByName(
        SYSTEM_TABLE_NAMES.USER_ROLES,
      );
      if (!userRolesTable) {
        this.logger.warn('User_roles table not found');
        return this.createEmptyPermissions(userId, username);
      }

      const userRoles = await this.nocoDBService.listAll(userRolesTable.id, {
        where: filterEq('user_id', userId),
        fields: ['role_id'],
      });

      const roleIds = [
        ...new Set(
          userRoles
            .map((ur) => Number(ur.role_id))
            .filter((id) => Number.isInteger(id) && id > 0),
        ),
      ];

      if (roleIds.length === 0) {
        this.logger.warn(`User ${userId} has no assigned roles`);
        return this.createEmptyPermissions(userId, username);
      }

      const rolesTable = await this.nocoDBService.getTableByName(
        SYSTEM_TABLE_NAMES.ROLES,
      );
      if (!rolesTable) {
        this.logger.warn('Roles table not found');
        return this.createEmptyPermissions(userId, username);
      }

      const roles = await this.nocoDBService.listAll(rolesTable.id, {
        where: filterIn('id', roleIds),
      });

      const roleNames = roles.map(
        (r) => (r.role_name as string | undefined) ?? '',
      );

      // Assignments of deleted roles remain in user_roles (and their rows in
      // table_permissions); only roles that still exist may grant access.
      const existingRoleIds = new Set(roles.map((r) => Number(r.id)));
      const activeRoleIds = roleIds.filter((id) => existingRoleIds.has(id));

      if (activeRoleIds.length === 0) {
        this.logger.warn(`User ${userId} has no existing roles`);
        return this.createEmptyPermissions(userId, username);
      }

      const permissionsTable = await this.nocoDBService.getTableByName(
        SYSTEM_TABLE_NAMES.TABLE_PERMISSIONS,
      );
      if (!permissionsTable) {
        this.logger.warn('Table_permissions table not found');
        return this.createEmptyPermissions(userId, username);
      }

      const permissionRecords = await this.nocoDBService.listAll(
        permissionsTable.id,
        { where: filterIn('role_id', activeRoleIds) },
      );

      const permissionsMap = new Map<string, Set<CrudAction>>();

      for (const perm of permissionRecords) {
        const tableName = perm.table_name as string | undefined;
        if (!tableName || !existingRoleIds.has(Number(perm.role_id))) continue;

        if (!permissionsMap.has(tableName)) {
          permissionsMap.set(tableName, new Set());
        }

        const actions = permissionsMap.get(tableName)!;

        if (perm.can_create) actions.add(CrudAction.CREATE);
        if (perm.can_read) actions.add(CrudAction.READ);
        if (perm.can_update) actions.add(CrudAction.UPDATE);
        if (perm.can_delete) actions.add(CrudAction.DELETE);
      }

      const userPermissions: UserPermissions = {
        userId,
        username,
        roles: roleNames.filter(Boolean),
        permissions: permissionsMap,
      };

      this.cachePermissions(userId, userPermissions);

      return userPermissions;
    } catch (error) {
      this.logger.error(`Error loading permissions for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Stores permissions, first dropping expired entries and, if the cache is
   * full, the oldest ones (a Map iterates in insertion order). Re-inserting
   * moves a user to the end.
   */
  private cachePermissions(userId: number, value: UserPermissions): void {
    const now = Date.now();
    for (const [id, entry] of this.permissionsCache) {
      if (entry.expiresAt <= now) this.permissionsCache.delete(id);
    }
    this.permissionsCache.delete(userId);
    while (this.permissionsCache.size >= PERMISSIONS_CACHE_MAX_ENTRIES) {
      const oldest = this.permissionsCache.keys().next().value as number;
      this.permissionsCache.delete(oldest);
    }
    this.permissionsCache.set(userId, {
      value,
      expiresAt: now + this.CACHE_TTL,
    });
  }

  /**
   * Check if a user can perform a specific action on a table
   */
  async canUserPerformAction(
    userId: number,
    tableName: string,
    action: CrudAction,
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);

    const tablePermissions = userPermissions.permissions.get(tableName);

    if (!tablePermissions) {
      return false;
    }

    return tablePermissions.has(action);
  }

  /**
   * Clear cache
   */
  clearCache(userId?: number): void {
    if (userId) {
      this.permissionsCache.delete(userId);
    } else {
      this.permissionsCache.clear();
    }
  }

  private createEmptyPermissions(
    userId: number,
    username: string,
  ): UserPermissions {
    return {
      userId,
      username,
      roles: [],
      permissions: new Map(),
    };
  }
}
