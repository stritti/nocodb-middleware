import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { NocoDBService } from './nocodb.service';
import { NocoDBException } from './exceptions/nocodb.exception';

export interface CreateOptions {
  includeFields?: string[];
  validateOnly?: boolean;
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

type JsonObject = Record<string, unknown>;

interface MetaTableRecord {
  id: string | number;
  table_name: string;
  title: string;
}

/**
 * NocoDB v3 API Service
 * Provides unified CRUD operations with inline relationship support
 * Based on NocoDB v3 API (2025.06.0+)
 */
@Injectable()
export class NocoDBV3Service {
  private readonly logger = new Logger(NocoDBV3Service.name);
  private readonly baseId: string;
  private readonly rateLimit = 5; // requests per second
  private lastRequestTime = 0;

  constructor(private nocoDBService: NocoDBService) {
    this.baseId = this.nocoDBService.getBaseId();
  }

  private get httpClient(): AxiosInstance {
    return this.nocoDBService.getHttpClient();
  }

  /**
   * Rate limiting helper - ensures we don't exceed 5 req/sec
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / this.rateLimit;

    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Create a new record with optional inline relationships
   */
  async create(
    tableId: string,
    data: JsonObject,
    options?: CreateOptions,
  ): Promise<unknown> {
    await this.enforceRateLimit();

    try {
      const url = `/api/v3/data/${this.baseId}/${tableId}/records`;
      const params: Record<string, string> = {};

      if (options?.includeFields) {
        params.fields = options.includeFields.join(',');
      }

      const response = await this.httpClient.post<unknown>(
        url,
        { fields: data },
        { params },
      );

      const firstRecord = this.extractFirstRecord(response.data);
      const result = this.normalizeRecord(firstRecord);

      this.logger.debug(
        `Created record in ${tableId}: ${this.getRecordIdentifier(result)}`,
      );
      return result;
    } catch (error) {
      this.handleDataError(`creating record in ${tableId}`, error);
    }
  }

  /**
   * Read a single record with optional relationship data
   */
  async read(
    tableId: string,
    recordId: number,
    options?: ReadOptions,
  ): Promise<unknown> {
    await this.enforceRateLimit();

    try {
      const url = `/api/v3/data/${this.baseId}/${tableId}/records/${recordId}`;
      const params: Record<string, string> = {};

      if (options?.fields) {
        params.fields = options.fields.join(',');
      }

      if (options?.includeRelations) {
        params.nested = JSON.stringify(
          this.buildNestedRelations(options.includeRelations),
        );
      }

      const response = await this.httpClient.get<unknown>(url, { params });
      const result = this.normalizeRecord(response.data);

      this.logger.debug(`Read record ${recordId} from ${tableId}`);
      return result;
    } catch (error) {
      this.handleDataError(`reading record ${recordId} from ${tableId}`, error);
    }
  }

  /**
   * Update a record with optional relationship updates
   */
  async update(
    tableId: string,
    recordId: number,
    data: JsonObject,
  ): Promise<unknown> {
    await this.enforceRateLimit();

    try {
      const url = `/api/v3/data/${this.baseId}/${tableId}/records/${recordId}`;
      const response = await this.httpClient.patch<unknown>(
        url,
        {
          fields: data,
        },
        {},
      );
      const result = this.normalizeRecord(response.data);

      this.logger.debug(`Updated record ${recordId} in ${tableId}`);
      return result;
    } catch (error) {
      this.handleDataError(`updating record ${recordId} in ${tableId}`, error);
    }
  }

  /**
   * Delete a record
   */
  async delete(tableId: string, recordId: number): Promise<void> {
    await this.enforceRateLimit();

    try {
      const url = `/api/v3/data/${this.baseId}/${tableId}/records/${recordId}`;
      await this.httpClient.delete(url);
      this.logger.debug(`Deleted record ${recordId} from ${tableId}`);
    } catch (error) {
      this.handleDataError(
        `deleting record ${recordId} from ${tableId}`,
        error,
      );
    }
  }

  /**
   * List records with filtering, sorting, and pagination
   */
  async list(tableId: string, options?: FilterOptions): Promise<JsonObject> {
    await this.enforceRateLimit();

    try {
      const url = `/api/v3/data/${this.baseId}/${tableId}/records`;
      const params: Record<string, string | number> = {};

      if (options?.where) {
        params.where = options.where;
      }

      if (options?.sort) {
        params.sort = options.sort;
      }

      if (options?.fields) {
        params.fields = options.fields.join(',');
      }

      if (options?.limit !== undefined) {
        params.limit = options.limit;
      }

      if (options?.offset !== undefined) {
        params.offset = options.offset;
      }

      if (options?.includeRelations) {
        params.nested = JSON.stringify(
          this.buildNestedRelations(options.includeRelations),
        );
      }

      const response = await this.httpClient.get<unknown>(url, { params });
      const responseObject = this.toObject(response.data);
      const flattenedList = this.extractList(response.data).map((item) =>
        this.normalizeRecord(item),
      );

      this.logger.debug(
        `Listed ${flattenedList.length} records from ${tableId}`,
      );

      return {
        ...responseObject,
        list: flattenedList,
      };
    } catch (error) {
      this.handleDataError(`listing records from ${tableId}`, error);
    }
  }

