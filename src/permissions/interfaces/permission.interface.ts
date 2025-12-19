import { CrudAction } from '../enums/crud-action.enum';

/**
 * Permission for a specific table
 */
export interface TablePermission {
    roleId: number;
    tableName: string;
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

/**
 * Aggregated permissions for a user
 */
export interface UserPermissions {
    userId: number;
    username: string;
    roles: string[];
    permissions: Map<string, Set<CrudAction>>;
}
