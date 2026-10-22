import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { isValidTableName } from './table-name';
import { SetTablePermissionsDto } from '../../permissions/dto/set-table-permissions.dto';
import { TablePermissionItem } from '../../permissions/dto/batch-permissions.dto';

describe('table name rule', () => {
  it.each([
    'customers',
    'sales-orders',
    'Customer Orders',
    'Bestellungen_2026',
    'Kunden Übersicht',
    'x'.repeat(255),
  ])('accepts %j', (name) => {
    expect(isValidTableName(name)).toBe(true);
  });

  it.each([
    '',
    ' leading',
    'trailing ',
    'quote"inside',
    '../users',
    'a/b',
    'tab\there',
    'x'.repeat(256),
  ])('rejects %j', (name) => {
    expect(isValidTableName(name)).toBe(false);
  });

  it.each([
    ['SetTablePermissionsDto', SetTablePermissionsDto],
    ['TablePermissionItem', TablePermissionItem],
  ])('%s applies the same rule', async (_name, dtoClass) => {
    const errorsFor = async (tableName: string) =>
      (
        await validate(
          plainToInstance(dtoClass as new () => object, {
            roleId: 1,
            tableName,
            canCreate: true,
            canRead: true,
            canUpdate: true,
            canDelete: true,
          }),
        )
      ).filter((e) => e.property === 'tableName');

    expect(await errorsFor('Customer Orders')).toHaveLength(0);
    expect(await errorsFor('quote"inside')).not.toHaveLength(0);
  });
});
