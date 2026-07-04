import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator that declares which roles are allowed to access a handler.
 *
 * Used together with {@link RolesGuard} to enforce role-based access control.
 *
 * @example
 * ```ts
 * @Roles('admin')
 * @Delete(':id')
 * delete(@Param('id') id: string) { ... }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
