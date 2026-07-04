import { Injectable, OnModuleInit, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Api } from 'nocodb-sdk';
import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { TelemetryService } from '../tracing/telemetry.service';
import {
  NocoTableMeta,
  NocoRecord,
  NocoRecordListResponse,
  NocoRecordResponse,
  NestedIncludes,
} from './nocodb.types';

// ─── NocoDB API path constants ──────────────────────────────────────────────

const META_API_BASE = '/api/v3/meta';
const DATA_API_BASE = '/api/v3/tables';

const TABLE_META_PATH = (tableId: string) => `${META_API_BASE}/tables/${tableId}`;
const BASE_TABLES_PATH = (baseId: string) => `${META_API_BASE}/bases/${baseId}/tables`;
const CREATE_TABLE_PATH = (baseId: string) => `${META_API_BASE}/bases/${baseId}/tables`;
const COLUMN_PATH = (tableId: string) => `${META_API_BASE}/tables/${tableId}/columns`;
const RECORDS_PATH = (tableId: string) => `${DATA_API_BASE}/${tableId}/records`;
const RECORD_PATH = (tableId: string, recordId: number) =>
  `${DATA_API_BASE}/${tableId}/records/${recordId}`;

// ─── Data API option interfaces ─────────────────────────────────────────────

export interface CreateOptions {
  includeFields?: string[];
}

export interface ReadOptions {
  fields?: string[];
  includeRelations?: string[];
}

export interface FilterOptions {
  where?: string;
  sort?: string;
  fields?: string[];
  limit?: number;
  offset?: number;
  includeRelations?: string[];
}

export interface LinkDefinition {
  fieldName: string;
  recordIds: number[];
}

/**
 * Build a nested-includes object for NocoDB's `nested` query parameter
 * without resorting to `as any` casts.
 */
