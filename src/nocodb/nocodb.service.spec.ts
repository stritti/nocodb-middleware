import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NocoDBService } from './nocodb.service';
import { Logger } from '@nestjs/common';

describe('NocoDBService', () => {
  let service: NocoDBService;
  let configService: ConfigService;
  let mockHttpClient: any;

  beforeEach(async () => {
    mockHttpClient = {
      post: jest.fn(),
      get: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      defaults: { baseURL: 'http://test-url' },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NocoDBService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                'nocodb.apiUrl': 'http://localhost:8080',
                'nocodb.apiToken': 'test-token',
                'nocodb.baseId': 'test-base-id',
                'nocodb.tablePrefix': 'nc_',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<NocoDBService>(NocoDBService);
    configService = module.get<ConfigService>(ConfigService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    await service.onModuleInit();

    // Inject mock HTTP client so tests don't make real HTTP calls
    (service as any).httpClient = mockHttpClient;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize with config', () => {
    expect(configService.get).toHaveBeenCalledWith('nocodb.apiUrl');
    expect(configService.get).toHaveBeenCalledWith('nocodb.apiToken');
  });

  it('should provide a client', () => {
    expect(service.getClient()).toBeDefined();
  });

  it('should return correct base ID', () => {
    expect(service.getBaseId()).toBe('test-base-id');
  });

  it('should return correct table prefix', () => {
    expect(service.getTablePrefix()).toBe('nc_');
  });

  // ── Data API v3 ─────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a record', async () => {
      const tableId = 'mUsers';
      const data = { name: 'Test User' };
      const responseData = { id: 1, ...data };
      mockHttpClient.post.mockResolvedValue({ data: responseData });

      const result = await service.create(tableId, data);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        `/api/v3/tables/${tableId}/records`,
        data,
        { params: {} },
      );
      expect(result).toEqual(responseData);
    });

    it('should include specific fields if requested', async () => {
      const tableId = 'mUsers';
      const data = { name: 'Test User' };
      const options = { includeFields: ['id', 'name'] };
      mockHttpClient.post.mockResolvedValue({ data: { id: 1 } });

      await service.create(tableId, data, options);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        data,
        { params: { fields: 'id,name' } },
      );
    });
  });

  describe('read', () => {
    it('should read a record', async () => {
      const tableId = 'mUsers';
      const recordId = 1;
      const responseData = { id: 1, name: 'Test User' };
      mockHttpClient.get.mockResolvedValue({ data: responseData });

      const result = await service.read(tableId, recordId);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/api/v3/tables/${tableId}/records/${recordId}`,
        { params: {} },
      );
      expect(result).toEqual(responseData);
    });

    it('should include relations if requested', async () => {
      const tableId = 'mUsers';
      const recordId = 1;
      const options = { includeRelations: ['posts'] };
      mockHttpClient.get.mockResolvedValue({ data: {} });

      await service.read(tableId, recordId, options);

      expect(mockHttpClient.get).toHaveBeenCalledWith(expect.any(String), {
        params: {
          nested: JSON.stringify({ posts: { fields: ['*'] } }),
        },
      });
    });
  });

  describe('update', () => {
    it('should update a record', async () => {
      const tableId = 'mUsers';
      const recordId = 1;
      const data = { name: 'Updated' };
      mockHttpClient.patch.mockResolvedValue({ data: { id: 1, ...data } });

      await service.update(tableId, recordId, data);

      expect(mockHttpClient.patch).toHaveBeenCalledWith(
        `/api/v3/tables/${tableId}/records/${recordId}`,
        data,
      );
    });
  });

  describe('delete', () => {
    it('should delete a record', async () => {
      const tableId = 'mUsers';
      const recordId = 1;
      mockHttpClient.delete.mockResolvedValue({});

      await service.delete(tableId, recordId);

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        `/api/v3/tables/${tableId}/records/${recordId}`,
      );
    });
  });

  describe('list', () => {
    it('should list records with options', async () => {
      const tableId = 'mUsers';
      const options = { where: '(name,eq,Test)', limit: 10 };
      const responseData = { list: [], pageInfo: {} };
      mockHttpClient.get.mockResolvedValue({ data: responseData });

      const result = await service.list(tableId, options);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/api/v3/tables/${tableId}/records`,
        {
          params: {
            where: options.where,
            limit: options.limit,
          },
        },
      );
      expect(result).toEqual(responseData);
    });
  });

  describe('Rate Limiting', () => {
    it('should serialize concurrent requests so they never fire simultaneously', async () => {
      jest.useFakeTimers();

      mockHttpClient.post.mockResolvedValue({ data: {} });

      const p1 = service.create('t1', {});
      const p2 = service.create('t1', {});

      // After the first 200 ms interval only the first request should have fired
      await jest.advanceTimersByTimeAsync(200);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);

      // After another 200 ms the second request fires
      await jest.advanceTimersByTimeAsync(200);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);

      await Promise.all([p1, p2]);

      jest.useRealTimers();
    });
  });

  describe('without TelemetryService', () => {
    it('should execute CRUD operations successfully when TelemetryService is not injected', async () => {
      const responseData = { id: 1, name: 'Test' };
      mockHttpClient.post.mockResolvedValue({ data: responseData });
      mockHttpClient.get.mockResolvedValue({ data: responseData });
      mockHttpClient.patch.mockResolvedValue({ data: responseData });
      mockHttpClient.delete.mockResolvedValue({});

      // All CRUD methods delegate to this.trace() which falls back to direct fn() call
      await expect(service.create('t1', { name: 'Test' })).resolves.toEqual(responseData);
      await expect(service.read('t1', 1)).resolves.toEqual(responseData);
      await expect(service.update('t1', 1, { name: 'Updated' })).resolves.toEqual(responseData);
      await expect(service.delete('t1', 1)).resolves.toBeUndefined();
    });
  });

  describe('onModuleInit error handling', () => {
    it('should throw when apiUrl is missing', async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          NocoDBService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                const config: Record<string, string> = {
                  'nocodb.apiToken': 'test-token',
                  'nocodb.baseId': 'test-base-id',
                  'nocodb.tablePrefix': '',
                };
                return config[key];
              }),
            },
          },
        ],
      }).compile();
      const svc = moduleRef.get<NocoDBService>(NocoDBService);
      expect(() => svc.onModuleInit()).toThrow('NocoDB configuration missing');
    });

    it('should throw when baseId is missing', async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          NocoDBService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                const config: Record<string, string | undefined> = {
                  'nocodb.apiUrl': 'http://localhost:8080',
                  'nocodb.apiToken': 'test-token',
                  'nocodb.baseId': undefined,
                  'nocodb.tablePrefix': '',
                };
                return config[key];
              }),
            },
          },
        ],
      }).compile();
      const svc = moduleRef.get<NocoDBService>(NocoDBService);
      expect(() => svc.onModuleInit()).toThrow('NocoDB BASE_ID missing');
    });
  });

  describe('tableExists', () => {
    it('should return true when table exists', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: { list: [{ table_name: 'nc_users' }] },
      });

      const result = await service.tableExists('users');
      expect(result).toBe(true);
    });

    it('should return false when table does not exist', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: { list: [{ table_name: 'nc_orders' }] },
      });

      const result = await service.tableExists('users');
      expect(result).toBe(false);
    });

    it('should throw when HTTP call fails', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));
      await expect(service.tableExists('users')).rejects.toThrow('Network error');
    });
  });

  describe('getTableByName', () => {
    it('should return table when found', async () => {
      const table = { id: 'tbl_1', table_name: 'nc_users' };
      mockHttpClient.get.mockResolvedValue({
        data: { list: [table] },
      });

      const result = await service.getTableByName('users');
      expect(result).toEqual(table);
    });

    it('should return null when table not found', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: { list: [] },
      });
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

      const result = await service.getTableByName('nonexistent');
      expect(result).toBeNull();
    });

    it('should throw when HTTP call fails', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));
      await expect(service.getTableByName('users')).rejects.toThrow('Network error');
    });
  });

  describe('createTable', () => {
    it('should create a table', async () => {
      const tableData = { id: 'tbl_new', table_name: 'nc_items' };
      mockHttpClient.post.mockResolvedValue({ data: tableData });

      const result = await service.createTable('items', 'Items', []);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        `/api/v3/meta/bases/test-base-id/tables`,
        expect.objectContaining({ table_name: 'nc_items' }),
      );
      expect(result).toEqual(tableData);
    });

    it('should throw when createTable fails', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('Create error'));
      await expect(service.createTable('items', 'Items')).rejects.toThrow('Create error');
    });
  });

  describe('createColumn', () => {
    it('should create a column', async () => {
      const colData = { id: 'col_1', column_name: 'email' };
      mockHttpClient.post.mockResolvedValue({ data: colData });

      const result = await service.createColumn('tbl_1', 'email', 'SingleLineText', 'Email');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        `/api/v3/meta/tables/tbl_1/columns`,
        expect.objectContaining({
          column_name: 'email',
          title: 'Email',
          uidt: 'SingleLineText',
        }),
      );
      expect(result).toEqual(colData);
    });

    it('should use column name as title when title not provided', async () => {
      mockHttpClient.post.mockResolvedValue({ data: {} });
      await service.createColumn('tbl_1', 'email', 'SingleLineText');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ title: 'email' }),
      );
    });

    it('should throw when createColumn fails', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('Column error'));
      await expect(
        service.createColumn('tbl_1', 'email', 'SingleLineText'),
      ).rejects.toThrow('Column error');
    });
  });

  describe('findOne', () => {
    it('should return first record from list', async () => {
      const records = [{ id: 1, name: 'Test' }];
      mockHttpClient.get.mockResolvedValue({ data: { list: records } });

      const result = await service.findOne('tbl_1', '(name,eq,Test)');
      expect(result).toEqual(records[0]);
    });

    it('should return null when no records found', async () => {
      mockHttpClient.get.mockResolvedValue({ data: { list: [] } });
      const result = await service.findOne('tbl_1', '(name,eq,NotExist)');
      expect(result).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true when record exists', async () => {
      mockHttpClient.get.mockResolvedValue({ data: { list: [{ id: 1 }] } });
      const result = await service.exists('tbl_1', '(id,eq,1)');
      expect(result).toBe(true);
    });

    it('should return false when record does not exist', async () => {
      mockHttpClient.get.mockResolvedValue({ data: { list: [] } });
      const result = await service.exists('tbl_1', '(id,eq,999)');
      expect(result).toBe(false);
    });
  });

  describe('createWithLinks', () => {
    it('should create a record with linked relationships', async () => {
      const responseData = { id: 1 };
      mockHttpClient.post.mockResolvedValue({ data: responseData });

      const result = await service.createWithLinks(
        'tbl_1',
        { name: 'Test' },
        [{ fieldName: 'tags', recordIds: [10, 20] }],
      );

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ tags: [{ id: 10 }, { id: 20 }] }),
        expect.anything(),
      );
      expect(result).toEqual(responseData);
    });
  });

  describe('updateLinks', () => {
    it('should update relationships for a record', async () => {
      mockHttpClient.patch.mockResolvedValue({ data: { id: 1 } });

      await service.updateLinks(
        'tbl_1',
        1,
        [{ fieldName: 'tags', recordIds: [5] }],
      );

      expect(mockHttpClient.patch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ tags: [{ id: 5 }] }),
      );
    });
  });

  describe('getWithLinks', () => {
    it('should read a record with included relations', async () => {
      const responseData = { id: 1, tags: [] };
      mockHttpClient.get.mockResolvedValue({ data: responseData });

      const result = await service.getWithLinks('tbl_1', 1, ['tags', 'category']);
      expect(result).toEqual(responseData);
    });
  });

  describe('batchCreate', () => {
    it('should create multiple records', async () => {
      mockHttpClient.post.mockResolvedValue({ data: { id: 1 } });

      const results = await service.batchCreate('tbl_1', [
        { name: 'A' },
        { name: 'B' },
      ]);

      expect(results).toHaveLength(2);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });

    it('should include error entries when individual creates fail', async () => {
      const error = new Error('Create failed');
      mockHttpClient.post.mockRejectedValue(error);

      const results = await service.batchCreate('tbl_1', [{ name: 'A' }]);
      expect(results[0]).toHaveProperty('error', 'Create failed');
    });
  });

  describe('batchUpdate', () => {
    it('should update multiple records', async () => {
      mockHttpClient.patch.mockResolvedValue({ data: { id: 1 } });

      const results = await service.batchUpdate('tbl_1', [
        { id: 1, data: { name: 'Updated A' } },
        { id: 2, data: { name: 'Updated B' } },
      ]);

      expect(results).toHaveLength(2);
    });

    it('should include error entries when individual updates fail', async () => {
      const error = new Error('Update failed');
      mockHttpClient.patch.mockRejectedValue(error);

      const results = await service.batchUpdate('tbl_1', [
        { id: 1, data: { name: 'Test' } },
      ]);
      expect(results[0]).toHaveProperty('error', 'Update failed');
      expect(results[0]).toHaveProperty('id', 1);
    });
  });

  describe('list with all options', () => {
    it('should include sort and fields in params', async () => {
      mockHttpClient.get.mockResolvedValue({ data: { list: [] } });

      await service.list('tbl_1', {
        where: '(name,eq,Test)',
        sort: 'name',
        fields: ['id', 'name'],
        limit: 5,
        offset: 10,
        includeRelations: ['tags'],
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            sort: 'name',
            fields: 'id,name',
            limit: 5,
            offset: 10,
          }),
        }),
      );
    });
  });

  describe('read with fields option', () => {
    it('should include fields param when specified', async () => {
      mockHttpClient.get.mockResolvedValue({ data: { id: 1 } });

      await service.read('tbl_1', 1, { fields: ['id', 'name'] });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { fields: 'id,name' },
        }),
      );
    });
  });

  describe('getHttpClient', () => {
    it('should return the http client', () => {
      expect(service.getHttpClient()).toBeDefined();
    });
  });
});
