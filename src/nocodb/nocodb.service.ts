import {
  HttpStatus,
  Injectable,
  OnModuleInit,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Api } from 'nocodb-sdk';
import axios, { AxiosInstance, AxiosError, isAxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { shouldRetryNocoDBRequest } from './nocodb-retry.util';
import { TelemetryService } from '../tracing/telemetry.service';
import { NocoDBException } from './exceptions/nocodb.exception';
import {
  NocoFieldDefinition,
  NocoTableMeta,
  NocoRecord,
  NocoRecordListResponse,
  NocoRecordResponse,
} from './nocodb.types';

// ─── NocoDB v3 API paths ────────────────────────────────────────────────────
// https://nocodb.com/apis/v3/meta and https://nocodb.com/apis/v3/data

const META_BASE_PATH = (baseId: string) => `/api/v3/meta/bases/${baseId}`;
const TABLES_PATH = (baseId: string) => `${META_BASE_PATH(baseId)}/tables`;
const TABLE_PATH = (baseId: string, tableId: string) =>
  `${TABLES_PATH(baseId)}/${tableId}`;
const FIELDS_PATH = (baseId: string, tableId: string) =>
  `${TABLE_PATH(baseId, tableId)}/fields`;

const DATA_TABLE_PATH = (baseId: string, tableId: string) =>
  `/api/v3/data/${baseId}/${tableId}`;
const RECORDS_PATH = (baseId: string, tableId: string) =>
  `${DATA_TABLE_PATH(baseId, tableId)}/records`;
const RECORD_PATH = (baseId: string, tableId: string, recordId: number) =>
  `${RECORDS_PATH(baseId, tableId)}/${recordId}`;
const COUNT_PATH = (baseId: string, tableId: string) =>
  `${DATA_TABLE_PATH(baseId, tableId)}/count`;

// ─── Data API option interfaces ─────────────────────────────────────────────

export interface ReadOptions {
  fields?: string[];
}

export interface FilterOptions {
  /** NocoDB where expression, build it with nocodb-filter.util. */
  where?: string;
  /** Comma-separated field titles, `-` prefix for descending: `-age,name`. */
  sort?: string;
  fields?: string[];
  limit?: number;
  offset?: number;
  /** Also fetch the total number of matching records (extra request). */
  withCount?: boolean;
}

/** A record as returned by the NocoDB v3 Data API. */
interface V3Record {
  id: number | string;
  fields?: Record<string, unknown>;
}

/** Turns `{ id, fields: {...} }` into the flat shape used in the middleware. */
function flattenRecord(record: V3Record): NocoRecord {
  return { ...(record.fields ?? {}), id: record.id };
}

/** Converts `-age,name` into the JSON sort format of the v3 Data API. */
function toV3Sort(sort: string): string {
  const entries = sort
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const descending = part.startsWith('-');
      const name = descending ? part.slice(1) : part;
      return {
        // NocoDB's primary key field is titled `Id`.
        field: name === 'id' ? 'Id' : name,
        direction: descending ? 'desc' : 'asc',
      };
    });
  return JSON.stringify(entries);
}

function isNotFound(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === HttpStatus.NOT_FOUND;
}

/**
 * Unified NocoDB service.
 *
 * Consolidates the Meta API v3 (table/column schema management) and the Data
 * API v3 (CRUD + filtering on records) into a single injectable following the
 * NestJS convention of one service per external system boundary.  Previously
 * these responsibilities were split between NocoDBService and NocoDBV3Service.
 */
@Injectable()
export class NocoDBService implements OnModuleInit {
  private readonly logger = new Logger(NocoDBService.name);
  private client: Api<unknown>;
  private httpClient: AxiosInstance;
  private readonly baseId: string;
  private readonly tablePrefix: string;

