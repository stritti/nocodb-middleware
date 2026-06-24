import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

@Injectable()
export class NocoDBService {
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly dbName: string;

  constructor() {
    this.baseUrl = process.env.NOCODB_BASE_URL || 'http://localhost:8080';
    this.apiKey = process.env.NOCODB_API_KEY || '';
    this.dbName = process.env.EXAMPLE_DB_NAME || 'example_books_db';

    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/v1/db/data/noco`,
      headers: {
        'xc-auth': this.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get all records from a table
   */
  async findAll(table: string, options: {
    where?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  } = {}): Promise<any[]> {
    try {
      const params: Record<string, any> = {};
      
      if (options.where) {
        params.where = options.where;
      }
      if (options.limit) {
        params.limit = options.limit;
      }
      if (options.offset) {
        params.offset = options.offset;
      }
      if (options.sortBy) {
        params.sort = options.sortBy;
        if (options.sortOrder) {
          params.sort += ` ${options.sortOrder}`;
        }
      }

      const response = await this.client.get(`/${this.dbName}/tables/${table}/records`, { params });
      return response.data.list || [];
    } catch (error) {
      console.error(`Error fetching records from ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Get a single record by ID
   */
  async findOne(table: string, id: number): Promise<any> {
    try {
      const response = await this.client.get(`/${this.dbName}/tables/${table}/records/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching record ${id} from ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Create a new record
   */
  async create(table: string, data: Record<string, any>): Promise<any> {
    try {
      const response = await this.client.post(`/${this.dbName}/tables/${table}/records`, data);
      return response.data;
    } catch (error) {
      console.error(`Error creating record in ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Update a record by ID
   */
  async update(table: string, id: number, data: Record<string, any>): Promise<any> {
    try {
      const response = await this.client.patch(`/${this.dbName}/tables/${table}/records/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating record ${id} in ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(table: string, id: number): Promise<void> {
    try {
      await this.client.delete(`/${this.dbName}/tables/${table}/records/${id}`);
    } catch (error) {
      console.error(`Error deleting record ${id} from ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Execute a custom SQL query
   */
  async query(sql: string): Promise<any[]> {
    try {
      const response = await this.client.post(`/${this.dbName}/sql`, { query: sql });
      return response.data.list || [];
    } catch (error) {
      console.error(`Error executing query:`, error.message);
      throw error;
    }
  }

  /**
   * Get table schema
   */
  async getTableSchema(table: string): Promise<any> {
    try {
      const response = await this.client.get(`/${this.dbName}/tables/${table}/schema`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching schema for ${table}:`, error.message);
      throw error;
    }
  }

  /**
   * Count records in a table
   */
  async count(table: string, where?: string): Promise<number> {
    try {
      const params: Record<string, any> = {};
      if (where) {
        params.where = where;
      }
      
      const response = await this.client.get(`/${this.dbName}/tables/${table}/records/count`, { params });
      return response.data.count || 0;
    } catch (error) {
      console.error(`Error counting records in ${table}:`, error.message);
      throw error;
    }
  }
}
