import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { NocoDBCacheService } from '../nocodb/cache/nocodb-cache.service';
import { NocoRecord } from '../nocodb/nocodb.types';
import { andFilters, filterEq } from '../nocodb/nocodb-filter.util';
import { PermissionsService } from '../permissions/permissions.service';
import {
  ConfiguredResource,
  ResourceRegistryService,
} from './resource-registry.service';
export type PublicRecord = Record<string, unknown>;

export interface PublicPage {
  data: PublicRecord[];
  meta: { page: number; take: number; total: number; pageCount: number };
}

function normalizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeKeys);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key.charAt(0).toLowerCase() + key.slice(1),
        normalizeKeys(nested),
      ]),
    );
  }
  return value;
}

@Injectable()
export class PublicReadService {
  constructor(
    private readonly nocoDB: NocoDBService,
    private readonly registry: ResourceRegistryService,
    private readonly cache: NocoDBCacheService,
    private readonly permissions: PermissionsService,
  ) {}

  private async authorize(resource: ConfiguredResource): Promise<void> {
    let allowed: boolean;
    try {
      allowed = await this.permissions.canAnonymousRead(resource.tableName);
    } catch {
      throw new ServiceUnavailableException(
        'Public permissions are unavailable',
      );
    }
    if (!allowed) throw new ForbiddenException();
  }

  private project(
    resource: ConfiguredResource,
    record: NocoRecord,
  ): PublicRecord {
    const result: PublicRecord = { id: record.id };
    for (const field of resource.fields) {
      const value = record[field.source] ?? field.defaultValue;
      if (value !== undefined)
        result[field.target] =
          field.normalization === 'lowerFirstDeep'
            ? normalizeKeys(value)
            : value;
    }
    return result;
  }

  private integer(value: unknown, fallback: number, max: number): number {
    if (value === undefined) return fallback;
    if (
      typeof value !== 'string' ||
      !/^[1-9]\d*$/.test(value) ||
      !Number.isSafeInteger(Number(value)) ||
      Number(value) > max
    )
      throw new BadRequestException('Invalid pagination');
    return Number(value);
  }

  async list(
    name: string,
    query: Record<string, unknown>,
  ): Promise<PublicPage> {
    const resource = await this.registry.resolve(name);
    const page = this.integer(query.page, 1, Number.MAX_SAFE_INTEGER);
    const take = this.integer(query.take, 25, 50);
    if (
      Object.keys(query).some(
        (key) =>
          key !== 'page' &&
          key !== 'take' &&
          !resource.filters.some((filter) => filter.parameter === key),
      )
    )
      throw new BadRequestException('Unknown query parameter');
    const expressions: string[] = [];
    for (const filter of resource.filters) {
      const value = query[filter.parameter];
      if (value === undefined && !filter.required) continue;
      if (typeof value !== 'string' || !filter.values.includes(value))
        throw new BadRequestException('Invalid resource filter');
      expressions.push(filterEq(filter.source, value));
    }
    const where = expressions.length ? andFilters(...expressions) : undefined;
    await this.authorize(resource);
    const tableId = resource.tableId;
    const key = this.cache.generateKey('public-read:list', {
      name,
      version: resource.version,
      role: 'anonymous',
      tableId,
      page,
      take,
      where,
    });
    const cached = await this.cache.get<PublicPage>(key);
    if (cached) return cached;

    const response = await this.nocoDB.list(tableId, {
      fields: [...new Set(resource.fields.map((field) => field.source))],
      sort: 'id',
      limit: take,
      page,
      withCount: true,
      ...(where ? { where } : {}),
    });
    const total = response.pageInfo?.totalRows ?? response.list.length;
    const result: PublicPage = {
      data: response.list.map((record) => this.project(resource, record)),
      meta: { page, take, total, pageCount: Math.ceil(total / take) },
    };
    await this.cache.set(key, result, 60_000);
    return result;
  }

  async read(
    name: string,
    id: number,
    query: Record<string, unknown> = {},
  ): Promise<PublicRecord> {
    if (!Number.isSafeInteger(id) || id < 1 || Object.keys(query).length)
      throw new BadRequestException('Invalid record query');
    const resource = await this.registry.resolve(name);
    await this.authorize(resource);
    const tableId = resource.tableId;
    const key = this.cache.generateKey('public-read:detail', {
      name,
      version: resource.version,
      role: 'anonymous',
      tableId,
      id,
    });
    const cached = await this.cache.get<PublicRecord>(key);
    if (cached) return cached;

    const record = await this.nocoDB.read(tableId, id, {
      fields: [...new Set(resource.fields.map((field) => field.source))],
    });
    if (!record) throw new NotFoundException('Public record not found');
    const result = this.project(resource, record);
    await this.cache.set(key, result, 60_000);
    return result;
  }
}
