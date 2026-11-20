import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { SYSTEM_TABLE_NAMES } from '../common/system-table-names';
import { PageOptionsDto } from '../nocodb/dto/page-options.dto';
import { PageDto } from '../nocodb/dto/page.dto';
import { emptyPage, pagedOptions, pageMeta } from '../nocodb/page.util';
import { andFilters, filterEq, filterIn } from '../nocodb/nocodb-filter.util';
import { NocoRecord } from '../nocodb/nocodb.types';
import { AssignRoleDto, AssignMultipleRolesDto } from './dto/assign-role.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { extractNumericId } from '../common/utils/nocodb-utils';

@Injectable()
export class UserRolesService {
  private readonly logger = new Logger(UserRolesService.name);

  constructor(
    private nocoDBService: NocoDBService,
    private permissionsService: PermissionsService,
  ) {}

  /**
   * Assign a role to a user
   */
  async assignRole(dto: AssignRoleDto): Promise<any> {
    try {
      const userRolesTable = await this.nocoDBService.getTableByName(
        SYSTEM_TABLE_NAMES.USER_ROLES,
      );
      if (!userRolesTable) {
        throw new NotFoundException('User_roles table not found');
      }

      const existing = await this.nocoDBService.findOne(
        userRolesTable.id,
        andFilters(
          filterEq('user_id', dto.userId),
          filterEq('role_id', dto.roleId),
        ),
      );

      if (existing) {
        throw new ConflictException(
          `User ${dto.userId} already has role ${dto.roleId}`,
        );
      }

      const result = await this.nocoDBService.create(userRolesTable.id, {
        user_id: dto.userId,
        role_id: dto.roleId,
        assigned_at: new Date().toISOString(),
      });

      this.logger.log(`Role ${dto.roleId} assigned to user ${dto.userId}`);

      this.permissionsService.clearCache(dto.userId);

      return result;
    } catch (error) {
      this.logger.error('Error assigning role:', error);
      throw error;
    }
  }

  /**
   * Assign multiple roles to a user
   */
  async assignMultipleRoles(dto: AssignMultipleRolesDto): Promise<any> {
    this.logger.log(
      `Assigning ${dto.roleIds.length} roles to user ${dto.userId}`,
    );

    const results = [];

    for (const roleId of dto.roleIds) {
      try {
        const result = await this.assignRole({
          userId: dto.userId,
          roleId: roleId,
        });
        results.push(result);
      } catch (error) {
        if (error instanceof ConflictException) {
          this.logger.warn(`Role ${roleId} already assigned, skipping`);
        } else {
          throw error;
        }
      }
    }

    return {
      success: true,
      assignedCount: results.length,
      results,
    };
  }

  /**
   * Remove a role from a user
   */
  async removeRole(userId: number, roleId: number): Promise<void> {
    try {
      const userRolesTable = await this.nocoDBService.getTableByName(
        SYSTEM_TABLE_NAMES.USER_ROLES,
      );
      if (!userRolesTable) {
        throw new NotFoundException('User_roles table not found');
      }

      const assignment = await this.nocoDBService.findOne(
        userRolesTable.id,
        andFilters(filterEq('user_id', userId), filterEq('role_id', roleId)),
      );

      if (!assignment) {
        throw new NotFoundException(
          `Role ${roleId} is not assigned to user ${userId}`,
        );
      }

      await this.nocoDBService.delete(
        userRolesTable.id,
        extractNumericId(assignment),
      );

      this.logger.log(`Role ${roleId} removed from user ${userId}`);

      this.permissionsService.clearCache(userId);
    } catch (error) {
      this.logger.error('Error removing role:', error);
      throw error;
    }
  }

  /**
   * Get all roles for a user with nested role data (paginated)
   */
  async getUserRoles(
    userId: number,
    pageOptionsDto?: PageOptionsDto,
  ): Promise<PageDto<any>> {
    try {
      const userRolesTable = await this.nocoDBService.getTableByName(
        SYSTEM_TABLE_NAMES.USER_ROLES,
      );

      if (!userRolesTable) {
        return emptyPage(pageOptionsDto);
      }

      const response = await this.nocoDBService.list(userRolesTable.id, {
        where: filterEq('user_id', userId),
        fields: ['role_id'],
        sort: 'role_id',
        ...pagedOptions(pageOptionsDto),
      });

      const roleIds = response.list
        .map((ur) => Number(ur.role_id))
        .filter((id) => Number.isInteger(id) && id > 0);

      const data = await this.loadRoles(roleIds);

      return new PageDto(
        data,
        pageMeta(pageOptionsDto, response.pageInfo, data.length),
      );
    } catch (error) {
      this.logger.error('Error fetching user roles:', error);
      throw error;
    }
  }

  /** Role records for the given ids, in the order of `roleIds`. */
  private async loadRoles(roleIds: number[]): Promise<NocoRecord[]> {
    if (roleIds.length === 0) {
      return [];
    }

    const rolesTable = await this.nocoDBService.getTableByName(
      SYSTEM_TABLE_NAMES.ROLES,
    );
    if (!rolesTable) {
      return [];
    }

    const roles = await this.nocoDBService.listAll(rolesTable.id, {
      where: filterIn('id', roleIds),
    });
    const byId = new Map(roles.map((role) => [Number(role.id), role]));

    return roleIds
      .map((id) => byId.get(id))
      .filter((role): role is NocoRecord => role !== undefined);
  }
}
