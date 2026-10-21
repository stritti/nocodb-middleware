import {
  RequirePermissions,
  RequireCreate,
  RequireRead,
  RequireUpdate,
  RequireDelete,
} from './permissions.decorator';
import { CrudAction } from './enums/crud-action.enum';
import { REQUIRE_PERMISSIONS_KEY } from './permissions.guard';

function applyDecorator(decorator: ClassDecorator) {
  class DecoratedController {}
  decorator(DecoratedController);
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, DecoratedController);
}

describe('permissions.decorator', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('RequirePermissions', () => {
    it('should call SetMetadata with the permissions key and permissions list', () => {
      const permissions = [
        { table: 'users', action: CrudAction.READ },
        { table: 'roles', action: CrudAction.CREATE },
      ];
      expect(applyDecorator(RequirePermissions(...permissions))).toEqual(
        permissions,
      );
    });
  });

  describe('RequireCreate', () => {
    it('should call SetMetadata with CREATE action', () => {
      expect(applyDecorator(RequireCreate('users'))).toEqual([
        { table: 'users', action: CrudAction.CREATE },
      ]);
    });
  });

  describe('RequireRead', () => {
    it('should call SetMetadata with READ action', () => {
      expect(applyDecorator(RequireRead('orders'))).toEqual([
        { table: 'orders', action: CrudAction.READ },
      ]);
    });
  });

  describe('RequireUpdate', () => {
    it('should call SetMetadata with UPDATE action', () => {
      expect(applyDecorator(RequireUpdate('products'))).toEqual([
        { table: 'products', action: CrudAction.UPDATE },
      ]);
    });
  });

  describe('RequireDelete', () => {
    it('should call SetMetadata with DELETE action', () => {
      expect(applyDecorator(RequireDelete('items'))).toEqual([
        { table: 'items', action: CrudAction.DELETE },
      ]);
    });
  });
});
