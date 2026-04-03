import { SetMetadata } from '@nestjs/common';
import {
  RequirePermissions,
  RequireCreate,
  RequireRead,
  RequireUpdate,
  RequireDelete,
} from './permissions.decorator';
import { CrudAction } from './enums/crud-action.enum';
import { REQUIRE_PERMISSIONS_KEY } from './permissions.guard';

jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  SetMetadata: jest.fn().mockReturnValue(() => {}),
}));

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
      RequirePermissions(...permissions);
      expect(SetMetadata).toHaveBeenCalledWith(
        REQUIRE_PERMISSIONS_KEY,
        permissions,
      );
    });
  });

  describe('RequireCreate', () => {
    it('should call SetMetadata with CREATE action', () => {
      RequireCreate('users');
      expect(SetMetadata).toHaveBeenCalledWith(REQUIRE_PERMISSIONS_KEY, [
        { table: 'users', action: CrudAction.CREATE },
      ]);
    });
  });

  describe('RequireRead', () => {
    it('should call SetMetadata with READ action', () => {
      RequireRead('orders');
      expect(SetMetadata).toHaveBeenCalledWith(REQUIRE_PERMISSIONS_KEY, [
        { table: 'orders', action: CrudAction.READ },
      ]);
    });
  });

  describe('RequireUpdate', () => {
    it('should call SetMetadata with UPDATE action', () => {
      RequireUpdate('products');
      expect(SetMetadata).toHaveBeenCalledWith(REQUIRE_PERMISSIONS_KEY, [
        { table: 'products', action: CrudAction.UPDATE },
      ]);
    });
  });

  describe('RequireDelete', () => {
    it('should call SetMetadata with DELETE action', () => {
      RequireDelete('items');
      expect(SetMetadata).toHaveBeenCalledWith(REQUIRE_PERMISSIONS_KEY, [
        { table: 'items', action: CrudAction.DELETE },
      ]);
    });
  });
});
