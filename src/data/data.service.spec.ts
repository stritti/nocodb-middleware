import {
  BadRequestException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { DataService, TABLE_CACHE_TTL_MS } from './data.service';
import { NocoDBService } from '../nocodb/nocodb.service';
import { NocoDBException } from '../nocodb/exceptions/nocodb.exception';

const CUSTOMERS_META = {
  id: 'tbl_customers',
  title: 'customers',
  fields: [
    { id: 'f0', title: 'Id', type: 'ID' },
    { id: 'f1', title: 'Name', type: 'SingleLineText' },
    { id: 'f2', title: 'Email', type: 'Email' },
    { id: 'f3', title: 'Total', type: 'Formula' },
    { id: 'f4', title: 'CreatedAt', type: 'CreatedTime' },
    { id: 'f5', title: 'Orders', type: 'Links' },
  ],
};

function upstreamError(status: number): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError(
    `Request failed with status code ${status}`,
    AxiosError.ERR_BAD_REQUEST,
    config,
    {},
    {
      status,
      statusText: '',
      data: { msg: 'Invalid value for field Email' },
      headers: {},
      config,
    } as AxiosResponse,
  );
}

describe('DataService', () => {
  let nocodb: {
    getTableByName: jest.Mock;
    getTableMetadata: jest.Mock;
    list: jest.Mock;
    read: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let service: DataService;
  let now: number;

  beforeEach(() => {
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    nocodb = {
      getTableByName: jest.fn(async (name: string) =>
        name === 'customers' ? { id: 'tbl_customers', title: name } : null,
      ),
      getTableMetadata: jest.fn().mockResolvedValue(CUSTOMERS_META),
      list: jest.fn().mockResolvedValue({
        list: [{ id: 1, Name: 'Alice' }],
        pageInfo: { totalRows: 1, pageSize: 25 },
      }),
      read: jest.fn().mockResolvedValue({ id: 1, Name: 'Alice' }),
      create: jest.fn().mockResolvedValue({ id: 2, Name: 'Bob' }),
      update: jest.fn().mockResolvedValue({ id: 1, Name: 'Carol' }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    service = new DataService(nocodb as unknown as NocoDBService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('list', () => {
    it('lists records with filter, sort, paging and a total count', async () => {
      const result = await service.list('customers', {
        where: '(Name,eq,Alice)',
        sort: '-CreatedAt',
        limit: 10,
        offset: 20,
      });

      expect(nocodb.list).toHaveBeenCalledWith('tbl_customers', {
        where: '(Name,eq,Alice)',
        sort: '-CreatedAt',
        limit: 10,
        offset: 20,
        withCount: true,
      });
      expect(result).toEqual({
        list: [{ id: 1, Name: 'Alice' }],
        pageInfo: { totalRows: 1, pageSize: 25 },
      });
    });

    it('uses a default page size of 25', async () => {
      await service.list('customers', {});

      expect(nocodb.list).toHaveBeenCalledWith(
        'tbl_customers',
        expect.objectContaining({ limit: 25, offset: 0 }),
      );
    });

    it('never reports fewer rows than it returns when NocoDB sends no pageInfo', async () => {
      nocodb.list.mockResolvedValue({ list: [{ id: 1 }, { id: 2 }] });

      const result = await service.list('customers', { offset: 40 });

      expect(result.pageInfo.totalRows).toBe(42);
    });
  });

  describe('list with a query NocoDB rejects', () => {
    it.each([400, 422])(
      'turns an upstream %i for an invalid where/sort into a 400',
      async (status) => {
        nocodb.list.mockRejectedValue(upstreamError(status));

        const error = await service
          .list('customers', { where: '(Name,eqq,Alice' })
          .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).message).toBe(
          'NocoDB rejected the query (where/sort)',
        );
      },
    );

    it('does not hide other upstream errors', async () => {
      const error = upstreamError(503);
      nocodb.list.mockRejectedValue(error);

      await expect(service.list('customers', {})).rejects.toBe(error);
    });
  });

  describe('table lookup', () => {
    it('throws NotFound for a table that does not exist in NocoDB', async () => {
      await expect(service.list('unknown', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('caches the table lookup instead of listing all tables on every request', async () => {
      await service.list('customers', {});
      await service.read('customers', 1);
      await service.create('customers', { Name: 'Bob' });

      expect(nocodb.getTableByName).toHaveBeenCalledTimes(1);
      expect(nocodb.getTableMetadata).toHaveBeenCalledTimes(1);
    });

    it('refreshes the cached lookup after the TTL', async () => {
      await service.list('customers', {});
      now += TABLE_CACHE_TTL_MS + 1;
      await service.list('customers', {});

      expect(nocodb.getTableByName).toHaveBeenCalledTimes(2);
    });

    it('does not cache a missing table, so a newly created one is found', async () => {
      await expect(service.list('orders', {})).rejects.toThrow();
      nocodb.getTableByName.mockResolvedValueOnce({
        id: 'tbl_orders',
        title: 'orders',
      });

      await expect(service.list('orders', {})).resolves.toBeDefined();
    });
  });

  describe('read', () => {
    it('returns the record', async () => {
      await expect(service.read('customers', 1)).resolves.toEqual({
        id: 1,
        Name: 'Alice',
      });
      expect(nocodb.read).toHaveBeenCalledWith('tbl_customers', 1);
    });

    it('throws NotFound when the record does not exist', async () => {
      nocodb.read.mockResolvedValue(null);

      await expect(service.read('customers', 99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates the record and returns it', async () => {
      await expect(
        service.create('customers', { Name: 'Bob', Email: 'bob@x.io' }),
      ).resolves.toEqual({ id: 2, Name: 'Bob' });
      expect(nocodb.create).toHaveBeenCalledWith('tbl_customers', {
        Name: 'Bob',
        Email: 'bob@x.io',
      });
    });

    it.each([[[{ Name: 'Bob' }]], [null], ['text'], [{}]])(
      'rejects the body %j because it is not a non-empty object',
      async (body) => {
        await expect(
          service.create('customers', body as never),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(nocodb.create).not.toHaveBeenCalled();
      },
    );

    it('rejects fields that do not exist in the table', async () => {
      const error = await service
        .create('customers', { Name: 'Bob', isAdmin: true, Secret: 1 })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toBe(
        'Unknown fields: isAdmin, Secret',
      );
      expect(nocodb.create).not.toHaveBeenCalled();
    });

    it.each(['Id', 'id', 'Total', 'CreatedAt', 'Orders'])(
      'rejects writing the read-only field %s',
      async (field) => {
        await expect(
          service.create('customers', { Name: 'Bob', [field]: 'x' }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(nocodb.create).not.toHaveBeenCalled();
      },
    );

    it.each([400, 422])(
      'turns an upstream %i validation error into a 400',
      async (status) => {
        nocodb.create.mockRejectedValue(upstreamError(status));

        await expect(
          service.create('customers', { Email: 'not-an-email' }),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );

    it('does not hide other upstream errors', async () => {
      const error = upstreamError(500);
      nocodb.create.mockRejectedValue(error);

      await expect(service.create('customers', { Name: 'Bob' })).rejects.toBe(
        error,
      );
    });
  });

  describe('update', () => {
    it('updates the record and returns it', async () => {
      await expect(
        service.update('customers', 1, { Name: 'Carol' }),
      ).resolves.toEqual({ id: 1, Name: 'Carol' });
      expect(nocodb.update).toHaveBeenCalledWith('tbl_customers', 1, {
        Name: 'Carol',
      });
    });

    it('rejects an array body', async () => {
      await expect(
        service.update('customers', 1, [] as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects read-only and unknown fields', async () => {
      await expect(
        service.update('customers', 1, { CreatedAt: '2020-01-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.update('customers', 1, { nope: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(nocodb.update).not.toHaveBeenCalled();
    });

    it('passes the 404 of a missing record through', async () => {
      nocodb.update.mockRejectedValue(
        NocoDBException.recordNotFound('tbl_customers', 99),
      );

      const error = await service
        .update('customers', 99, { Name: 'X' })
        .catch((e: unknown) => e);

      expect((error as HttpException).getStatus()).toBe(404);
    });
  });

  describe('delete', () => {
    it('deletes the record', async () => {
      await service.delete('customers', 1);

      expect(nocodb.delete).toHaveBeenCalledWith('tbl_customers', 1);
    });

    it('passes the 404 of a missing record through', async () => {
      nocodb.delete.mockRejectedValue(
        NocoDBException.recordNotFound('tbl_customers', 99),
      );

      const error = await service
        .delete('customers', 99)
        .catch((e: unknown) => e);

      expect((error as HttpException).getStatus()).toBe(404);
    });
  });
});
