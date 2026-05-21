import { AxiosInstance } from 'axios';
import { normaliseError } from '../http-client';
import {
  ListOptions,
  PaginatedResult,
  ReadOptions,
} from '../types';

/**
 * Provides record CRUD and filter operations for any NocoDB table exposed
 * through the Middleware.
 */
export class RecordsService {
  constructor(private readonly http: AxiosInstance) {}

  /**
   * List records from a table with optional filtering, sorting, and pagination.
   */
  async list<T = Record<string, unknown>>(
    tableId: string,
    options?: ListOptions,
  ): Promise<PaginatedResult<T>> {
    try {
      const params: Record<string, unknown> = {};
      if (options?.where) params['where'] = options.where;
      if (options?.sort) params['sort'] = options.sort;
      if (options?.fields) params['fields'] = options.fields;
      if (options?.limit !== undefined) params['limit'] = options.limit;
      if (options?.offset !== undefined) params['offset'] = options.offset;

      const response = await this.http.get<PaginatedResult<T>>(
        `/api/v1/db/data/${tableId}`,
        { params },
      );
      return response.data;
    } catch (error) {
      throw normaliseError(error);
    }
  }

  /**
   * Read a single record by its numeric ID.
   */
  async read<T = Record<string, unknown>>(
    tableId: string,
    recordId: number,
    options?: ReadOptions,
  ): Promise<T> {
    try {
      const params: Record<string, unknown> = {};
      if (options?.fields) params['fields'] = options.fields;

      const response = await this.http.get<T>(
        `/api/v1/db/data/${tableId}/${recordId}`,
        { params },
      );
      return response.data;
    } catch (error) {
      throw normaliseError(error);
    }
  }

  /**
   * Create a new record in a table.
   */
  async create<T = Record<string, unknown>>(
    tableId: string,
    data: Record<string, unknown>,
  ): Promise<T> {
    try {
      const response = await this.http.post<T>(
        `/api/v1/db/data/${tableId}`,
        data,
      );
      return response.data;
    } catch (error) {
      throw normaliseError(error);
    }
  }

  /**
   * Update an existing record.
   */
  async update<T = Record<string, unknown>>(
    tableId: string,
    recordId: number,
    data: Record<string, unknown>,
  ): Promise<T> {
    try {
      const response = await this.http.patch<T>(
        `/api/v1/db/data/${tableId}/${recordId}`,
        data,
      );
      return response.data;
    } catch (error) {
      throw normaliseError(error);
    }
  }

  /**
   * Delete a record by ID.
   */
  async delete(tableId: string, recordId: number): Promise<void> {
    try {
      await this.http.delete(`/api/v1/db/data/${tableId}/${recordId}`);
    } catch (error) {
      throw normaliseError(error);
    }
  }

  /**
   * Convenience wrapper that returns the first record matching a NocoDB filter,
   * or `null` if none is found.
   */
  async findOne<T = Record<string, unknown>>(
    tableId: string,
    where: string,
  ): Promise<T | null> {
    const result = await this.list<T>(tableId, { where, limit: 1 });
    return result.list.length > 0 ? result.list[0] : null;
  }
}
