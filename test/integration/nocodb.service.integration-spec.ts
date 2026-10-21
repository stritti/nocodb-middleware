import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { NocoDBService } from '../../src/nocodb/nocodb.service';
import { NocoDBException } from '../../src/nocodb/exceptions/nocodb.exception';
import {
  andFilters,
  filterChecked,
  filterEq,
  filterIn,
} from '../../src/nocodb/nocodb-filter.util';

/**
 * Runs NocoDBService against a real NocoDB instance (see global-setup.cjs).
 * Every run works in its own, freshly created base.
 */
function createService(tablePrefix = ''): NocoDBService {
  const values: Record<string, string> = {
    'nocodb.apiUrl': process.env.NOCODB_IT_URL!,
    'nocodb.apiToken': process.env.NOCODB_IT_TOKEN!,
    'nocodb.baseId': process.env.NOCODB_IT_BASE_ID!,
    'nocodb.tablePrefix': tablePrefix,
    NOCODB_RETRY_COUNT: '0',
  };
  const config = {
    get: (key: string, fallback?: unknown) => values[key] ?? fallback,
  } as unknown as ConfigService;

  const service = new NocoDBService(config);
  service.onModuleInit();
  return service;
}

describe('NocoDBService against NocoDB v3', () => {
  const nocodb = createService();
  let tableId: string;

  beforeAll(async () => {
    const table = await nocodb.createTable('people', 'people', [
      { title: 'name', type: 'SingleLineText' },
      { title: 'age', type: 'Number' },
      { title: 'active', type: 'Checkbox' },
    ]);
    tableId = String(table.id);
  });

  describe('meta API', () => {
    it('finds a table by name', async () => {
      const table = await nocodb.getTableByName('people');
      expect(table?.id).toBe(tableId);
      await expect(nocodb.tableExists('people')).resolves.toBe(true);
    });

    it('returns null for an unknown table', async () => {
      await expect(nocodb.getTableByName('missing')).resolves.toBeNull();
      await expect(nocodb.tableExists('missing')).resolves.toBe(false);
    });

    it('lists the fields of a table', async () => {
      const meta = await nocodb.getTableMetadata(tableId);
      expect(meta.fields?.map((f) => f.title)).toEqual(
        expect.arrayContaining(['name', 'age', 'active']),
      );
    });

    it('adds a field to an existing table', async () => {
      await nocodb.createColumn(tableId, { title: 'email', type: 'Email' });
      const meta = await nocodb.getTableMetadata(tableId);
      expect(meta.fields?.map((f) => f.title)).toContain('email');
    });
  });

  describe('data API', () => {
    let aliceId: number;
    let bobId: number;

    beforeAll(async () => {
      const alice = await nocodb.create(tableId, {
        name: 'Alice',
        age: 30,
        active: true,
      });
      const bob = await nocodb.create(tableId, {
        name: 'Bob',
        age: 40,
        active: false,
      });
      aliceId = Number(alice.id);
      bobId = Number(bob.id);
    });

    it('creates records and returns them flat with their id', async () => {
      const carol = await nocodb.create(tableId, { name: 'Carol', age: 25 });
      expect(carol).toEqual(
        expect.objectContaining({ id: expect.any(Number), name: 'Carol' }),
      );
      await nocodb.delete(tableId, Number(carol.id));
    });

    it('reads a record flat', async () => {
      await expect(nocodb.read(tableId, aliceId)).resolves.toEqual(
        expect.objectContaining({ id: aliceId, name: 'Alice', age: 30 }),
      );
    });

    it('returns null when reading a missing record', async () => {
      await expect(nocodb.read(tableId, 999999)).resolves.toBeNull();
    });

    it('updates a record and returns it flat', async () => {
      const updated = await nocodb.update(tableId, bobId, { age: 41 });
      expect(updated).toEqual(
        expect.objectContaining({ id: bobId, name: 'Bob', age: 41 }),
      );
    });

    it('throws a 404 NocoDBException when updating a missing record', async () => {
      const error = await nocodb
        .update(tableId, 999999, { age: 1 })
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(NocoDBException);
      expect((error as NocoDBException).getStatus()).toBe(HttpStatus.NOT_FOUND);
    });

    it('lists with filter, sort, paging and total count', async () => {
      const page = await nocodb.list(tableId, {
        where: filterIn('name', ['Alice', 'Bob']),
        sort: '-age',
        limit: 1,
        offset: 0,
        withCount: true,
      });
      expect(page.list.map((r) => r.name)).toEqual(['Bob']);
      expect(page.pageInfo?.totalRows).toBe(2);

      const next = await nocodb.list(tableId, {
        where: filterIn('name', ['Alice', 'Bob']),
        sort: '-age',
        limit: 1,
        offset: 1,
      });
      expect(next.list.map((r) => r.name)).toEqual(['Alice']);
    });

    it('lists only the first page of 25 records by default', async () => {
      const bulk = await nocodb.createTable('bulk', 'bulk', [
        { title: 'n', type: 'Number' },
      ]);
      const bulkId = String(bulk.id);
      for (let n = 0; n < 27; n++) {
        await nocodb.create(bulkId, { n });
      }

      const page = await nocodb.list(bulkId);
      expect(page.list).toHaveLength(25);

      const all = await nocodb.listAll(bulkId, { sort: 'n' }, 10);
      expect(all.map((r) => r.n)).toEqual(
        Array.from({ length: 27 }, (_, n) => n),
      );

      const filtered = await nocodb.listAll(
        bulkId,
        { where: filterIn('n', [3, 26]) },
        10,
      );
      expect(filtered.map((r) => r.n).sort()).toEqual([26, 3].sort());
    });

    it('filters checkbox fields', async () => {
      const page = await nocodb.list(tableId, {
        where: andFilters(filterChecked('active'), filterEq('name', 'Alice')),
      });
      expect(page.list.map((r) => r.id)).toEqual([aliceId]);
    });

    it('sorts by record id', async () => {
      const page = await nocodb.list(tableId, {
        where: filterIn('id', [aliceId, bobId]),
        sort: '-id',
      });
      expect(page.list.map((r) => r.id)).toEqual([bobId, aliceId]);
    });

    it('filters by record id', async () => {
      const page = await nocodb.list(tableId, {
        where: filterIn('id', [aliceId]),
      });
      expect(page.list.map((r) => r.id)).toEqual([aliceId]);
    });

    it('finds a single record or null', async () => {
      await expect(
        nocodb.findOne(tableId, filterEq('name', 'Alice')),
      ).resolves.toEqual(expect.objectContaining({ id: aliceId }));
      await expect(
        nocodb.findOne(tableId, filterEq('name', 'Nobody')),
      ).resolves.toBeNull();
    });

    it('deletes a record', async () => {
      const temp = await nocodb.create(tableId, { name: 'Temp' });
      await nocodb.delete(tableId, Number(temp.id));
      await expect(nocodb.read(tableId, Number(temp.id))).resolves.toBeNull();
    });

    it('throws a 404 NocoDBException when deleting a missing record', async () => {
      const error = await nocodb
        .delete(tableId, 999999)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(NocoDBException);
      expect((error as NocoDBException).getStatus()).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('table prefix', () => {
    const prefixed = createService('app_');

    it('creates and finds tables under the prefixed name', async () => {
      const table = await prefixed.createTable('orders', 'orders', [
        { title: 'total', type: 'Number' },
      ]);

      await expect(prefixed.getTableByName('orders')).resolves.toEqual(
        expect.objectContaining({ id: table.id }),
      );
      await expect(nocodb.getTableByName('app_orders')).resolves.toEqual(
        expect.objectContaining({ id: table.id }),
      );
      await expect(nocodb.getTableByName('orders')).resolves.toBeNull();
    });
  });
});
