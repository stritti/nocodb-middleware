import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { NocoDBV3Service } from '../nocodb/nocodb-v3.service';
import { AssignRoleDto, AssignMultipleRolesDto } from './dto/assign-role.dto';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class UserRolesService {
  private readonly logger = new Logger(UserRolesService.name);

  constructor(
    private nocoDBService: NocoDBService,
    private nocoDBV3Service: NocoDBV3Service,
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

      const httpClient = this.nocoDBService.getHttpClient();

      // Check if assignment already exists
      const existingResponse = await httpClient.get(
        `/api/v2/tables/${userRolesTable.id}/records`,
        {
          params: {
            where: `(user.Id,eq,${dto.userId})~and(role.Id,eq,${dto.roleId})`,
          },
        },
      );

      if (existingResponse.data.list.length > 0) {
        throw new ConflictException(
          `User ${dto.userId} already has role ${dto.roleId}`,
        );
      }

      // Create assignment
      const response = await httpClient.post(
        `/api/v2/tables/${userRolesTable.id}/records`,
        {
          user: { Id: dto.userId },
          role: { Id: dto.roleId },
          assigned_at: new Date().toISOString(),
        },
      );

      this.logger.log(`Role ${dto.roleId} assigned to user ${dto.userId}`);

      // Invalidate cache for this user
      this.permissionsService.clearCache(dto.userId);

      return response.data;
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

      const httpClient = this.nocoDBService.getHttpClient();
      const response = await httpClient.get(
        `/api/v2/tables/${userRolesTable.id}/records`,
        {
          params: {
            where: `(user.Id,eq,${userId})~and(role.Id,eq,${roleId})`,
          },
        },
      );

      if (response.data.list.length === 0) {
        throw new NotFoundException(
          `Role ${roleId} is not assigned to user ${userId}`,
        );
      }

      const assignmentId = response.data.list[0].Id;

      await httpClient.delete(
        `/api/v2/tables/${userRolesTable.id}/records/${assignmentId}`,
      );

      this.logger.log(`Role ${roleId} removed from user ${userId}`);

      // Invalidate cache
      this.permissionsService.clearCache(userId);
    } catch (error) {
      this.logger.error('Error removing role:', error);
      throw error;
    }
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId: number): Promise<any[]> {
    try {
      const userRolesTable =
        await this.nocoDBService.getTableByName('user_roles');
      const rolesTable = await this.nocoDBService.getTableByName('roles');

      if (!userRolesTable || !rolesTable) {
        return [];
      }

      const httpClient = this.nocoDBService.getHttpClient();
      const response = await httpClient.get(
        `/api/v2/tables/${userRolesTable.id}/records`,
        {
          params: {
            where: `(user.Id,eq,${userId})`,
            nested: {
              role: {
                fields: ['Id', 'role_name', 'description', 'is_system_role'],
              },
            },
          },
        },
      );

      // Extract roles from nested objects
      return response.data.list
        .filter((ur: any) => ur.role)
        .map((ur: any) => ur.role);
    } catch (error) {
      this.logger.error('Error fetching user roles:', error);
      throw error;
    }
  }

  // ============ V3 API Methods ============

  /**
   * Assign a role to a user using v3 API (inline relationships)
   * This is more efficient than v2 as it uses inline relationship syntax
   */
  async assignRoleV3(dto: AssignRoleDto): Promise<any> {
    try {
      const userRolesTable =
        await this.nocoDBService.getTableByName('user_roles');
      if (!userRolesTable) {
        throw new NotFoundException('User_roles table not found');
      }

      // Check if assignment already exists using v3
      const existing = await this.nocoDBV3Service.findOne(
        userRolesTable.id,
        `(user.id,eq,${dto.userId})~and(role.id,eq,${dto.roleId})`,
      );

      if (existing) {
        throw new ConflictException(
          `User ${dto.userId} already has role ${dto.roleId}`,
        );
      }

      // Create assignment with inline relationships (v3 style)
      const result = await this.nocoDBV3Service.create(userRolesTable.id, {
        user: [{ id: dto.userId }],
        role: [{ id: dto.roleId }],
        assigned_at: new Date().toISOString(),
      });

      this.logger.log(`Role ${dto.roleId} assigned to user ${dto.userId} (v3)`);

      // Invalidate cache for this user
      this.permissionsService.clearCache(dto.userId);

      return result;
    } catch (error) {
      this.logger.error('Error assigning role (v3):', error);
      throw error;
    }
  }

  /**
   * Get all roles for a user using v3 API with nested data
   * This retrieves all role data in a single call
   */
  async getUserRolesV3(userId: number): Promise<any[]> {
    try {
      const userRolesTable =
        await this.nocoDBService.getTableByName('user_roles');

      if (!userRolesTable) {
        return [];
      }

      // Use v3 list with nested relations
      const response = await this.nocoDBV3Service.list(userRolesTable.id, {
        where: `(user.id,eq,${userId})`,
        includeRelations: ['role'],
      });

      // Extract roles from nested objects
      return (
        response.list
          ?.filter((ur: any) => ur.role && ur.role.length > 0)
          .map((ur: any) => ur.role[0]) || []
      );
    } catch (error) {
      this.logger.error('Error fetching user roles (v3):', error);
      throw error;
    }
  }

  /**
   * Remove a role from a user using v3 API
   */
  async removeRoleV3(userId: number, roleId: number): Promise<void> {
    try {
      const userRolesTable =
        await this.nocoDBService.getTableByName('user_roles');
      if (!userRolesTable) {
        throw new NotFoundException('User_roles table not found');
      }

      // Find the assignment
      const assignment = await this.nocoDBV3Service.findOne(
        userRolesTable.id,
        `(user.id,eq,${userId})~and(role.id,eq,${roleId})`,
      );

      if (!assignment) {
        throw new NotFoundException(
          `Role ${roleId} is not assigned to user ${userId}`,
        );
      }

      // Delete the assignment
      await this.nocoDBV3Service.delete(userRolesTable.id, assignment.id);

      this.logger.log(`Role ${roleId} removed from user ${userId} (v3)`);

      // Invalidate cache
      this.permissionsService.clearCache(userId);
    } catch (error) {
      this.logger.error('Error removing role (v3):', error);
      throw error;
    }
  }
}
