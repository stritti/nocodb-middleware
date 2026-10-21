import { Logger } from '@nestjs/common';
import {
  DatabaseInitializationService,
  SYSTEM_TABLES,
} from './database-initialization.service';
import { NocoDBService } from './nocodb.service';
import { NocoFieldDefinition, NocoRecord } from './nocodb.types';

interface FakeTable {
  id: string;
  title: string;
  fields: NocoFieldDefinition[];
  records: NocoRecord[];
}

/** Minimal in-memory stand-in for the parts of NocoDBService used here. */
function createFakeNocoDB(existing: FakeTable[] = []) {
  const tables = new Map(existing.map((t) => [t.title, t]));
  const byId = () => new Map([...tables.values()].map((t) => [t.id, t]));
  let nextId = 100;

  const matches = (record: NocoRecord, where: string) =>
    [...where.matchAll(/\((\w+),eq,"?([^")]*)"?\)/g)].every(
      ([, field, value]) => String(record[field]) === value,
    );

  const fake = {
    getTablePrefix: jest.fn(() => ''),
    getTableByName: jest.fn((name: string) =>
      Promise.resolve(tables.get(name) ?? null),
    ),
    getTableMetadata: jest.fn((id: string) => Promise.resolve(byId().get(id)!)),
    createTable: jest.fn(
      (name: string, _title: string, fields: NocoFieldDefinition[]) => {
        const table = { id: `t_${name}`, title: name, fields, records: [] };
        tables.set(name, table);
        return Promise.resolve(table);
      },
    ),
    createColumn: jest.fn((id: string, field: NocoFieldDefinition) => {
      byId().get(id)!.fields.push(field);
      return Promise.resolve({});
    }),
    list: jest.fn((id: string, options: { where?: string }) =>
      Promise.resolve({
        list: byId()
          .get(id)!
          .records.filter((r) => matches(r, options.where ?? '')),
      }),
    ),
    findOne: jest.fn((id: string, where: string) =>
      Promise.resolve(
        byId()
          .get(id)!
          .records.find((r) => matches(r, where)) ?? null,
      ),
    ),
    create: jest.fn((id: string, data: Record<string, unknown>) => {
      const record = { id: nextId++, ...data };
      byId().get(id)!.records.push(record);
      return Promise.resolve(record);
    }),
    update: jest.fn((id: string, recordId: number, data: object) => {
      const record = byId()
        .get(id)!
        .records.find((r) => r.id === recordId)!;
      Object.assign(record, data);
      return Promise.resolve(record);
    }),
    tables,
  };
  return fake;
}

function serviceFor(fake: ReturnType<typeof createFakeNocoDB>) {
  return new DatabaseInitializationService(fake as unknown as NocoDBService);
}

describe('DatabaseInitializationService', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates all system tables with their fields', async () => {
    const fake = createFakeNocoDB();

    await serviceFor(fake).onModuleInit();

    for (const definition of SYSTEM_TABLES) {
      const table = fake.tables.get(definition.tableName);
      expect(table?.fields.map((f) => f.title)).toEqual(
        definition.fields.map((f) => f.title),
      );
    }
  });

  it('keys relations by numeric id fields', () => {
    const fieldsOf = (name: string) =>
      SYSTEM_TABLES.find((t) => t.tableName === name)!.fields;

    expect(fieldsOf('user_roles')).toEqual(
      expect.arrayContaining([
        { title: 'user_id', type: 'Number' },
        { title: 'role_id', type: 'Number' },
      ]),
    );
    expect(fieldsOf('table_permissions')).toEqual(
      expect.arrayContaining([{ title: 'role_id', type: 'Number' }]),
    );
  });

  it('adds only the missing fields to an existing table', async () => {
    const fake = createFakeNocoDB([
      {
        id: 't_users',
        title: 'users',
        fields: [{ title: 'username', type: 'SingleLineText' }],
        records: [],
      },
    ]);

    await serviceFor(fake).onModuleInit();

    expect(fake.createTable).not.toHaveBeenCalledWith(
      'users',
      expect.anything(),
      expect.anything(),
    );
    expect(fake.createColumn).not.toHaveBeenCalledWith(
      't_users',
      expect.objectContaining({ title: 'username' }),
    );
    expect(fake.createColumn).toHaveBeenCalledWith(
      't_users',
      expect.objectContaining({ title: 'password_hash' }),
    );
  });

  it('seeds the admin role with full access to the system tables', async () => {
    const fake = createFakeNocoDB();

    await serviceFor(fake).onModuleInit();

    const admin = fake.tables
      .get('roles')!
      .records.find((r) => r.role_name === 'admin')!;
    const permissions = fake.tables.get('table_permissions')!.records;

    expect(permissions.map((p) => p.table_name).sort()).toEqual([
      'roles',
      'table_permissions',
      'user_roles',
      'users',
    ]);
    expect(permissions).toEqual(
      permissions.map(() =>
        expect.objectContaining({
          role_id: admin.id,
          can_create: true,
          can_read: true,
          can_update: true,
          can_delete: true,
        }),
      ),
    );
  });

  it('does not duplicate the seed on restart', async () => {
    const fake = createFakeNocoDB();

    await serviceFor(fake).onModuleInit();
    await serviceFor(fake).onModuleInit();

    expect(fake.tables.get('roles')!.records).toHaveLength(1);
    expect(fake.tables.get('table_permissions')!.records).toHaveLength(4);
    expect(fake.createTable).toHaveBeenCalledTimes(SYSTEM_TABLES.length);
  });

  it('skips seeding when a table cannot be created', async () => {
    const fake = createFakeNocoDB();
    fake.createTable.mockRejectedValueOnce(new Error('NocoDB unavailable'));

    await serviceFor(fake).onModuleInit();

    expect(fake.create).not.toHaveBeenCalled();
  });
});
