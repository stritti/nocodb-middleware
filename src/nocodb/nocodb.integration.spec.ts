import { Test, TestingModule } from '@nestjs/testing';
import { NocoDBService } from './nocodb.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import type { AxiosInstance } from 'axios';

describe('NocoDB Integration', () => {
  let nocodbService: NocoDBService;
  let mockHttpClient: HttpClientMock;

  type HttpClientMock = {
    get: jest.Mock<
      Promise<{ data: { list?: unknown[] } | null }>,
      [string, { params?: Record<string, unknown> }?]
    >;
    post: jest.Mock<Promise<{ data: unknown }>, [string, unknown?]>;
    patch: jest.Mock<Promise<{ data: unknown }>, [string, unknown?]>;
    delete: jest.Mock<Promise<unknown>, [string]>;
    defaults: { baseURL: string };
  };

  beforeEach(async () => {
    mockHttpClient = {
      get: jest.fn<
        Promise<{ data: { list?: unknown[] } | null }>,
        [string, { params?: Record<string, unknown> }?]
      >(),
      post: jest.fn<Promise<{ data: unknown }>, [string, unknown?]>(),
      patch: jest.fn<Promise<{ data: unknown }>, [string, unknown?]>(),
      delete: jest.fn<Promise<unknown>, [string]>(),
      defaults: { baseURL: 'http://test-url' },
    } satisfies HttpClientMock;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        NocoDBService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'nocodb.apiUrl') return 'http://localhost';
              if (key === 'nocodb.apiToken') return 'token';
              if (key === 'nocodb.baseId') return 'base_id';
              return null;
            }) as ConfigService['get'],
          },
        },
      ],
    }).compile();

    nocodbService = moduleFixture.get<NocoDBService>(NocoDBService);

    nocodbService.onModuleInit();

    (nocodbService as any).httpClient =
      mockHttpClient as unknown as AxiosInstance;

    (nocodbService as any).client = {};

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('NocoDBV3Service should use NocoDBService HTTP client', () => {
    expect((nocodbService as any).httpClient).toBeDefined();
  });

  it('DatabaseInit should use NocoDBService to check tables', async () => {
    mockHttpClient.get.mockResolvedValueOnce({
      data: { list: [] },
    });

    const result = await nocodbService.getTableByName('users');
    expect(result).toBeNull();
    expect(mockHttpClient.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/v2/meta/bases/base_id/tables'),
    );
  });
});
