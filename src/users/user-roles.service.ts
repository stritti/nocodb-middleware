import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { AssignRoleDto, AssignMultipleRolesDto } from './dto/assign-role.dto';
import { PermissionsService } from '../permissions/permissions.service';

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
      const userRolesTable =
        await this.nocoDBService.getTableByName('user_roles');
      if (!userRolesTable) {
        throw new NotFoundException('User_roles table not found');
      }

      const existing = await this.nocoDBService.findOne(
        userRolesTable.id,
        `(user.id,eq,${dto.userId})~and(role.id,eq,${dto.roleId})`,
      );

      if (existing) {
        throw new ConflictException(
          `User ${dto.userId} already has role ${dto.roleId}`,
        );
      }

      const result = await this.nocoDBService.create(userRolesTable.id, {
        user: [{ id: dto.userId }],
        role: [{ id: dto.roleId }],
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
      const userRolesTable =
        await this.nocoDBService.getTableByName('user_roles');
      if (!userRolesTable) {
        throw new NotFoundException('User_roles table not found');
      }

      const assignment = await this.nocoDBService.findOne(
        userRolesTable.id,
        `(user.id,eq,${userId})~and(role.id,eq,${roleId})`,
      );

      if (!assignment) {
        throw new NotFoundException(
          `Role ${roleId} is not assigned to user ${userId}`,
        );
      }

      await this.nocoDBService.delete(userRolesTable.id, assignment.id);

      this.logger.log(`Role ${roleId} removed from user ${userId}`);

      this.permissionsService.clearCache(userId);
    } catch (error) {
      this.logger.error('Error removing role:', error);
      throw error;
    }
  }

  /**
   * Get all roles for a user with nested role data
   */
  async getUserRoles(userId: number): Promise<any[]> {
    try {
      const userRolesTable =
        await this.nocoDBService.getTableByName('user_roles');

      if (!userRolesTable) {
        return [];
      }

      const response = await this.nocoDBService.list(userRolesTable.id, {
        where: `(user.id,eq,${userId})`,
        includeRelations: ['role'],
      });

      return (response.list || [])
        .filter((ur: any) => ur.role && ur.role.length > 0)
        .map((ur: any) => ur.role[0]);
    } catch (error) {
      this.logger.error('Error fetching user roles:', error);
      throw error;
    }
  }
}
