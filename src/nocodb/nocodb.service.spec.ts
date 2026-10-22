import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NocoDBService } from './nocodb.service';
import { Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { NocoDBException } from './exceptions/nocodb.exception';

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

  const DATA = '/api/v3/data/test-base-id/t1';
  const META = '/api/v3/meta/bases/test-base-id';

  function axiosError(status: number) {
    return new AxiosError(
      `Request failed with status code ${status}`,
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      { status, data: {} } as never,
    );
  }

  describe('create', () => {
    it('wraps the data in fields and returns the record flat', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: { records: [{ id: 5, fields: { name: 'Alice' } }] },
      });

      await expect(service.create('t1', { name: 'Alice' })).resolves.toEqual({
        id: 5,
        name: 'Alice',
      });
      expect(mockHttpClient.post).toHaveBeenCalledWith(`${DATA}/records`, {
        fields: { name: 'Alice' },
      });
    });
  });

  describe('read', () => {
    it('reads a record and returns it flat', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: { id: 1, fields: { name: 'Alice' } },
      });

      await expect(service.read('t1', 1)).resolves.toEqual({
        id: 1,
        name: 'Alice',
      });
      expect(mockHttpClient.get).toHaveBeenCalledWith(`${DATA}/records/1`, {
        params: {},
      });
    });

    it('passes requested fields', async () => {
      mockHttpClient.get.mockResolvedValue({ data: { id: 1, fields: {} } });

      await service.read('t1', 1, { fields: ['name', 'age'] });

      expect(mockHttpClient.get).toHaveBeenCalledWith(`${DATA}/records/1`, {
        params: { fields: 'name,age' },
      });
    });

    it('returns null for a missing record', async () => {
      mockHttpClient.get.mockRejectedValue(axiosError(404));

      await expect(service.read('t1', 99)).resolves.toBeNull();
    });

    it('rethrows other errors', async () => {
      mockHttpClient.get.mockRejectedValue(axiosError(500));

      await expect(service.read('t1', 1)).rejects.toBeInstanceOf(AxiosError);
    });
  });

  describe('update', () => {
    it('patches the collection with id and fields', async () => {
      mockHttpClient.patch.mockResolvedValue({
        data: { records: [{ id: 1, fields: { name: 'Bob' } }] },
      });

      await expect(service.update('t1', 1, { name: 'Bob' })).resolves.toEqual({
        id: 1,
        name: 'Bob',
      });
      expect(mockHttpClient.patch).toHaveBeenCalledWith(`${DATA}/records`, {
        id: 1,
        fields: { name: 'Bob' },
      });
    });

    it('throws a 404 NocoDBException for a missing record', async () => {
      mockHttpClient.patch.mockRejectedValue(axiosError(404));

      const error = await service
        .update('t1', 99, { name: 'x' })
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(NocoDBException);
      expect((error as NocoDBException).getStatus()).toBe(404);
    });
  });

  describe('delete', () => {
    it('deletes by id in the request body', async () => {
      mockHttpClient.delete.mockResolvedValue({ data: {} });

      await service.delete('t1', 1);

      expect(mockHttpClient.delete).toHaveBeenCalledWith(`${DATA}/records`, {
        data: { id: 1 },
      });
    });

    it('throws a 404 NocoDBException for a missing record', async () => {
      mockHttpClient.delete.mockRejectedValue(axiosError(404));

      await expect(service.delete('t1', 99)).rejects.toBeInstanceOf(
        NocoDBException,
      );
    });
  });

  describe('list', () => {
    it('passes where, JSON sort, fields and offset paging', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: { records: [{ id: 1, fields: { name: 'Alice' } }] },
      });

      const result = await service.list('t1', {
        where: '(name,eq,"Alice")',
        sort: '-age,id',
        fields: ['name'],
        limit: 10,
        offset: 20,
      });

      expect(result).toEqual({ list: [{ id: 1, name: 'Alice' }] });
      expect(mockHttpClient.get).toHaveBeenCalledWith(`${DATA}/records`, {
        params: {
          where: '(name,eq,"Alice")',
          sort: JSON.stringify([
            { field: 'age', direction: 'desc' },
            { field: 'Id', direction: 'asc' },
          ]),
          fields: 'name',
          limit: '10',
          offset: '20',
        },
      });
    });

    it('adds the total count with withCount', async () => {
      mockHttpClient.get
        .mockResolvedValueOnce({ data: { records: [] } })
        .mockResolvedValueOnce({ data: { count: 42 } });

      const result = await service.list('t1', {
        where: '(a,eq,1)',
        limit: 5,
        withCount: true,
      });

      expect(result.pageInfo).toEqual({ totalRows: 42, pageSize: 5 });
      expect(mockHttpClient.get).toHaveBeenLastCalledWith(`${DATA}/count`, {
        params: { where: '(a,eq,1)' },
      });
    });
  });

  describe('listAll', () => {
    it('loads pages until a page is not full', async () => {
      mockHttpClient.get
        .mockResolvedValueOnce({
          data: { records: [{ id: 1 }, { id: 2 }] },
        })
        .mockResolvedValueOnce({ data: { records: [{ id: 3 }] } });

      const all = await service.listAll('t1', { where: '(a,eq,1)' }, 2);

      expect(all.map((r) => r.id)).toEqual([1, 2, 3]);
      expect(mockHttpClient.get).toHaveBeenNthCalledWith(2, `${DATA}/records`, {
        params: { where: '(a,eq,1)', limit: '2', offset: '2' },
      });
    });
  });

  describe('findOne / exists', () => {
    it('returns the first record or null', async () => {
      mockHttpClient.get
        .mockResolvedValueOnce({ data: { records: [{ id: 7, fields: {} }] } })
        .mockResolvedValueOnce({ data: { records: [] } });

      await expect(service.findOne('t1', '(a,eq,1)')).resolves.toEqual({
        id: 7,
      });
      await expect(service.exists('t1', '(a,eq,2)')).resolves.toBe(false);
    });
  });

  describe('meta API', () => {
    it('reads table metadata from the base', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: { id: 't1', title: 'users', fields: [] },
      });

      await service.getTableMetadata('t1');

      expect(mockHttpClient.get).toHaveBeenCalledWith(`${META}/tables/t1`);
    });

    it('lists the tables of the base', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: { list: [{ id: 't1', title: 'users' }] },
      });

      await expect(service.listBaseTables()).resolves.toEqual([
        { id: 't1', title: 'users' },
      ]);
      expect(mockHttpClient.get).toHaveBeenCalledWith(`${META}/tables`);
    });

    it('finds tables by prefixed title', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: {
          list: [
            { id: 't1', title: 'nc_users' },
            { id: 't2', title: 'users' },
          ],
        },
      });

      await expect(service.getTableByName('users')).resolves.toEqual({
        id: 't1',
        title: 'nc_users',
      });
      await expect(service.tableExists('missing')).resolves.toBe(false);
    });

    it('falls back to the physical table name of older NocoDB versions', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: { list: [{ id: 't3', title: 'Users', table_name: 'nc_users' }] },
      });

      await expect(service.getTableByName('users')).resolves.toEqual(
        expect.objectContaining({ id: 't3' }),
      );
    });

    it('creates tables titled with the prefixed name', async () => {
      mockHttpClient.post.mockResolvedValue({ data: { id: 'new' } });

      await service.createTable('users', 'Users', [
        { title: 'username', type: 'SingleLineText' },
      ]);

      expect(mockHttpClient.post).toHaveBeenCalledWith(`${META}/tables`, {
        title: 'nc_users',
        description: 'Users',
        fields: [{ title: 'username', type: 'SingleLineText' }],
      });
    });

    it('creates fields', async () => {
      mockHttpClient.post.mockResolvedValue({ data: { id: 'f1' } });

      await service.createColumn('t1', { title: 'email', type: 'Email' });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        `${META}/tables/t1/fields`,
        {
          title: 'email',
          type: 'Email',
        },
      );
    });

    it('propagates meta API errors', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('boom'));

      await expect(service.getTableByName('users')).rejects.toThrow('boom');
    });
  });

  describe('batch operations', () => {
    it('collects errors per record', async () => {
      mockHttpClient.post
        .mockResolvedValueOnce({ data: { records: [{ id: 1, fields: {} }] } })
        .mockRejectedValueOnce(new Error('fail'));

      const results = await service.batchCreate('t1', [{ a: 1 }, { a: 2 }]);

      expect(results).toEqual([{ id: 1 }, { error: 'fail' }]);
    });

    it('collects update errors per record', async () => {
      mockHttpClient.patch
        .mockResolvedValueOnce({ data: { records: [{ id: 1, fields: {} }] } })
        .mockRejectedValueOnce(new Error('fail'));

      const results = await service.batchUpdate('t1', [
        { id: 1, data: {} },
        { id: 2, data: {} },
      ]);

      expect(results).toEqual([{ id: 1 }, { id: 2, error: 'fail' }]);
    });
  });

  describe('Rate Limiting', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('should allow first request to proceed immediately and space subsequent requests by minRequestInterval', async () => {
      jest.useFakeTimers();

      mockHttpClient.post.mockResolvedValue({
        data: { records: [{ id: 1, fields: {} }] },
      });

      const p1 = service.create('t1', {});
      const p2 = service.create('t1', {});

      // First request fires immediately (no delay needed when idle);
      // second is serialized behind it and waits minRequestInterval (200 ms).
      // Advancing by < 200 ms flushes microtasks so p1 runs, but p2 is still queued.
      await jest.advanceTimersByTimeAsync(100);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);

      // Advance past the full minRequestInterval — p2 fires now.
      await jest.advanceTimersByTimeAsync(100);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);

      await Promise.all([p1, p2]);
    });
  });

  describe('without TelemetryService', () => {
    it('should execute CRUD operations successfully when TelemetryService is not injected', async () => {
      const v3Record = { id: 1, fields: { name: 'Test' } };
      const flat = { id: 1, name: 'Test' };
      mockHttpClient.post.mockResolvedValue({ data: { records: [v3Record] } });
      mockHttpClient.get.mockResolvedValue({ data: v3Record });
      mockHttpClient.patch.mockResolvedValue({ data: { records: [v3Record] } });
      mockHttpClient.delete.mockResolvedValue({});

      // All CRUD methods delegate to this.trace() which falls back to direct fn() call
      await expect(service.create('t1', { name: 'Test' })).resolves.toEqual(
        flat,
      );
      await expect(service.read('t1', 1)).resolves.toEqual(flat);
      await expect(service.update('t1', 1, { name: 'Test' })).resolves.toEqual(
        flat,
      );
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

  it('exposes the http client', () => {
    expect(service.getHttpClient()).toBe(mockHttpClient);
  });
});
