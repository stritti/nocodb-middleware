import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
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
    ) { }

    /**
     * Assign a role to a user
     */
    async assignRole(dto: AssignRoleDto): Promise<any> {
        try {
            const userRolesTable = await this.nocoDBService.getTableByName('user_roles');
            if (!userRolesTable) {
                throw new NotFoundException('User_roles table not found');
            }

            // Check if assignment already exists using v3 API
            const existing = await this.nocoDBV3Service.findOne(
                userRolesTable.id,
                `(user.id,eq,${dto.userId})~and(role.id,eq,${dto.roleId})`
            );

            if (existing) {
                throw new ConflictException(
                    `User ${dto.userId} already has role ${dto.roleId}`
                );
            }

            // Create assignment with inline relationships (v3 style)
            const result = await this.nocoDBV3Service.create(
                userRolesTable.id,
                {
                    user: [{ id: dto.userId }],
                    role: [{ id: dto.roleId }],
                    assigned_at: new Date().toISOString(),
                }
            );

            this.logger.log(`Role ${dto.roleId} assigned to user ${dto.userId}`);

            // Invalidate cache for this user
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
        this.logger.log(`Assigning ${dto.roleIds.length} roles to user ${dto.userId}`);

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
            const userRolesTable = await this.nocoDBService.getTableByName('user_roles');
            if (!userRolesTable) {
                throw new NotFoundException('User_roles table not found');
            }

            // Find the assignment using v3 API
            const assignment = await this.nocoDBV3Service.findOne(
                userRolesTable.id,
                `(user.id,eq,${userId})~and(role.id,eq,${roleId})`
            );

            if (!assignment) {
                throw new NotFoundException(
                    `Role ${roleId} is not assigned to user ${userId}`
                );
            }

            // Delete the assignment using v3 API
            await this.nocoDBV3Service.delete(userRolesTable.id, assignment.id);

            this.logger.log(`Role ${roleId} removed from user ${userId}`);

            // Invalidate cache
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
            const userRolesTable = await this.nocoDBService.getTableByName('user_roles');

            if (!userRolesTable) {
                return [];
            }

            // Use v3 list with nested relations
            const response = await this.nocoDBV3Service.list(
                userRolesTable.id,
                {
                    where: `(user.id,eq,${userId})`,
                    includeRelations: ['role']
                }
            );

            // Extract roles from nested objects (v3 returns arrays for relations)
            return (response.list || [])
                .filter((ur: any) => ur.role && ur.role.length > 0)
                .map((ur: any) => ur.role[0]);
        } catch (error) {
            this.logger.error('Error fetching user roles:', error);
            throw error;
        }
    }
}
