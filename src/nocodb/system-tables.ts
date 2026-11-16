export const INTERNAL_TABLE_NAMES: ReadonlySet<string> = new Set([
  'users',
  'roles',
  'user_roles',
  'table_permissions',
  'api_resources',
  'api_resource_fields',
  'api_resource_filters',
]);

export function isInternalTable(
  table: { title: string; table_name?: string },
  prefix: string,
): boolean {
  return [table.title, table.table_name].some(
    (name) =>
      typeof name === 'string' &&
      (INTERNAL_TABLE_NAMES.has(name) ||
        (name.startsWith(prefix) &&
          INTERNAL_TABLE_NAMES.has(name.slice(prefix.length)))),
  );
}
