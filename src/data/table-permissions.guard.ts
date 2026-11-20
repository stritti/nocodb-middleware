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
import {
  assertTableAction,
  PermissionUser,
} from '../permissions/permission-check.util';
import { isValidTableName } from '../common/validation/table-name';
import { SYSTEM_TABLES } from '../common/system-table-names';

const METHOD_ACTIONS: Readonly<Record<string, CrudAction>> = {
  GET: CrudAction.READ,
  POST: CrudAction.CREATE,
  PATCH: CrudAction.UPDATE,
  DELETE: CrudAction.DELETE,
};

interface DataRequest {
  method: string;
  params: { table?: string };
  user?: PermissionUser;
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

    if (!isValidTableName(table) || SYSTEM_TABLES.has(table)) {
      throw new NotFoundException(`Table '${table}' not found`);
    }

    const action = METHOD_ACTIONS[request.method.toUpperCase()];
    const user = request.user;

    if (!action || !user?.userId) {
      throw new ForbiddenException('Access denied');
    }

    await assertTableAction(
      this.permissionsService,
      this.logger,
      user,
      table,
      action,
    );

    return true;
  }
}
