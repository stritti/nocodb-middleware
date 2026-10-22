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

  // Response bodies below are the shapes the Middleware actually returns:
  // paginated { data, meta } and NocoDB records with snake_case fields.
  const SERVER_META = {
    page: 1,
    take: 10,
    itemCount: 12,
    pageCount: 2,
    hasPreviousPage: false,
    hasNextPage: true,
  };

  describe('listRoles', () => {
    it('returns a page of roles mapped to the client shape', async () => {
      http.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 1,
              role_name: 'editor',
              description: 'Edits content',
              is_system_role: false,
            },
          ],
          meta: SERVER_META,
        },
      });

      const result = await service.listRoles();

      expect(result).toEqual({
        data: [
          {
            id: 1,
            roleName: 'editor',
            description: 'Edits content',
            isSystemRole: false,
          },
        ],
        meta: SERVER_META,
      });
      expect(http.get).toHaveBeenCalledWith('/admin/permissions/roles', {
        params: {},
      });
    });

    it('passes page, take and order as query parameters', async () => {
      http.get.mockResolvedValueOnce({ data: { data: [], meta: SERVER_META } });

      await service.listRoles({ page: 2, take: 50, order: 'DESC' });

      expect(http.get).toHaveBeenCalledWith('/admin/permissions/roles', {
        params: { page: 2, take: 50, order: 'DESC' },
      });
    });
  });

  describe('createRole', () => {
    it('posts role data and returns the created role in client shape', async () => {
      http.post.mockResolvedValueOnce({
        data: { id: 2, role_name: 'viewer', is_system_role: false },
      });

      const result = await service.createRole('viewer', 'Read-only access');
      expect(result).toEqual({
        id: 2,
        roleName: 'viewer',
        description: undefined,
        isSystemRole: false,
      });
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

      expect(http.post).toHaveBeenCalledWith(
        '/admin/permissions/table-permissions',
        {
          roleId: 1,
          tableName: 'products',
          canCreate: true,
          canRead: true,
          canUpdate: false,
          canDelete: false,
        },
      );
    });
  });

  describe('createUser', () => {
    it('provisions a user and returns it in client shape', async () => {
      http.post.mockResolvedValueOnce({
        data: {
          userId: 1,
          username: 'alice',
          email: 'alice@example.com',
          roles: ['editor'],
          active: true,
        },
      });

      const result = await service.createUser({
        username: 'alice',
        email: 'alice@example.com',
        password: 'P@ss1',
        roles: ['editor'],
      });
      expect(result).toEqual({
        id: 1,
        username: 'alice',
        email: 'alice@example.com',
        isActive: true,
        roles: ['editor'],
      });
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