  /**
   * Create a record with linked relationships in a single call
   */
  async createWithLinks(
    tableId: string,
    data: JsonObject,
    links: LinkDefinition[],
  ): Promise<unknown> {
    const payload: JsonObject = { ...data };

    for (const link of links) {
      payload[link.fieldName] = link.recordIds.map((id) => ({ id }));
    }

    return this.create(tableId, payload);
  }

  /**
   * Update relationships for an existing record
   */
  async updateLinks(
    tableId: string,
    recordId: number,
    links: LinkDefinition[],
  ): Promise<unknown> {
    const payload: JsonObject = {};

    for (const link of links) {
      payload[link.fieldName] = link.recordIds.map((id) => ({ id }));
    }

    return this.update(tableId, recordId, payload);
  }

  /**
   * Get a record with all specified linked relationships
   */
  async getWithLinks(
    tableId: string,
    recordId: number,
    includeFields: string[],
  ): Promise<unknown> {
    return this.read(tableId, recordId, { includeRelations: includeFields });
  }

  /**
   * Batch create multiple records
   */
  async batchCreate(
    tableId: string,
    records: JsonObject[],
  ): Promise<unknown[]> {
    const results: unknown[] = [];

    for (const record of records) {
      try {
        const result = await this.create(tableId, record);
        results.push(result);
      } catch (error) {
        this.logger.error('Error in batch create for record:', error);
        results.push({ error: this.errorMessage(error) });
      }
    }

    return results;
  }

  /**
   * Batch update multiple records
   */
  async batchUpdate(
    tableId: string,
    updates: Array<{ id: number; data: JsonObject }>,
  ): Promise<unknown[]> {
    const results: unknown[] = [];

    for (const update of updates) {
      try {
        const result = await this.update(tableId, update.id, update.data);
        results.push(result);
      } catch (error) {
        this.logger.error(
          `Error in batch update for record ${update.id}:`,
          error,
        );
        results.push({ id: update.id, error: this.errorMessage(error) });
      }
    }

    return results;
  }

  /**
   * Find a single record by filter
   */
  async findOne(tableId: string, where: string): Promise<unknown> {
    const result = await this.list(tableId, { where, limit: 1 });
    const list = this.extractList(result);
    return list.length > 0 ? list[0] : null;
  }

  /**
   * Check if a record exists
   */
  async exists(tableId: string, where: string): Promise<boolean> {
    const result = await this.findOne(tableId, where);
    return result !== null;
  }

  // ============ Meta API V3 Methods ============

  /**
   * Create a new table using Meta API V3
   */
  async createTableV3(
    baseId: string,
    data: { table_name: string; title: string; fields: JsonObject[] },
  ): Promise<unknown> {
    await this.enforceRateLimit();
    try {
      const url = `/api/v3/meta/bases/${baseId}/tables`;
      const response = await this.httpClient.post<unknown>(url, data);
      this.logger.log(
        `Table ${data.table_name} created successfully (V3 Meta)`,
      );
      return response.data;
    } catch (error) {
      this.handleMetaError(`creating table ${data.table_name}`, error);
    }
  }

  /**
   * Create a new column using Meta API V2 (more stable for relationships)
   */
  async createColumnV3(tableId: string, data: JsonObject): Promise<unknown> {
    await this.enforceRateLimit();
    try {
      const url = `/api/v2/meta/tables/${tableId}/columns`;
      const payload: JsonObject = { ...data };

      if (!payload.uidt && typeof payload.type === 'string') {
        payload.uidt = payload.type;
      }

      const response = await this.httpClient.post<unknown>(url, payload);
      this.logger.log(
        `Column ${this.getColumnLabel(payload)} created (V2 Meta)`,
      );
      return response.data;
    } catch (error) {
      this.handleMetaError('creating column', error);
    }
  }

  async listTablesMetaV3(baseId: string): Promise<MetaTableRecord[]> {
    await this.enforceRateLimit();
    try {
      const response = await this.httpClient.get<unknown>(
        `/api/v3/meta/bases/${baseId}/tables`,
      );
      const tablesSource = this.extractTablesSource(response.data);

      return tablesSource
        .map((table) => this.toMetaTableRecord(table))
        .filter((table): table is MetaTableRecord => table !== null);
    } catch (error) {
      this.handleMetaError('listing tables', error);
    }
  }

