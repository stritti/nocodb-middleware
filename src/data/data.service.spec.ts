import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataService } from './data.service';
import { NocoDBService } from '../nocodb/nocodb.service';

describe('DataService', () => {
  let nocodb: {
    getTableByName: jest.Mock;
    list: jest.Mock;
    read: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let service: DataService;

  beforeEach(() => {
    nocodb = {
      getTableByName: jest.fn(async (name: string) =>
        name === 'customers' ? { id: 'tbl_customers', table_name: name } : null,
      ),
      list: jest.fn().mockResolvedValue({
        list: [{ id: 1, Name: 'Alice' }],
        pageInfo: { totalRows: 1 },
      }),
      read: jest.fn().mockResolvedValue({ id: 1, Name: 'Alice' }),
      create: jest.fn().mockResolvedValue({ id: 2, Name: 'Bob' }),
      update: jest.fn().mockResolvedValue({ id: 1, Name: 'Carol' }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    service = new DataService(nocodb as unknown as NocoDBService);
  });

  describe('list', () => {
    it('lists records of the resolved table with filter, sort and paging', async () => {
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
      });
      expect(result).toEqual({
        list: [{ id: 1, Name: 'Alice' }],
        pageInfo: { totalRows: 1 },
      });
    });

    it('uses a default page size of 25', async () => {
      await service.list('customers', {});

      expect(nocodb.list).toHaveBeenCalledWith(
        'tbl_customers',
        expect.objectContaining({ limit: 25, offset: 0 }),
      );
    });

    it('returns an empty pageInfo when NocoDB sends none', async () => {
      nocodb.list.mockResolvedValue({ list: [] });

      await expect(service.list('customers', {})).resolves.toEqual({
        list: [],
        pageInfo: { totalRows: 0 },
      });
    });
  });

  it('throws NotFound for a table that does not exist in NocoDB', async () => {
    await expect(service.list('unknown', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
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
        service.create('customers', { Name: 'Bob' }),
      ).resolves.toEqual({ id: 2, Name: 'Bob' });
      expect(nocodb.create).toHaveBeenCalledWith('tbl_customers', {
        Name: 'Bob',
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
  });

  it('deletes the record', async () => {
    await service.delete('customers', 1);

    expect(nocodb.delete).toHaveBeenCalledWith('tbl_customers', 1);
  });
});