function buildNestedParams(
  relations: string[],
): NestedIncludes {
  const acc: NestedIncludes = {};
  for (const field of relations) {
    acc[field] = { fields: ['*'] };
  }
  return acc;
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
      retryCondition: (error: AxiosError) => {
        // Retry on network errors or idempotent methods (GET, HEAD, PUT, DELETE, OPTIONS)
        // that returned any error status – these are safe to replay.
        if (axiosRetry.isNetworkOrIdempotentRequestError(error)) {
          return true;
        }
        // 429 (rate limited) is safe to retry for all methods; the server
        // did not process the request.
        if (error.response?.status === 429) {
          return true;
        }
        // Do NOT retry non-idempotent methods on 5xx – the request may have
        // been processed (e.g. a POST that created a record before the
        // connection dropped).
        return false;
      },
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

  async getTableMetadata(tableId: string): Promise<NocoTableMeta> {
    const response = await this.httpClient.get(TABLE_META_PATH(tableId));
    return response.data as NocoTableMeta;
  }

  async listBaseTables(baseId = this.baseId): Promise<NocoTableMeta[]> {
    const response = await this.httpClient.get(BASE_TABLES_PATH(baseId));
    return (response.data.list ?? []) as NocoTableMeta[];
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

  // ── Meta API – table management ───────────────────────────────────────────

  private getPrefixedTableName(tableName: string): string {
    return `${this.tablePrefix}${tableName}`;
  }

  /**
   * Check if a table exists in the base.
   */
  async tableExists(tableName: string): Promise<boolean> {
    const prefixedName = this.getPrefixedTableName(tableName);
    try {
      const tables = await this.listTables();
      return tables.some((table) => table.table_name === prefixedName);
    } catch (error) {
      this.logger.error(
        `Error checking if table ${prefixedName} exists:`,
        error,
      );
      throw error;
    }
  }

  /**
   * List all tables in the base.
   */
  async listTables(): Promise<NocoTableMeta[]> {
    try {
      return this.listBaseTables();
    } catch (error) {
      this.logger.error(`Error listing tables for base ${this.baseId}:`, error);
      throw error;
    }
  }

  /**
   * Get table details by name.
   */
  async getTableByName(tableName: string): Promise<NocoTableMeta | null> {
    const prefixedName = this.getPrefixedTableName(tableName);
    try {
      const tables = await this.listTables();
      const table = tables.find((t) => t.table_name === prefixedName) ?? null;
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
   * Create a new table in the base.
   */
  async createTable(
    tableName: string,
    title: string,
    columns: Record<string, unknown>[] = [],
  ): Promise<NocoRecordResponse> {
    const prefixedName = this.getPrefixedTableName(tableName);
    const prefixedTitle = this.getPrefixedTableName(title);
    try {
      const response = await this.httpClient.post(
        CREATE_TABLE_PATH(this.baseId),
        {
          table_name: prefixedName,
          title: prefixedTitle,
          columns,
        },
      );
      this.logger.log(`Table ${prefixedName} created successfully`);
      return response.data as NocoRecordResponse;
    } catch (error) {
      this.logger.error(`Error creating table ${prefixedName}:`, error);
      throw error;
    }
  }

  /**
   * Create a new column in a table.
   */
  async createColumn(
    tableId: string,
    columnName: string,
    columnType: string,
    title?: string,
    additionalOptions?: Record<string, unknown>,
  ): Promise<NocoRecordResponse> {
    try {
      const payload = {
        column_name: columnName,
        title: title || columnName,
        uidt: columnType,
        ...additionalOptions,
      };
      const response = await this.httpClient.post(
        COLUMN_PATH(tableId),
        payload,
      );
      this.logger.log(`Column ${columnName} created in table ${tableId}`);
      return response.data as NocoRecordResponse;
    } catch (error) {
      this.logger.error(`Error creating column ${columnName}:`, error);
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
   * Create a new record.
   */
  async create(
    tableId: string,
    data: Record<string, unknown>,
    options?: CreateOptions,
  ): Promise<NocoRecordResponse> {
    return this.trace(
      'nocodb.create',
      async () => {
        await this.enforceRateLimit();
        try {
          const params: Record<string, string> = {};
          if (options?.includeFields) {
            params.fields = options.includeFields.join(',');
          }
          const response = await this.httpClient.post(
            RECORDS_PATH(tableId),
            data,
            { params },
          );
          this.logger.debug(
            `Created record in ${tableId}: ${response.data.id}`,
          );
          return response.data as NocoRecordResponse;
        } catch (error) {
          this.logger.error(`Error creating record in ${tableId}:`, error);
          throw error;
        }
      },
      { 'db.table_id': tableId, 'db.operation': 'create' },
    );
  }

  /**
   * Read a single record.
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
          if (options?.includeRelations) {
            params.nested = JSON.stringify(
              buildNestedParams(options.includeRelations),
            );
          }
          const response = await this.httpClient.get(
            RECORD_PATH(tableId, recordId),
            { params },
          );
          this.logger.debug(`Read record ${recordId} from ${tableId}`);
          return response.data as NocoRecord;
        } catch (error) {
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
   * Update a record.
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
            RECORD_PATH(tableId, recordId),
            data,
          );
          this.logger.debug(`Updated record ${recordId} in ${tableId}`);
          return response.data as NocoRecordResponse;
        } catch (error) {
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
   * Delete a record.
   */
  async delete(tableId: string, recordId: number): Promise<void> {
    return this.trace(
      'nocodb.delete',
      async () => {
        await this.enforceRateLimit();
        try {
          await this.httpClient.delete(
            RECORD_PATH(tableId, recordId),
          );
          this.logger.debug(`Deleted record ${recordId} from ${tableId}`);
        } catch (error) {
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
   * List records with filtering, sorting, and pagination.
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
          if (options?.sort) params.sort = options.sort;
          if (options?.fields) params.fields = options.fields.join(',');
          if (options?.limit !== undefined)
            params.limit = String(options.limit);
          if (options?.offset !== undefined)
            params.offset = String(options.offset);
          if (options?.includeRelations) {
            params.nested = JSON.stringify(
              buildNestedParams(options.includeRelations),
            );
          }
          const response = await this.httpClient.get(
            RECORDS_PATH(tableId),
            { params },
          );
          this.logger.debug(
            `Listed ${(response.data as NocoRecordListResponse).list?.length || 0} records from ${tableId}`,
          );
          return response.data as NocoRecordListResponse;
        } catch (error) {
          this.logger.error(`Error listing records from ${tableId}:`, error);
          throw error;
        }
      },
      { 'db.table_id': tableId, 'db.operation': 'list' },
    );
  }

  /**
   * Find a single record by filter.
   */
  async findOne(
    tableId: string,
    where: string,
  ): Promise<NocoRecord | null> {
    const result = await this.list(tableId, { where, limit: 1 });
    return result.list && result.list.length > 0 ? result.list[0] : null;
  }

  /**
   * Check if a record matching the filter exists.
   */
  async exists(tableId: string, where: string): Promise<boolean> {
    return (await this.findOne(tableId, where)) !== null;
  }

  /**
   * Create a record with linked relationships in a single call.
   */
  async createWithLinks(
    tableId: string,
    data: Record<string, unknown>,
    links: LinkDefinition[],
  ): Promise<NocoRecordResponse> {
    const payload: Record<string, unknown> = { ...data };
    for (const link of links) {
      payload[link.fieldName] = link.recordIds.map((id) => ({ id }));
    }
    return this.create(tableId, payload);
  }

  /**
   * Update relationships for an existing record.
   */
  async updateLinks(
    tableId: string,
    recordId: number,
    links: LinkDefinition[],
  ): Promise<NocoRecordResponse> {
    const payload: Record<string, unknown> = {};
    for (const link of links) {
      payload[link.fieldName] = link.recordIds.map((id) => ({ id }));
    }
    return this.update(tableId, recordId, payload);
  }

  /**
   * Get a record with all specified linked relationships.
   */
  async getWithLinks(
    tableId: string,
    recordId: number,
    includeFields: string[],
  ): Promise<NocoRecord | null> {
    return this.read(tableId, recordId, { includeRelations: includeFields });
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
          error:
            error instanceof Error ? error.message : String(error),
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
          error:
            error instanceof Error ? error.message : String(error),
        } as unknown as NocoRecordResponse);
      }
    }
    return results;
  }
}
