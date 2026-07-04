import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { PageOptionsDto } from '../nocodb/dto/page-options.dto';
import { PageMetaDto } from '../nocodb/dto/page-meta.dto';
import { PageDto } from '../nocodb/dto/page.dto';
import { andFilters, filterEq } from '../nocodb/nocodb-filter.util';
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
   * Set permissions for a single table
   */
  async setTablePermissions(dto: SetTablePermissionsDto): Promise<unknown> {
    try {
      const permissionsTable =
        await this.nocoDBService.getTableByName('table_permissions');
      if (!permissionsTable) {
        throw new NotFoundException('Table_permissions table not found');
      }

      const existing = await this.nocoDBService.findOne(
        permissionsTable.id,
        andFilters(
          filterEq('role.id', dto.roleId),
          filterEq('table_name', dto.tableName),
        ),
      );

      const permissionData = {
        role: [{ id: dto.roleId }],
        table_name: dto.tableName,
        can_create: dto.canCreate,
        can_read: dto.canRead,
        can_update: dto.canUpdate,
        can_delete: dto.canDelete,
      };

      let result: unknown;

      if (existing) {
        result = await this.nocoDBService.update(
          permissionsTable.id,
          extractNumericId(existing),
          permissionData,
        );

        this.logger.log(
          `Permission updated: Role ${dto.roleId} -> Table ${dto.tableName}`,
        );
      } else {
        result = await this.nocoDBService.create(
          permissionsTable.id,
          permissionData,
        );

        this.logger.log(
          `Permission created: Role ${dto.roleId} -> Table ${dto.tableName}`,
        );
      }

      this.permissionsService.clearCache();

      return result;
    } catch (error) {
      this.logger.error('Error setting table permissions:', error);
      throw error;
    }
  }

  /**
   * Set permissions for multiple tables at once
   */
  async batchSetPermissions(dto: BatchSetPermissionsDto): Promise<{ success: boolean; count: number; results: unknown[] }> {
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
      const permissionsTable =
        await this.nocoDBService.getTableByName('table_permissions');
      if (!permissionsTable) {
        throw new NotFoundException('Table_permissions table not found');
      }

      const result = await this.nocoDBService.list(permissionsTable.id, {
        where: filterEq('role.id', sourceRoleId),
      });

      const sourcePermissions = result.list || [];

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
      const permissionsTable =
        await this.nocoDBService.getTableByName('table_permissions');
      if (!permissionsTable) {
        throw new NotFoundException('Table_permissions table not found');
      }

      const result = await this.nocoDBService.list(permissionsTable.id, {
        where: filterEq('role.id', roleId),
      });

      const permissions = result.list || [];

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
      const permissionsTable =
        await this.nocoDBService.getTableByName('table_permissions');
      if (!permissionsTable) {
        return new PageDto(
          [],
          new PageMetaDto({
            pageOptionsDto: pageOptionsDto || new PageOptionsDto(),
            itemCount: 0,
          }),
        );
      }

      const limit = pageOptionsDto?.take ?? 10;
      const offset = pageOptionsDto?.skip ?? 0;

      const result = await this.nocoDBService.list(permissionsTable.id, {
        where: filterEq('role.id', roleId),
        limit,
        offset,
      });

      const data = result.list || [];
      const totalRows = result.pageInfo?.totalRows ?? data.length;

      const meta = new PageMetaDto({
        pageOptionsDto: pageOptionsDto || new PageOptionsDto(),
        itemCount: pageOptionsDto ? totalRows : data.length,
      });

      return new PageDto(data, meta);
    } catch (error) {
      this.logger.error('Error fetching role permissions:', error);
      throw error;
    }
  }
}
