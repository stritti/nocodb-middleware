import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { SetTablePermissionsDto } from './dto/set-table-permissions.dto';
import { BatchSetPermissionsDto } from './dto/batch-permissions.dto';
import { PermissionsService } from './permissions.service';

type PermissionRecord = {
  Id: string | number;
  role?: { Id?: string | number };
  table_name?: string;
  can_create?: boolean;
  can_read?: boolean;
  can_update?: boolean;
  can_delete?: boolean;
};

type PermissionPayload = {
  role: { Id: number };
  table_name: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
};

@Injectable()
export class PermissionsManagementService {
  private readonly logger = new Logger(PermissionsManagementService.name);

  constructor(
    private nocoDBService: NocoDBService,
    private permissionsService: PermissionsService,
  ) {}

  async setTablePermissions(
    dto: SetTablePermissionsDto,
  ): Promise<PermissionPayload> {
    const permissionsTable = await this.getPermissionsTable();
    const httpClient = this.nocoDBService.getHttpClient();

    const existingResponse = await httpClient.get(
      `/api/v2/tables/${permissionsTable.id}/records`,
      {
        params: {
          where: `(role.Id,eq,${dto.roleId})~and(table_name,eq,${dto.tableName})`,
        },
      },
    );

    const permissionData: PermissionPayload = {
      role: { Id: dto.roleId },
      table_name: dto.tableName,
      can_create: dto.canCreate,
      can_read: dto.canRead,
      can_update: dto.canUpdate,
      can_delete: dto.canDelete,
    };

    const list = this.extractList(existingResponse.data);

    if (list.length > 0) {
      const existingId = list[0].Id;
      await httpClient.patch(
        `/api/v2/tables/${permissionsTable.id}/records/${existingId}`,
        permissionData,
      );
      this.logger.log(
        `Permission updated: Role ${dto.roleId} -> Table ${dto.tableName}`,
      );
    } else {
      await httpClient.post(
        `/api/v2/tables/${permissionsTable.id}/records`,
        permissionData,
      );
      this.logger.log(
        `Permission created: Role ${dto.roleId} -> Table ${dto.tableName}`,
      );
    }

    this.permissionsService.clearCache();

    return permissionData;
  }

  async batchSetPermissions(dto: BatchSetPermissionsDto): Promise<{
    success: true;
    count: number;
    results: PermissionPayload[];
  }> {
    this.logger.log(
      `Batch update: ${dto.permissions.length} permissions for role ${dto.roleId}`,
    );

    const results: PermissionPayload[] = [];

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

  async copyPermissions(
    sourceRoleId: number,
    targetRoleId: number,
  ): Promise<{ success: true; copiedCount: number }> {
    const permissionsTable = await this.getPermissionsTable();
    const httpClient = this.nocoDBService.getHttpClient();

    const response = await httpClient.get(
      `/api/v2/tables/${permissionsTable.id}/records`,
      {
        params: {
          where: `(role.Id,eq,${sourceRoleId})`,
        },
      },
    );

    const sourcePermissions = this.extractList(response.data);

    this.logger.log(
      `Copying ${sourcePermissions.length} permissions from role ${sourceRoleId} to ${targetRoleId}`,
    );

    for (const perm of sourcePermissions) {
      await this.setTablePermissions({
        roleId: targetRoleId,
        tableName: perm.table_name ?? '',
        canCreate: Boolean(perm.can_create),
        canRead: Boolean(perm.can_read),
        canUpdate: Boolean(perm.can_update),
        canDelete: Boolean(perm.can_delete),
      });
    }

    return {
      success: true,
      copiedCount: sourcePermissions.length,
    };
  }

  async deleteRolePermissions(roleId: number): Promise<void> {
    const permissionsTable = await this.getPermissionsTable();
    const httpClient = this.nocoDBService.getHttpClient();

    const response = await httpClient.get(
      `/api/v2/tables/${permissionsTable.id}/records`,
      {
        params: {
          where: `(role.Id,eq,${roleId})`,
        },
      },
    );

    const permissions = this.extractList(response.data);

    for (const perm of permissions) {
      await httpClient.delete(
        `/api/v2/tables/${permissionsTable.id}/records/${perm.Id}`,
      );
    }

    this.logger.log(
      `${permissions.length} permissions deleted for role ${roleId}`,
    );
    this.permissionsService.clearCache();
  }

  async getRolePermissions(roleId: number): Promise<PermissionRecord[]> {
    const permissionsTable = await this.getPermissionsTable();
    const httpClient = this.nocoDBService.getHttpClient();

    const response = await httpClient.get(
      `/api/v2/tables/${permissionsTable.id}/records`,
      {
        params: {
          where: `(role.Id,eq,${roleId})`,
        },
      },
    );

    return this.extractList(response.data);
  }

  private async getPermissionsTable(): Promise<{ id: string }> {
    const permissionsTable =
      await this.nocoDBService.getTableByName('table_permissions');
    if (!permissionsTable) {
      throw new NotFoundException('Table_permissions table not found');
    }
    return permissionsTable;
  }

  private extractList(data: unknown): PermissionRecord[] {
    if (typeof data !== 'object' || data === null) {
      return [];
    }
    const list = (data as { list?: unknown }).list;
    if (!Array.isArray(list)) {
      return [];
    }
    return list.filter((item): item is PermissionRecord =>
      this.isPermission(item),
    );
  }

  private isPermission(value: unknown): value is PermissionRecord {
    return typeof value === 'object' && value !== null && 'Id' in value;
  }
}
