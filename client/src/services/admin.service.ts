import { AxiosInstance } from 'axios';
import { normaliseError } from '../http-client';

/** Table metadata as returned by GET /meta/tables. */
export interface TableMeta {
  id: string;
  table_name: string;
  title: string;
}

/** Role object as returned by the permissions API. */
export interface Role {
  id: number;
  roleName: string;
  description?: string;
  isSystemRole: boolean;
}

/** Table permission flags. */
export interface TablePermissions {
  tableName: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

/** User object returned by the provisioning API. */
export interface ProvisionedUser {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  roles: string[];
}

/** Health-check response. */
export interface HealthStatus {
  status: string;
  [key: string]: unknown;
}

/**
 * Provides administrative operations: table catalog, roles, permissions,
 * user provisioning, and health check.
 */
export class AdminService {
  constructor(private readonly http: AxiosInstance) {}

  /** List all tables exposed by the Middleware. */
  async listTables(): Promise<TableMeta[]> {
    try {
      const response = await this.http.get<TableMeta[]>('/meta/tables');
      return response.data;
    } catch (error) {
      throw normaliseError(error);
    }
  }

  /** List all roles defined in the system. */
  async listRoles(): Promise<Role[]> {
    try {
      const response = await this.http.get<Role[]>('/admin/permissions/roles');
      return response.data;
    } catch (error) {
      throw normaliseError(error);
    }
  }

  /** Create a new role. */
  async createRole(
    roleName: string,
    description?: string,
    isSystemRole?: boolean,
  ): Promise<Role> {
    try {
      const response = await this.http.post<Role>('/admin/permissions/roles', {
        roleName,
        description,
        isSystemRole,
      });
      return response.data;
    } catch (error) {
      throw normaliseError(error);
    }
  }

  /** Set CRUD permissions for a role on a specific table. */
  async setTablePermissions(
    roleId: number,
    tableName: string,
    permissions: Omit<TablePermissions, 'tableName'>,
  ): Promise<void> {
    try {
      await this.http.post('/admin/permissions/tables', {
        roleId,
        tableName,
        ...permissions,
      });
    } catch (error) {
      throw normaliseError(error);
    }
  }

  /** Provision a new user account. */
  async createUser(dto: {
    username: string;
    email: string;
    password: string;
    roles?: string[];
    isActive?: boolean;
  }): Promise<ProvisionedUser> {
    try {
      const response = await this.http.post<ProvisionedUser>('/users', dto);
      return response.data;
    } catch (error) {
      throw normaliseError(error);
    }
  }

  /** Check the health status of the Middleware. */
  async healthCheck(): Promise<HealthStatus> {
    try {
      const response = await this.http.get<HealthStatus>('/health');
      return response.data;
    } catch (error) {
      throw normaliseError(error);
    }
  }
}
