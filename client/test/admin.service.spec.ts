import { AxiosInstance } from 'axios';
import { AdminService } from '../src/services/admin.service';

function createMockHttp() {
  return {
    get: jest.fn(),
    post: jest.fn(),
  };
}

describe('AdminService', () => {
  let http: ReturnType<typeof createMockHttp>;
  let service: AdminService;

  beforeEach(() => {
    http = createMockHttp();
    service = new AdminService(http as unknown as AxiosInstance);
  });

  describe('listTables', () => {
    it('returns array of tables', async () => {
      const tables = [{ id: '1', table_name: 'products', title: 'Products' }];
      http.get.mockResolvedValueOnce({ data: tables });

      const result = await service.listTables();
      expect(result).toEqual(tables);
      expect(http.get).toHaveBeenCalledWith('/meta/tables');
    });
  });

  describe('listRoles', () => {
    it('returns array of roles', async () => {
      const roles = [{ id: 1, roleName: 'editor', isSystemRole: false }];
      http.get.mockResolvedValueOnce({ data: roles });

      const result = await service.listRoles();
      expect(result).toEqual(roles);
      expect(http.get).toHaveBeenCalledWith('/admin/permissions/roles');
    });
  });

  describe('createRole', () => {
    it('posts role data and returns created role', async () => {
      const created = { id: 2, roleName: 'viewer', isSystemRole: false };
      http.post.mockResolvedValueOnce({ data: created });

      const result = await service.createRole('viewer', 'Read-only access');
      expect(result).toEqual(created);
      expect(http.post).toHaveBeenCalledWith('/admin/permissions/roles', {
        roleName: 'viewer',
        description: 'Read-only access',
        isSystemRole: undefined,
      });
    });
  });

  describe('setTablePermissions', () => {
    it('posts permission flags', async () => {
      http.post.mockResolvedValueOnce({});

      await service.setTablePermissions(1, 'products', {
        canCreate: true,
        canRead: true,
        canUpdate: false,
        canDelete: false,
      });

      expect(http.post).toHaveBeenCalledWith('/admin/permissions/tables', {
        roleId: 1,
        tableName: 'products',
        canCreate: true,
        canRead: true,
        canUpdate: false,
        canDelete: false,
      });
    });
  });

  describe('createUser', () => {
    it('provisions a user and returns it', async () => {
      const user = {
        id: 1,
        username: 'alice',
        email: 'alice@example.com',
        isActive: true,
        roles: ['editor'],
      };
      http.post.mockResolvedValueOnce({ data: user });

      const result = await service.createUser({
        username: 'alice',
        email: 'alice@example.com',
        password: 'P@ss1',
        roles: ['editor'],
      });
      expect(result).toEqual(user);
    });
  });

  describe('healthCheck', () => {
    it('returns health status', async () => {
      http.get.mockResolvedValueOnce({ data: { status: 'ok' } });

      const result = await service.healthCheck();
      expect(result.status).toBe('ok');
      expect(http.get).toHaveBeenCalledWith('/health');
    });
  });
});
