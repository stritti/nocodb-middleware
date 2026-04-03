import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { PermissionsManagementController } from './permissions-management.controller';
import { PermissionsManagementService } from './permissions-management.service';
import { RolesService } from '../roles/roles.service';
import { UserRolesService } from '../users/user-roles.service';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsManagementController', () => {
  let controller: PermissionsManagementController;
  let permissionsManagement: jest.Mocked<PermissionsManagementService>;
  let rolesService: jest.Mocked<RolesService>;
  let userRolesService: jest.Mocked<UserRolesService>;

  beforeEach(async () => {
    permissionsManagement = {
      setTablePermissions: jest.fn(),
      batchSetPermissions: jest.fn(),
      getRolePermissions: jest.fn(),
      deleteRolePermissions: jest.fn(),
      copyPermissions: jest.fn(),
    } as any;

    rolesService = {
      createRole: jest.fn(),
      getAllRoles: jest.fn(),
      deleteRole: jest.fn(),
    } as any;

    userRolesService = {
      assignRole: jest.fn(),
      assignMultipleRoles: jest.fn(),
      removeRole: jest.fn(),
      getUserRoles: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsManagementController],
      providers: [
        { provide: PermissionsManagementService, useValue: permissionsManagement },
        { provide: RolesService, useValue: rolesService },
        { provide: UserRolesService, useValue: userRolesService },
      ],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PermissionsManagementController>(
      PermissionsManagementController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── Roles Management ──────────────────────────────────────────────────────

  describe('createRole', () => {
    it('should delegate to rolesService.createRole', async () => {
      const dto = { roleName: 'admin', description: 'Administrator' };
      const expected = { id: 1, role_name: 'admin' };
      rolesService.createRole.mockResolvedValue(expected);

      const result = await controller.createRole(dto as any);
      expect(rolesService.createRole).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('getAllRoles', () => {
    it('should return all roles', async () => {
      const expected = [{ id: 1, role_name: 'admin' }];
      rolesService.getAllRoles.mockResolvedValue(expected);

      const result = await controller.getAllRoles();
      expect(result).toEqual(expected);
    });
  });

  describe('deleteRole', () => {
    it('should delete a role', async () => {
      rolesService.deleteRole.mockResolvedValue(undefined);
      await controller.deleteRole(1);
      expect(rolesService.deleteRole).toHaveBeenCalledWith(1);
    });
  });

  // ── Table Permissions ─────────────────────────────────────────────────────

  describe('setTablePermissions', () => {
    it('should set table permissions', async () => {
      const dto = {
        roleId: 1,
        tableName: 'users',
        canCreate: true,
        canRead: true,
        canUpdate: false,
        canDelete: false,
      };
      const expected = { id: 1, ...dto };
      permissionsManagement.setTablePermissions.mockResolvedValue(expected);

      const result = await controller.setTablePermissions(dto as any);
      expect(permissionsManagement.setTablePermissions).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('batchSetPermissions', () => {
    it('should batch set permissions', async () => {
      const dto = { roleId: 1, permissions: [] };
      const expected = { success: true, count: 0, results: [] };
      permissionsManagement.batchSetPermissions.mockResolvedValue(expected);

      const result = await controller.batchSetPermissions(dto as any);
      expect(result).toEqual(expected);
    });
  });

  describe('getRolePermissions', () => {
    it('should return permissions for a role', async () => {
      const expected = [{ id: 1, table_name: 'users' }];
      permissionsManagement.getRolePermissions.mockResolvedValue(expected);

      const result = await controller.getRolePermissions(1);
      expect(permissionsManagement.getRolePermissions).toHaveBeenCalledWith(1);
      expect(result).toEqual(expected);
    });
  });

  describe('deleteRolePermissions', () => {
    it('should delete all permissions for a role', async () => {
      permissionsManagement.deleteRolePermissions.mockResolvedValue(undefined);
      await controller.deleteRolePermissions(1);
      expect(permissionsManagement.deleteRolePermissions).toHaveBeenCalledWith(1);
    });
  });

  describe('copyPermissions', () => {
    it('should copy permissions from one role to another', async () => {
      const expected = { success: true, copiedCount: 3 };
      permissionsManagement.copyPermissions.mockResolvedValue(expected);

      const result = await controller.copyPermissions(1, 2);
      expect(permissionsManagement.copyPermissions).toHaveBeenCalledWith(1, 2);
      expect(result).toEqual(expected);
    });
  });

  // ── User Roles ────────────────────────────────────────────────────────────

  describe('assignRole', () => {
    it('should assign a role to a user', async () => {
      const dto = { userId: 1, roleId: 2 };
      const expected = { id: 1, ...dto };
      userRolesService.assignRole.mockResolvedValue(expected);

      const result = await controller.assignRole(dto as any);
      expect(userRolesService.assignRole).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('assignMultipleRoles', () => {
    it('should assign multiple roles', async () => {
      const dto = { userId: 1, roleIds: [2, 3] };
      const expected = { assignedCount: 2 };
      userRolesService.assignMultipleRoles.mockResolvedValue(expected);

      const result = await controller.assignMultipleRoles(dto as any);
      expect(result).toEqual(expected);
    });
  });

  describe('removeRole', () => {
    it('should remove a role from a user', async () => {
      userRolesService.removeRole.mockResolvedValue(undefined);
      await controller.removeRole(1, 2);
      expect(userRolesService.removeRole).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('getUserRoles', () => {
    it('should return roles for a user', async () => {
      const expected = [{ id: 1, role_name: 'admin' }];
      userRolesService.getUserRoles.mockResolvedValue(expected);

      const result = await controller.getUserRoles(1);
      expect(result).toEqual(expected);
    });
  });
});
