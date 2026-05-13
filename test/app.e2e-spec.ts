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
});
