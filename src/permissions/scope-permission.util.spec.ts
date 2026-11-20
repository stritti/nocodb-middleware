import { hasScopePermission } from './scope-permission.util';
import { CrudAction } from './enums/crud-action.enum';
import { SYSTEM_TABLE_NAMES } from '../common/system-table-names';

describe('hasScopePermission', () => {
  it('denies when scope is missing, empty or not an array', () => {
    expect(hasScopePermission(undefined, 'customers', CrudAction.READ)).toBe(
      false,
    );
    expect(hasScopePermission([], 'customers', CrudAction.READ)).toBe(false);
    expect(hasScopePermission('*:*', 'customers', CrudAction.READ)).toBe(false);
  });

  it.each([['customers:read'], ['customers:*'], ['*:read'], ['*:*']])(
    'grants read on a data table for scope %s',
    (scope) => {
      expect(hasScopePermission([scope], 'customers', CrudAction.READ)).toBe(
        true,
      );
    },
  );

  it('does not grant a different action or table', () => {
    expect(
      hasScopePermission(['customers:read'], 'customers', CrudAction.DELETE),
    ).toBe(false);
    expect(hasScopePermission(['orders:*'], 'customers', CrudAction.READ)).toBe(
      false,
    );
  });

  describe.each(Object.values(SYSTEM_TABLE_NAMES))(
    'system table %s',
    (table) => {
      it.each([['*:*'], ['*:create'], ['*:read']])(
        'is not covered by wildcard scope %s',
        (scope) => {
          expect(hasScopePermission([scope], table, CrudAction.CREATE)).toBe(
            false,
          );
          expect(hasScopePermission([scope], table, CrudAction.READ)).toBe(
            false,
          );
        },
      );

      it('is granted by an explicit table scope', () => {
        expect(
          hasScopePermission([`${table}:create`], table, CrudAction.CREATE),
        ).toBe(true);
        expect(
          hasScopePermission([`${table}:*`], table, CrudAction.DELETE),
        ).toBe(true);
      });
    },
  );
});
