import { createHash } from 'node:crypto';
import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { NocoRecord } from '../nocodb/nocodb.types';
import { INTERNAL_TABLE_NAMES, isInternalTable } from '../nocodb/system-tables';
import { isValidTableName } from '../common/validation/table-name';
import { filterEq } from '../nocodb/nocodb-filter.util';

export interface ResourceField {
  source: string;
  target: string;
  normalization: 'none' | 'lowerFirstDeep';
  defaultValue?: unknown;
}

export interface ResourceFilter {
  parameter: string;
  source: string;
  required: boolean;
  values: string[];
}

export interface ConfiguredResource {
  tableId: string;
  tableName: string;
  fields: ResourceField[];
  filters: ResourceFilter[];
  version: string;
}

const NAME = /^[a-z][a-z0-9-]{0,62}$/;
const KEY = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

@Injectable()
export class ResourceRegistryService {
  private snapshot?: {
    expiresAt: number;
    resources: Map<string, ConfiguredResource>;
  };
  private loading?: Promise<Map<string, ConfiguredResource>>;

  constructor(private readonly nocoDB: NocoDBService) {}

  async resolve(name: string): Promise<ConfiguredResource> {
    if (!NAME.test(name) || INTERNAL_TABLE_NAMES.has(name))
      throw new NotFoundException();
    if (!this.snapshot || this.snapshot.expiresAt <= Date.now()) {
      this.loading ??= this.load();
      try {
        const resources = await this.loading;
        this.snapshot = { resources, expiresAt: Date.now() + 30_000 };
      } catch {
        this.snapshot = undefined;
        throw new ServiceUnavailableException(
          'Resource configuration is unavailable',
        );
      } finally {
        this.loading = undefined;
      }
    }
    const resource = this.snapshot.resources.get(name);
    if (!resource) throw new NotFoundException();
    return resource;
  }

  private async rows(name: string): Promise<NocoRecord[]> {
    const table = await this.nocoDB.getTableByName(name);
    if (!table) throw new Error('Missing resource configuration table');
    const rows: NocoRecord[] = [];
    for (let page = 1; page <= 200; page += 1) {
      const result = await this.nocoDB.list(table.id, {
        page,
        limit: 50,
        sort: 'id',
      });
      rows.push(...result.list);
      if (result.list.length < 50) return rows;
    }
    throw new Error('Resource configuration exceeds limit');
  }

  private text(value: unknown): string {
    if (
      typeof value !== 'string' ||
      value.length === 0 ||
      value !== value.trim()
    )
      throw new Error('Invalid configuration string');
    return value;
  }

  private numericId(value: unknown): number {
    if (
      (typeof value !== 'number' && typeof value !== 'string') ||
      !/^[1-9]\d*$/.test(String(value))
    )
      throw new Error('Invalid configuration relation');
    const number = Number(value);
    if (!Number.isSafeInteger(number))
      throw new Error('Invalid configuration relation');
    return number;
  }

  private key(value: unknown, reserved: string[]): string {
    const key = this.text(value);
    if (!KEY.test(key) || UNSAFE_KEYS.has(key) || reserved.includes(key))
      throw new Error('Invalid configuration key');
    return key;
  }

  private json(value: unknown): unknown {
    const text = this.text(value);
    if (text.length > 16_384)
      throw new Error('Configuration JSON exceeds limit');
    return JSON.parse(text) as unknown;
  }

  private async load(): Promise<Map<string, ConfiguredResource>> {
    const definitions = await this.rows('api_resources');
    const fieldRows = await this.rows('api_resource_fields');
    const filterRows = await this.rows('api_resource_filters');
    const ids = new Set<number>();
    const names = new Set<string>();
    for (const definition of definitions) {
      const id = this.numericId(definition.id);
      const name = this.text(definition.resource_name);
      if (
        ids.has(id) ||
        names.has(name) ||
        !NAME.test(name) ||
        INTERNAL_TABLE_NAMES.has(name)
      )
        throw new Error('Invalid resource name');
      ids.add(id);
      names.add(name);
    }
    for (const rows of [fieldRows, filterRows]) {
      const rowIds = new Set<number>();
      for (const row of rows) {
        const id = this.numericId(row.id);
        if (rowIds.has(id) || !ids.has(this.numericId(row.resource_id)))
          throw new Error('Invalid resource relation');
        rowIds.add(id);
      }
    }
    const resources = new Map<string, ConfiguredResource>();
    for (const definition of definitions) {
      if (definition.enabled !== true) continue;
      const tableName = this.text(definition.table_name);
      if (!isValidTableName(tableName) || INTERNAL_TABLE_NAMES.has(tableName))
        throw new Error('Invalid resource table');
      const table = await this.nocoDB.getTableByName(tableName);
      const prefix = this.nocoDB.getTablePrefix();
      if (!table || table.title !== `${prefix}${tableName}`)
        throw new Error('Resource target does not match permission table');
      const metadata = await this.nocoDB.getTableMetadata(table.id);
      if (isInternalTable(table, prefix) || isInternalTable(metadata, prefix))
        throw new Error('Internal resource target');
      if (metadata.id !== table.id || metadata.title !== table.title)
        throw new Error('Resource metadata does not match target');
      const sourceNames = new Set(
        (metadata.fields ?? []).map((field) => field.title),
      );
      const sourceField = (value: unknown): string => {
        const source = this.text(value);
        if (!sourceNames.has(source) || !isValidTableName(source))
          throw new Error('Unknown or unsupported resource field');
        return source;
      };
      const fields: ResourceField[] = fieldRows
        .filter((row) => Number(row.resource_id) === Number(definition.id))
        .map((row) => {
          if (
            row.normalization !== 'none' &&
            row.normalization !== 'lowerFirstDeep'
          )
            throw new Error('Invalid normalization');
          return {
            source: sourceField(row.source_field),
            target: this.key(row.response_field, ['id']),
            normalization: row.normalization,
            ...(row.default_json == null || row.default_json === ''
              ? {}
              : { defaultValue: this.json(row.default_json) }),
          };
        });
      if (
        !fields.length ||
        new Set(fields.map((field) => field.target)).size !== fields.length
      )
        throw new Error('Invalid field mapping');
      const filters: ResourceFilter[] = filterRows
        .filter((row) => Number(row.resource_id) === Number(definition.id))
        .map((row) => {
          const source = sourceField(row.source_field);
          const values = this.json(row.allowed_values_json);
          if (
            !Array.isArray(values) ||
            !values.length ||
            values.some((value: unknown) => typeof value !== 'string')
          )
            throw new Error('Invalid filter values');
          const strings = values as string[];
          for (const value of strings) {
            if (value !== value.trim()) throw new Error('Invalid filter value');
            filterEq(source, value);
          }
          if (row.required != null && typeof row.required !== 'boolean')
            throw new Error('Invalid required flag');
          return {
            parameter: this.key(row.query_param, ['page', 'take']),
            source,
            required: row.required === true,
            values: strings,
          };
        });
      if (
        new Set(filters.map((filter) => filter.parameter)).size !==
        filters.length
      )
        throw new Error('Duplicate filters');
      const configured = { tableId: table.id, tableName, fields, filters };
      const version = createHash('sha256')
        .update(JSON.stringify(configured))
        .digest('hex');
      resources.set(String(definition.resource_name), {
        ...configured,
        version,
      });
    }
    return resources;
  }
}