  // Rate limiting for Data API calls
  private readonly rateLimit = 5; // requests per second
  private readonly minRequestInterval = 1000 / this.rateLimit;
  private rateLimitChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly telemetry?: TelemetryService,
  ) {
    this.baseId = this.configService.get<string>('nocodb.baseId') || '';
    this.tablePrefix = this.configService.get<string>('nocodb.tablePrefix', '');
  }

  onModuleInit() {
    const apiUrl = this.configService.get<string>('nocodb.apiUrl');
    const apiToken = this.configService.get<string>('nocodb.apiToken');

    if (!apiUrl || !apiToken) {
      this.logger.error(
        'NocoDB configuration missing: API URL or Token not found.',
      );
      throw new Error('NocoDB configuration missing');
    }

    if (!this.baseId) {
      this.logger.error('NocoDB BASE_ID is required for Meta API operations');
      throw new Error('NocoDB BASE_ID missing');
    }

    // SDK client (kept for backwards compatibility)
    this.client = new Api({
      baseURL: apiUrl,
      headers: {
        'xc-auth': apiToken,
      },
    });

    // Shared HTTP client used by both Meta and Data API calls
    this.httpClient = axios.create({
      baseURL: apiUrl,
      headers: {
        'xc-token': apiToken,
        'Content-Type': 'application/json',
      },
    });

    // Configure retry logic with exponential backoff for transient failures
    const retryCount = this.configService.get<number>('NOCODB_RETRY_COUNT', 3);
    const retryBaseDelay = this.configService.get<number>(
      'NOCODB_RETRY_BASE_DELAY',
      1000,
    );
    const retryMaxDelay = this.configService.get<number>(
      'NOCODB_RETRY_MAX_DELAY',
      10000,
    );

    axiosRetry(this.httpClient, {
      retries: retryCount,
      retryDelay: (retryCountParam: number, _error: AxiosError) => {
        const delay = Math.min(
          retryBaseDelay * Math.pow(2, retryCountParam - 1),
          retryMaxDelay,
        );
        // Add jitter (±25%) to avoid thundering herd
        const jitter = delay * 0.25 * (Math.random() * 2 - 1);
        return Math.round(delay + jitter);
      },
      // Only reads are replayed on 5xx/network errors; writes may already
      // have been applied by NocoDB. See shouldRetryNocoDBRequest.
      retryCondition: shouldRetryNocoDBRequest,
      onRetry: (retryCountParam: number, error: AxiosError) => {
        this.logger.warn(
          `[axios-retry] Retrying NocoDB request (attempt ${retryCountParam}) after: ${error.message}`,
        );
      },
    });

    this.logger.log(
      `HTTP client retry configured: ${retryCount} attempts, base delay ${retryBaseDelay}ms`,
    );

    if (this.tablePrefix) {
      this.logger.log(
        `NocoDB Service initialized with table prefix: "${this.tablePrefix}"`,
      );
    }
    this.logger.log(`NocoDB Service initialized with URL: ${apiUrl}`);
  }

  // ── Accessor helpers ──────────────────────────────────────────────────────

  /**
   * Get the NocoDB SDK client for data operations
   */
  getClient(): Api<unknown> {
    return this.client;
  }

  /**
   * Get the configured base ID
   */
  getBaseId(): string {
    return this.baseId;
  }

  /**
   * Get the configured table prefix
   */
  getTablePrefix(): string {
    return this.tablePrefix;
  }

  /**
   * Get the HTTP client for legacy direct API calls.
   * Prefer dedicated NocoDBService methods so the privileged token stays
   * encapsulated in this infrastructure boundary.
   */
  getHttpClient(): AxiosInstance {
    return this.httpClient;
  }

  // ── Tracing helper ────────────────────────────────────────────────────────

  /**
   * Run `fn` inside a named OTel span when {@link TelemetryService} is
   * available; otherwise execute `fn` directly.
   */
  private trace<T>(
    name: string,
    fn: () => Promise<T>,
    attributes?: Record<string, string | number>,
  ): Promise<T> {
    return this.telemetry
      ? this.telemetry.withSpan(name, fn, attributes)
      : fn();
  }

  // ── Meta API – tables and fields ──────────────────────────────────────────

  private getPrefixedTableName(tableName: string): string {
    return `${this.tablePrefix}${tableName}`;
  }

  /** Table with its fields. */
  async getTableMetadata(tableId: string): Promise<NocoTableMeta> {
    const response = await this.httpClient.get(
      TABLE_PATH(this.baseId, tableId),
    );
    return response.data as NocoTableMeta;
  }

  async listBaseTables(baseId = this.baseId): Promise<NocoTableMeta[]> {
    const response = await this.httpClient.get(TABLES_PATH(baseId));
    return (response.data.list ?? []) as NocoTableMeta[];
  }

  /**
   * List all tables in the base.
   */
  async listTables(): Promise<NocoTableMeta[]> {
    try {
      return await this.listBaseTables();
    } catch (error) {
      this.logger.error(`Error listing tables for base ${this.baseId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a table exists in the base.
   */
  async tableExists(tableName: string): Promise<boolean> {
    return (await this.getTableByName(tableName)) !== null;
  }

  /**
   * Find a table by its (unprefixed) name. Tables are matched by title, which
   * is how NocoDB v3 identifies them; the physical `table_name` is accepted
   * as a fallback for older NocoDB versions.
   */
  async getTableByName(tableName: string): Promise<NocoTableMeta | null> {
    const prefixedName = this.getPrefixedTableName(tableName);
    try {
      const tables = await this.listTables();
      const table =
        tables.find((t) => t.title === prefixedName) ??
        tables.find((t) => t.table_name === prefixedName) ??
        null;
      if (!table) {
        this.logger.warn(`Table ${prefixedName} not found`);
      }
      return table;
    } catch (error) {
      this.logger.error(`Error getting table ${prefixedName}:`, error);
      throw error;
    }
  }

  /**
   * Create a new table in the base. The table is titled with the prefixed
   * `tableName` so {@link getTableByName} can find it; `title` is kept for
   * API compatibility and stored as the table description.
   */
  async createTable(
    tableName: string,
    title: string,
    fields: NocoFieldDefinition[] = [],
  ): Promise<NocoTableMeta> {
    const prefixedName = this.getPrefixedTableName(tableName);
    try {
      const response = await this.httpClient.post(TABLES_PATH(this.baseId), {
        title: prefixedName,
        description: title !== tableName ? title : undefined,
        fields,
      });
      this.logger.log(`Table ${prefixedName} created successfully`);
      return response.data as NocoTableMeta;
    } catch (error) {
      this.logger.error(`Error creating table ${prefixedName}:`, error);
      throw error;
    }
  }

  /**
   * Add a field to a table. Record values are keyed by the field title.
   */
  async createColumn(
    tableId: string,
    field: NocoFieldDefinition,
  ): Promise<NocoRecordResponse> {
    try {
      const response = await this.httpClient.post(
        FIELDS_PATH(this.baseId, tableId),
        field,
      );
      this.logger.log(`Field ${field.title} created in table ${tableId}`);
      return response.data as NocoRecordResponse;
    } catch (error) {
      this.logger.error(`Error creating field ${field.title}:`, error);
      throw error;
    }
  }

  // ── Data API v3 – rate limiting ───────────────────────────────────────────

  private nextAllowedTime = 0;

  private enforceRateLimit(): Promise<void> {
    // In test environments, setTimeout may not be available (Jest 30 + Node.js 26)
    // Skip rate limiting in such cases to avoid ReferenceError
    if (typeof setTimeout !== 'function') {
      return Promise.resolve();
    }

    const next = this.rateLimitChain
      .catch(() => {})
      .then(() => {
        const now = Date.now();
        const scheduledTime = Math.max(now, this.nextAllowedTime);
        const delay = Math.max(0, scheduledTime - now);

        this.nextAllowedTime = scheduledTime + this.minRequestInterval;

        if (delay === 0) {
          return;
        }

        return new Promise<void>((resolve) => setTimeout(resolve, delay));
      });
    this.rateLimitChain = next;
    return next;
  }

  // ── Data API v3 – CRUD ────────────────────────────────────────────────────

  /**
   * Create a new record and return it flat (`{ id, ...fields }`).
   */
  async create(
    tableId: string,
    data: Record<string, unknown>,
  ): Promise<NocoRecordResponse> {
    return this.trace(
      'nocodb.create',
      async () => {
        await this.enforceRateLimit();
        try {
          const response = await this.httpClient.post(
            RECORDS_PATH(this.baseId, tableId),
            { fields: data },
          );
          const record = flattenRecord(
            (response.data as { records: V3Record[] }).records[0],
          );
          this.logger.debug(`Created record in ${tableId}: ${record.id}`);
          return record;
        } catch (error) {
          this.logger.error(`Error creating record in ${tableId}:`, error);
          throw error;
        }
      },
      { 'db.table_id': tableId, 'db.operation': 'create' },
    );
  }

  /**
   * Read a single record. Returns `null` if it does not exist.
   */
  async read(
    tableId: string,
    recordId: number,
    options?: ReadOptions,
  ): Promise<NocoRecord | null> {
    return this.trace(
      'nocodb.read',
      async () => {
        await this.enforceRateLimit();
        try {
          const params: Record<string, string> = {};
          if (options?.fields) {
            params.fields = options.fields.join(',');
          }
          const response = await this.httpClient.get(
            RECORD_PATH(this.baseId, tableId, recordId),
            { params },
          );
          this.logger.debug(`Read record ${recordId} from ${tableId}`);
          return flattenRecord(response.data as V3Record);
        } catch (error) {
          if (isNotFound(error)) {
            return null;
          }
          this.logger.error(
            `Error reading record ${recordId} from ${tableId}:`,
            error,
          );
          throw error;
        }
      },
      {
        'db.table_id': tableId,
        'db.record_id': recordId,
        'db.operation': 'read',
      },
    );
  }

  /**
   * Update fields of a record and return it flat. Throws a 404
   * {@link NocoDBException} if the record does not exist.
   */
  async update(
    tableId: string,
    recordId: number,
    data: Record<string, unknown>,
  ): Promise<NocoRecordResponse> {
    return this.trace(
      'nocodb.update',
      async () => {
        await this.enforceRateLimit();
        try {
          const response = await this.httpClient.patch(
            RECORDS_PATH(this.baseId, tableId),
            { id: recordId, fields: data },
          );
          this.logger.debug(`Updated record ${recordId} in ${tableId}`);
          return flattenRecord(
            (response.data as { records: V3Record[] }).records[0],
          );
        } catch (error) {
          if (isNotFound(error)) {
            throw NocoDBException.recordNotFound(tableId, recordId);
          }
          this.logger.error(
            `Error updating record ${recordId} in ${tableId}:`,
            error,
          );
          throw error;
        }
      },
      {
        'db.table_id': tableId,
        'db.record_id': recordId,
        'db.operation': 'update',
      },
    );
  }

  /**
   * Delete a record. Throws a 404 {@link NocoDBException} if it does not
   * exist.
   */
  async delete(tableId: string, recordId: number): Promise<void> {
    return this.trace(
      'nocodb.delete',
      async () => {
        await this.enforceRateLimit();
        try {
          await this.httpClient.delete(RECORDS_PATH(this.baseId, tableId), {
            data: { id: recordId },
          });
          this.logger.debug(`Deleted record ${recordId} from ${tableId}`);
        } catch (error) {
          if (isNotFound(error)) {
            throw NocoDBException.recordNotFound(tableId, recordId);
          }
          this.logger.error(
            `Error deleting record ${recordId} from ${tableId}:`,
            error,
          );
          throw error;
        }
      },
      {
        'db.table_id': tableId,
        'db.record_id': recordId,
        'db.operation': 'delete',
      },
    );
  }

  /**
   * List records with filtering, sorting and offset pagination. With
   * `withCount`, `pageInfo.totalRows` holds the number of all matches.
   */
  async list(
    tableId: string,
    options?: FilterOptions,
  ): Promise<NocoRecordListResponse> {
    return this.trace(
      'nocodb.list',
      async () => {
        await this.enforceRateLimit();
        try {
          const params: Record<string, string> = {};
          if (options?.where) params.where = options.where;
          if (options?.sort) params.sort = toV3Sort(options.sort);
          if (options?.fields) params.fields = options.fields.join(',');
          if (options?.limit !== undefined)
            params.limit = String(options.limit);
          if (options?.offset !== undefined)
            params.offset = String(options.offset);

          const response = await this.httpClient.get(
            RECORDS_PATH(this.baseId, tableId),
            { params },
          );
          const list = (
            (response.data as { records?: V3Record[] }).records ?? []
          ).map(flattenRecord);
          this.logger.debug(`Listed ${list.length} records from ${tableId}`);

          if (!options?.withCount) {
            return { list };
          }

          return {
            list,
            pageInfo: {
              totalRows: await this.count(tableId, options.where),
              pageSize: options.limit,
            },
          };
        } catch (error) {
          this.logger.error(`Error listing records from ${tableId}:`, error);
          throw error;
        }
      },
      { 'db.table_id': tableId, 'db.operation': 'list' },
    );
  }

  /**
   * List all records matching the options, page by page. Use this instead of
   * {@link list} whenever a lookup must not miss records: NocoDB returns
   * only 25 records unless a limit is given.
   */
  async listAll(
    tableId: string,
    options: Omit<FilterOptions, 'limit' | 'offset' | 'withCount'> = {},
    pageSize = 1000,
  ): Promise<NocoRecord[]> {
    const records: NocoRecord[] = [];

    for (let offset = 0; ; offset += pageSize) {
      const page = await this.list(tableId, {
        ...options,
        limit: pageSize,
        offset,
      });
      records.push(...page.list);

      if (page.list.length < pageSize) {
        return records;
      }
    }
  }

  /**
   * Count records matching an optional filter.
   */
  async count(tableId: string, where?: string): Promise<number> {
    await this.enforceRateLimit();
    const response = await this.httpClient.get(
      COUNT_PATH(this.baseId, tableId),
      { params: where ? { where } : {} },
    );
    return Number((response.data as { count?: number }).count ?? 0);
  }

  /**
   * Find a single record by filter.
   */
  async findOne(tableId: string, where: string): Promise<NocoRecord | null> {
    const result = await this.list(tableId, { where, limit: 1 });
    return result.list.length > 0 ? result.list[0] : null;
  }

  /**
   * Check if a record matching the filter exists.
   */
  async exists(tableId: string, where: string): Promise<boolean> {
    return (await this.findOne(tableId, where)) !== null;
  }

  /**
   * Batch-create multiple records.
   */
  async batchCreate(
    tableId: string,
    records: Record<string, unknown>[],
  ): Promise<NocoRecordResponse[]> {
    const results: NocoRecordResponse[] = [];
    for (const record of records) {
      try {
        results.push(await this.create(tableId, record));
      } catch (error) {
        this.logger.error('Error in batch create for record:', error);
        results.push({
          error: error instanceof Error ? error.message : String(error),
        } as unknown as NocoRecordResponse);
      }
    }
    return results;
  }

  /**
   * Batch-update multiple records.
   */
  async batchUpdate(
    tableId: string,
    updates: Array<{ id: number; data: Record<string, unknown> }>,
  ): Promise<NocoRecordResponse[]> {
    const results: NocoRecordResponse[] = [];
    for (const upd of updates) {
      try {
        results.push(await this.update(tableId, upd.id, upd.data));
      } catch (error) {
        this.logger.error(`Error in batch update for record ${upd.id}:`, error);
        results.push({
          id: upd.id,
          error: error instanceof Error ? error.message : String(error),
        } as unknown as NocoRecordResponse);
      }
    }
    return results;
  }
}
