import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import {
  NocoPageInfo,
  NocoRecord,
  NocoRecordResponse,
} from '../nocodb/nocodb.types';

export const DEFAULT_PAGE_SIZE = 25;

export interface ListRecordsOptions {
  where?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface RecordList {
  list: NocoRecord[];
  pageInfo: NocoPageInfo;
}

type RecordInput = Record<string, unknown>;

/**
 * Generic record access for user tables. Authorization happens in
 * TablePermissionsGuard; this service only resolves the table and talks to
 * NocoDB.
 */
@Injectable()
export class DataService {
  constructor(private readonly nocoDBService: NocoDBService) {}

  async list(table: string, options: ListRecordsOptions): Promise<RecordList> {
    const tableId = await this.resolveTableId(table);
    const result = await this.nocoDBService.list(tableId, {
      where: options.where,
      sort: options.sort,
      limit: options.limit ?? DEFAULT_PAGE_SIZE,
      offset: options.offset ?? 0,
    });

    return {
      list: result.list ?? [],
      pageInfo: result.pageInfo ?? { totalRows: 0 },
    };
  }

  async read(table: string, id: number): Promise<NocoRecord> {
    const tableId = await this.resolveTableId(table);
    const record = await this.nocoDBService.read(tableId, id);

    if (!record) {
      throw new NotFoundException(`Record ${id} not found in '${table}'`);
    }

    return record;
  }

  async create(table: string, data: RecordInput): Promise<NocoRecordResponse> {
    this.assertRecordInput(data);
    const tableId = await this.resolveTableId(table);
    return this.nocoDBService.create(tableId, data);
  }

  async update(
    table: string,
    id: number,
    data: RecordInput,
  ): Promise<NocoRecordResponse> {
    this.assertRecordInput(data);
    const tableId = await this.resolveTableId(table);
    return this.nocoDBService.update(tableId, id, data);
  }

  async delete(table: string, id: number): Promise<void> {
    const tableId = await this.resolveTableId(table);
    await this.nocoDBService.delete(tableId, id);
  }

  private async resolveTableId(table: string): Promise<string> {
    const meta = await this.nocoDBService.getTableByName(table);

    if (!meta?.id) {
      throw new NotFoundException(`Table '${table}' not found`);
    }

    return String(meta.id);
  }

  private assertRecordInput(data: unknown): asserts data is RecordInput {
    if (
      data === null ||
      typeof data !== 'object' ||
      Array.isArray(data) ||
      Object.keys(data).length === 0
    ) {
      throw new BadRequestException(
        'Request body must be a non-empty JSON object',
      );
    }
  }
}
