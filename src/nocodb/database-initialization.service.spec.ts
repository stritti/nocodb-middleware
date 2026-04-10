import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseInitializationService } from './database-initialization.service';
import { NocoDBService } from './nocodb.service';
import { NocoDBV3Service } from './nocodb-v3.service';

type HttpClientMock = {
  get: jest.Mock<Promise<{ data?: unknown }>, [string]>;
  post: jest.Mock<Promise<unknown>, [string, unknown?]>;
};

type NocoDBServiceMock = {
  getTablePrefix: jest.Mock<string, []>;
  getTableByName: jest.Mock<Promise<unknown>, [string]>;
  getHttpClient: jest.Mock<HttpClientMock, []>;
  getBaseId: jest.Mock<string, []>;
};

type NocoDBV3ServiceMock = {
  createTableV3: jest.Mock<Promise<unknown>, [string, unknown]>;
  findOne: jest.Mock<Promise<unknown>, [string, string]>;
  create: jest.Mock<Promise<unknown>, [string, unknown]>;
};

describe('DatabaseInitializationService', () => {
  let service: DatabaseInitializationService;

  let serviceWithPrivates: any;
  let nocoDBService: NocoDBServiceMock;
  let nocoDBV3Service: NocoDBV3ServiceMock;
  let httpClientMock: HttpClientMock;
  let configService: ConfigServiceMock;

  beforeEach(async () => {
    httpClientMock = {
      get: jest.fn<Promise<{ data?: unknown }>, [string]>(),
      post: jest.fn<Promise<unknown>, [string, unknown?]>(),
    };

    nocoDBService = {
      getTablePrefix: jest.fn<string, []>().mockReturnValue('nc_'),
      getTableByName: jest.fn<Promise<unknown>, [string]>(),
      getHttpClient: jest
        .fn<HttpClientMock, []>()
        .mockReturnValue(httpClientMock),
      getBaseId: jest.fn<string, []>().mockReturnValue('base_id'),
    };

    nocoDBV3Service = {
      createTableV3: jest.fn<Promise<unknown>, [string, unknown]>(),
      findOne: jest.fn<Promise<unknown>, [string, string]>(),
      create: jest.fn<Promise<unknown>, [string, unknown]>(),
    };

    configService = {
      get: jest.fn<unknown, [string]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseInitializationService,
        {
          provide: NocoDBService,
          useValue: nocoDBService,
        },
        {
          provide: NocoDBV3Service,
          useValue: nocoDBV3Service,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<DatabaseInitializationService>(
      DatabaseInitializationService,
    );

    serviceWithPrivates = service as any;

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('onModuleInit should trigger table initialization', async () => {
    const initSpy = jest
      .spyOn(serviceWithPrivates, 'initializeTables')
      .mockResolvedValue(undefined);
    await service.onModuleInit();
    expect(initSpy).toHaveBeenCalled();
  });

  it('initializeTables should attempt base and junction tables and seeding', async () => {
    const ensureSpy = jest
      .spyOn(serviceWithPrivates, 'ensureTableExists')
      .mockResolvedValue('table-id');

    const seedPermSpy = jest
      .spyOn(serviceWithPrivates, 'seedDefaultPermissions')
      .mockResolvedValue(undefined);

    const seedUserSpy = jest
      .spyOn(serviceWithPrivates, 'seedDefaultUser')
      .mockResolvedValue(undefined);

    await serviceWithPrivates.initializeTables();

    expect(ensureSpy).toHaveBeenCalledTimes(4);
    expect(seedPermSpy).toHaveBeenCalled();
    expect(seedUserSpy).toHaveBeenCalled();
  });

  it('ensureTableExists should return existing table id when accessible', async () => {
    nocoDBService.getTableByName.mockResolvedValue({
      id: 'existing-id',
      table_name: 'nc_users',
    } as { id: string; table_name: string });
    httpClientMock.get.mockResolvedValue({ data: { id: 'existing-id' } });

    const result = await serviceWithPrivates.ensureTableExists({
      tableName: 'users',
      title: 'Users',
      columns: [
        { name: 'username', title: 'Username', type: 'SingleLineText' },
      ],
    });

    expect(result).toBe('existing-id');
    expect(nocoDBV3Service.createTableV3).not.toHaveBeenCalled();
    expect(httpClientMock.get).toHaveBeenCalled();
  });

  it('ensureTableExists should create table via v3 when missing', async () => {
    nocoDBService.getTableByName.mockResolvedValue(null);
    nocoDBV3Service.createTableV3.mockResolvedValue({
      id: 'new-id',
    } as { id: string });

    const result = await serviceWithPrivates.ensureTableExists({
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
    expect(httpClientMock.get).not.toHaveBeenCalled();
    expect(result).toBe('new-id');
  });

  it('seedDefaultUser should skip when bootstrap admin username is missing', async () => {
    configService.get.mockReturnValueOnce(undefined);

    await serviceWithPrivates.seedDefaultUser();

    expect(nocoDBService.getTableByName).not.toHaveBeenCalled();
    expect(nocoDBV3Service.findOne).not.toHaveBeenCalled();
    expect(nocoDBV3Service.create).not.toHaveBeenCalled();
  });

  it('seedDefaultUser should assign admin role to configured bootstrap user', async () => {
    configService.get.mockReturnValue('bootstrap-admin');

    nocoDBService.getTableByName
      .mockResolvedValueOnce({ id: 'users-id', table_name: 'nc_users' })
      .mockResolvedValueOnce({ id: 'roles-id', table_name: 'nc_roles' })
      .mockResolvedValueOnce({
        id: 'user-roles-id',
        table_name: 'nc_user_roles',
      });

    nocoDBV3Service.findOne
      .mockResolvedValueOnce({ id: 10, Username: 'bootstrap-admin' })
      .mockResolvedValueOnce({ id: 1, 'Role Name': 'admin' })
      .mockResolvedValueOnce(null);

    await serviceWithPrivates.seedDefaultUser();

    expect(nocoDBV3Service.findOne).toHaveBeenCalledTimes(3);
    expect(nocoDBV3Service.create).toHaveBeenCalledWith('user-roles-id', {
      'User Id': 10,
      'Role Id': 1,
      'Assigned At': expect.any(String),
    });
  });
});
