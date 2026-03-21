import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { SetTablePermissionsDto } from './dto/set-table-permissions.dto';
import { BatchSetPermissionsDto } from './dto/batch-permissions.dto';
import { PermissionsService } from './permissions.service';

@Injectable()
export class PermissionsManagementService {
  private readonly logger = new Logger(PermissionsManagementService.name);

  constructor(
    private nocoDBService: NocoDBService,
    private permissionsService: PermissionsService,
  ) {}

  /**
   * Set permissions for a single table
   */
  async setTablePermissions(dto: SetTablePermissionsDto): Promise<any> {
    try {
      const permissionsTable =
        await this.nocoDBService.getTableByName('table_permissions');
      if (!permissionsTable) {
        throw new NotFoundException('Table_permissions table not found');
      }

      const httpClient = this.nocoDBService.getHttpClient();

      // Check if entry already exists
      const existingResponse = await httpClient.get(
        `/api/v2/tables/${permissionsTable.id}/records`,
        {
          params: {
            where: `(role.Id,eq,${dto.roleId})~and(table_name,eq,${dto.tableName})`,
          },
        },
      );

      const permissionData = {
        role: { Id: dto.roleId },
        table_name: dto.tableName,
        can_create: dto.canCreate,
        can_read: dto.canRead,
        can_update: dto.canUpdate,
        can_delete: dto.canDelete,
      };

      let result;

      if (existingResponse.data.list.length > 0) {
        // Update existing entry
        const existingId = existingResponse.data.list[0].Id;
        result = await httpClient.patch(
          `/api/v2/tables/${permissionsTable.id}/records/${existingId}`,
          permissionData,
        );

        this.logger.log(
          `Permission updated: Role ${dto.roleId} -> Table ${dto.tableName}`,
        );
      } else {
        // Create new entry
        result = await httpClient.post(
          `/api/v2/tables/${permissionsTable.id}/records`,
          permissionData,
        );

        this.logger.log(
          `Permission created: Role ${dto.roleId} -> Table ${dto.tableName}`,
        );
      }

      // Invalidate cache
      this.permissionsService.clearCache();

      return result.data;
    } catch (error) {
      this.logger.error('Error setting table permissions:', error);
      throw error;
    }
  }

  /**
   * Set permissions for multiple tables at once
   */
  async batchSetPermissions(dto: BatchSetPermissionsDto): Promise<any> {
    this.logger.log(
      `Batch update: ${dto.permissions.length} permissions for role ${dto.roleId}`,
    );

    const results = [];

    for (const permission of dto.permissions) {
      const result = await this.setTablePermissions({
        roleId: dto.roleId,
        tableName: permission.tableName,
        canCreate: permission.canCreate,
        canRead: permission.canRead,
        canUpdate: permission.canUpdate,
        canDelete: permission.canDelete,
      });

      results.push(result);
    }

    return {
      success: true,
      count: results.length,
      results,
    };
  }

  /**
   * Copy permissions from one role to another
   */
  async copyPermissions(
    sourceRoleId: number,
    targetRoleId: number,
  ): Promise<any> {
    try {
      const permissionsTable =
        await this.nocoDBService.getTableByName('table_permissions');
      if (!permissionsTable) {
        throw new NotFoundException('Table_permissions table not found');
      }

      const httpClient = this.nocoDBService.getHttpClient();

      // Get all permissions from source role
      const response = await httpClient.get(
        `/api/v2/tables/${permissionsTable.id}/records`,
        {
          params: {
            where: `(role.Id,eq,${sourceRoleId})`,
          },
        },
      );

      const sourcePermissions = response.data.list || [];

      this.logger.log(
        `Copying ${sourcePermissions.length} permissions from role ${sourceRoleId} to ${targetRoleId}`,
      );

      // Create permissions for target role
      for (const perm of sourcePermissions) {
        await this.setTablePermissions({
          roleId: targetRoleId,
          tableName: perm.table_name,
          canCreate: perm.can_create,
          canRead: perm.can_read,
          canUpdate: perm.can_update,
          canDelete: perm.can_delete,
        });
      }

      return {
        success: true,
        copiedCount: sourcePermissions.length,
      };
    } catch (error) {
      this.logger.error('Error copying permissions:', error);
      throw error;
    }
  }

  /**
   * Delete all permissions for a role
   */
  async deleteRolePermissions(roleId: number): Promise<void> {
    try {
      const permissionsTable =
        await this.nocoDBService.getTableByName('table_permissions');
      if (!permissionsTable) {
        throw new NotFoundException('Table_permissions table not found');
      }

      const httpClient = this.nocoDBService.getHttpClient();

      // Get all permissions for the role
      const response = await httpClient.get(
        `/api/v2/tables/${permissionsTable.id}/records`,
        {
          params: {
            where: `(role.Id,eq,${roleId})`,
          },
        },
      );

      const permissions = response.data.list || [];

      // Delete each entry
      for (const perm of permissions) {
        await httpClient.delete(
          `/api/v2/tables/${permissionsTable.id}/records/${perm.Id}`,
        );
      }

      this.logger.log(
        `${permissions.length} permissions deleted for role ${roleId}`,
      );

      // Invalidate cache
      this.permissionsService.clearCache();
    } catch (error) {
      this.logger.error('Error deleting role permissions:', error);
      throw error;
    }
  }

  /**
   * Get all permissions for a role
   */
  async getRolePermissions(roleId: number): Promise<any[]> {
    try {
      const permissionsTable =
        await this.nocoDBService.getTableByName('table_permissions');
      if (!permissionsTable) {
        return [];
      }

      const httpClient = this.nocoDBService.getHttpClient();
      const response = await httpClient.get(
        `/api/v2/tables/${permissionsTable.id}/records`,
        {
          params: {
            where: `(role.Id,eq,${roleId})`,
          },
        },
      );

      return response.data.list || [];
    } catch (error) {
      this.logger.error('Error fetching role permissions:', error);
      throw error;
    }
  }
}
