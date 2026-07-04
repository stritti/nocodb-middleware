import { Injectable, Logger } from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import type { NocoRecord } from '../nocodb/nocodb.types';
import { andFilters, filterEq, filterIn } from '../nocodb/nocodb-filter.util';
import { CrudAction } from './enums/crud-action.enum';
import { UserPermissions } from './interfaces/permission.interface';
import { extractNumericId } from '../common/utils/nocodb-utils';

/** In-memory permission cache TTL (5 minutes). */
const PERMISSIONS_CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  private permissionsCache: Map<number, UserPermissions> = new Map();
  private readonly CACHE_TTL = PERMISSIONS_CACHE_TTL_MS;

  constructor(private nocoDBService: NocoDBService) {}

  /**
   * Get all tables in the configured workspace
   */
  async getAllWorkspaceTables(): Promise<string[]> {
    try {
      const baseId = this.nocoDBService.getBaseId();
      const tables = await this.nocoDBService.listBaseTables(baseId);
      const prefix = this.nocoDBService.getTablePrefix();

      return tables
        .map((table) => table.table_name)
        .filter((name: string) => (prefix ? name.startsWith(prefix) : true));
    } catch (error) {
      this.logger.error('Error fetching workspace tables:', error);
      throw error;
    }
  }

  /**
   * Load all permissions for a user
   */
  async getUserPermissions(userId: number): Promise<UserPermissions> {
    const cached = this.permissionsCache.get(userId);
    if (cached) {
      return cached;
    }

    try {
      const usersTable = await this.nocoDBService.getTableByName('users');
      if (!usersTable) {
        this.logger.warn('Users table not found');
        return this.createEmptyPermissions(userId, 'unknown');
      }

      const user = await this.nocoDBService.read(usersTable.id, userId);
      const username =
        (user?.username as string | undefined) ?? 'unknown';

      const userRolesTable =
        await this.nocoDBService.getTableByName('user_roles');
      if (!userRolesTable) {
        this.logger.warn('User_roles table not found');
        return this.createEmptyPermissions(userId, username);
      }

      const userRolesResult = await this.nocoDBService.list(userRolesTable.id, {
        where: filterEq('user.id', userId),
        includeRelations: ['role'],
      });

      const roleIds = (userRolesResult.list ?? [])
        .filter((ur) => {
          const role = (ur as Record<string, unknown>).role;
          return Array.isArray(role) && role.length > 0;
        })
        .map((ur) => {
          const role = (ur as Record<string, unknown>).role as Array<{ id?: number | string }>;
          return role[0].id != null ? Number(role[0].id) : NaN;
        })
        .filter((id): id is number => !Number.isNaN(id));

      if (roleIds.length === 0) {
        this.logger.warn(`User ${userId} has no assigned roles`);
        return this.createEmptyPermissions(userId, username);
      }

      const rolesTable = await this.nocoDBService.getTableByName('roles');
      if (!rolesTable) {
        this.logger.warn('Roles table not found');
        return this.createEmptyPermissions(userId, username);
      }

      const rolesResult = await this.nocoDBService.list(rolesTable.id, {
        where: filterIn('id', roleIds),
      });

      const roleNames = (rolesResult.list ?? []).map(
        (r) => (r.role_name as string | undefined) ?? '',
      );

      const permissionsTable =
        await this.nocoDBService.getTableByName('table_permissions');
      if (!permissionsTable) {
        this.logger.warn('Table_permissions table not found');
        return this.createEmptyPermissions(userId, username);
      }

      const permissionsResult = await this.nocoDBService.list(
        permissionsTable.id,
        { where: filterIn('role.id', roleIds) },
      );

      const permissionsMap = new Map<string, Set<CrudAction>>();

      for (const perm of permissionsResult.list ?? []) {
        const tableName = perm.table_name as string | undefined;
        if (!tableName) continue;

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

      this.permissionsCache.set(userId, userPermissions);
      setTimeout(() => this.permissionsCache.delete(userId), this.CACHE_TTL);

      return userPermissions;
    } catch (error) {
      this.logger.error(`Error loading permissions for user ${userId}:`, error);
      throw error;
    }
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
   * Set permissions for a role on a table
   */
  async setTablePermissions(
    roleId: number,
    tableName: string,
    permissions: Partial<Record<CrudAction, boolean>>,
  ): Promise<void> {
    try {
      const permissionsTable =
        await this.nocoDBService.getTableByName('table_permissions');

      if (!permissionsTable) {
        throw new Error('Table_permissions table not found');
      }

      const existing = await this.nocoDBService.findOne(
        permissionsTable.id,
        andFilters(
          filterEq('role.id', roleId),
          filterEq('table_name', tableName),
        ),
      );

      const permissionData = {
        role: [{ id: roleId }],
        table_name: tableName,
        can_create: permissions[CrudAction.CREATE] ?? false,
        can_read: permissions[CrudAction.READ] ?? false,
        can_update: permissions[CrudAction.UPDATE] ?? false,
        can_delete: permissions[CrudAction.DELETE] ?? false,
      };

      if (existing) {
        await this.nocoDBService.update(
          permissionsTable.id,
          extractNumericId(existing),
          permissionData,
        );
      } else {
        await this.nocoDBService.create(permissionsTable.id, permissionData);
      }

      this.logger.log(
        `Permissions set for role ${roleId} on table ${tableName}`,
      );

      this.permissionsCache.clear();
    } catch (error) {
      this.logger.error('Error setting table permissions:', error);
      throw error;
    }
  }

  /**
   * Initialize permissions for all tables in workspace for a role
   */
  async initializePermissionsForRole(
    roleId: number,
    roleName: string,
    defaultPermissions: Partial<Record<CrudAction, boolean>>,
  ): Promise<void> {
    this.logger.log(`Initializing permissions for role ${roleName}...`);

    const tables = await this.getAllWorkspaceTables();

    for (const tableName of tables) {
      await this.setTablePermissions(roleId, tableName, defaultPermissions);
    }

    this.logger.log(
      `${tables.length} table permissions initialized for role ${roleName}`,
    );
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
