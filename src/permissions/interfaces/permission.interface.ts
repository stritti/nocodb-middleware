import { CrudAction } from '../enums/crud-action.enum';

/**
 * Aggregated permissions for a user
 */
export interface UserPermissions {
  userId: number;
  username: string;
  roles: string[];
  permissions: Map<string, Set<CrudAction>>;
}
