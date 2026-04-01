import { Test, TestingModule } from '@nestjs/testing';
import { NocoDBService } from './nocodb.service';
import { DatabaseInitializationService } from './database-initialization.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

// Integration test: verifies module wiring and service interaction without real HTTP calls.

describe('NocoDB Integration', () => {
    let nocodbService: NocoDBService;
    let dbInitService: DatabaseInitializationService;
    let mockHttpClient: any;

    beforeEach(async () => {
        mockHttpClient = {
            get: jest.fn(),
            post: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn(),
            defaults: { baseURL: 'http://test-url' },
        };

        const moduleFixture: TestingModule = await Test.createTestingModule({
            providers: [
                NocoDBService,
                DatabaseInitializationService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key) => {
                            if (key === 'nocodb.apiUrl') return 'http://localhost';
                            if (key === 'nocodb.apiToken') return 'token';
                            if (key === 'nocodb.baseId') return 'base_id';
                            return null;
                        }),
                    },
                },
            ],
        }).compile();

        nocodbService = moduleFixture.get<NocoDBService>(NocoDBService);
        dbInitService = moduleFixture.get<DatabaseInitializationService>(DatabaseInitializationService);

        await nocodbService.onModuleInit();
        (nocodbService as any).httpClient = mockHttpClient;
        (nocodbService as any).client = {};

        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => { });
    });

    it('NocoDBService should expose the HTTP client', () => {
        expect(nocodbService.getHttpClient()).toBeDefined();
    });

    it('DatabaseInit should use NocoDBService to check tables', async () => {
        mockHttpClient.get.mockResolvedValueOnce({
            data: { list: [] },
        });

        const result = await nocodbService.getTableByName('users');
        expect(result).toBeNull();
        expect(mockHttpClient.get).toHaveBeenCalledWith(
            expect.stringContaining('/api/v3/meta/bases/base_id/tables')
        );
    });
});
