import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { NocoDBService } from '../../src/nocodb/nocodb.service';
import { filterEq } from '../../src/nocodb/nocodb-filter.util';

/**
 * Boots the complete middleware (production HTTP pipeline, schema
 * initialization, auth, RBAC) against a real NocoDB in a fresh base.
 */
const JWT_SECRET = 'integration-test-jwt-secret';
const BOOTSTRAP_TOKEN = 'integration-test-bootstrap-token';
const ADMIN_PASSWORD = 'Integration-Admin-Pw-2026!';

function token(sub: number, roles: string[] = []): string {
  return jwt.sign({ sub, roles }, JWT_SECRET, { expiresIn: '10m' });
}

async function startApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

describe('Middleware against NocoDB v3 (full stack)', () => {
  let app: INestApplication;
  let nocodb: NocoDBService;
  let adminUserId: number;

  beforeAll(async () => {
    Object.assign(process.env, {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      AUTH_PROVIDER: 'local',
      JWT_SECRET,
      BOOTSTRAP_ADMIN_TOKEN: BOOTSTRAP_TOKEN,
      NOCODB_API_URL: process.env.NOCODB_IT_URL,
      NOCODB_API_TOKEN: process.env.NOCODB_IT_TOKEN,
      NOCODB_BASE_ID: process.env.NOCODB_IT_BASE_ID,
      NOCODB_TABLE_PREFIX: 'mw_',
      NOCODB_RETRY_COUNT: '0',
      CORS_ORIGINS: 'http://localhost:3000',
    });

    app = await startApp();
    nocodb = app.get(NocoDBService);
  });

  afterAll(async () => {
    await app?.close();
  });

  const http = () => request(app.getHttpServer());

  describe('schema initialization', () => {
    it('creates the system tables with their fields', async () => {
      const expected: Record<string, string[]> = {
        users: ['username', 'email', 'password_hash', 'is_active'],
        roles: ['role_name', 'description', 'is_system_role'],
        user_roles: ['user_id', 'role_id'],
        table_permissions: ['role_id', 'table_name', 'can_read'],
      };

      for (const [name, fields] of Object.entries(expected)) {
        const table = await nocodb.getTableByName(name);
        expect(table).not.toBeNull();
        const meta = await nocodb.getTableMetadata(table!.id);
        expect(meta.fields?.map((f) => f.title)).toEqual(
          expect.arrayContaining(fields),
        );
      }
    });

    it('seeds the admin role with full access to the system tables', async () => {
      const roles = await nocodb.getTableByName('roles');
      const admin = await nocodb.findOne(
        roles!.id,
        filterEq('role_name', 'admin'),
      );
      const permissions = await nocodb.getTableByName('table_permissions');
      const adminPermissions = await nocodb.listAll(permissions!.id, {
        where: filterEq('role_id', Number(admin!.id)),
      });

      expect(adminPermissions.map((p) => p.table_name).sort()).toEqual([
        'roles',
        'table_permissions',
        'user_roles',
        'users',
      ]);
      expect(adminPermissions.every((p) => p.can_read === true)).toBe(true);
    });

    it('is idempotent across restarts', async () => {
      const tablesBefore = await nocodb.listTables();
      const second = await startApp();
      await second.close();

      const tablesAfter = await nocodb.listTables();
      expect(tablesAfter.map((t) => t.title).sort()).toEqual(
        tablesBefore.map((t) => t.title).sort(),
      );

      const permissions = await nocodb.getTableByName('table_permissions');
      expect(await nocodb.count(permissions!.id)).toBe(4);
    });
  });

  describe('bootstrap and authorization', () => {
    it('creates the first admin with the bootstrap token', async () => {
      const response = await http()
        .post('/api/bootstrap/admin')
        .set('x-bootstrap-token', BOOTSTRAP_TOKEN)
        .send({
          username: 'admin',
          email: 'admin@example.com',
          password: ADMIN_PASSWORD,
        })
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({ success: true, created: true }),
      );
      adminUserId = Number(response.body.userId);
      expect(adminUserId).toBeGreaterThan(0);
    });

    it('authorizes the admin via the role permissions stored in NocoDB', async () => {
      const response = await http()
        .get('/api/admin/permissions/roles')
        .set('Authorization', `Bearer ${token(adminUserId)}`)
        .expect(200);

      expect(
        (response.body.data as Array<{ role_name: string }>).map(
          (r) => r.role_name,
        ),
      ).toContain('admin');
      expect(response.body.meta).toEqual(
        expect.objectContaining({ itemCount: 1 }),
      );
    });

    it('rejects a token for a user that does not exist', () => {
      return http()
        .get('/api/admin/permissions/roles')
        .set('Authorization', `Bearer ${token(999999)}`)
        .expect(401);
    });

    it('denies a provisioned user without role permissions', async () => {
      const created = await http()
        .post('/api/users')
        .set('Authorization', `Bearer ${token(adminUserId, ['admin'])}`)
        .send({
          username: 'viewer',
          email: 'viewer@example.com',
          password: 'Viewer-Password-2026!',
        })
        .expect(201);

      const viewerId = Number(created.body.userId);
      expect(viewerId).toBeGreaterThan(0);

      await http()
        .get('/api/admin/permissions/roles')
        .set('Authorization', `Bearer ${token(viewerId)}`)
        .expect(403);
    });

    it('grants access after assigning a role with permissions', async () => {
      const admin = `Bearer ${token(adminUserId)}`;

      const role = await http()
        .post('/api/admin/permissions/roles')
        .set('Authorization', admin)
        .send({ roleName: 'auditor', description: 'Read roles' })
        .expect(201);
      const roleId = Number(role.body.id);

      await http()
        .post('/api/admin/permissions/table-permissions')
        .set('Authorization', admin)
        .send({
          roleId,
          tableName: 'roles',
          canCreate: false,
          canRead: true,
          canUpdate: false,
          canDelete: false,
        })
        .expect(201);

      const viewer = await nocodb.findOne(
        (await nocodb.getTableByName('users'))!.id,
        filterEq('username', 'viewer'),
      );
      const viewerId = Number(viewer!.id);

      await http()
        .post('/api/admin/permissions/user-roles/assign')
        .set('Authorization', admin)
        .send({ userId: viewerId, roleId })
        .expect(201);

      await http()
        .get('/api/admin/permissions/roles')
        .set('Authorization', `Bearer ${token(viewerId)}`)
        .expect(200);

      await http()
        .post('/api/admin/permissions/roles')
        .set('Authorization', `Bearer ${token(viewerId)}`)
        .send({ roleName: 'sneaky' })
        .expect(403);

      const roles = await http()
        .get(`/api/admin/permissions/users/${viewerId}/roles`)
        .set('Authorization', admin)
        .expect(200);
      expect(roles.body.data).toEqual([
        expect.objectContaining({ id: roleId, role_name: 'auditor' }),
      ]);
    });
  });

  it('lists user tables by logical name in the table catalog', async () => {
    await nocodb.createTable('customers', 'Customers', [
      { title: 'name', type: 'SingleLineText' },
    ]);

    const response = await http()
      .get('/api/meta/tables')
      .set('Authorization', `Bearer ${token(adminUserId, ['admin'])}`)
      .expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({
        tableName: 'customers',
        title: 'mw_customers',
      }),
    ]);
  });

  describe('data API', () => {
    // runs after the catalog test, which creates mw_customers with field 'name'
    const withScope = (scope: string[]) =>
      `Bearer ${jwt.sign({ sub: adminUserId, scope }, JWT_SECRET, { expiresIn: '10m' })}`;

    it('denies a user table without permission (admin role only covers system tables)', () => {
      return http()
        .get('/api/data/customers')
        .set('Authorization', `Bearer ${token(adminUserId)}`)
        .expect(403);
    });

    it('hides system tables', () => {
      return http()
        .get('/api/data/users')
        .set('Authorization', withScope(['*:*']))
        .expect(404);
    });

    it('creates, reads, lists, updates and deletes a record', async () => {
      const auth = withScope(['customers:*']);

      const created = await http()
        .post('/api/data/customers')
        .set('Authorization', auth)
        .send({ name: 'Alice' })
        .expect(201);
      const id = created.body.id as number;
      expect(created.body).toEqual(expect.objectContaining({ name: 'Alice' }));

      await http()
        .get(`/api/data/customers/${id}`)
        .set('Authorization', auth)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual(expect.objectContaining({ id, name: 'Alice' }));
        });

      await http()
        .get('/api/data/customers')
        .query({ limit: 10 })
        .set('Authorization', auth)
        .expect(200)
        .expect(({ body }) => {
          expect(body.list).toEqual(
            expect.arrayContaining([expect.objectContaining({ id })]),
          );
          expect(body.pageInfo.totalRows).toBeGreaterThanOrEqual(1);
        });

      await http()
        .patch(`/api/data/customers/${id}`)
        .set('Authorization', auth)
        .send({ name: 'Alicia' })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual(expect.objectContaining({ id, name: 'Alicia' }));
        });

      await http()
        .delete(`/api/data/customers/${id}`)
        .set('Authorization', auth)
        .expect(204);

      await http()
        .get(`/api/data/customers/${id}`)
        .set('Authorization', auth)
        .expect(404);
    });

    it('answers 404 for updating or deleting a missing record', async () => {
      const auth = withScope(['customers:*']);
      await http()
        .patch('/api/data/customers/999999')
        .set('Authorization', auth)
        .send({ name: 'Ghost' })
        .expect(404);
      await http()
        .delete('/api/data/customers/999999')
        .set('Authorization', auth)
        .expect(404);
    });

    it('answers 400 for a filter NocoDB cannot parse', () => {
      return http()
        .get('/api/data/customers')
        .query({ where: '(name,noSuchOperator,x)' })
        .set('Authorization', withScope(['customers:read']))
        .expect(400);
    });

    it('rejects unknown and read-only fields', async () => {
      const auth = withScope(['customers:create']);
      await http()
        .post('/api/data/customers')
        .set('Authorization', auth)
        .send({ name: 'Bob', isAdmin: true })
        .expect(400);
      await http()
        .post('/api/data/customers')
        .set('Authorization', auth)
        .send({ name: 'Bob', Id: 5 })
        .expect(400);
    });
  });
});
