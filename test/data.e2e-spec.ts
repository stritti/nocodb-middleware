import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from './../src/app.module';
import { NocoDBService } from './../src/nocodb/nocodb.service';
import { DatabaseInitializationService } from './../src/nocodb/database-initialization.service';

const TEST_JWT_SECRET = 'test-jwt-secret-for-data-e2e-2026';

function token(scope?: string[]): string {
  return jwt.sign(
    { sub: 1, username: 'alice', roles: ['user'], scope },
    TEST_JWT_SECRET,
    { expiresIn: '1h' },
  );
}

const TABLES: Record<string, { id: string; table_name: string }> = {
  users: { id: 'tbl_users', table_name: 'users' },
  customers: { id: 'tbl_customers', table_name: 'customers' },
  // required at startup by ExampleRepository (NocoDBModule)
  examples: { id: 'tbl_examples', table_name: 'examples' },
};

const CUSTOMERS: Record<number, Record<string, unknown>> = {
  1: { id: 1, Name: 'Alice' },
};

const mockNocoDBService = {
  getTableByName: jest.fn(async (name: string) => TABLES[name] ?? null),
  read: jest.fn(async (tableId: string, id: number) => {
    if (tableId === 'tbl_users') {
      return { id, username: 'alice', is_active: true };
    }
    return CUSTOMERS[id] ?? null;
  }),
  list: jest.fn().mockResolvedValue({
    list: [{ id: 1, Name: 'Alice' }],
    pageInfo: { totalRows: 1 },
  }),
  create: jest.fn(async (_tableId: string, data: object) => ({
    id: 2,
    ...data,
  })),
  update: jest.fn(async (_tableId: string, id: number, data: object) => ({
    id,
    ...data,
  })),
  delete: jest.fn().mockResolvedValue(undefined),
  getBaseId: jest.fn().mockReturnValue('test-base'),
  getTablePrefix: jest.fn().mockReturnValue(''),
};

describe('Data API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    process.env.NODE_ENV = 'test';
    process.env.NOCODB_API_URL = 'http://localhost:8080';
    process.env.NOCODB_API_TOKEN = 'test-token';
    process.env.NOCODB_BASE_ID = 'test-base';
    process.env.AUTH_PROVIDER = 'local';
    process.env.LOG_LEVEL = 'silent';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NocoDBService)
      .useValue(mockNocoDBService)
      .overrideProvider(DatabaseInitializationService)
      .useValue({ onModuleInit: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    // same configuration as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const http = () => request(app.getHttpServer());

  describe('authorization', () => {
    it('requires a JWT', () => {
      return http().get('/api/data/customers').expect(401);
    });

    it('denies access without permission for the table', () => {
      return http()
        .get('/api/data/customers')
        .set('Authorization', `Bearer ${token()}`)
        .expect(403);
    });

    it('does not let a read scope create records', () => {
      return http()
        .post('/api/data/customers')
        .set('Authorization', `Bearer ${token(['customers:read'])}`)
        .send({ Name: 'Mallory' })
        .expect(403);
    });

    it('hides internal system tables even with full scope', () => {
      return http()
        .get('/api/data/users')
        .set('Authorization', `Bearer ${token(['*:*'])}`)
        .expect(404);
    });
  });

  describe('GET /api/data/:table', () => {
    it('lists records with filter, sort and paging', async () => {
      await http()
        .get('/api/data/customers')
        .query({
          where: '(Name,eq,Alice)',
          sort: '-Name',
          limit: 10,
          offset: 5,
        })
        .set('Authorization', `Bearer ${token(['customers:read'])}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({
            list: [{ id: 1, Name: 'Alice' }],
            pageInfo: { totalRows: 1 },
          });
        });

      expect(mockNocoDBService.list).toHaveBeenCalledWith('tbl_customers', {
        where: '(Name,eq,Alice)',
        sort: '-Name',
        limit: 10,
        offset: 5,
      });
    });

    it('rejects a page size above 100', () => {
      return http()
        .get('/api/data/customers')
        .query({ limit: 500 })
        .set('Authorization', `Bearer ${token(['customers:read'])}`)
        .expect(400);
    });

    it('returns 404 for a table that does not exist', () => {
      return http()
        .get('/api/data/orders')
        .set('Authorization', `Bearer ${token(['*:*'])}`)
        .expect(404);
    });
  });

  describe('GET /api/data/:table/:id', () => {
    it('returns the record', () => {
      return http()
        .get('/api/data/customers/1')
        .set('Authorization', `Bearer ${token(['customers:read'])}`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ id: 1, Name: 'Alice' });
        });
    });

    it('returns 404 for a missing record', () => {
      return http()
        .get('/api/data/customers/999')
        .set('Authorization', `Bearer ${token(['customers:read'])}`)
        .expect(404);
    });

    it('returns 400 for a non-numeric id', () => {
      return http()
        .get('/api/data/customers/abc')
        .set('Authorization', `Bearer ${token(['customers:read'])}`)
        .expect(400);
    });
  });

  describe('writes', () => {
    it('POST creates a record', () => {
      return http()
        .post('/api/data/customers')
        .set('Authorization', `Bearer ${token(['customers:create'])}`)
        .send({ Name: 'Bob' })
        .expect(201)
        .expect(({ body }) => {
          expect(body).toEqual({ id: 2, Name: 'Bob' });
        });
    });

    it('POST rejects an empty body', () => {
      return http()
        .post('/api/data/customers')
        .set('Authorization', `Bearer ${token(['customers:create'])}`)
        .send({})
        .expect(400);
    });

    it('PATCH updates a record', () => {
      return http()
        .patch('/api/data/customers/1')
        .set('Authorization', `Bearer ${token(['customers:update'])}`)
        .send({ Name: 'Carol' })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ id: 1, Name: 'Carol' });
        });
    });

    it('DELETE removes a record and returns 204', async () => {
      await http()
        .delete('/api/data/customers/1')
        .set('Authorization', `Bearer ${token(['customers:delete'])}`)
        .expect(204);

      expect(mockNocoDBService.delete).toHaveBeenCalledWith('tbl_customers', 1);
    });
  });
});
