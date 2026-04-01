import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { NocoDBV3Service } from '../nocodb/nocodb-v3.service';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
    private readonly logger = new Logger(RolesService.name);

    constructor(
        private nocoDBService: NocoDBService,
        private nocoDBV3Service: NocoDBV3Service,
    ) { }

    /**
     * Create a new role
     */
    async createRole(createRoleDto: CreateRoleDto): Promise<any> {
        try {
            const rolesTable = await this.nocoDBService.getTableByName('roles');
            if (!rolesTable) {
                throw new NotFoundException('Roles table not found');
            }

            // Check if role already exists using v3 API
            const existingRole = await this.findRoleByName(createRoleDto.roleName);
            if (existingRole) {
                throw new ConflictException(
                    `Role "${createRoleDto.roleName}" already exists`
                );
            }

            // Create role using v3 API
            const result = await this.nocoDBV3Service.create(
                rolesTable.id,
                {
                    role_name: createRoleDto.roleName,
                    description: createRoleDto.description || '',
                    is_system_role: createRoleDto.isSystemRole || false,
                }
            );

            this.logger.log(`Role "${createRoleDto.roleName}" created`);
            return result;
        } catch (error) {
            this.logger.error('Error creating role:', error);
            throw error;
        }
    }

    /**
     * Find role by name
     */
    async findRoleByName(roleName: string): Promise<any> {
        try {
            const rolesTable = await this.nocoDBService.getTableByName('roles');
            if (!rolesTable) {
                return null;
            }

            return await this.nocoDBV3Service.findOne(
                rolesTable.id,
                `(role_name,eq,${roleName})`
            );
        } catch (error) {
            this.logger.error('Error finding role:', error);
            throw error;
        }
    }

    /**
     * Get all roles
     */
    async getAllRoles(): Promise<any[]> {
        try {
            const rolesTable = await this.nocoDBService.getTableByName('roles');
            if (!rolesTable) {
                return [];
            }

            const response = await this.nocoDBV3Service.list(rolesTable.id);
            return response.list || [];
        } catch (error) {
            this.logger.error('Error fetching roles:', error);
            throw error;
        }
    }

    /**
     * Delete a role
     */
    async deleteRole(roleId: number): Promise<void> {
        try {
            const rolesTable = await this.nocoDBService.getTableByName('roles');
            if (!rolesTable) {
                throw new NotFoundException('Roles table not found');
            }

            await this.nocoDBV3Service.delete(rolesTable.id, roleId);

            this.logger.log(`Role ${roleId} deleted`);
        } catch (error) {
            this.logger.error('Error deleting role:', error);
            throw error;
        }
    }
}
