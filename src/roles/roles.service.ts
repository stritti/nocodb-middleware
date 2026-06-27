import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { PageOptionsDto } from '../nocodb/dto/page-options.dto';
import { PageMetaDto } from '../nocodb/dto/page-meta.dto';
import { PageDto } from '../nocodb/dto/page.dto';
import { filterEq } from '../nocodb/nocodb-filter.util';
import { CreateRoleDto } from './dto/create-role.dto';
import { TABLE_NAMES } from '../common/constants/table-names';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private nocoDBService: NocoDBService) {}

  /**
   * Create a new role
   */
  async createRole(createRoleDto: CreateRoleDto): Promise<any> {
    try {
      const rolesTable = await this.nocoDBService.getTableByName(TABLE_NAMES.ROLES);
      if (!rolesTable) {
        throw new NotFoundException('Roles table not found');
      }

      const existingRole = await this.findRoleByName(createRoleDto.roleName);
      if (existingRole) {
        throw new ConflictException(
          `Role "${createRoleDto.roleName}" already exists`,
        );
      }

      const result = await this.nocoDBService.create(rolesTable.id, {
        role_name: createRoleDto.roleName,
        description: createRoleDto.description || '',
        is_system_role: createRoleDto.isSystemRole || false,
      });

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
    if (!/^[a-zA-Z0-9_-]+(?: [a-zA-Z0-9_-]+)*$/.test(roleName)) {
      throw new BadRequestException(
        'Role name contains invalid characters. Only alphanumeric characters, spaces, underscores, and hyphens are allowed.',
      );
    }
    try {
      const rolesTable = await this.nocoDBService.getTableByName(TABLE_NAMES.ROLES);
      if (!rolesTable) {
        return null;
      }

      return await this.nocoDBService.findOne(
        rolesTable.id,
        filterEq('role_name', roleName),
      );
    } catch (error) {
      this.logger.error('Error finding role:', error);
      throw error;
    }
  }

  /**
   * Get all roles (paginated)
   */
  async getAllRoles(pageOptionsDto?: PageOptionsDto): Promise<PageDto<any>> {
    try {
      const rolesTable = await this.nocoDBService.getTableByName(TABLE_NAMES.ROLES);
      if (!rolesTable) {
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

      const response = await this.nocoDBService.list(rolesTable.id, {
        limit,
        offset,
      });

      const data = response.list || [];
      const totalRows = response.pageInfo?.totalRows ?? data.length;

      const meta = new PageMetaDto({
        pageOptionsDto: pageOptionsDto || new PageOptionsDto(),
        itemCount: pageOptionsDto ? totalRows : data.length,
      });

      return new PageDto(data, meta);
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
      const rolesTable = await this.nocoDBService.getTableByName(TABLE_NAMES.ROLES);
      if (!rolesTable) {
        throw new NotFoundException('Roles table not found');
      }

      await this.nocoDBService.delete(rolesTable.id, roleId);

      this.logger.log(`Role ${roleId} deleted`);
    } catch (error) {
      this.logger.error('Error deleting role:', error);
      throw error;
    }
  }
}
