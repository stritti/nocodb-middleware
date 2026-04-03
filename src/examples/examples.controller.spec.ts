import { Test, TestingModule } from '@nestjs/testing';
import { ExamplesController } from './examples.controller';
import { ExamplesService } from './examples.service';
import { PageOptionsDto } from '../nocodb/dto/page-options.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CacheInterceptor } from '../nocodb/interceptors/cache.interceptor';
import { NocoDBCacheService } from '../nocodb/cache/nocodb-cache.service';

describe('ExamplesController', () => {
  let controller: ExamplesController;
  let examplesService: jest.Mocked<ExamplesService>;

  beforeEach(async () => {
    examplesService = {
      findAll: jest.fn(),
      create: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamplesController],
      providers: [
        { provide: ExamplesService, useValue: examplesService },
        {
          provide: NocoDBCacheService,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(CacheInterceptor)
      .useValue({ intercept: (_ctx: any, next: any) => next.handle() })
      .compile();

    controller = module.get<ExamplesController>(ExamplesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call examplesService.findAll with pageOptionsDto', async () => {
      const pageOptions = new PageOptionsDto();
      const expected = { data: [], meta: {} };
      examplesService.findAll.mockResolvedValue(expected as any);

      const result = await controller.findAll(pageOptions);

      expect(examplesService.findAll).toHaveBeenCalledWith(pageOptions);
      expect(result).toEqual(expected);
    });
  });

  describe('create', () => {
    it('should call examplesService.create with createExampleDto', async () => {
      const dto = { name: 'Test Example', description: 'A test' };
      const expected = { id: 1, ...dto };
      examplesService.create.mockResolvedValue(expected as any);

      const result = await controller.create(dto as any);

      expect(examplesService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });
});
