import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Api } from 'nocodb-sdk';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class NocoDBService implements OnModuleInit {
  private readonly logger = new Logger(NocoDBService.name);
  private client: Api<any>;
  private httpClient: AxiosInstance;
  private readonly baseId: string;
  private readonly tablePrefix: string;

  constructor(private configService: ConfigService) {
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

    // SDK Client for data operations
    this.client = new Api({
      baseURL: apiUrl,
      headers: {
        'xc-auth': apiToken,
      },
    });

    // HTTP Client for Meta API v2 operations
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

  /**
   * Get the NocoDB SDK client for data operations
   */
  getClient(): Api<any> {
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
   * Get the HTTP client for direct API calls
   */
  getHttpClient(): AxiosInstance {
    return this.httpClient;
  }

  /**
   * Add prefix to table name
   * @private
   */
  private getPrefixedTableName(tableName: string): string {
    return `${this.tablePrefix}${tableName}`;
  }

  /**
   * Check if a table exists in the base
   */
  async tableExists(tableName: string): Promise<boolean> {
    const prefixedName = this.getPrefixedTableName(tableName);

    try {
      const tables = await this.fetchTables();
      return tables.some((table) => table.table_name === prefixedName);
    } catch (error) {
      const payload = this.safeErrorPayload(error);
      this.logger.error(
        `Error checking if table ${prefixedName} exists:`,
        payload,
      );
      throw error;
    }
  }

  /**
   * Get table details by name
   */
  async getTableByName(tableName: string): Promise<{
    id: string;
    table_name: string;
    title?: string;
  } | null> {
    const prefixedName = this.getPrefixedTableName(tableName);

    try {
      const tables = await this.fetchTables();
      const table = tables.find((t) => t.table_name === prefixedName) ?? null;

      if (!table) {
        this.logger.warn(`Table ${prefixedName} not found`);
        return null;
      }

      return table;
    } catch (error) {
      const payload = this.safeErrorPayload(error);
      this.logger.error(`Error getting table ${prefixedName}:`, payload);
      throw error;
    }
  }

  /**
   * Create a new table in the base
   */
  async createTable(
    tableName: string,
    title: string,
    columns: Array<Record<string, unknown>> = [],
  ): Promise<unknown> {
    const prefixedName = this.getPrefixedTableName(tableName);
    const prefixedTitle = this.getPrefixedTableName(title);

    try {
      const response = await this.httpClient.post(
        `/api/v2/meta/bases/${this.baseId}/tables`,
        {
          table_name: prefixedName,
          title: prefixedTitle,
          columns: columns,
        },
      );

      this.logger.log(`Table ${prefixedName} created successfully`);
      return response.data;
    } catch (error) {
      const payload = this.safeErrorPayload(error);
      this.logger.error(`Error creating table ${prefixedName}:`, payload);
      throw error;
    }
  }

  /**
   * Create a new column in a table
   */
  async createColumn(
    tableId: string,
    columnName: string,
    columnType: string,
    title?: string,
    additionalOptions?: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      const payload: Record<string, unknown> = {
        column_name: columnName,
        title: title || columnName,
        uidt: columnType, // UI Data Type
        ...additionalOptions,
      };

      const response = await this.httpClient.post(
        `/api/v2/meta/tables/${tableId}/columns`,
        payload,
      );

      this.logger.log(`Column ${columnName} created in table ${tableId}`);
      return response.data;
    } catch (error) {
      const payload = this.safeErrorPayload(error);
      this.logger.error(`Error creating column ${columnName}:`, payload);
      throw error;
    }
  }

  private async fetchTables(): Promise<
    Array<{ id: string; table_name: string; title?: string }>
  > {
    const response = await this.httpClient.get(
      `/api/v2/meta/bases/${this.baseId}/tables`,
    );

    return this.extractTables(response.data);
  }

  private extractTables(data: unknown): Array<{
    id: string;
    table_name: string;
    title?: string;
  }> {
    if (typeof data !== 'object' || data === null) {
      return [];
    }

    const list = (data as { list?: unknown }).list;
    if (!Array.isArray(list)) {
      return [];
    }

    return list
      .map((item) => this.toTableRecord(item))
      .filter(
        (item): item is { id: string; table_name: string; title?: string } =>
          item !== null,
      );
  }

  private toTableRecord(
    item: unknown,
  ): { id: string; table_name: string; title?: string } | null {
    if (
      typeof item === 'object' &&
      item !== null &&
      'id' in item &&
      'table_name' in item
    ) {
      const rawId = (item as { id: unknown }).id;
      const tableName = (item as { table_name: unknown }).table_name;
      if (
        (typeof rawId === 'string' || typeof rawId === 'number') &&
        typeof tableName === 'string'
      ) {
        return {
          id: String(rawId),
          table_name: tableName,
          title:
            'title' in item &&
            typeof (item as { title?: unknown }).title === 'string'
              ? ((item as { title?: unknown }).title as string)
              : undefined,
        };
      }
    }
    return null;
  }

  private safeErrorPayload(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error';
  }
}
