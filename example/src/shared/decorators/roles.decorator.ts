import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export interface RoleType {
  role: string;
  table?: string;
  action?: string;
}

/**
 * Decorator to specify required roles for a route
 * @param roles Array of role names or role configurations
 * @example
 * @Roles('admin')
 * @Roles('admin', 'user')
 * @Roles({ role: 'user', table: 'books', action: 'read' })
 */
export const Roles = (...roles: (string | RoleType)[]) => SetMetadata(ROLES_KEY, roles);
