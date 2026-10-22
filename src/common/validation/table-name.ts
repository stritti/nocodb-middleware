/**
 * The one rule for logical table names, shared by the table catalog, the
 * table-permission DTOs and the data API: letters (any script), digits,
 * spaces, `_` and `-`; 1–255 characters; no leading or trailing space.
 *
 * Everything allowed here is safe inside a quoted NocoDB filter value (which
 * must not contain `"`) and in a URL path segment once encoded.
 */
export const TABLE_NAME_PATTERN =
  /^[\p{L}\p{N}_-](?:[\p{L}\p{N} _-]{0,253}[\p{L}\p{N}_-])?$/u;

export const TABLE_NAME_RULE =
  'letters, digits, spaces, underscores and hyphens (1-255 characters, no leading or trailing space)';

export function isValidTableName(name: string): boolean {
  return TABLE_NAME_PATTERN.test(name);
}
