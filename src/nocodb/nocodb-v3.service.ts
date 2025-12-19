import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosInstance } from 'axios';
import { NocoDBService } from './nocodb.service';

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

/**
 * NocoDB v3 API Service
 * Provides unified CRUD operations with inline relationship support
 * Based on NocoDB v3 API (2025.06.0+)
 */
@Injectable()
export class NocoDBV3Service {
    private readonly logger = new Logger(NocoDBV3Service.name);
    // private httpClient: AxiosInstance; // Removed to use getter
    private readonly baseId: string;
    private readonly rateLimit = 5; // requests per second
    private lastRequestTime = 0;

    constructor(
        private configService: ConfigService,
        private nocoDBService: NocoDBService,
    ) {
        // this.httpClient = this.nocoDBService.getHttpClient(); // Removed
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
     * @param tableId - Table ID (e.g., 'mUsers')
     * @param data - Record data with inline relationships
     * @param options - Additional options
     */
    async create(
        tableId: string,
        data: any,
        options?: CreateOptions,
    ): Promise<any> {
        await this.enforceRateLimit();

        try {
            const url = `/api/v3/tables/${tableId}/records`;
            const params: any = {};

            if (options?.includeFields) {
                params.fields = options.includeFields.join(',');
            }

            const response = await this.httpClient.post(url, data, { params });

            this.logger.debug(`Created record in ${tableId}: ${response.data.id}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Error creating record in ${tableId}:`, error);
            throw error;
        }
    }

    /**
     * Read a single record with optional relationship data
     * @param tableId - Table ID
     * @param recordId - Record ID
     * @param options - Fields and relations to include
     */
    async read(
        tableId: string,
        recordId: number,
        options?: ReadOptions,
    ): Promise<any> {
        await this.enforceRateLimit();

        try {
            const url = `/api/v3/tables/${tableId}/records/${recordId}`;
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

            const response = await this.httpClient.get(url, { params });

            this.logger.debug(`Read record ${recordId} from ${tableId}`);
            return response.data;
        } catch (error) {
            this.logger.error(
                `Error reading record ${recordId} from ${tableId}:`,
                error,
            );
            throw error;
        }
    }

    /**
     * Update a record with optional relationship updates
     * @param tableId - Table ID
     * @param recordId - Record ID
     * @param data - Updated data with inline relationships
     */
    async update(tableId: string, recordId: number, data: any): Promise<any> {
        await this.enforceRateLimit();

        try {
            const url = `/api/v3/tables/${tableId}/records/${recordId}`;
            const response = await this.httpClient.patch(url, data);

            this.logger.debug(`Updated record ${recordId} in ${tableId}`);
            return response.data;
        } catch (error) {
            this.logger.error(
                `Error updating record ${recordId} in ${tableId}:`,
                error,
            );
            throw error;
        }
    }

    /**
     * Delete a record
     * @param tableId - Table ID
     * @param recordId - Record ID
     */
    async delete(tableId: string, recordId: number): Promise<void> {
        await this.enforceRateLimit();

        try {
            const url = `/api/v3/tables/${tableId}/records/${recordId}`;
            await this.httpClient.delete(url);

            this.logger.debug(`Deleted record ${recordId} from ${tableId}`);
        } catch (error) {
            this.logger.error(
                `Error deleting record ${recordId} from ${tableId}:`,
                error,
            );
            throw error;
        }
    }

    /**
     * List records with filtering, sorting, and pagination
     * @param tableId - Table ID
     * @param options - Filter, sort, pagination options
     */
    async list(tableId: string, options?: FilterOptions): Promise<any> {
        await this.enforceRateLimit();

        try {
            const url = `/api/v3/tables/${tableId}/records`;
            const params: any = {};

            if (options?.where) {
                params.where = options.where;
            }

            if (options?.sort) {
                params.sort = options.sort;
            }

            if (options?.fields) {
                params.fields = options.fields.join(',');
            }

            if (options?.limit) {
                params.limit = options.limit;
            }

            if (options?.offset) {
                params.offset = options.offset;
            }

            if (options?.includeRelations) {
                params.nested = JSON.stringify(
                    options.includeRelations.reduce((acc, field) => {
                        acc[field] = { fields: ['*'] };
                        return acc;
                    }, {} as any),
                );
            }

            const response = await this.httpClient.get(url, { params });

            this.logger.debug(
                `Listed ${response.data.list?.length || 0} records from ${tableId}`,
            );
            return response.data;
        } catch (error) {
            this.logger.error(`Error listing records from ${tableId}:`, error);
            throw error;
        }
    }

    /**
     * Create a record with linked relationships in a single call
     * @param tableId - Table ID
     * @param data - Base record data
     * @param links - Array of link definitions
     */
    async createWithLinks(
        tableId: string,
        data: any,
        links: LinkDefinition[],
    ): Promise<any> {
        const payload = { ...data };

        // Add inline relationships
        for (const link of links) {
            payload[link.fieldName] = link.recordIds.map((id) => ({ id }));
        }

        return this.create(tableId, payload);
    }

    /**
     * Update relationships for an existing record
     * @param tableId - Table ID
     * @param recordId - Record ID
     * @param links - Array of link definitions
     */
    async updateLinks(
        tableId: string,
        recordId: number,
        links: LinkDefinition[],
    ): Promise<any> {
        const payload: any = {};

        // Add inline relationships
        for (const link of links) {
            payload[link.fieldName] = link.recordIds.map((id) => ({ id }));
        }

        return this.update(tableId, recordId, payload);
    }

    /**
     * Get a record with all specified linked relationships
     * @param tableId - Table ID
     * @param recordId - Record ID
     * @param includeFields - Array of relationship field names to include
     */
    async getWithLinks(
        tableId: string,
        recordId: number,
        includeFields: string[],
    ): Promise<any> {
        return this.read(tableId, recordId, { includeRelations: includeFields });
    }

    /**
     * Batch create multiple records
     * @param tableId - Table ID
     * @param records - Array of record data
     */
    async batchCreate(tableId: string, records: any[]): Promise<any[]> {
        const results = [];

        for (const record of records) {
            try {
                const result = await this.create(tableId, record);
                results.push(result);
            } catch (error) {
                this.logger.error(`Error in batch create for record:`, error);
                // Continue with other records
                results.push({ error: error.message });
            }
        }

        return results;
    }

    /**
     * Batch update multiple records
     * @param tableId - Table ID
     * @param updates - Array of {id, data} objects
     */
    async batchUpdate(
        tableId: string,
        updates: Array<{ id: number; data: any }>,
    ): Promise<any[]> {
        const results = [];

        for (const update of updates) {
            try {
                const result = await this.update(tableId, update.id, update.data);
                results.push(result);
            } catch (error) {
                this.logger.error(
                    `Error in batch update for record ${update.id}:`,
                    error,
                );
                results.push({ id: update.id, error: error.message });
            }
        }

        return results;
    }

    /**
     * Find a single record by filter
     * @param tableId - Table ID
     * @param where - Filter condition
     */
    async findOne(tableId: string, where: string): Promise<any | null> {
        const result = await this.list(tableId, { where, limit: 1 });
        return result.list && result.list.length > 0 ? result.list[0] : null;
    }

    /**
     * Check if a record exists
     * @param tableId - Table ID
     * @param where - Filter condition
     */
    async exists(tableId: string, where: string): Promise<boolean> {
        const result = await this.findOne(tableId, where);
        return result !== null;
    }
}
