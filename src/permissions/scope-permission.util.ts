import { CrudAction } from './enums/crud-action.enum';
import { SYSTEM_TABLE_NAMES } from '../common/system-table-names';

const SYSTEM_TABLE_SET: ReadonlySet<string> = new Set(
  Object.values(SYSTEM_TABLE_NAMES),
);

/**
 * Checks OAuth-style scopes of the form `<table>:<action>`, with `*` as a
 * wildcard for table and/or action (e.g. `customers:read`, `customers:*`,
 * `*:read`, `*:*`).
 *
 * Table wildcards (`*:read`, `*:*`, ...) only cover regular data tables.
 * The middleware's system tables (`roles`, `user_roles`,
 * `table_permissions`, `users`) back the admin API, so access to them must be
 * granted explicitly by name (e.g. `user_roles:create` or `roles:*`).
 * Otherwise a token issued for broad data access could assign itself the
 * admin role.
 */
export function hasScopePermission(
  scope: unknown,
  table: string,
  action: CrudAction,
): boolean {
  if (!Array.isArray(scope) || scope.length === 0) {
    return false;
  }

  if (scope.includes(`${table}:${action}`) || scope.includes(`${table}:*`)) {
    return true;
  }

  if (SYSTEM_TABLE_SET.has(table)) {
    return false;
  }

  return scope.includes(`*:${action}`) || scope.includes('*:*');
}
