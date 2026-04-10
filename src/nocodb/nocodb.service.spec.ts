import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NocoDBService } from './nocodb.service';
import axios, { AxiosInstance } from 'axios';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NocoDBService', () => {
  let service: NocoDBService;
  let configService: ConfigService;

  beforeEach(async () => {
    mockedAxios.create.mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    } as unknown as AxiosInstance);

    const getMock = jest.fn((key: string) => {
      const config: Record<string, string> = {
        'nocodb.apiUrl': 'http://localhost:8080',
        'nocodb.apiToken': 'test-token',
        'nocodb.baseId': 'test-base-id',
        'nocodb.tablePrefix': 'nc_',
      };
      return config[key];
    }) as ConfigService['get'];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NocoDBService,
        {
          provide: ConfigService,
          useValue: {
            get: getMock,
          },
        },
      ],
    }).compile();

    service = module.get<NocoDBService>(NocoDBService);
    configService = module.get<ConfigService>(ConfigService);

    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize with config', () => {
    const getMock = configService.get as jest.Mock;

    const typedGetMock: jest.Mock = getMock;
    expect(typedGetMock).toHaveBeenCalledWith('nocodb.apiUrl');
    expect(typedGetMock).toHaveBeenCalledWith('nocodb.apiToken');
  });

  it('should provide a client', () => {
    const client = service.getClient();
    expect(client).toBeDefined();
  });

  it('should return correct base ID', () => {
    expect(service.getBaseId()).toBe('test-base-id');
  });

  it('should return correct table prefix', () => {
    expect(service.getTablePrefix()).toBe('nc_');
  });
});
