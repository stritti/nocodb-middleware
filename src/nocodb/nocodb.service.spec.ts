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
    it('should enforce rate limit between requests', async () => {
      jest.useFakeTimers();

      mockHttpClient.post.mockResolvedValue({ data: {} });

      const p1 = service.create('t1', {});
      const p2 = service.create('t1', {});

      jest.advanceTimersByTime(200);

      await Promise.all([p1, p2]);

      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);

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
});
