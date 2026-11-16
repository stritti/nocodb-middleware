import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { NocoDBService, FilterOptions } from '../src/nocodb/nocodb.service';
import { DatabaseInitializationService } from '../src/nocodb/database-initialization.service';
import { NocoRecord } from '../src/nocodb/nocodb.types';

const initialRecords: Record<string, NocoRecord[]> = {
  trees: [
    {
      id: 1,
      Name: 'Eiche',
      Abstract: 'Baumart',
      Description: 'Beschreibung',
      Picture: [
        { SignedUrl: 'https://images.example/oak.jpg', Title: 'Eiche' },
      ],
      InternalNotes: 'not public',
    },
    { id: 2, Name: 'Linde', Picture: [] },
  ],
  locations: [
    {
      id: 1,
      Name: 'Park',
      GeoLocation: '47.74;8.97',
      InternalNotes: 'private',
    },
  ],
  partners: [
    {
      id: 1,
      Name: 'Partner A',
      Type: 'Partner',
      Logo: [{ signedUrl: 'https://images.example/partner.png' }],
      Website: 'https://partner.example',
      Description: 'Partner',
      ContactEmail: 'private@example.com',
    },
    { id: 2, Name: 'Sponsor B', Type: 'Sponsor', Logo: null },
  ],
  inventory: [{ id: 1, Name: 'Spade', Secret: 'private' }],
  api_resources: [
    { id: 1, resource_name: 'tree-info', table_name: 'trees', enabled: true },
    {
      id: 2,
      resource_name: 'locations',
      table_name: 'locations',
      enabled: true,
    },
    {
      id: 3,
      resource_name: 'partner-sponsors',
      table_name: 'partners',
      enabled: true,
    },
    {
      id: 4,
      resource_name: 'inventory',
      table_name: 'inventory',
      enabled: true,
    },
  ],
  api_resource_fields: [
    ...['Name', 'Abstract', 'Description', 'Picture'].map(
      (source_field, index) => ({
        id: index + 1,
        resource_id: 1,
        source_field,
        response_field:
          source_field.charAt(0).toLowerCase() + source_field.slice(1),
        normalization: 'lowerFirstDeep',
        ...(source_field === 'Picture' ? { default_json: '[]' } : {}),
      }),
    ),
    {
      id: 5,
      resource_id: 2,
      source_field: 'Name',
      response_field: 'name',
      normalization: 'none',
    },
    {
      id: 6,
      resource_id: 2,
      source_field: 'GeoLocation',
      response_field: 'geoLocation',
      normalization: 'none',
    },
    ...['Name', 'Type', 'Logo', 'Website', 'Description'].map(
      (source_field, index) => ({
        id: index + 7,
        resource_id: 3,
        source_field,
        response_field:
          source_field.charAt(0).toLowerCase() + source_field.slice(1),
        normalization: 'lowerFirstDeep',
      }),
    ),
    {
      id: 12,
      resource_id: 4,
      source_field: 'Name',
      response_field: 'label',
      normalization: 'none',
    },
  ],
  api_resource_filters: [
    {
      id: 1,
      resource_id: 3,
      query_param: 'type',
      source_field: 'Type',
      required: true,
      allowed_values_json: '["Partner","Sponsor"]',
    },
  ],
  roles: [{ id: 10, role_name: 'anonymous' }],
  table_permissions: ['trees', 'locations', 'partners', 'inventory'].map(
    (table_name, index) => ({
      id: index + 1,
      role_id: 10,
      table_name,
      can_read: true,
    }),
  ),
};
let records = structuredClone(initialRecords);

function matchesWhere(record: NocoRecord, where?: string): boolean {
  if (!where) return true;
  return where.split('~and').every((part) => {
    const match = /^\(([^,]+),eq,(.*)\)$/.exec(part);
    if (!match) return false;
    const [, field, raw] = match;
    const value = raw.startsWith('"') ? (JSON.parse(raw) as unknown) : raw;
    return String(record[field]) === String(value);
  });
}

const nocoDB = {
  list: jest.fn(async (table: string, options: FilterOptions = {}) => {
    const filtered = (records[table] ?? []).filter((record) =>
      matchesWhere(record, options.where),
    );
    const offset = ((options.page ?? 1) - 1) * (options.limit ?? 25);
    return {
      list: filtered.slice(offset, offset + (options.limit ?? 25)),
      pageInfo: { totalRows: filtered.length },
    };
  }),
  read: jest.fn(
    async (table: string, id: number) =>
      records[table]?.find((item) => item.id === id) ?? null,
  ),
  getBaseId: jest.fn().mockReturnValue('test-base'),
  getTablePrefix: jest.fn().mockReturnValue(''),
  getTableByName: jest.fn(async (name: string) =>
    records[name] ? { id: name, title: name } : null,
  ),
  getTableMetadata: jest.fn(async (name: string) => ({
    id: name,
    title: name,
    fields: [
      ...new Set(
        (records[name] ?? []).flatMap((record) => Object.keys(record)),
      ),
    ].map((title) => ({ id: title, title, type: 'SingleLineText' })),
  })),
};

