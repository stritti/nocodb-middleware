import axios, { AxiosInstance } from 'axios';
import { RecordsService } from '../src/services/records.service';
import { MiddlewareError } from '../src/types';

function createMockHttp() {
  return {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };
}

describe('RecordsService', () => {
  let http: ReturnType<typeof createMockHttp>;
  let service: RecordsService;

  beforeEach(() => {
    http = createMockHttp();
    service = new RecordsService(http as unknown as AxiosInstance);
  });

  describe('list', () => {
    it('returns paginated result', async () => {
      const payload = {
        list: [{ Id: 1, Name: 'Alice' }],
        pageInfo: {
          totalRows: 1,
          page: 1,
          pageSize: 25,
          isFirstPage: true,
          isLastPage: true,
        },
      };
      http.get.mockResolvedValueOnce({ data: payload });

      const result = await service.list('tbl_abc');
      expect(result.list).toHaveLength(1);
      expect(result.pageInfo.totalRows).toBe(1);
      expect(http.get).toHaveBeenCalledWith('/api/v1/db/data/tbl_abc', {
        params: {},
      });
    });

    it('passes filter and sort query params', async () => {
      http.get.mockResolvedValueOnce({
        data: { list: [], pageInfo: { totalRows: 0 } },
      });

      await service.list('tbl_abc', {
        where: '(Name,eq,Alice)',
        sort: '-CreatedAt',
        limit: 10,
      });

      expect(http.get).toHaveBeenCalledWith('/api/v1/db/data/tbl_abc', {
        params: { where: '(Name,eq,Alice)', sort: '-CreatedAt', limit: 10 },
      });
    });
  });

  describe('read', () => {
    it('returns the record', async () => {
      const record = { Id: 1, Name: 'Alice' };
      http.get.mockResolvedValueOnce({ data: record });

      const result = await service.read('tbl_abc', 1);
      expect(result).toEqual(record);
    });

    it('throws MiddlewareError on 404', async () => {
      const axiosErr = Object.assign(new Error('Not found'), {
        response: { status: 404, data: { message: 'Not found' } },
      });
      jest.spyOn(axios, 'isAxiosError').mockReturnValueOnce(true);
      http.get.mockRejectedValueOnce(axiosErr);

      await expect(service.read('tbl_abc', 999)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('create', () => {
    it('posts data and returns created record', async () => {
      const created = { Id: 2, Name: 'Bob' };
      http.post.mockResolvedValueOnce({ data: created });

      const result = await service.create('tbl_abc', { Name: 'Bob' });
      expect(result).toEqual(created);
      expect(http.post).toHaveBeenCalledWith('/api/v1/db/data/tbl_abc', {
        Name: 'Bob',
      });
    });
  });

  describe('update', () => {
    it('patches record and returns updated record', async () => {
      const updated = { Id: 1, Name: 'Alice Updated' };
      http.patch.mockResolvedValueOnce({ data: updated });

      const result = await service.update('tbl_abc', 1, {
        Name: 'Alice Updated',
      });
      expect(result).toEqual(updated);
      expect(http.patch).toHaveBeenCalledWith('/api/v1/db/data/tbl_abc/1', {
        Name: 'Alice Updated',
      });
    });
  });

  describe('delete', () => {
    it('calls delete endpoint', async () => {
      http.delete.mockResolvedValueOnce({});

      await service.delete('tbl_abc', 1);

      expect(http.delete).toHaveBeenCalledWith('/api/v1/db/data/tbl_abc/1');
    });
  });

  describe('findOne', () => {
    it('returns first matching record', async () => {
      const record = { Id: 1, Email: 'alice@example.com' };
      http.get.mockResolvedValueOnce({
        data: { list: [record], pageInfo: { totalRows: 1 } },
      });

      const result = await service.findOne(
        'tbl_abc',
        '(Email,eq,alice@example.com)',
      );
      expect(result).toEqual(record);
    });

    it('returns null when no match', async () => {
      http.get.mockResolvedValueOnce({
        data: { list: [], pageInfo: { totalRows: 0 } },
      });

      const result = await service.findOne('tbl_abc', '(Email,eq,nobody)');
      expect(result).toBeNull();
    });
  });

  describe('error wrapping', () => {
    it('wraps thrown errors as MiddlewareError', async () => {
      http.post.mockRejectedValueOnce(new Error('boom'));

      await expect(
        service.create('tbl_abc', { Name: 'X' }),
      ).rejects.toBeInstanceOf(MiddlewareError);
    });
  });
});
