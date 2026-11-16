import { SYSTEM_TABLE_NAMES } from '../common/system-table-names';

export const INTERNAL_TABLE_NAMES: ReadonlySet<string> = new Set(
  Object.values(SYSTEM_TABLE_NAMES),
);

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
