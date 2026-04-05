import { Injectable, OnModuleInit, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Api } from 'nocodb-sdk';
import axios, { AxiosInstance } from 'axios';
import { TelemetryService } from '../tracing/telemetry.service';

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
  private client: Api<any>;
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

    if (this.tablePrefix) {
      this.logger.log(
        `NocoDB Service initialized with table prefix: "${this.tablePrefix}"`,
      );
    }
    this.logger.log(`NocoDB Service initialized with URL: ${apiUrl}`);
  }

  // ── Accessor helpers ──────────────────────────────────────────────────────

  getClient(): Api<any> {
    return this.client;
  }

  getBaseId(): string {
    return this.baseId;
  }

  getTablePrefix(): string {
    return this.tablePrefix;
  }

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
      const response = await this.httpClient.get(
        `/api/v3/meta/bases/${this.baseId}/tables`,
      );
      const tables = response.data.list || [];
      return tables.some((table: any) => table.table_name === prefixedName);
    } catch (error) {
      this.logger.error(
        `Error checking if table ${prefixedName} exists:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get table details by name.
   */
  async getTableByName(tableName: string): Promise<any> {
    const prefixedName = this.getPrefixedTableName(tableName);
    try {
      const response = await this.httpClient.get(
        `/api/v3/meta/bases/${this.baseId}/tables`,
      );
      const tables = response.data.list || [];
      const table = tables.find((t: any) => t.table_name === prefixedName);
      if (!table) {
        this.logger.warn(`Table ${prefixedName} not found`);
        return null;
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
  async createTable(tableName: string, title: string, columns: any[] = []) {
    const prefixedName = this.getPrefixedTableName(tableName);
    const prefixedTitle = this.getPrefixedTableName(title);
    try {
      const response = await this.httpClient.post(
        `/api/v3/meta/bases/${this.baseId}/tables`,
        {
          table_name: prefixedName,
          title: prefixedTitle,
          columns,
        },
      );
      this.logger.log(`Table ${prefixedName} created successfully`);
      return response.data;
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
    additionalOptions?: any,
  ): Promise<any> {
    try {
      const payload = {
        column_name: columnName,
        title: title || columnName,
        uidt: columnType,
        ...additionalOptions,
      };
      const response = await this.httpClient.post(
        `/api/v3/meta/tables/${tableId}/columns`,
        payload,
      );
      this.logger.log(`Column ${columnName} created in table ${tableId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error creating column ${columnName}:`, error);
      throw error;
    }
  }

  // ── Data API v3 – rate limiting ───────────────────────────────────────────

  private nextAllowedTime = 0;

  private enforceRateLimit(): Promise<void> {
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
    data: any,
    options?: CreateOptions,
  ): Promise<any> {
    return this.trace(
      'nocodb.create',
      async () => {
        await this.enforceRateLimit();
        try {
          const params: any = {};
          if (options?.includeFields) {
            params.fields = options.includeFields.join(',');
          }
          const response = await this.httpClient.post(
            `/api/v3/tables/${tableId}/records`,
            data,
            { params },
          );
          this.logger.debug(
            `Created record in ${tableId}: ${response.data.id}`,
          );
          return response.data;
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
  ): Promise<any> {
    return this.trace(
      'nocodb.read',
      async () => {
        await this.enforceRateLimit();
        try {
          const params: any = {};
          if (options?.fields) {
            params.fields = options.fields.join(',');
          }
          if (options?.includeRelations) {
            params.nested = JSON.stringify(
              options.includeRelations.reduce((acc, field) => {
                acc[field] = { fields: ['*'] };
                return acc;
              }, {} as any),
            );
          }
          const response = await this.httpClient.get(
            `/api/v3/tables/${tableId}/records/${recordId}`,
            { params },
          );
          this.logger.debug(`Read record ${recordId} from ${tableId}`);
          return response.data;
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
  async update(tableId: string, recordId: number, data: any): Promise<any> {
    return this.trace(
      'nocodb.update',
      async () => {
        await this.enforceRateLimit();
        try {
          const response = await this.httpClient.patch(
            `/api/v3/tables/${tableId}/records/${recordId}`,
            data,
          );
          this.logger.debug(`Updated record ${recordId} in ${tableId}`);
          return response.data;
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
            `/api/v3/tables/${tableId}/records/${recordId}`,
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
  async list(tableId: string, options?: FilterOptions): Promise<any> {
    return this.trace(
      'nocodb.list',
      async () => {
        await this.enforceRateLimit();
        try {
          const params: any = {};
          if (options?.where) params.where = options.where;
          if (options?.sort) params.sort = options.sort;
          if (options?.fields) params.fields = options.fields.join(',');
          if (options?.limit !== undefined) params.limit = options.limit;
          if (options?.offset !== undefined) params.offset = options.offset;
          if (options?.includeRelations) {
            params.nested = JSON.stringify(
              options.includeRelations.reduce((acc, field) => {
                acc[field] = { fields: ['*'] };
                return acc;
              }, {} as any),
            );
          }
          const response = await this.httpClient.get(
            `/api/v3/tables/${tableId}/records`,
            { params },
          );
          this.logger.debug(
            `Listed ${response.data.list?.length || 0} records from ${tableId}`,
          );
          return response.data;
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
  async findOne(tableId: string, where: string): Promise<any | null> {
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
    data: any,
    links: LinkDefinition[],
  ): Promise<any> {
    const payload = { ...data };
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
  ): Promise<any> {
    const payload: any = {};
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
  ): Promise<any> {
    return this.read(tableId, recordId, { includeRelations: includeFields });
  }

  /**
   * Batch-create multiple records.
   */
  async batchCreate(tableId: string, records: any[]): Promise<any[]> {
    const results = [];
    for (const record of records) {
      try {
        results.push(await this.create(tableId, record));
      } catch (error) {
        this.logger.error('Error in batch create for record:', error);
        results.push({ error: error.message });
      }
    }
    return results;
  }

  /**
   * Batch-update multiple records.
   */
  async batchUpdate(
    tableId: string,
    updates: Array<{ id: number; data: any }>,
  ): Promise<any[]> {
    const results = [];
    for (const upd of updates) {
      try {
        results.push(await this.update(tableId, upd.id, upd.data));
      } catch (error) {
        this.logger.error(`Error in batch update for record ${upd.id}:`, error);
        results.push({ id: upd.id, error: error.message });
      }
    }
    return results;
  }
}
