import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseInitializationService } from './database-initialization.service';
import { NocoDBService } from './nocodb.service';

describe('DatabaseInitializationService', () => {
  let service: DatabaseInitializationService;
  let nocoDBService: NocoDBService;
  let mockHttpClient: any;

  beforeEach(async () => {
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      defaults: { baseURL: 'http://test-url' },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseInitializationService,
        {
          provide: NocoDBService,
          useValue: {
            getTablePrefix: jest.fn().mockReturnValue(''),
            getTableByName: jest.fn(),
            createTable: jest.fn(),
            createColumn: jest.fn(),
            getHttpClient: jest.fn().mockReturnValue(mockHttpClient),
            list: jest.fn(),
            create: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'nocodb.bootstrapAdminUsername') return 'admin';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DatabaseInitializationService>(
      DatabaseInitializationService,
    );
    nocoDBService = module.get<NocoDBService>(NocoDBService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ensureTableExists', () => {
    it('should create table if it does not exist', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);
      (nocoDBService.createTable as jest.Mock).mockResolvedValue({
        id: 'new-table-id',
      });

      const result = await (service as any).ensureTableExists({
        tableName: 'test_table',
        title: 'Test Table',
        columns: [{ name: 'col1', title: 'Col 1', type: 'SingleLineText' }],
      });

      expect(nocoDBService.createTable).toHaveBeenCalledWith(
        'test_table',
        'Test Table',
        expect.arrayContaining([
          expect.objectContaining({ column_name: 'col1' }),
        ]),
      );
      expect(result).toBe('new-table-id');
    });

    it('should return existing table ID if found', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'existing-id',
      });
      mockHttpClient.get.mockResolvedValue({ data: { columns: [] } });

      const result = await (service as any).ensureTableExists({
        tableName: 'test_table',
        title: 'Test Table',
        columns: [],
      });

      expect(nocoDBService.createTable).not.toHaveBeenCalled();
      expect(result).toBe('existing-id');
    });
  });

  describe('verifyLinkColumnsExist', () => {
    it('should continue if required link columns are missing (only logs error)', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockImplementation((name) => {
        return Promise.resolve({ id: `id_${name}`, title: name });
      });

      mockHttpClient.get.mockImplementation((url: string) => {
        if (url.includes('/api/v3/meta/tables/')) {
          return Promise.resolve({ data: { columns: [] } });
        }
        return Promise.resolve({ data: {} });
      });

      await expect((service as any).verifyLinkColumnsExist()).resolves.not.toThrow();
    });

    it('should pass if all link columns exist', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockImplementation((name) => {
        return Promise.resolve({ id: `id_${name}`, title: name });
      });

      mockHttpClient.get.mockImplementation((url: string) => {
        if (url.includes('/api/v3/meta/tables/id_user_roles')) {
          return Promise.resolve({
            data: {
              columns: [
                { column_name: 'user', uidt: 'LinkToAnotherRecord' },
                { column_name: 'role', uidt: 'LinkToAnotherRecord' },
              ],
            },
          });
        }
        if (url.includes('/api/v3/meta/tables/id_table_permissions')) {
          return Promise.resolve({
            data: {
              columns: [{ column_name: 'role', uidt: 'LinkToAnotherRecord' }],
            },
          });
        }
        return Promise.resolve({ data: { columns: [] } });
      });

      await expect(
        (service as any).verifyLinkColumnsExist(),
      ).resolves.not.toThrow();
    });
  });

  describe('seedDefaultUser', () => {
    it('should create admin user if not exists', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockImplementation((name) => {
        return Promise.resolve({ id: `id_${name}`, title: name });
      });

      (nocoDBService.list as jest.Mock).mockResolvedValue({ list: [] });
      (nocoDBService.create as jest.Mock).mockResolvedValue({ id: 1 });

      await (service as any).seedDefaultUser();

      expect(nocoDBService.create).toHaveBeenCalledWith(
        'id_users',
        expect.objectContaining({ username: 'admin' }),
      );
    });

    it('should skip user creation if user already exists', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockImplementation((name) => {
        return Promise.resolve({ id: `id_${name}`, title: name });
      });

      (nocoDBService.list as jest.Mock).mockImplementation(
        (tableId: string) => {
          if (tableId === 'id_users') {
            return Promise.resolve({ list: [{ id: 1, username: 'admin' }] });
          }
          if (tableId === 'id_roles') {
            return Promise.resolve({ list: [{ id: 1, role_name: 'admin' }] });
          }
          return Promise.resolve({ list: [{ id: 1 }] });
        },
      );

      await (service as any).seedDefaultUser();

      expect(nocoDBService.create).not.toHaveBeenCalled();
    });
  });
});
