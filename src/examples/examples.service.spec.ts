import { Test, TestingModule } from '@nestjs/testing';
import { ExamplesService } from './examples.service';
import { ExampleRepository } from '../nocodb/repositories/example.repository';
import { PageOptionsDto } from '../nocodb/dto/page-options.dto';
import { CreateExampleDto } from './dto/create-example.dto';

describe('ExamplesService', () => {
    let service: ExamplesService;
    let repository: ExampleRepository;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExamplesService,
                {
                    provide: ExampleRepository,
                    useValue: {
                        findMany: jest.fn(),
                        create: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<ExamplesService>(ExamplesService);
        repository = module.get<ExampleRepository>(ExampleRepository);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('should return paginated examples', async () => {
            const pageOptions = new PageOptionsDto();
            const mockResult = { data: [], meta: {} };

            jest.spyOn(repository, 'findMany').mockResolvedValue(mockResult as any);

            const result = await service.findAll(pageOptions);

            expect(repository.findMany).toHaveBeenCalledWith(pageOptions);
            expect(result).toEqual(mockResult);
        });
    });

    describe('create', () => {
        it('should create a new example', async () => {
            const createDto: CreateExampleDto = { title: 'Test Example' };
            const mockExample = { id: 1, ...createDto };

            jest.spyOn(repository, 'create').mockResolvedValue(mockExample as any);

            const result = await service.create(createDto);

            expect(repository.create).toHaveBeenCalledWith(createDto);
            expect(result).toEqual(mockExample);
        });
    });
});
