import { AxiosInstance } from 'axios';
import { normaliseError } from '../http-client.js';

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

/** Pagination metadata of the Middleware's paginated admin endpoints. */
export interface PageMeta {
  page: number;
  take: number;
  itemCount: number;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/** A page of items as returned by paginated admin endpoints. */
export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

/** Query options of paginated admin endpoints. */
export interface PageOptions {
  /** 1-based page number (default 1). */
  page?: number;
  /** Page size, 1–50 (default 10). */
  take?: number;
}

/** Role record as stored in NocoDB (wire format of the Middleware). */
interface RoleRecord {
  id: number;
  role_name: string;
  description?: string;
  is_system_role?: boolean;
}

/** Identity returned by POST /users (wire format of the Middleware). */
interface IdentityRecord {
  userId: number;
  username: string;
  email: string;
  roles: string[];
  active: boolean;
}

function toRole(record: RoleRecord): Role {
  return {
    id: record.id,
    roleName: record.role_name,
    description: record.description,
    isSystemRole: Boolean(record.is_system_role),
  };
}

function toProvisionedUser(identity: IdentityRecord): ProvisionedUser {
  return {
    id: identity.userId,
    username: identity.username,
    email: identity.email,
    isActive: identity.active,
    roles: identity.roles,
  };
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

  /** List roles, one page at a time. */
  async listRoles(options: PageOptions = {}): Promise<Page<Role>> {
    try {
      const response = await this.http.get<Page<RoleRecord>>(
        '/admin/permissions/roles',
        { params: options },
      );
      return {
        data: response.data.data.map(toRole),
        meta: response.data.meta,
      };
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
      const response = await this.http.post<RoleRecord>(
        '/admin/permissions/roles',
        { roleName, description, isSystemRole },
      );
      return toRole(response.data);
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
      await this.http.post('/admin/permissions/table-permissions', {
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
      const response = await this.http.post<IdentityRecord>('/users', dto);
      return toProvisionedUser(response.data);
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
