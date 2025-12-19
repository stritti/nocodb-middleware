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

            // Check if role already exists
            const existingRole = await this.findRoleByName(createRoleDto.roleName);
            if (existingRole) {
                throw new ConflictException(
                    `Role "${createRoleDto.roleName}" already exists`
                );
            }

            // Create role
            const httpClient = this.nocoDBService.getHttpClient();
            const response = await httpClient.post(
                `/api/v2/tables/${rolesTable.id}/records`,
                {
                    role_name: createRoleDto.roleName,
                    description: createRoleDto.description || '',
                    is_system_role: createRoleDto.isSystemRole || false,
                }
            );

            this.logger.log(`Role "${createRoleDto.roleName}" created`);
            return response.data;
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

            const httpClient = this.nocoDBService.getHttpClient();
            const response = await httpClient.get(
                `/api/v2/tables/${rolesTable.id}/records`,
                {
                    params: {
                        where: `(Role Name,eq,${roleName})`,
                    },
                }
            );

            return response.data.list[0] || null;
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

            const httpClient = this.nocoDBService.getHttpClient();
            const response = await httpClient.get(
                `/api/v2/tables/${rolesTable.id}/records`
            );

            return response.data.list || [];
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

            const httpClient = this.nocoDBService.getHttpClient();
            await httpClient.delete(
                `/api/v2/tables/${rolesTable.id}/records/${roleId}`
            );

            this.logger.log(`Role ${roleId} deleted`);
        } catch (error) {
            this.logger.error('Error deleting role:', error);
            throw error;
        }
    }

    // ============ V3 API Methods ============

    /**
     * Create a new role using v3 API
     */
    async createRoleV3(createRoleDto: CreateRoleDto): Promise<any> {
        try {
            const rolesTable = await this.nocoDBService.getTableByName('roles');
            if (!rolesTable) {
                throw new NotFoundException('Roles table not found');
            }

            // Check if role already exists
            const existingRole = await this.findRoleByNameV3(createRoleDto.roleName);
            if (existingRole) {
                throw new ConflictException(
                    `Role "${createRoleDto.roleName}" already exists`
                );
            }

            // Create role using v3
            const result = await this.nocoDBV3Service.create(
                rolesTable.id,
                {
                    role_name: createRoleDto.roleName,
                    description: createRoleDto.description || '',
                    is_system_role: createRoleDto.isSystemRole || false,
                }
            );

            this.logger.log(`Role "${createRoleDto.roleName}" created (v3)`);
            return result;
        } catch (error) {
            this.logger.error('Error creating role (v3):', error);
            throw error;
        }
    }

    /**
     * Find role by name using v3 API
     */
    async findRoleByNameV3(roleName: string): Promise<any> {
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
            this.logger.error('Error finding role (v3):', error);
            throw error;
        }
    }

    /**
     * Get all roles using v3 API
     */
    async getAllRolesV3(): Promise<any[]> {
        try {
            const rolesTable = await this.nocoDBService.getTableByName('roles');
            if (!rolesTable) {
                return [];
            }

            const response = await this.nocoDBV3Service.list(rolesTable.id);
            return response.list || [];
        } catch (error) {
            this.logger.error('Error fetching roles (v3):', error);
            throw error;
        }
    }

    /**
     * Delete a role using v3 API
     */
    async deleteRoleV3(roleId: number): Promise<void> {
        try {
            const rolesTable = await this.nocoDBService.getTableByName('roles');
            if (!rolesTable) {
                throw new NotFoundException('Roles table not found');
            }

            await this.nocoDBV3Service.delete(rolesTable.id, roleId);

            this.logger.log(`Role ${roleId} deleted (v3)`);
        } catch (error) {
            this.logger.error('Error deleting role (v3):', error);
            throw error;
        }
    }
}
