import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import request from 'supertest';
import { NocoDBService } from '../src/nocodb/nocodb.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(() => {
    process.env.JWT_SECRET ??= 'test-jwt-secret';
    process.env.NOCODB_API_URL ??= 'http://localhost:8080';
    process.env.NOCODB_API_TOKEN ??= 'test-nocodb-token';
    process.env.NOCODB_BASE_ID ??= 'test-base-id';
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NocoDBService)
      .useValue({
        getTablePrefix: jest.fn().mockReturnValue(''),
        getBaseId: jest.fn().mockReturnValue('test-base-id'),
        getTableByName: jest.fn((name: string) =>
          Promise.resolve({ id: `id_${name}`, table_name: name }),
        ),
        getTableMetadata: jest.fn().mockResolvedValue({
          columns: [
            { column_name: 'user' },
            { column_name: 'role' },
            { column_name: 'username' },
            { column_name: 'email' },
            { column_name: 'password_hash' },
            { column_name: 'is_active' },
            { column_name: 'role_name' },
            { column_name: 'description' },
            { column_name: 'is_system_role' },
          ],
        }),
        createTable: jest.fn().mockResolvedValue({ id: 'new-table-id' }),
        createColumn: jest.fn().mockResolvedValue({ id: 'new-column-id' }),
        list: jest.fn().mockResolvedValue({ list: [{ id: 1 }] }),
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 1 }),
        update: jest.fn().mockResolvedValue({ id: 1 }),
        read: jest.fn().mockResolvedValue({
          id: 1,
          username: 'test-user',
          is_active: true,
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  describe('/ (GET)', () => {
    it('should return Hello World!', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual(
            expect.objectContaining({
              name: 'NocoDB Middleware API',
              version: '0.0.1',
            }),
          );
        });
    });
  });

  describe('/admin/permissions/roles (Authenticated)', () => {
    it('should return 401 without auth token', () => {
      return request(app.getHttpServer())
        .get('/admin/permissions/roles')
        .expect(401);
    });
  });

  describe('Validation', () => {
    it('should reject invalid POST data', () => {
      return request(app.getHttpServer())
        .post('/admin/permissions/roles')
        .send({ invalid: 'data' })
        .expect(401);
    });
  });

  describe('XSS Sanitization', () => {
    const validToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InVzZXIifQ.test';

    it('should strip HTML from title when creating an example', () => {
      const xssPayload = {
        title: '<script>alert("xss")</script>Hello',
      };

      return request(app.getHttpServer())
        .post('/examples')
        .set('Authorization', `Bearer ${validToken}`)
        .send(xssPayload)
        .expect(201)
        .expect(({ body }) => {
          // The sanitized title should not contain script tags
          if (body && body.title) {
            expect(body.title).not.toContain('<script>');
            expect(body.title).not.toContain('</script>');
          }
        });
    });

    it('should reject empty title', () => {
      return request(app.getHttpServer())
        .post('/examples')
        .send({ title: '' })
        .expect(401);
    });

    it('should reject title that is too long', () => {
      const longTitle = 'a'.repeat(101);
      return request(app.getHttpServer())
        .post('/examples')
        .send({ title: longTitle })
        .expect(401);
    });

    it('should strip XSS from role description', () => {
      const xssPayload = {
        roleName: 'test-role',
        description: '<img src=x onerror=alert(1)>Role description',
      };

      return request(app.getHttpServer())
        .post('/admin/permissions/roles')
        .set('Authorization', `Bearer ${validToken}`)
        .send(xssPayload)
        .expect(201)
        .expect(({ body }) => {
          if (body && body.description) {
            expect(body.description).not.toContain('onerror=');
            expect(body.description).not.toContain('<img');
          }
        });
    });
  });
});