describe('Public application reads (HTTP)', () => {
  let app: INestApplication;
  let clock = Date.now();
  const savedEnv = { ...process.env };

  beforeAll(async () => {
    Object.assign(process.env, {
      NODE_ENV: 'test',
      JWT_SECRET: 'public-read-test-secret',
      AUTH_PROVIDER: 'local',
      LOG_LEVEL: 'silent',
      NOCODB_API_URL: 'http://localhost:8080',
      NOCODB_API_TOKEN: 'test-token',
      NOCODB_BASE_ID: 'test-base',
      CORS_ORIGINS: 'http://localhost:5173',
    });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(NocoDBService)
      .useValue(nocoDB)
      .overrideProvider(DatabaseInitializationService)
      .useValue({ onModuleInit: jest.fn() })
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
  });

  afterAll(async () => {
    await app?.close();
    jest.restoreAllMocks();
    process.env = savedEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    records = structuredClone(initialRecords);
    clock += 31_000;
  });

  it('publishes a new resource using only NocoDB configuration', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/public/inventory')
      .expect(200);
    expect(response.body.data).toEqual([{ id: 1, label: 'Spade' }]);
  });

  it.each(['Tools & Plants', '<Plants>', "Planter's tools"])(
    'preserves the configured filter value %s through the HTTP pipeline',
    async (category) => {
      records.inventory[0].Category = category;
      records.api_resource_filters.push({
        id: 2,
        resource_id: 4,
        query_param: 'category',
        source_field: 'Category',
        required: true,
        allowed_values_json: JSON.stringify([category]),
      });
      const response = await request(app.getHttpServer())
        .get('/api/public/inventory')
        .query({ category })
        .expect(200);
      expect(response.body.data).toEqual([{ id: 1, label: 'Spade' }]);
      expect(nocoDB.list).toHaveBeenCalledWith(
        'inventory',
        expect.objectContaining({ where: `(Category,eq,"${category}")` }),
      );
    },
  );

  it('rejects a renamed system-table identity in otherwise valid resource metadata', async () => {
    const original = nocoDB.getTableMetadata.getMockImplementation()!;
    nocoDB.getTableMetadata.mockImplementation(async (name) => ({
      ...(await original(name)),
      ...(name === 'inventory' ? { table_name: 'api_resource_fields' } : {}),
    }));
    try {
      await request(app.getHttpServer())
        .get('/api/public/inventory')
        .expect(503);
    } finally {
      nocoDB.getTableMetadata.mockImplementation(original);
    }
  });

  it('lists public tree fields and images without authentication', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/public/tree-info?page=1&take=1')
      .expect(200);
    expect(response.body).toEqual({
      data: [
        {
          id: 1,
          name: 'Eiche',
          abstract: 'Baumart',
          description: 'Beschreibung',
          picture: [
            { signedUrl: 'https://images.example/oak.jpg', title: 'Eiche' },
          ],
        },
      ],
      meta: { page: 1, take: 1, total: 2, pageCount: 2 },
    });
    expect(nocoDB.list).toHaveBeenCalledWith(
      'trees',
      expect.objectContaining({
        fields: ['Name', 'Abstract', 'Description', 'Picture'],
        sort: 'id',
        limit: 1,
        page: 1,
        withCount: true,
      }),
    );
  });

  it('forwards page numbers to NocoDB v3', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/public/tree-info?page=2&take=1')
      .expect(200);
    expect(response.body.data).toEqual([{ id: 2, name: 'Linde', picture: [] }]);
    expect(nocoDB.list).toHaveBeenCalledWith(
      'trees',
      expect.objectContaining({ page: 2 }),
    );
  });

  it('returns only public location fields', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/public/locations')
      .expect(200);
    expect(response.body.data).toEqual([
      { id: 1, name: 'Park', geoLocation: '47.74;8.97' },
    ]);
    expect(response.body.meta.take).toBe(25);
  });

  it.each(['Partner', 'Sponsor'])(
    'filters %s entries on the server',
    async (type) => {
      const response = await request(app.getHttpServer())
        .get('/api/public/partner-sponsors')
        .query({ type })
        .expect(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe(type);
      expect(response.body.data[0]).not.toHaveProperty('contactEmail');
      expect(nocoDB.list).toHaveBeenCalledWith(
        'partners',
        expect.objectContaining({ where: `(Type,eq,"${type}")` }),
      );
    },
  );

  it.each(['tree-info', 'locations', 'partner-sponsors'])(
    'reads a %s detail and reports missing records',
    async (resource) => {
      const response = await request(app.getHttpServer())
        .get(`/api/public/${resource}/1`)
        .expect(200);
      expect(response.body.id).toBe(1);
      expect(response.body).not.toHaveProperty('InternalNotes');
      await request(app.getHttpServer())
        .get(`/api/public/${resource}/999`)
        .expect(404);
    },
  );

  it.each([
    '/tree-info?take=51',
    '/tree-info?take=0',
    '/tree-info?page=0',
    '/tree-info?page=1.5',
    '/locations?take=no',
    '/tree-info?fields=Password',
    '/tree-info?table=users',
    '/partner-sponsors',
    '/partner-sponsors?type=Admin',
    '/tree-info/not-a-number',
    '/tree-info/0',
    '/tree-info/-1',
    '/tree-info/9007199254740992',
    '/tree-info/1?fields=InternalNotes',
    '/tree-info?take=1&take=2',
    '/partner-sponsors?type=Partner&type=Sponsor',
    '/tree-info?where=(Name,eq,Eiche)',
  ])(
    'rejects invalid public query %s before reading resource records',
    async (path) => {
      await request(app.getHttpServer()).get(`/api/public${path}`).expect(400);
      expect(
        nocoDB.list.mock.calls.some(([table]) =>
          ['trees', 'locations', 'partners', 'inventory'].includes(table),
        ),
      ).toBe(false);
      expect(nocoDB.read).not.toHaveBeenCalled();
    },
  );

  it('accepts the maximum page size', async () => {
    await request(app.getHttpServer())
      .get('/api/public/locations?take=50')
      .expect(200);
  });

  it('does not expose arbitrary tables or writes', async () => {
    await request(app.getHttpServer()).get('/api/public/users').expect(404);
    await request(app.getHttpServer())
      .post('/api/public/tree-info')
      .send({ Name: 'Injected' })
      .expect(404);
    expect(
      nocoDB.list.mock.calls.some(([table]) =>
        ['trees', 'locations', 'partners', 'inventory'].includes(table),
      ),
    ).toBe(false);
  });

  it('keeps generic table access authenticated', async () => {
    await request(app.getHttpServer()).get('/api/data/trees').expect(401);
  });

  it('allows only the configured frontend origin', async () => {
    const allowed = await request(app.getHttpServer())
      .get('/api/public/locations/1')
      .set('Origin', 'http://localhost:5173')
      .expect(200);
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
    const denied = await request(app.getHttpServer())
      .get('/api/public/locations/1')
      .set('Origin', 'https://unknown.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('does not publish data unless explicitly enabled', async () => {
    records.api_resources[0].enabled = false;
    await request(app.getHttpServer()).get('/api/public/tree-info').expect(404);
  });

  it('fails closed when a public table is not configured, even if a response was cached', async () => {
    await request(app.getHttpServer()).get('/api/public/locations').expect(200);
    delete records.locations;
    clock += 31_000;
    await request(app.getHttpServer()).get('/api/public/locations').expect(503);
  });

  it('revokes cached list and detail access immediately when anonymous read permission is removed', async () => {
    await request(app.getHttpServer()).get('/api/public/inventory').expect(200);
    await request(app.getHttpServer())
      .get('/api/public/inventory/1')
      .expect(200);
    records.table_permissions[3].can_read = false;
    await request(app.getHttpServer()).get('/api/public/inventory').expect(403);
    await request(app.getHttpServer())
      .get('/api/public/inventory/1')
      .expect(403);
  });

  it('prevents HTTP caches from retaining public data and authorization errors', async () => {
    await request(app.getHttpServer())
      .get('/api/public/inventory')
      .expect(200)
      .expect('Cache-Control', 'no-store');
    await request(app.getHttpServer())
      .get('/api/public/inventory/1')
      .expect(200)
      .expect('Cache-Control', 'no-store');
    records.table_permissions[3].can_read = false;
    await request(app.getHttpServer())
      .get('/api/public/inventory')
      .expect(403)
      .expect('Cache-Control', 'no-store');
    await request(app.getHttpServer())
      .get('/api/public/unknown')
      .expect(404)
      .expect('Cache-Control', 'no-store');
    clock += 31_000;
    delete records.api_resources;
    await request(app.getHttpServer())
      .get('/api/public/inventory')
      .expect(503)
      .expect('Cache-Control', 'no-store');
  });

  it.each([undefined, false, 'true', 1])(
    'requires an explicit boolean anonymous grant (%s)',
    async (grant) => {
      records.table_permissions[3].can_read = grant;
      await request(app.getHttpServer())
        .get('/api/public/inventory')
        .expect(403);
    },
  );

  it('does not accept an authorization header instead of an anonymous grant', async () => {
    records.table_permissions = [];
    await request(app.getHttpServer())
      .get('/api/public/inventory')
      .set('Authorization', 'Bearer ignored')
      .expect(403);
  });

  it('requires an existing unambiguous anonymous role', async () => {
    records.roles = [];
    await request(app.getHttpServer()).get('/api/public/inventory').expect(403);
    records.roles = [
      { id: 10, role_name: 'anonymous' },
      { id: 11, role_name: 'anonymous' },
    ];
    await request(app.getHttpServer()).get('/api/public/inventory').expect(503);
  });

  it('does not serve cached data when permission queries fail', async () => {
    await request(app.getHttpServer()).get('/api/public/inventory').expect(200);
    nocoDB.list.mockRejectedValueOnce(new Error('NocoDB unavailable'));
    await request(app.getHttpServer()).get('/api/public/inventory').expect(503);
  });

  it('refreshes field mappings after expiry without reusing the previous projected response', async () => {
    await request(app.getHttpServer()).get('/api/public/inventory').expect(200);
    records.api_resource_fields[11].response_field = 'displayLabel';
    clock += 31_000;
    const response = await request(app.getHttpServer())
      .get('/api/public/inventory')
      .expect(200);
    expect(response.body.data).toEqual([{ id: 1, displayLabel: 'Spade' }]);
  });

  it('does not fall back to an expired snapshot when configuration reload fails', async () => {
    await request(app.getHttpServer()).get('/api/public/inventory').expect(200);
    clock += 31_000;
    nocoDB.list.mockRejectedValueOnce(new Error('NocoDB unavailable'));
    await request(app.getHttpServer()).get('/api/public/inventory').expect(503);
  });

  it('loads resource configuration beyond the first NocoDB page', async () => {
    records.api_resources.unshift(
      ...Array.from({ length: 50 }, (_, index) => ({
        id: index + 100,
        resource_name: `disabled-${index}`,
        enabled: false,
      })),
    );
    const response = await request(app.getHttpServer())
      .get('/api/public/inventory')
      .expect(200);
    expect(response.body.data).toEqual([{ id: 1, label: 'Spade' }]);
    expect(nocoDB.list).toHaveBeenCalledWith(
      'api_resources',
      expect.objectContaining({ page: 2, limit: 50 }),
    );
  });

  it.each([
    'users',
    'roles',
    'user_roles',
    'table_permissions',
    'api_resources',
    'api_resource_fields',
    'api_resource_filters',
  ])(
    'cannot publish internal table %s under a harmless alias',
    async (table) => {
      records.api_resources[3].table_name = table;
      await request(app.getHttpServer())
        .get('/api/public/inventory')
        .expect(503);
      expect(nocoDB.read).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['response_field', 'id'],
    ['response_field', '__proto__'],
    ['response_field', 'constructor'],
    ['response_field', 'nested.key'],
    ['source_field', 'Missing'],
    ['normalization', 'eval'],
    ['default_json', '{broken'],
    ['resource_id', 999],
  ])('rejects invalid field configuration %s=%s', async (key, value) => {
    records.api_resource_fields[11][key] = value;
    await request(app.getHttpServer()).get('/api/public/inventory').expect(503);
  });

  it('rejects duplicate resource names and missing field projections', async () => {
    records.api_resources.push({
      id: 5,
      resource_name: 'inventory',
      table_name: 'inventory',
      enabled: true,
    });
    await request(app.getHttpServer()).get('/api/public/inventory').expect(503);
    records.api_resources.pop();
    records.api_resource_fields = records.api_resource_fields.filter(
      (row) => row.resource_id !== 4,
    );
    await request(app.getHttpServer()).get('/api/public/inventory').expect(503);
  });

  it.each([
    '[]',
    'not json',
    '["Partner",eq,anything"]',
    '[1]',
    '[" Partner"]',
  ])('rejects unsafe filter configuration %s', async (values) => {
    records.api_resource_filters[0].allowed_values_json = values;
    await request(app.getHttpServer())
      .get('/api/public/partner-sponsors?type=Partner')
      .expect(503);
  });
});
