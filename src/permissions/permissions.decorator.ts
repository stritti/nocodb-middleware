import { SetMetadata } from '@nestjs/common';
import { CrudAction } from './enums/crud-action.enum';
import { REQUIRE_PERMISSIONS_KEY, RequiredPermission } from './permissions.guard';

/**
 * Decorator to define required permissions for an endpoint
 * 
 * @example
 * @RequirePermissions({ table: 'users', action: CrudAction.READ })
 * @Get()
 * findAll() { ... }
 * 
 * @example Multiple permissions
 * @RequirePermissions(
 *   { table: 'users', action: CrudAction.READ },
 *   { table: 'roles', action: CrudAction.READ }
 * )
 */
export const RequirePermissions = (...permissions: RequiredPermission[]) =>
    SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);

/**
 * Helper decorators for common CRUD operations
 */
export const RequireCreate = (table: string) =>
    RequirePermissions({ table, action: CrudAction.CREATE });

export const RequireRead = (table: string) =>
    RequirePermissions({ table, action: CrudAction.READ });

export const RequireUpdate = (table: string) =>
    RequirePermissions({ table, action: CrudAction.UPDATE });

export const RequireDelete = (table: string) =>
    RequirePermissions({ table, action: CrudAction.DELETE });
