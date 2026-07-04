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
  table_name: string;
  title: string;
  /** Columns belonging to this table — populated by GET /meta/tables/:id. */
  columns?: NocoColumnMeta[];
  /** Human-readable labels for linked columns, e.g. { "user": "User" }. */
  column_metas?: Record<string, NocoColumnMeta>;
}

export interface NocoColumnMeta {
  id: string;
  column_name: string;
  title: string;
  uidt: string;
  /** Link / rollup target when column is a relation. */
  fk_model_id?: string;
  /** Additional driver-specific options. */
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
