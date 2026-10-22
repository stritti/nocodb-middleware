import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isAxiosError } from 'axios';
import { NocoDBService } from '../nocodb/nocodb.service';
import {
  NocoFieldMeta,
  NocoPageInfo,
  NocoRecord,
  NocoRecordResponse,
} from '../nocodb/nocodb.types';

export const DEFAULT_PAGE_SIZE = 25;
export const TABLE_CACHE_TTL_MS = 60_000;

/**
 * Field types whose values NocoDB computes or manages itself. Links are
 * maintained through the link endpoints of the v3 API, not through `fields`.
 */
const READ_ONLY_FIELD_TYPES: ReadonlySet<string> = new Set([
  'ID',
  'AutoNumber',
  'Formula',
  'Rollup',
  'Lookup',
  'Links',
  'LinkToAnotherRecord',
  'CreatedTime',
  'LastModifiedTime',
  'CreatedBy',
  'LastModifiedBy',
  'Barcode',
  'QrCode',
  'Button',
]);

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

interface TableInfo {
  id: string;
  writableFields: ReadonlySet<string>;
  readOnlyFields: ReadonlySet<string>;
  expiresAt: number;
}

/**
 * Generic record access for user tables. Authorization happens in
 * TablePermissionsGuard; this service resolves the table, validates write
 * payloads against the table's fields and talks to NocoDB.
 */
@Injectable()
export class DataService {
  /** Table name → id and fields; avoids a Meta API round trip per request. */
  private readonly tables = new Map<string, TableInfo>();

  constructor(private readonly nocoDBService: NocoDBService) {}

  async list(table: string, options: ListRecordsOptions): Promise<RecordList> {
    const { id } = await this.getTable(table);
    const offset = options.offset ?? 0;
    const result = await this.nocoDBService.list(id, {
      where: options.where,
      sort: options.sort,
      limit: options.limit ?? DEFAULT_PAGE_SIZE,
      offset,
      withCount: true,
    });
    const list = result.list ?? [];

    return {
      list,
      // without a count, the rows up to this page are a lower bound
      pageInfo: result.pageInfo ?? { totalRows: offset + list.length },
    };
  }

  async read(table: string, id: number): Promise<NocoRecord> {
    const info = await this.getTable(table);
    const record = await this.nocoDBService.read(info.id, id);

    if (!record) {
      throw new NotFoundException(`Record ${id} not found in '${table}'`);
    }

    return record;
  }

  async create(table: string, data: RecordInput): Promise<NocoRecordResponse> {
    assertRecordInput(data);
    const info = await this.getTable(table);
    assertWritableFields(info, data);
    return this.withUpstreamValidation(() =>
      this.nocoDBService.create(info.id, data),
    );
  }

  async update(
    table: string,
    id: number,
    data: RecordInput,
  ): Promise<NocoRecordResponse> {
    assertRecordInput(data);
    const info = await this.getTable(table);
    assertWritableFields(info, data);
    return this.withUpstreamValidation(() =>
      this.nocoDBService.update(info.id, id, data),
    );
  }

  async delete(table: string, id: number): Promise<void> {
    const info = await this.getTable(table);
    await this.nocoDBService.delete(info.id, id);
  }

  private async getTable(table: string): Promise<TableInfo> {
    const cached = this.tables.get(table);
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }

    const meta = await this.nocoDBService.getTableByName(table);
    if (!meta?.id) {
      this.tables.delete(table);
      throw new NotFoundException(`Table '${table}' not found`);
    }

    const tableId = String(meta.id);
    const { fields = [] } = await this.nocoDBService.getTableMetadata(tableId);
    const info: TableInfo = {
      id: tableId,
      writableFields: fieldTitles(fields, (f) => !isReadOnly(f)),
      readOnlyFields: fieldTitles(fields, isReadOnly),
      expiresAt: Date.now() + TABLE_CACHE_TTL_MS,
    };
    this.tables.set(table, info);
    return info;
  }

  /** NocoDB rejects invalid values with 400/422; report them as 400. */
  private async withUpstreamValidation<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 400 || status === 422) {
        throw new BadRequestException('NocoDB rejected the record values');
      }
      throw error;
    }
  }
}

function isReadOnly(field: NocoFieldMeta): boolean {
  return READ_ONLY_FIELD_TYPES.has(field.type);
}

function fieldTitles(
  fields: NocoFieldMeta[],
  predicate: (field: NocoFieldMeta) => boolean,
): ReadonlySet<string> {
  return new Set(fields.filter(predicate).map((f) => f.title));
}

function assertRecordInput(data: unknown): asserts data is RecordInput {
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

/**
 * Only fields that exist in the table and are not managed by NocoDB may be
 * written. `id` is the record key of the flattened v3 records.
 */
function assertWritableFields(info: TableInfo, data: RecordInput): void {
  const keys = Object.keys(data);

  const readOnly = keys.filter(
    (key) => key === 'id' || info.readOnlyFields.has(key),
  );
  if (readOnly.length > 0) {
    throw new BadRequestException(`Read-only fields: ${readOnly.join(', ')}`);
  }

  const unknown = keys.filter((key) => !info.writableFields.has(key));
  if (unknown.length > 0) {
    throw new BadRequestException(`Unknown fields: ${unknown.join(', ')}`);
  }
}
