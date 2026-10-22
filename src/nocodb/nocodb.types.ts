/**
 * NocoDB API response types.
 *
 * These interfaces describe shapes returned by the NocoDB Meta API v3 and
 * Data API v3.  They replace `any` in service method signatures, giving
 * consumers predictable, self-documenting return values.
 *
 * ── Design note ────────────────────────────────────────────────────────────
 * Meta API responses (tables, columns) have a known shape and are fully typed.
 * Data API responses (records) are inherently dynamic because table schemas
 * are user-defined, so we use `unknown` values to discourage unsafe access
 * without validation.  Use the helper functions in `nocodb-utils.ts` or local
 * guards to narrow the type in consumer code.
 */

// ── Meta API (table/column schema) ──────────────────────────────────────────

export interface NocoTableMeta {
  id: string;
  /**
   * Table name. NocoDB v3 identifies tables by their title; the middleware
   * creates its tables with `title` = (prefixed) table name.
   */
  title: string;
  /** Physical table name; only returned by older NocoDB versions. */
  table_name?: string;
  /** Fields of the table — populated by GET /meta/bases/:baseId/tables/:id. */
  fields?: NocoFieldMeta[];
}

export interface NocoFieldMeta {
  id: string;
  /** Field title; record values are keyed by it in the v3 Data API. */
  title: string;
  /** NocoDB field type, e.g. `SingleLineText`, `Number`, `Checkbox`. */
  type: string;
  options?: Record<string, unknown>;
}

/** Field definition for creating tables or fields via the v3 Meta API. */
export interface NocoFieldDefinition {
  title: string;
  type: string;
  options?: Record<string, unknown>;
}

export interface NocoTableListResponse {
  list: NocoTableMeta[];
  pageInfo?: NocoPageInfo;
}

export interface NocoPageInfo {
  totalRows: number;
  page?: number;
  pageSize?: number;
}

// ── Data API (records) ──────────────────────────────────────────────────────

/**
 * A single NocoDB record — values use `unknown` to discourage unsafe
 * property access.  Consumers that know the table schema should use
 * the helpers in `nocodb-utils.ts` or add local type guards.
 */
export interface NocoRecord {
  id?: number | string;
  [key: string]: unknown;
}

export interface NocoRecordListResponse {
  list: NocoRecord[];
  /** Only present when the list was requested with `withCount`. */
  pageInfo?: NocoPageInfo;
}

/** Response shape for create/update endpoints (record + metadata). */
export interface NocoRecordResponse {
  id?: number | string;
  [key: string]: unknown;
}

// ── Permalink types for nested includes ─────────────────────────────────────

export interface NestedIncludes {
  [field: string]: { fields: string[] };
}
