import { Injectable, Logger } from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { CrudAction } from './enums/crud-action.enum';
import { UserPermissions } from './interfaces/permission.interface';

type ListResponse<T> = { list?: T[] };

type WorkspaceTableRecord = { table_name?: string };

type UserRecord = { username?: string };

type UserRoleRecord = { role?: { Id?: number } };

type RoleRecord = { role_name?: string; Id?: number };

type PermissionRecord = {
  table_name?: string;
  can_create?: boolean;
  can_read?: boolean;
  can_update?: boolean;
  can_delete?: boolean;
};

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  private permissionsCache: Map<number, UserPermissions> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private nocoDBService: NocoDBService) {}

  /**
   * Get all tables in the configured workspace
   */
  async getAllWorkspaceTables(): Promise<string[]> {
    try {
      const httpClient = this.nocoDBService.getHttpClient();
      const baseId = this.nocoDBService.getBaseId();
      const response = await httpClient.get<ListResponse<WorkspaceTableRecord>>(
        `/api/v2/meta/bases/${baseId}/tables`,
      );

      const tables = response.data.list ?? [];
      const prefix = this.nocoDBService.getTablePrefix();

      // Filter only tables with the configured prefix
      return tables
        .map((table) => table.table_name)
        .filter(
          (name): name is string =>
            typeof name === 'string' && (!prefix || name.startsWith(prefix)),
        );
    } catch (error) {
      this.logger.error('Error fetching workspace tables:', error);
      throw error;
    }
  }

  /**
   * Load all permissions for a user
   */
  async getUserPermissions(userId: number): Promise<UserPermissions> {
    // Check cache
    const cached = this.permissionsCache.get(userId);
    if (cached) {
      return cached;
    }

    try {
      const httpClient = this.nocoDBService.getHttpClient();

      // 1. Get user data
      const usersTable = await this.nocoDBService.getTableByName('users');
      if (!usersTable) {
        this.logger.warn('Users table not found');
        return this.createEmptyPermissions(userId, 'unknown');
      }

      const userResponse = await httpClient.get<UserRecord>(
        `/api/v2/tables/${usersTable.id}/records/${userId}`,
      );
      const user = userResponse.data;
      const username =
        typeof user.username === 'string' ? user.username : 'unknown';

      // 2. Get user roles
      const userRolesTable =
        await this.nocoDBService.getTableByName('user_roles');
      if (!userRolesTable) {
        this.logger.warn('User_roles table not found');
        return this.createEmptyPermissions(userId, username);
      }

      const userRolesResponse = await httpClient.get<
        ListResponse<UserRoleRecord>
      >(`/api/v2/tables/${userRolesTable.id}/records`, {
        params: {
          where: `(user.Id,eq,${userId})`,
          nested: {
            role: {
              fields: ['Id', 'role_name'],
            },
          },
        },
      });

      // Extract role IDs from nested objects
      const roleIds = (userRolesResponse.data.list ?? [])
        .map((ur) => ur.role?.Id)
        .filter((id): id is number => typeof id === 'number');

      if (roleIds.length === 0) {
        this.logger.warn(`User ${userId} has no assigned roles`);
        return this.createEmptyPermissions(userId, username);
      }

      // 3. Get role information
      const rolesTable = await this.nocoDBService.getTableByName('roles');
      if (!rolesTable) {
        this.logger.warn('Roles table not found');
        return this.createEmptyPermissions(userId, username);
      }

      const rolesResponse = await httpClient.get<ListResponse<RoleRecord>>(
        `/api/v2/tables/${rolesTable.id}/records`,
        {
          params: {
            where: `(Id,in,${roleIds.join(',')})`,
          },
        },
      );

      const roles = rolesResponse.data.list ?? [];
      const roleNames = roles
        .map((r) => r.role_name)
        .filter((name): name is string => typeof name === 'string');

      // 4. Get table permissions for all roles
      const permissionsTable =
        await this.nocoDBService.getTableByName('table_permissions');
      if (!permissionsTable) {
        this.logger.warn('Table_permissions table not found');
        return this.createEmptyPermissions(userId, username);
      }

      const permissionsResponse = await httpClient.get<
        ListResponse<PermissionRecord>
      >(`/api/v2/tables/${permissionsTable.id}/records`, {
        params: {
          where: `(role.Id,in,${roleIds.join(',')})`,
        },
      });

      // 5. Aggregate permissions (OR logic: if one role has access, user has access)
      const permissionsMap = new Map<string, Set<CrudAction>>();
      const permissionsList = permissionsResponse.data.list ?? [];

      for (const perm of permissionsList) {
        if (typeof perm.table_name !== 'string') {
          continue;
        }

        if (!permissionsMap.has(perm.table_name)) {
          permissionsMap.set(perm.table_name, new Set());
        }

        const actions = permissionsMap.get(perm.table_name)!;

        if (perm.can_create) actions.add(CrudAction.CREATE);
        if (perm.can_read) actions.add(CrudAction.READ);
        if (perm.can_update) actions.add(CrudAction.UPDATE);
        if (perm.can_delete) actions.add(CrudAction.DELETE);
      }

      const userPermissions: UserPermissions = {
        userId,
        username,
        roles: roleNames,
        permissions: permissionsMap,
      };

      // Cache with TTL
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
      return false; // No permissions for this table
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
      const httpClient = this.nocoDBService.getHttpClient();
      const permissionsTable =
        await this.nocoDBService.getTableByName('table_permissions');

      if (!permissionsTable) {
        throw new Error('Table_permissions table not found');
      }

      // Check if permission entry exists
      const existingResponse = await httpClient.get<
        ListResponse<{ Id?: string | number }>
      >(`/api/v2/tables/${permissionsTable.id}/records`, {
        params: {
          where: `(role.Id,eq,${roleId})~and(table_name,eq,${tableName})`,
        },
      });

      const permissionData = {
        role: { Id: roleId }, // LinkToAnotherRecord format
        table_name: tableName,
        can_create: permissions[CrudAction.CREATE] ?? false,
        can_read: permissions[CrudAction.READ] ?? false,
        can_update: permissions[CrudAction.UPDATE] ?? false,
        can_delete: permissions[CrudAction.DELETE] ?? false,
      };

      const existingList = existingResponse.data.list ?? [];

      if (existingList.length > 0) {
        const existingId = existingList[0]?.Id;
        if (existingId === undefined) {
          throw new Error('Existing permission record id missing');
        }
        await httpClient.patch(
          `/api/v2/tables/${permissionsTable.id}/records/${existingId}`,
          permissionData,
        );
      } else {
        // Create new
        await httpClient.post(
          `/api/v2/tables/${permissionsTable.id}/records`,
          permissionData,
        );
      }

      this.logger.log(
        `Permissions set for role ${roleId} on table ${tableName}`,
      );

      // Invalidate cache for all users with this role
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
