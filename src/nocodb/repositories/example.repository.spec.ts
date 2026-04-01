import { Test, TestingModule } from '@nestjs/testing';
import { ExampleRepository } from './example.repository';
import { NocoDBService } from '../nocodb.service';
import { Logger } from '@nestjs/common';

describe('ExampleRepository', () => {
    let repository: ExampleRepository;
    let nocoDBService: NocoDBService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExampleRepository,
                {
                    provide: NocoDBService,
                    useValue: {
                        getTableByName: jest.fn(),
                        list: jest.fn(),
                        create: jest.fn(),
                        findOne: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                    },
                },
            ],
        }).compile();

        repository = module.get<ExampleRepository>(ExampleRepository);
        nocoDBService = module.get<NocoDBService>(NocoDBService);

        jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(repository).toBeDefined();
    });

    describe('onModuleInit', () => {
        it('should resolve the table ID from the Meta API by name', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
                id: 'md_examples_id',
                title: 'Examples',
            });

            await repository.onModuleInit();

            expect(nocoDBService.getTableByName).toHaveBeenCalledWith('examples');
            expect((repository as any).tableId).toBe('md_examples_id');
        });

        it('should throw an error if the table is not found', async () => {
            (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);

            await expect(repository.onModuleInit()).rejects.toThrow(
                "ExampleRepository: table 'examples' not found in NocoDB",
            );
        });
    });
});
