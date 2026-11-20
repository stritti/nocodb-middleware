import { ForbiddenException, Logger } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CrudAction } from './enums/crud-action.enum';
import { hasScopePermission } from './scope-permission.util';
import { logPermissionDenied } from './permission-audit';

export interface PermissionUser {
  userId: number | string;
  scope?: string[];
}

/**
 * Assert that `user` may perform `action` on `table`, either through an
 * OAuth-style scope or through the roles in `table_permissions`.
 * Throws `ForbiddenException` and logs a structured denial otherwise.
 *
 * Shared by {@link PermissionsGuard} and the data API's table guard.
 */
export async function assertTableAction(
  permissionsService: PermissionsService,
  logger: Logger,
  user: PermissionUser,
  table: string,
  action: CrudAction,
): Promise<void> {
  const allowed =
    hasScopePermission(user.scope, table, action) ||
    (await permissionsService.canUserPerformAction(
      Number(user.userId),
      table,
      action,
    ));

  if (!allowed) {
    logPermissionDenied(logger, user.userId, action, table);
    throw new ForbiddenException(`Missing permission: ${action} on ${table}`);
  }
}
