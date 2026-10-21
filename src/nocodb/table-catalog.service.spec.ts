import { TableCatalogService } from './table-catalog.service';
import { NocoDBService } from './nocodb.service';

function serviceWith(prefix: string, titles: string[]) {
  const nocodb = {
    getTablePrefix: () => prefix,
    listTables: jest
      .fn()
      .mockResolvedValue(
        titles.map((title, index) => ({ id: `t${index}`, title })),
      ),
  };
  return new TableCatalogService(nocodb as unknown as NocoDBService);
}

describe('TableCatalogService', () => {
  it('lists user tables by name and hides system tables', async () => {
    const service = serviceWith('', ['customers', 'users', 'roles', 'orders']);

    await expect(service.listExternalTables()).resolves.toEqual([
      { id: 't0', tableName: 'customers', title: 'customers' },
      { id: 't3', tableName: 'orders', title: 'orders' },
    ]);
  });

  it('returns logical names without the prefix, usable with the data API', async () => {
    const service = serviceWith('app_', [
      'app_customers',
      'app_users',
      'app_user_roles',
    ]);

    await expect(service.listExternalTables()).resolves.toEqual([
      { id: 't0', tableName: 'customers', title: 'app_customers' },
    ]);
  });

  it('omits tables outside the configured prefix', async () => {
    const service = serviceWith('app_', ['app_customers', 'legacy']);

    const tables = await service.listExternalTables();

    expect(tables.map((t) => t.tableName)).toEqual(['customers']);
  });

  it('skips malformed table entries', async () => {
    const nocodb = {
      getTablePrefix: () => '',
      listTables: jest
        .fn()
        .mockResolvedValue([{ id: 't0', title: 'ok' }, { id: 't1' }, null]),
    };
    const service = new TableCatalogService(nocodb as unknown as NocoDBService);

    await expect(service.listExternalTables()).resolves.toEqual([
      { id: 't0', tableName: 'ok', title: 'ok' },
    ]);
  });
});
