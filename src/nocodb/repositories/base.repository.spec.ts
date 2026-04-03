import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { NocoDBService } from '../nocodb.service';
import { PageOptionsDto } from '../dto/page-options.dto';

// Concrete subclass of BaseRepository for testing
@Injectable()
class TestRepository extends BaseRepository<{ id: number; name: string }> {
  constructor(nocoDBService: NocoDBService) {
    super(nocoDBService, 'test_table_id');
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let nocoDBService: jest.Mocked<Partial<NocoDBService>>;

  beforeEach(async () => {
    nocoDBService = {
      list: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestRepository,
        { provide: NocoDBService, useValue: nocoDBService },
      ],
    }).compile();

    repository = module.get<TestRepository>(TestRepository);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findMany', () => {
    it('should return a paginated result', async () => {
      const pageOptions = Object.assign(new PageOptionsDto(), {
        page: 1,
        take: 10,
      });
      (nocoDBService.list as jest.Mock).mockResolvedValue({
        list: [{ id: 1, name: 'Test' }],
        pageInfo: { totalRows: 1 },
      });

      const result = await repository.findMany(pageOptions);

      expect(nocoDBService.list).toHaveBeenCalledWith(
        'test_table_id',
        expect.objectContaining({ limit: 10, offset: 0 }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.itemCount).toBe(1);
    });

    it('should handle empty result', async () => {
      const pageOptions = Object.assign(new PageOptionsDto(), {
        page: 1,
        take: 10,
      });
      (nocoDBService.list as jest.Mock).mockResolvedValue({
        list: [],
        pageInfo: { totalRows: 0 },
      });

      const result = await repository.findMany(pageOptions);
      expect(result.data).toEqual([]);
      expect(result.meta.itemCount).toBe(0);
    });

    it('should throw error and log when list fails', async () => {
      const pageOptions = Object.assign(new PageOptionsDto(), {
        page: 1,
        take: 10,
      });
      const error = new Error('Network error');
      (nocoDBService.list as jest.Mock).mockRejectedValue(error);

      await expect(repository.findMany(pageOptions)).rejects.toThrow('Network error');
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single record', async () => {
      const expected = { id: 1, name: 'Test' };
      (nocoDBService.findOne as jest.Mock).mockResolvedValue(expected);

      const result = await repository.findOne('(id,eq,1)');
      expect(result).toEqual(expected);
      expect(nocoDBService.findOne).toHaveBeenCalledWith(
        'test_table_id',
        '(id,eq,1)',
      );
    });

    it('should return null when not found', async () => {
      (nocoDBService.findOne as jest.Mock).mockResolvedValue(null);
      const result = await repository.findOne('(id,eq,999)');
      expect(result).toBeNull();
    });

    it('should throw error and log when findOne fails', async () => {
      const error = new Error('DB error');
      (nocoDBService.findOne as jest.Mock).mockRejectedValue(error);

      await expect(repository.findOne('(id,eq,1)')).rejects.toThrow('DB error');
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create a record', async () => {
      const data = { name: 'New Item' };
      const expected = { id: 5, name: 'New Item' };
      (nocoDBService.create as jest.Mock).mockResolvedValue(expected);

      const result = await repository.create(data);
      expect(result).toEqual(expected);
      expect(nocoDBService.create).toHaveBeenCalledWith('test_table_id', data);
    });

    it('should throw error and log when create fails', async () => {
      const error = new Error('Create failed');
      (nocoDBService.create as jest.Mock).mockRejectedValue(error);

      await expect(repository.create({ name: 'Test' })).rejects.toThrow('Create failed');
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a record', async () => {
      const expected = { id: 1, name: 'Updated' };
      (nocoDBService.update as jest.Mock).mockResolvedValue(expected);

      const result = await repository.update(1, { name: 'Updated' });
      expect(result).toEqual(expected);
      expect(nocoDBService.update).toHaveBeenCalledWith(
        'test_table_id',
        1,
        { name: 'Updated' },
      );
    });

    it('should throw error and log when update fails', async () => {
      const error = new Error('Update failed');
      (nocoDBService.update as jest.Mock).mockRejectedValue(error);

      await expect(repository.update(1, { name: 'Test' })).rejects.toThrow('Update failed');
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a record', async () => {
      (nocoDBService.delete as jest.Mock).mockResolvedValue(undefined);

      await repository.delete(1);
      expect(nocoDBService.delete).toHaveBeenCalledWith('test_table_id', 1);
    });

    it('should throw error and log when delete fails', async () => {
      const error = new Error('Delete failed');
      (nocoDBService.delete as jest.Mock).mockRejectedValue(error);

      await expect(repository.delete(1)).rejects.toThrow('Delete failed');
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });
});
