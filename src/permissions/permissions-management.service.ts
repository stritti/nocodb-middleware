import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { SYSTEM_TABLE_NAMES } from '../common/system-table-names';
import { PageOptionsDto } from '../nocodb/dto/page-options.dto';
import { PageDto } from '../nocodb/dto/page.dto';
import { emptyPage, pagedOptions, pageMeta } from '../nocodb/page.util';
import { filterEq } from '../nocodb/nocodb-filter.util';
import { CrudAction } from './enums/crud-action.enum';
import { SetTablePermissionsDto } from './dto/set-table-permissions.dto';
import { BatchSetPermissionsDto } from './dto/batch-permissions.dto';
import { PermissionsService } from './permissions.service';
import { extractNumericId } from '../common/utils/nocodb-utils';

@Injectable()
export class PermissionsManagementService {
  private readonly logger = new Logger(PermissionsManagementService.name);

  constructor(
    private nocoDBService: NocoDBService,
    private permissionsService: PermissionsService,
  ) {}

  /**
   * Set permissions for a single table. The upsert itself lives in
   * {@link PermissionsService.setTablePermissions}, which also clears the
   * permission cache.
   */
  async setTablePermissions(dto: SetTablePermissionsDto): Promise<unknown> {
    this.logger.log(
      `Setting permissions: Role ${dto.roleId} -> Table ${dto.tableName}`,
    );

    return this.permissionsService.setTablePermissions(
      dto.roleId,
      dto.tableName,
      {
        [CrudAction.CREATE]: dto.canCreate,
        [CrudAction.READ]: dto.canRead,
        [CrudAction.UPDATE]: dto.canUpdate,
        [CrudAction.DELETE]: dto.canDelete,
      },
    );
  }

  /**
   * Set permissions for multiple tables at once
   */
  async batchSetPermissions(
    dto: BatchSetPermissionsDto,
  ): Promise<{ success: boolean; count: number; results: unknown[] }> {
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
  ): Promise<{ success: boolean; copiedCount: number }> {
    try {
      const permissionsTable = await this.nocoDBService.getTableByName(
        SYSTEM_TABLE_NAMES.TABLE_PERMISSIONS,
      );
      if (!permissionsTable) {
        throw new NotFoundException('Table_permissions table not found');
      }

      const sourcePermissions = await this.nocoDBService.listAll(
        permissionsTable.id,
        { where: filterEq('role_id', sourceRoleId) },
      );

      this.logger.log(
        `Copying ${sourcePermissions.length} permissions from role ${sourceRoleId} to ${targetRoleId}`,
      );

      for (const perm of sourcePermissions) {
        const p = perm as Record<string, unknown>;
        await this.setTablePermissions({
          roleId: targetRoleId,
          tableName: p.table_name as string,
          canCreate: Boolean(p.can_create),
          canRead: Boolean(p.can_read),
          canUpdate: Boolean(p.can_update),
          canDelete: Boolean(p.can_delete),
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
      const permissionsTable = await this.nocoDBService.getTableByName(
        SYSTEM_TABLE_NAMES.TABLE_PERMISSIONS,
      );
      if (!permissionsTable) {
        throw new NotFoundException('Table_permissions table not found');
      }

      const permissions = await this.nocoDBService.listAll(
        permissionsTable.id,
        { where: filterEq('role_id', roleId) },
      );

      for (const perm of permissions) {
        await this.nocoDBService.delete(
          permissionsTable.id,
          extractNumericId(perm),
        );
      }

      this.logger.log(
        `${permissions.length} permissions deleted for role ${roleId}`,
      );

      this.permissionsService.clearCache();
    } catch (error) {
      this.logger.error('Error deleting role permissions:', error);
      throw error;
    }
  }

  /**
   * Get all permissions for a role (paginated)
   */
  async getRolePermissions(
    roleId: number,
    pageOptionsDto?: PageOptionsDto,
  ): Promise<PageDto<unknown>> {
    try {
      const permissionsTable = await this.nocoDBService.getTableByName(
        SYSTEM_TABLE_NAMES.TABLE_PERMISSIONS,
      );
      if (!permissionsTable) {
        return emptyPage(pageOptionsDto);
      }

      const result = await this.nocoDBService.list(permissionsTable.id, {
        where: filterEq('role_id', roleId),
        sort: 'table_name',
        ...pagedOptions(pageOptionsDto),
      });

      const data = result.list;

      return new PageDto(
        data,
        pageMeta(pageOptionsDto, result.pageInfo, data.length),
      );
    } catch (error) {
      this.logger.error('Error fetching role permissions:', error);
      throw error;
    }
  }
}
