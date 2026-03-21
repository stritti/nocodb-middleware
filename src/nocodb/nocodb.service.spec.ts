import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NocoDBService } from './nocodb.service';

describe('NocoDBService', () => {
  let service: NocoDBService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NocoDBService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'nocodb.apiUrl': 'http://localhost:8080',
                'nocodb.apiToken': 'test-token',
                'nocodb.baseId': 'test-base-id',
                'nocodb.tablePrefix': 'nc_',
              };
              return (config as any)[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<NocoDBService>(NocoDBService);
    configService = module.get<ConfigService>(ConfigService);

    // Mock axios to prevent actual HTTP calls during service initialization if it happens there
    // (Though currently axios.create is used, which is synchronous)

    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize with config', () => {
    expect(configService.get).toHaveBeenCalledWith('nocodb.apiUrl');
    expect(configService.get).toHaveBeenCalledWith('nocodb.apiToken');
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
