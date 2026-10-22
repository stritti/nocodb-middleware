import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PermissionsService } from '../permissions/permissions.service';
import { CrudAction } from '../permissions/enums/crud-action.enum';
import { hasScopePermission } from '../permissions/scope-permission.util';
import { logPermissionDenied } from '../permissions/permission-audit';

/** Internal tables of the middleware; never reachable via the data API. */
export const SYSTEM_TABLES: ReadonlySet<string> = new Set([
  'users',
  'roles',
  'user_roles',
  'table_permissions',
]);

const TABLE_NAME_PATTERN = /^[A-Za-z0-9_]{1,64}$/;

const METHOD_ACTIONS: Readonly<Record<string, CrudAction>> = {
  GET: CrudAction.READ,
  POST: CrudAction.CREATE,
  PATCH: CrudAction.UPDATE,
  DELETE: CrudAction.DELETE,
};

interface DataRequest {
  method: string;
  params: { table?: string };
  user?: { userId?: number | string; scope?: string[] };
}

/**
 * Authorizes data API requests per table: the HTTP method is mapped to a CRUD
 * action, which must be granted by an OAuth scope or by the user's roles in
 * `table_permissions`. Anything not explicitly granted is denied.
 *
 * System tables and malformed table names are answered with 404 so the API
 * does not reveal which internal tables exist.
 */
@Injectable()
export class TablePermissionsGuard implements CanActivate {
  private readonly logger = new Logger(TablePermissionsGuard.name);

  constructor(private readonly permissionsService: PermissionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<DataRequest>();
    const table = request.params.table ?? '';

    if (!TABLE_NAME_PATTERN.test(table) || SYSTEM_TABLES.has(table)) {
      throw new NotFoundException(`Table '${table}' not found`);
    }

    const action = METHOD_ACTIONS[request.method.toUpperCase()];
    const user = request.user;

    if (!action || !user?.userId) {
      throw new ForbiddenException('Access denied');
    }

    const allowed =
      hasScopePermission(user.scope, table, action) ||
      (await this.permissionsService.canUserPerformAction(
        Number(user.userId),
        table,
        action,
      ));

    if (!allowed) {
      logPermissionDenied(this.logger, user.userId, action, table);
      throw new ForbiddenException(`Missing permission: ${action} on ${table}`);
    }

    return true;
  }
}
