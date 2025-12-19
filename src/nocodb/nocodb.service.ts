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
            const response = await this.httpClient.get(
                `/api/v2/meta/bases/${this.baseId}/tables`,
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
     * Get table details by name
     */
    async getTableByName(tableName: string): Promise<any> {
        const prefixedName = this.getPrefixedTableName(tableName);

        try {
            const response = await this.httpClient.get(
                `/api/v2/meta/bases/${this.baseId}/tables`,
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
     * Create a new table in the base
     */
    async createTable(tableName: string, title: string, columns: any[] = []) {
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
            this.logger.error(`Error creating table ${prefixedName}:`, error);
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
        additionalOptions?: any,
    ): Promise<any> {
        try {
            const payload = {
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
            this.logger.error(`Error creating column ${columnName}:`, error);
            throw error;
        }
    }
}
