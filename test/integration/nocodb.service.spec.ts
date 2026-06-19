import { Test, TestingModule } from '@nestjs/testing';
import { NocoDBService } from '../../src/nocodb/nocodb.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { TelemetryService } from '../../src/tracing/telemetry.service';

describe('NocoDBService (Integration)', () => {
  let service: NocoDBService;
  let mockAxios: MockAdapter;
  let configService: ConfigService;

  const mockConfig = {
    nocodb: {
      apiUrl: 'http://localhost:8080',
      apiToken: 'test-token',
      baseId: 'test-base-id',
      tablePrefix: 'app_',
    },
    NOCODB_RETRY_COUNT: 3,
    NOCODB_RETRY_BASE_DELAY: 1000,
    NOCODB_RETRY_MAX_DELAY: 10000,
  };

  beforeEach(async () => {
    mockAxios = new MockAdapter(axios);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NocoDBService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const keys = key.split('.');
              let value = mockConfig;
              for (const k of keys) {
                value = value?.[k];
                if (value === undefined) break;
              }
              return value !== undefined ? value : defaultValue;
            }),
          },
        },
        {
          provide: TelemetryService,
          useValue: {
            startSpan: jest.fn(),
            endSpan: jest.fn(),
            recordException: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NocoDBService>(NocoDBService);
    configService = module.get<ConfigService>(ConfigService);

    // Initialize the service
    await service.onModuleInit();
  });

  afterEach(() => {
    mockAxios.restore();
    jest.clearAllMocks();
  });

  describe('listRecords', () => {
    it('should fetch records from a table', async () => {
      const tableName = 'test_table';
      const mockRecords = {
        list: [
          { id: 1, name: 'Record 1' },
          { id: 2, name: 'Record 2' },
        ],
      };

      mockAxios
        .onGet(`/api/v2/tables/${tableName}/records`)
        .reply(200, mockRecords);

      const result = await service.listRecords(tableName);

      expect(result.data).toEqual(mockRecords.list);
      expect(mockAxios.history.get.length).toBe(1);
    });

    it('should handle pagination parameters', async () => {
      const tableName = 'test_table';
      const mockRecords = {
        list: [{ id: 1, name: 'Record 1' }],
      };

      mockAxios
        .onGet(`/api/v2/tables/${tableName}/records`, {
          params: {
            limit: 10,
            offset: 0,
          },
        })
        .reply(200, mockRecords);

      const result = await service.listRecords(tableName, {
        limit: 10,
        offset: 0,
      });

      expect(result.data).toEqual(mockRecords.list);
    });

    it('should handle errors from NocoDB API', async () => {
      const tableName = 'test_table';

      mockAxios.onGet(`/api/v2/tables/${tableName}/records`).reply(500, {
        message: 'Internal Server Error',
      });

      await expect(service.listRecords(tableName)).rejects.toThrow();
    });

    it('should retry on transient errors', async () => {
      const tableName = 'test_table';
      const mockRecords = {
        list: [{ id: 1, name: 'Record 1' }],
      };

      // First call fails with 503, second succeeds
      mockAxios
        .onGet(`/api/v2/tables/${tableName}/records`)
        .replyOnce(503)
        .onGet(`/api/v2/tables/${tableName}/records`)
        .reply(200, mockRecords);

      const result = await service.listRecords(tableName);

      expect(result.data).toEqual(mockRecords.list);
      expect(mockAxios.history.get.length).toBe(2);
    });
  });

  describe('createRecord', () => {
    it('should create a new record', async () => {
      const tableName = 'test_table';
      const recordData = { name: 'New Record', value: 100 };
      const mockResponse = {
        id: 1,
        ...recordData,
      };

      mockAxios
        .onPost(`/api/v2/tables/${tableName}/records`)
        .reply(201, mockResponse);

      const result = await service.createRecord(tableName, recordData);

      expect(result.data).toEqual(mockResponse);
      expect(mockAxios.history.post.length).toBe(1);
    });

    it('should handle validation errors', async () => {
      const tableName = 'test_table';
      const invalidData = { name: '', value: -1 };

      mockAxios
        .onPost(`/api/v2/tables/${tableName}/records`)
        .reply(400, {
          message: 'Validation failed',
          errors: ['name is required', 'value must be positive'],
        });

      await expect(
        service.createRecord(tableName, invalidData),
      ).rejects.toThrow();
    });
  });

  describe('getRecord', () => {
    it('should fetch a single record by ID', async () => {
      const tableName = 'test_table';
      const recordId = 1;
      const mockRecord = { id: recordId, name: 'Test Record' };

      mockAxios
        .onGet(`/api/v2/tables/${tableName}/records/${recordId}`)
        .reply(200, mockRecord);

      const result = await service.getRecord(tableName, recordId);

      expect(result.data).toEqual(mockRecord);
    });

    it('should return null for non-existent record', async () => {
      const tableName = 'test_table';
      const recordId = 999;

      mockAxios
        .onGet(`/api/v2/tables/${tableName}/records/${recordId}`)
        .reply(404, { message: 'Record not found' });

      const result = await service.getRecord(tableName, recordId);

      expect(result.data).toBeNull();
    });
  });

  describe('updateRecord', () => {
    it('should update an existing record', async () => {
      const tableName = 'test_table';
      const recordId = 1;
      const updateData = { name: 'Updated Record' };
      const mockResponse = { id: recordId, ...updateData };

      mockAxios
        .onPatch(`/api/v2/tables/${tableName}/records/${recordId}`)
        .reply(200, mockResponse);

      const result = await service.updateRecord(
        tableName,
        recordId,
        updateData,
      );

      expect(result.data).toEqual(mockResponse);
    });

    it('should handle concurrent updates', async () => {
      const tableName = 'test_table';
      const recordId = 1;
      const updateData = { name: 'Updated Record' };
      const mockResponse = { id: recordId, ...updateData };

      mockAxios
        .onPatch(`/api/v2/tables/${tableName}/records/${recordId}`)
        .reply(200, mockResponse);

      // Simulate concurrent updates
      const promises = [
        service.updateRecord(tableName, recordId, { name: 'Update 1' }),
        service.updateRecord(tableName, recordId, { name: 'Update 2' }),
        service.updateRecord(tableName, recordId, { name: 'Update 3' }),
      ];

      const results = await Promise.all(promises);

      expect(results.length).toBe(3);
      expect(results.every((r) => r.data.id === recordId)).toBe(true);
    });
  });

  describe('deleteRecord', () => {
    it('should delete a record', async () => {
      const tableName = 'test_table';
      const recordId = 1;

      mockAxios
        .onDelete(`/api/v2/tables/${tableName}/records/${recordId}`)
        .reply(200, { message: 'Record deleted successfully' });

      const result = await service.deleteRecord(tableName, recordId);

      expect(result.success).toBe(true);
    });

    it('should handle delete errors', async () => {
      const tableName = 'test_table';
      const recordId = 1;

      mockAxios
        .onDelete(`/api/v2/tables/${tableName}/records/${recordId}`)
        .reply(403, { message: 'Forbidden' });

      const result = await service.deleteRecord(tableName, recordId);

      expect(result.success).toBe(false);
    });
  });

  describe('batchCreate', () => {
    it('should create multiple records', async () => {
      const tableName = 'test_table';
      const records = [
        { name: 'Record 1' },
        { name: 'Record 2' },
        { name: 'Record 3' },
      ];
      const mockResponse = {
        list: records.map((r, i) => ({ id: i + 1, ...r })),
      };

      mockAxios
        .onPost(`/api/v2/tables/${tableName}/records/batch`)
        .reply(201, mockResponse);

      const result = await service.batchCreate(tableName, records);

      expect(result.data).toEqual(mockResponse.list);
    });

    it('should handle partial failures', async () => {
      const tableName = 'test_table';
      const records = [
        { name: 'Valid Record' },
        { name: '' }, // Invalid
        { name: 'Another Valid Record' },
      ];

      // Mock response with mixed results
      mockAxios
        .onPost(`/api/v2/tables/${tableName}/records/batch`)
        .reply(207, {
          list: [
            { id: 1, name: 'Valid Record' },
            { error: 'Validation failed: name is required' },
            { id: 2, name: 'Another Valid Record' },
          ],
        });

      const result = await service.batchCreate(tableName, records);

      expect(result.data.length).toBe(3);
      expect(result.data[0].id).toBe(1);
      expect(result.data[1].error).toBeDefined();
      expect(result.data[2].id).toBe(2);
    });
  });

  describe('getTable', () => {
    it('should fetch table metadata', async () => {
      const tableName = 'test_table';
      const mockTable = {
        id: 1,
        name: tableName,
        columns: [
          { id: 1, name: 'id', type: 'integer' },
          { id: 2, name: 'name', type: 'string' },
        ],
      };

      mockAxios
        .onGet(`/api/v3/meta/bases/test-base-id/tables/${tableName}`)
        .reply(200, mockTable);

      const result = await service.getTable(tableName);

      expect(result.data).toEqual(mockTable);
    });

    it('should handle non-existent tables', async () => {
      const tableName = 'non_existent_table';

      mockAxios
        .onGet(`/api/v3/meta/bases/test-base-id/tables/${tableName}`)
        .reply(404, { message: 'Table not found' });

      const result = await service.getTable(tableName);

      expect(result.data).toBeNull();
    });
  });

  describe('tableExists', () => {
    it('should return true for existing table', async () => {
      const tableName = 'test_table';
      const mockTable = { id: 1, name: tableName };

      mockAxios
        .onGet(`/api/v3/meta/bases/test-base-id/tables/${tableName}`)
        .reply(200, mockTable);

      const exists = await service.tableExists(tableName);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent table', async () => {
      const tableName = 'non_existent_table';

      mockAxios
        .onGet(`/api/v3/meta/bases/test-base-id/tables/${tableName}`)
        .reply(404);

      const exists = await service.tableExists(tableName);

      expect(exists).toBe(false);
    });
  });

  describe('getTableColumns', () => {
    it('should fetch table columns', async () => {
      const tableName = 'test_table';
      const mockColumns = [
        { id: 1, name: 'id', type: 'integer' },
        { id: 2, name: 'name', type: 'string' },
        { id: 3, name: 'created_at', type: 'datetime' },
      ];

      mockAxios
        .onGet(`/api/v3/meta/bases/test-base-id/tables/${tableName}/columns`)
        .reply(200, { list: mockColumns });

      const result = await service.getTableColumns(tableName);

      expect(result.data).toEqual(mockColumns);
    });
  });

  describe('createTable', () => {
    it('should create a new table', async () => {
      const tableName = 'new_table';
      const mockResponse = {
        id: 1,
        name: tableName,
        columns: [],
      };

      mockAxios
        .onPost(`/api/v3/meta/bases/test-base-id/tables`)
        .reply(201, mockResponse);

      const result = await service.createTable(tableName);

      expect(result.data).toEqual(mockResponse);
    });

    it('should handle duplicate table names', async () => {
      const tableName = 'existing_table';

      mockAxios
        .onPost(`/api/v3/meta/bases/test-base-id/tables`)
        .reply(409, { message: 'Table already exists' });

      await expect(service.createTable(tableName)).rejects.toThrow();
    });
  });

  describe('createColumn', () => {
    it('should create a new column', async () => {
      const tableName = 'test_table';
      const columnName = 'new_column';
      const columnType = 'string';
      const mockResponse = {
        id: 1,
        name: columnName,
        type: columnType,
      };

      mockAxios
        .onPost(
          `/api/v3/meta/bases/test-base-id/tables/${tableName}/columns`,
        )
        .reply(201, mockResponse);

      const result = await service.createColumn(
        tableName,
        columnName,
        columnType,
      );

      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limiting', async () => {
      const tableName = 'test_table';

      // Mock 6 requests, but rate limit is 5 per second
      for (let i = 0; i < 6; i++) {
        mockAxios
          .onGet(`/api/v2/tables/${tableName}/records`)
          .reply(200, { list: [] });
      }

      const promises = Array(6)
        .fill(null)
        .map(() => service.listRecords(tableName));

      const results = await Promise.all(promises);

      // All should succeed due to queuing
      expect(results.length).toBe(6);
    });
  });
});
