import { AxiosError, AxiosHeaders, AxiosInstance, AxiosResponse } from 'axios';
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

function httpError(status: number, message: string): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError(message, AxiosError.ERR_BAD_REQUEST, config, {}, {
    status,
    statusText: '',
    data: { message },
    headers: {},
    config,
  } as AxiosResponse);
}

interface Customer {
  id: number;
  Name: string;
}

describe('RecordsService', () => {
  let http: ReturnType<typeof createMockHttp>;
  let records: RecordsService;

  beforeEach(() => {
    http = createMockHttp();
    records = new RecordsService(http as unknown as AxiosInstance);
  });

  describe('list', () => {
    it('returns list and pageInfo', async () => {
      const page = {
        list: [{ id: 1, Name: 'Alice' }],
        pageInfo: { totalRows: 1 },
      };
      http.get.mockResolvedValueOnce({ data: page });

      const result = await records.list<Customer>('customers');

      expect(result).toEqual(page);
      expect(http.get).toHaveBeenCalledWith('/data/customers', { params: {} });
    });

    it('passes filter, sort and paging as query parameters', async () => {
      http.get.mockResolvedValueOnce({
        data: { list: [], pageInfo: { totalRows: 0 } },
      });

      await records.list('customers', {
        where: '(Name,eq,Alice)',
        sort: '-CreatedAt',
        limit: 10,
        offset: 20,
      });

      expect(http.get).toHaveBeenCalledWith('/data/customers', {
        params: {
          where: '(Name,eq,Alice)',
          sort: '-CreatedAt',
          limit: 10,
          offset: 20,
        },
      });
    });

    it('encodes the table name in the path', async () => {
      http.get.mockResolvedValueOnce({
        data: { list: [], pageInfo: { totalRows: 0 } },
      });

      await records.list('../users');

      expect(http.get).toHaveBeenCalledWith('/data/..%2Fusers', { params: {} });
    });
  });

  describe('read', () => {
    it('returns the record', async () => {
      http.get.mockResolvedValueOnce({ data: { id: 1, Name: 'Alice' } });

      await expect(records.read<Customer>('customers', 1)).resolves.toEqual({
        id: 1,
        Name: 'Alice',
      });
      expect(http.get).toHaveBeenCalledWith('/data/customers/1');
    });

    it('rejects with a 404 MiddlewareError when the record does not exist', async () => {
      http.get.mockRejectedValueOnce(httpError(404, 'Record 99 not found'));

      const error = await records
        .read('customers', 99)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(MiddlewareError);
      expect((error as MiddlewareError).statusCode).toBe(404);
    });
  });

  it('create posts the data and returns the created record', async () => {
    http.post.mockResolvedValueOnce({ data: { id: 2, Name: 'Bob' } });

    await expect(
      records.create<Customer>('customers', { Name: 'Bob' }),
    ).resolves.toEqual({
      id: 2,
      Name: 'Bob',
    });
    expect(http.post).toHaveBeenCalledWith('/data/customers', { Name: 'Bob' });
  });

  it('update patches the record and returns it', async () => {
    http.patch.mockResolvedValueOnce({ data: { id: 1, Name: 'Carol' } });

    await expect(
      records.update<Customer>('customers', 1, { Name: 'Carol' }),
    ).resolves.toEqual({
      id: 1,
      Name: 'Carol',
    });
    expect(http.patch).toHaveBeenCalledWith('/data/customers/1', {
      Name: 'Carol',
    });
  });

  it('delete removes the record and resolves without a value', async () => {
    http.delete.mockResolvedValueOnce({ data: '' });

    await expect(records.delete('customers', 1)).resolves.toBeUndefined();
    expect(http.delete).toHaveBeenCalledWith('/data/customers/1');
  });

  it('maps a 403 to a MiddlewareError', async () => {
    http.post.mockRejectedValueOnce(httpError(403, 'Missing permission'));

    const error = await records
      .create('customers', { Name: 'X' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MiddlewareError);
    expect((error as MiddlewareError).statusCode).toBe(403);
  });

  describe('findOne', () => {
    it('returns the first match using limit 1', async () => {
      http.get.mockResolvedValueOnce({
        data: { list: [{ id: 1, Name: 'Alice' }], pageInfo: { totalRows: 1 } },
      });

      await expect(
        records.findOne<Customer>('customers', '(Email,eq,alice@example.com)'),
      ).resolves.toEqual({ id: 1, Name: 'Alice' });
      expect(http.get).toHaveBeenCalledWith('/data/customers', {
        params: { where: '(Email,eq,alice@example.com)', limit: 1 },
      });
    });

    it('returns null when nothing matches', async () => {
      http.get.mockResolvedValueOnce({
        data: { list: [], pageInfo: { totalRows: 0 } },
      });

      await expect(
        records.findOne('customers', '(Name,eq,Nobody)'),
      ).resolves.toBeNull();
    });
  });
});