  private normalizeRecord(record: unknown): unknown {
    if (!this.isObject(record)) {
      return record;
    }

    const fields = this.asObject(record.fields);

    if (!fields) {
      return record;
    }

    const normalized: JsonObject = { ...fields };
    if (record.id !== undefined) {
      normalized.id = record.id;
    }

    return normalized;
  }

  private handleDataError(operation: string, error: unknown): never {
    const payload = this.extractErrorPayload(error);
    this.logger.error(`Error ${operation}:`, payload.payload);
    throw this.toNocoDBException(payload.payload, payload.status);
  }

  private handleMetaError(operation: string, error: unknown): never {
    const payload = this.extractErrorPayload(error);
    this.logger.error(
      `Error ${operation}:`,
      JSON.stringify(payload.payload, null, 2),
    );
    throw this.toNocoDBException(payload.payload, payload.status);
  }

  private toNocoDBException(
    payload: unknown,
    status?: number,
  ): NocoDBException {
    const message =
      typeof payload === 'string'
        ? payload
        : (this.asObject(payload)?.message?.toString() ??
          'NocoDB request failed');

    switch (status) {
      case 400:
        return new NocoDBException(message, HttpStatus.BAD_REQUEST);
      case 401:
        return NocoDBException.unauthorized(message);
      case 404:
        return new NocoDBException(message, HttpStatus.NOT_FOUND);
      case 429:
        return new NocoDBException(message, HttpStatus.TOO_MANY_REQUESTS);
      default:
        return new NocoDBException(message, HttpStatus.BAD_GATEWAY);
    }
  }

  private toObject(value: unknown): JsonObject {
    return this.isObject(value) ? value : {};
  }

  private asObject(value: unknown): JsonObject | null {
    return this.isObject(value) ? value : null;
  }

  private isObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null;
  }

  private buildNestedRelations(
    fields: string[],
  ): Record<string, { fields: string[] }> {
    return fields.reduce<Record<string, { fields: string[] }>>((acc, field) => {
      acc[field] = { fields: ['*'] };
      return acc;
    }, {});
  }

  private extractFirstRecord(data: unknown): unknown {
    if (!this.isObject(data)) {
      return data;
    }

    const records = data.records;
    if (Array.isArray(records) && records.length > 0) {
      return records[0];
    }

    return data;
  }

  private extractList(data: unknown): unknown[] {
    if (!this.isObject(data)) {
      return [];
    }

    const list = data.list;
    return Array.isArray(list) ? list : [];
  }

  private extractTablesSource(data: unknown): unknown[] {
    if (!this.isObject(data)) {
      return [];
    }

    const list = data.list;
    if (Array.isArray(list)) {
      return list;
    }

    const tables = data.tables;
    return Array.isArray(tables) ? tables : [];
  }

  private toMetaTableRecord(table: unknown): MetaTableRecord | null {
    if (!this.isObject(table)) {
      return null;
    }

    const id = table.id ?? table.Id;
    if (typeof id !== 'string' && typeof id !== 'number') {
      return null;
    }

    if (
      typeof table.table_name !== 'string' ||
      typeof table.title !== 'string'
    ) {
      return null;
    }

    return {
      id,
      table_name: table.table_name,
      title: table.title,
    };
  }

  private getRecordIdentifier(record: unknown): string {
    if (!this.isObject(record)) {
      return 'unknown';
    }

    const identifier = record.id ?? record.Id;

    if (typeof identifier === 'string' || typeof identifier === 'number') {
      return String(identifier);
    }

    return 'unknown';
  }

  private getColumnLabel(payload: JsonObject): string {
    if (typeof payload.column_name === 'string') {
      return payload.column_name;
    }

    if (typeof payload.title === 'string') {
      return payload.title;
    }

    return 'unknown';
  }

  private extractErrorPayload(error: unknown): {
    payload: unknown;
    status?: number;
  } {
    if (!this.isObject(error)) {
      return { payload: 'Unknown error' };
    }

    const response = this.asObject(error.response);
    if (!response) {
      return {
        payload: error.message ?? 'Unknown error',
      };
    }

    const status =
      typeof response.status === 'number' ? response.status : undefined;
    return {
      payload: response.data ?? error.message ?? 'Unknown error',
      status,
    };
  }

  private errorMessage(error: unknown): string {
    if (!this.isObject(error)) {
      return 'Unknown error';
    }

    const message = error.message;
    return typeof message === 'string' ? message : 'Unknown error';
  }
}
