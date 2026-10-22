import { AxiosInstance } from 'axios';
import { normaliseError } from '../http-client.js';

/** Paging information returned with a record list. */
export interface PageInfo {
  totalRows: number;
  page?: number;
  pageSize?: number;
}

/** A page of records as returned by GET /data/:table. */
export interface RecordList<T> {
  list: T[];
  pageInfo: PageInfo;
}

/** Query options for {@link RecordsService.list}. */
export interface ListOptions {
  /** NocoDB filter expression, e.g. `(Name,eq,Alice)`. */
  where?: string;
  /** Sort fields, prefix with `-` for descending, e.g. `-CreatedAt`. */
  sort?: string;
  /** Page size, 1–100 (server default 25). */
  limit?: number;
  /** Number of records to skip. */
  offset?: number;
}

/**
 * CRUD access to NocoDB tables through the Middleware's data API
 * (`/data/:table`). Access is authorized per table and action on the server;
 * missing permissions surface as a `MiddlewareError` with status 403.
 */
export class RecordsService {
  constructor(private readonly http: AxiosInstance) {}

  /** List records of a table. */
  async list<T = Record<string, unknown>>(
    table: string,
    options: ListOptions = {},
  ): Promise<RecordList<T>> {
    try {
      const response = await this.http.get<RecordList<T>>(path(table), {
        params: options,
      });
      return response.data;
    } catch (error) {
      throw normaliseError(error);
    }
  }

  /** Read a single record. Rejects with status 404 if it does not exist. */
  async read<T = Record<string, unknown>>(
    table: string,
    id: number,
  ): Promise<T> {
    try {
      const response = await this.http.get<T>(path(table, id));
      return response.data;
    } catch (error) {
      throw normaliseError(error);
    }
  }

  /** Create a record and return it. */
  async create<T = Record<string, unknown>>(
    table: string,
    data: Partial<T>,
  ): Promise<T> {
    try {
      const response = await this.http.post<T>(path(table), data);
      return response.data;
    } catch (error) {
      throw normaliseError(error);
    }
  }

  /** Update fields of a record and return it. */
  async update<T = Record<string, unknown>>(
    table: string,
    id: number,
    data: Partial<T>,
  ): Promise<T> {
    try {
      const response = await this.http.patch<T>(path(table, id), data);
      return response.data;
    } catch (error) {
      throw normaliseError(error);
    }
  }

  /** Delete a record. */
  async delete(table: string, id: number): Promise<void> {
    try {
      await this.http.delete(path(table, id));
    } catch (error) {
      throw normaliseError(error);
    }
  }

  /** Return the first record matching `where`, or `null`. */
  async findOne<T = Record<string, unknown>>(
    table: string,
    where: string,
  ): Promise<T | null> {
    const result = await this.list<T>(table, { where, limit: 1 });
    return result.list[0] ?? null;
  }
}

function path(table: string, id?: number): string {
  const base = `/data/${encodeURIComponent(table)}`;
  return id === undefined ? base : `${base}/${encodeURIComponent(String(id))}`;
}
