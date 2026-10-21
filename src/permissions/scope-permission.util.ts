import { CrudAction } from './enums/crud-action.enum';

/**
 * Checks OAuth-style scopes of the form `<table>:<action>`, with `*` as a
 * wildcard for table and/or action (e.g. `customers:read`, `customers:*`,
 * `*:read`, `*:*`).
 */
export function hasScopePermission(
  scope: unknown,
  table: string,
  action: CrudAction,
): boolean {
  if (!Array.isArray(scope) || scope.length === 0) {
    return false;
  }

  return (
    scope.includes(`${table}:${action}`) ||
    scope.includes(`${table}:*`) ||
    scope.includes(`*:${action}`) ||
    scope.includes('*:*')
  );
}
