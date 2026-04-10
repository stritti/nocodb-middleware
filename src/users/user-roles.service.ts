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

type TableMeta = { id: string };
type UserRoleRecord = {
  Id: string | number;
  role?: { Id?: string | number } | { id?: string | number };
};

type RoleRecord = {
  id?: string | number;
  role_name?: string;
  role?: string;
  description?: string;
  is_system_role?: boolean;
};

@Injectable()
export class UserRolesService {
  private readonly logger = new Logger(UserRolesService.name);

  constructor(
    private nocoDBService: NocoDBService,
    private nocoDBV3Service: NocoDBV3Service,
    private permissionsService: PermissionsService,
  ) {}

  async assignRole(dto: AssignRoleDto): Promise<unknown> {
    const userRolesTable = await this.getTableMeta('user_roles');
    const httpClient = this.nocoDBService.getHttpClient();

    const existingResponse = await httpClient.get(
      `/api/v2/tables/${userRolesTable.id}/records`,
      {
        params: {
          where: `(user.Id,eq,${dto.userId})~and(role.Id,eq,${dto.roleId})`,
        },
      },
    );

    const list = this.extractUserRoles(existingResponse.data);
    if (list.length > 0) {
      throw new ConflictException(
        `User ${dto.userId} already has role ${dto.roleId}`,
      );
    }

    const response = await httpClient.post(
      `/api/v2/tables/${userRolesTable.id}/records`,
      {
        user: { Id: dto.userId },
        role: { Id: dto.roleId },
        assigned_at: new Date().toISOString(),
      },
    );

    this.logger.log(`Role ${dto.roleId} assigned to user ${dto.userId}`);
    this.permissionsService.clearCache(dto.userId);

    return response.data;
  }

  async assignMultipleRoles(dto: AssignMultipleRolesDto): Promise<{
    success: true;
    assignedCount: number;
    results: unknown[];
  }> {
    this.logger.log(
      `Assigning ${dto.roleIds.length} roles to user ${dto.userId}`,
    );

    const results: unknown[] = [];

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

  async removeRole(userId: number, roleId: number): Promise<void> {
    const userRolesTable = await this.getTableMeta('user_roles');
    const httpClient = this.nocoDBService.getHttpClient();

    const response = await httpClient.get(
      `/api/v2/tables/${userRolesTable.id}/records`,
      {
        params: {
          where: `(user.Id,eq,${userId})~and(role.Id,eq,${roleId})`,
        },
      },
    );

    const list = this.extractUserRoles(response.data);
    if (list.length === 0) {
      throw new NotFoundException(
        `Role ${roleId} is not assigned to user ${userId}`,
      );
    }

    const assignmentId = list[0].Id;

    await httpClient.delete(
      `/api/v2/tables/${userRolesTable.id}/records/${assignmentId}`,
    );

    this.logger.log(`Role ${roleId} removed from user ${userId}`);
    this.permissionsService.clearCache(userId);
  }

  async getUserRoles(userId: number): Promise<RoleRecord[]> {
    const userRolesTable = await this.getTableMeta('user_roles');
    const rolesTable = await this.getTableMeta('roles');

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

    const list = this.extractUserRoles(response.data);
    return list
      .map((item) => item.role)
      .filter((role): role is RoleRecord => Boolean(role));
  }

  async assignRoleV3(dto: AssignRoleDto): Promise<unknown> {
    const userRolesTable = await this.getTableMeta('user_roles');

    const existing = await this.nocoDBV3Service.findOne(
      userRolesTable.id,
      `(user.id,eq,${dto.userId})~and(role.id,eq,${dto.roleId})`,
    );

    if (existing) {
      throw new ConflictException(
        `User ${dto.userId} already has role ${dto.roleId}`,
      );
    }

    const result = await this.nocoDBV3Service.create(userRolesTable.id, {
      user: [{ id: dto.userId }],
      role: [{ id: dto.roleId }],
      assigned_at: new Date().toISOString(),
    });

    this.logger.log(`Role ${dto.roleId} assigned to user ${dto.userId} (v3)`);
    this.permissionsService.clearCache(dto.userId);

    return result;
  }

  async getUserRolesV3(userId: number): Promise<RoleRecord[]> {
    const userRolesTable = await this.getTableMeta('user_roles');

    const response = (await this.nocoDBV3Service.list(userRolesTable.id, {
      where: `(user.id,eq,${userId})`,
      includeRelations: ['role'],
    })) as {
      list?: Array<{ role?: RoleRecord[] }>;
    };

    return (
      response.list
        ?.flatMap((item) => item.role ?? [])
        .filter((role): role is RoleRecord => Boolean(role)) ?? []
    );
  }

  async removeRoleV3(userId: number, roleId: number): Promise<void> {
    const userRolesTable = await this.getTableMeta('user_roles');

    const existing = this.toRecordRef(
      await this.nocoDBV3Service.findOne(
        userRolesTable.id,
        `(user.id,eq,${userId})~and(role.id,eq,${roleId})`,
      ),
    );

    if (!existing) {
      throw new NotFoundException(
        `Role ${roleId} is not assigned to user ${userId}`,
      );
    }

    await this.nocoDBV3Service.delete(userRolesTable.id, Number(existing.id));
    this.logger.log(`Role ${roleId} removed from user ${userId} (v3)`);
    this.permissionsService.clearCache(userId);
  }

  private async getTableMeta(tableName: string): Promise<TableMeta> {
    const table = await this.nocoDBService.getTableByName(tableName);
    if (!table) {
      throw new NotFoundException(`${tableName} table not found`);
    }
    return { id: table.id };
  }

  private extractUserRoles(data: unknown): UserRoleRecord[] {
    if (typeof data !== 'object' || data === null) {
      return [];
    }

    const list = (data as { list?: unknown }).list;
    if (!Array.isArray(list)) {
      return [];
    }

    return list.filter((item): item is UserRoleRecord => {
      if (typeof item !== 'object' || item === null) {
        return false;
      }
      const hasId = 'Id' in item;
      const hasRole = 'role' in item;
      return hasId || hasRole;
    });
  }

  private toRecordRef(record: unknown): { id: number | string } | null {
    if (typeof record !== 'object' || record === null) {
      return null;
    }
    const candidate = record as { id?: unknown; Id?: unknown };
    const id = candidate.id ?? candidate.Id;
    if (typeof id === 'number' || typeof id === 'string') {
      return { id };
    }
    return null;
  }
}
