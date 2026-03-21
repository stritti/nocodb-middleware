import { Injectable, Logger } from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { CrudAction } from './enums/crud-action.enum';
import { UserPermissions } from './interfaces/permission.interface';

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
      const response = await httpClient.get(
        `/api/v2/meta/bases/${baseId}/tables`,
      );

      const tables = response.data.list || [];
      const prefix = this.nocoDBService.getTablePrefix();

      // Filter only tables with the configured prefix
      return tables
        .map((table: any) => table.table_name)
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

      const userResponse = await httpClient.get(
        `/api/v2/tables/${usersTable.id}/records/${userId}`,
      );
      const user = userResponse.data;

      // 2. Get user roles
      const userRolesTable =
        await this.nocoDBService.getTableByName('user_roles');
      if (!userRolesTable) {
        this.logger.warn('User_roles table not found');
        return this.createEmptyPermissions(userId, user.username);
      }

      const userRolesResponse = await httpClient.get(
        `/api/v2/tables/${userRolesTable.id}/records`,
        {
          params: {
            where: `(user.Id,eq,${userId})`,
            nested: {
              role: {
                fields: ['Id', 'role_name'],
              },
            },
          },
        },
      );

      // Extract role IDs from nested objects
      const roleIds = userRolesResponse.data.list
        .filter((ur: any) => ur.role && ur.role.Id)
        .map((ur: any) => ur.role.Id);

      if (roleIds.length === 0) {
        this.logger.warn(`User ${userId} has no assigned roles`);
        return this.createEmptyPermissions(userId, user.username);
      }

      // 3. Get role information
      const rolesTable = await this.nocoDBService.getTableByName('roles');
      if (!rolesTable) {
        this.logger.warn('Roles table not found');
        return this.createEmptyPermissions(userId, user.username);
      }

      const rolesResponse = await httpClient.get(
        `/api/v2/tables/${rolesTable.id}/records`,
        {
          params: {
            where: `(Id,in,${roleIds.join(',')})`,
          },
        },
      );

      const roles = rolesResponse.data.list;
      const roleNames = roles.map((r: any) => r.role_name);

      // 4. Get table permissions for all roles
      const permissionsTable =
        await this.nocoDBService.getTableByName('table_permissions');
      if (!permissionsTable) {
        this.logger.warn('Table_permissions table not found');
        return this.createEmptyPermissions(userId, user.username);
      }

      const permissionsResponse = await httpClient.get(
        `/api/v2/tables/${permissionsTable.id}/records`,
        {
          params: {
            where: `(role.Id,in,${roleIds.join(',')})`,
          },
        },
      );

      // 5. Aggregate permissions (OR logic: if one role has access, user has access)
      const permissionsMap = new Map<string, Set<CrudAction>>();

      for (const perm of permissionsResponse.data.list) {
        const tableName = perm.table_name;

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
        username: user.username,
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
      const existingResponse = await httpClient.get(
        `/api/v2/tables/${permissionsTable.id}/records`,
        {
          params: {
            where: `(role.Id,eq,${roleId})~and(table_name,eq,${tableName})`,
          },
        },
      );

      const permissionData = {
        role: { Id: roleId }, // LinkToAnotherRecord format
        table_name: tableName,
        can_create: permissions[CrudAction.CREATE] ?? false,
        can_read: permissions[CrudAction.READ] ?? false,
        can_update: permissions[CrudAction.UPDATE] ?? false,
        can_delete: permissions[CrudAction.DELETE] ?? false,
      };

      if (existingResponse.data.list.length > 0) {
        // Update existing
        const existingId = existingResponse.data.list[0].Id;
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
