import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
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
            getTableMetadata: jest.fn(),
            listBaseTables: jest.fn(),
            createTable: jest.fn(),
            createColumn: jest.fn(),
            getHttpClient: jest.fn().mockReturnValue(mockHttpClient),
            list: jest.fn(),
            create: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
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

  it('should initialize identity columns on users table', async () => {
    (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);
    (nocoDBService.createTable as jest.Mock).mockResolvedValue({
      id: 'created-table-id',
    });

    await (service as any).initializeTables();

    expect(nocoDBService.createTable).toHaveBeenCalledWith(
      'users',
      'Users',
      expect.arrayContaining([
        expect.objectContaining({ column_name: 'auth_provider' }),
        expect.objectContaining({ column_name: 'external_subject' }),
      ]),
    );
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

      await expect(
        (service as any).verifyLinkColumnsExist(),
      ).resolves.not.toThrow();
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

  describe('seedDefaultPermissions', () => {
    it('should grant full admin permissions for protected tables', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockImplementation((name) =>
        Promise.resolve({ id: `id_${name}`, title: name }),
      );
      (nocoDBService.list as jest.Mock).mockResolvedValue({
        list: [{ id: 1, role_name: 'admin' }],
      });
      (nocoDBService.findOne as jest.Mock).mockResolvedValue(null);
      (nocoDBService.create as jest.Mock).mockResolvedValue({ id: 10 });

      await (service as any).seedDefaultPermissions();

      expect(nocoDBService.create).toHaveBeenCalledTimes(4);
      expect(nocoDBService.create).toHaveBeenCalledWith(
        'id_table_permissions',
        expect.objectContaining({
          table_name: 'roles',
          can_create: true,
          can_read: true,
          can_update: true,
          can_delete: true,
        }),
      );
    });
  });
});
