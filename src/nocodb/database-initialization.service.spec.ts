import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseInitializationService } from './database-initialization.service';
import { NocoDBService } from './nocodb.service';
import { NocoDBV3Service } from './nocodb-v3.service';

describe('DatabaseInitializationService', () => {
  let service: DatabaseInitializationService;
  let nocoDBService: NocoDBService;
  let nocoDBV3Service: NocoDBV3Service;
  let mockHttpClient: any;

  beforeEach(async () => {
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseInitializationService,
        {
          provide: NocoDBService,
          useValue: {
            getTablePrefix: jest.fn().mockReturnValue('nc_'),
            getTableByName: jest.fn(),
            getHttpClient: jest.fn().mockReturnValue(mockHttpClient),
            getBaseId: jest.fn().mockReturnValue('base_id'),
          },
        },
        {
          provide: NocoDBV3Service,
          useValue: {
            createTableV3: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DatabaseInitializationService>(
      DatabaseInitializationService,
    );
    nocoDBService = module.get<NocoDBService>(NocoDBService);
    nocoDBV3Service = module.get<NocoDBV3Service>(NocoDBV3Service);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('onModuleInit should trigger table initialization', async () => {
    const initSpy = jest
      .spyOn(service as any, 'initializeTables')
      .mockResolvedValue(undefined);
    await service.onModuleInit();
    expect(initSpy).toHaveBeenCalled();
  });

  it('initializeTables should attempt base and junction tables and seeding', async () => {
    const ensureSpy = jest
      .spyOn(service as any, 'ensureTableExists')
      .mockResolvedValue('table-id');
    const seedPermSpy = jest
      .spyOn(service as any, 'seedDefaultPermissions')
      .mockResolvedValue(undefined);
    const seedUserSpy = jest
      .spyOn(service as any, 'seedDefaultUser')
      .mockResolvedValue(undefined);

    await (service as any).initializeTables();

    expect(ensureSpy).toHaveBeenCalledTimes(4);
    expect(seedPermSpy).toHaveBeenCalled();
    expect(seedUserSpy).toHaveBeenCalled();
  });

  it('ensureTableExists should return existing table id when accessible', async () => {
    (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
      id: 'existing-id',
    });
    mockHttpClient.get.mockResolvedValue({ data: { id: 'existing-id' } });

    const result = await (service as any).ensureTableExists({
      tableName: 'users',
      title: 'Users',
      columns: [
        { name: 'username', title: 'Username', type: 'SingleLineText' },
      ],
    });

    expect(result).toBe('existing-id');
    expect(nocoDBV3Service.createTableV3).not.toHaveBeenCalled();
  });

  it('ensureTableExists should create table via v3 when missing', async () => {
    (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);
    (nocoDBV3Service.createTableV3 as jest.Mock).mockResolvedValue({
      id: 'new-id',
    });

    const result = await (service as any).ensureTableExists({
      tableName: 'users',
      title: 'Users',
      columns: [
        { name: 'username', title: 'Username', type: 'SingleLineText' },
      ],
    });

    expect(nocoDBV3Service.createTableV3).toHaveBeenCalledWith(
      'base_id',
      expect.objectContaining({
        table_name: 'nc_users',
        title: 'nc_users',
      }),
    );
    expect(result).toBe('new-id');
  });

  it('seedDefaultUser should skip when bootstrap admin username is missing', async () => {
    const configService = (service as any).configService;
    configService.get.mockReturnValue(undefined);

    await (service as any).seedDefaultUser();

    expect(nocoDBService.getTableByName).not.toHaveBeenCalled();
  });

  it('seedDefaultUser should assign admin role to configured bootstrap user', async () => {
    const configService = (service as any).configService;
    configService.get.mockReturnValue('bootstrap-admin');

    (nocoDBService.getTableByName as jest.Mock)
      .mockResolvedValueOnce({ id: 'users-id' })
      .mockResolvedValueOnce({ id: 'roles-id' })
      .mockResolvedValueOnce({ id: 'user-roles-id' });

    (nocoDBV3Service.findOne as jest.Mock)
      .mockResolvedValueOnce({ id: 10, Username: 'bootstrap-admin' })
      .mockResolvedValueOnce({ id: 1, 'Role Name': 'admin' })
      .mockResolvedValueOnce(null);

    await (service as any).seedDefaultUser();

    expect(nocoDBV3Service.create).toHaveBeenCalledWith('user-roles-id', {
      'User Id': 10,
      'Role Id': 1,
      'Assigned At': expect.any(String),
    });
  });
});
