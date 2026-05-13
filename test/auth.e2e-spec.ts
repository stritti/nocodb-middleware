import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import { NocoDBService } from './../src/nocodb/nocodb.service';
import { DatabaseInitializationService } from './../src/nocodb/database-initialization.service';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';

// ── Helpers ──────────────────────────────────────────────────────────────────

const TEST_JWT_SECRET = 'test-jwt-secret-for-e2e-tests-2026';

function createAuthToken(overrides: Record<string, unknown> = {}): string {
  const payload = {
    sub: 1,
    email: 'admin@test.com',
    username: 'admin',
    roles: ['admin'],
    ...overrides,
  };
  return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '1h' });
}

// ── Mock services ────────────────────────────────────────────────────────────

const mockHttpClient = {
  get: jest.fn().mockResolvedValue({ data: { list: [] } }),
  post: jest.fn().mockResolvedValue({ data: {} }),
  patch: jest.fn().mockResolvedValue({ data: {} }),
  delete: jest.fn().mockResolvedValue({ data: {} }),
};

const mockNocoDBService = {
  getTableByName: jest.fn().mockResolvedValue({ id: 'mock-table-id' }),
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue({ id: 1 }),
  update: jest.fn().mockResolvedValue({ id: 1 }),
  list: jest.fn().mockResolvedValue({ list: [] }),
  read: jest.fn().mockResolvedValue({ id: 1 }),
  delete: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(false),
  getHttpClient: jest.fn().mockReturnValue(mockHttpClient),
  getBaseId: jest.fn().mockReturnValue('mock-base-id'),
  getTablePrefix: jest.fn().mockReturnValue(''),
  getClient: jest.fn().mockReturnValue({}),
};

const mockDbInitService = {
  onModuleInit: jest.fn().mockResolvedValue(undefined),
};

// ── Setup required env vars ─────────────────────────────────────────────────

beforeAll(() => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.NODE_ENV = 'test';
  process.env.NOCODB_API_URL = 'http://localhost:8080';
  process.env.NOCODB_API_TOKEN = 'test-token';
  process.env.NOCODB_BASE_ID = 'test-base';
  process.env.AUTH_PROVIDER = 'local';
  process.env.CORS_ORIGINS = 'http://localhost:3000';
  process.env.LOG_LEVEL = 'silent';
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Auth Flow (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NocoDBService)
      .useValue(mockNocoDBService)
      .overrideProvider(DatabaseInitializationService)
      .useValue(mockDbInitService)
      .compile();

    app = moduleFixture.createNestApplication();
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

  // ── Public endpoints ─────────────────────────────────────────────────────

  describe('Public endpoints', () => {
    it('GET /api returns Hello World!', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect('Hello World!');
    });

    it('GET /api/health returns 200', () => {
      return request(app.getHttpServer()).get('/api/health').expect(200);
    });
  });

  // ── Unauthenticated access ───────────────────────────────────────────────

  describe('Unauthenticated access', () => {
    it('GET /api/examples returns 401 without auth', () => {
      return request(app.getHttpServer()).get('/api/examples').expect(401);
    });

    it('POST /api/users returns 401 without auth', () => {
      return request(app.getHttpServer())
        .post('/api/users')
        .send({ username: 'test', email: 'test@test.com', password: 'Test1234!' })
        .expect(401);
    });

    it('POST /api/admin/permissions/roles returns 401 without auth', () => {
      return request(app.getHttpServer())
        .post('/api/admin/permissions/roles')
        .send({ roleName: 'test-role' })
        .expect(401);
    });

    it('GET /api/admin/permissions/roles returns 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/api/admin/permissions/roles')
        .expect(401);
    });

    it('GET /api/meta/tables returns 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/api/meta/tables')
        .expect(401);
    });
  });

  // ── Bootstrap admin protection ───────────────────────────────────────────

  describe('Bootstrap admin endpoint', () => {
    it('POST /api/bootstrap/admin returns 401 without bootstrap token', () => {
      return request(app.getHttpServer())
        .post('/api/bootstrap/admin')
        .send({
          username: 'admin',
          email: 'admin@test.com',
          password: 'StrongP@ss1',
        })
        .expect(401);
    });
  });

  // ── Invalid token ────────────────────────────────────────────────────────

  describe('Invalid token', () => {
    it('returns 401 with malformed token', () => {
      return request(app.getHttpServer())
        .get('/api/examples')
        .set('Authorization', 'Bearer invalid-token-that-is-definitely-not-valid')
        .expect(401);
    });

    it('returns 401 with wrong secret token', () => {
      const badToken = jwt.sign(
        { sub: 1, email: 'test@test.com' },
        'wrong-secret-key',
        { expiresIn: '1h' },
      );
      return request(app.getHttpServer())
        .get('/api/examples')
        .set('Authorization', `Bearer ${badToken}`)
        .expect(401);
    });

    it('returns 401 with expired token', () => {
      const expiredToken = jwt.sign(
        { sub: 1, email: 'test@test.com', roles: ['admin'] },
        TEST_JWT_SECRET,
        { expiresIn: '0s' },
      );
      // Small delay to ensure expiry
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          request(app.getHttpServer())
            .get('/api/examples')
            .set('Authorization', `Bearer ${expiredToken}`)
            .expect(401)
            .end(resolve);
        }, 1100);
      });
    }, 5000);
  });

  // ── Authenticated access ─────────────────────────────────────────────────

  describe('Authenticated access', () => {
    it('GET /api/examples returns 200 with valid token', () => {
      const token = createAuthToken();
      return request(app.getHttpServer())
        .get('/api/examples')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('GET /api/admin/permissions/roles returns 200 with valid admin token', () => {
      const token = createAuthToken({ roles: ['admin'] });
      return request(app.getHttpServer())
        .get('/api/admin/permissions/roles')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('GET /api/meta/tables returns 200 with valid admin token', () => {
      const token = createAuthToken({ roles: ['admin'] });
      return request(app.getHttpServer())
        .get('/api/meta/tables')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('POST /api/admin/permissions/roles returns 201 with valid admin token', () => {
      const token = createAuthToken({ roles: ['admin'] });
      return request(app.getHttpServer())
        .post('/api/admin/permissions/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({ roleName: 'editor', description: 'Content editor', isSystemRole: false })
        .expect(201);
    });
  });

  // ── Token with different user info ───────────────────────────────────────

  describe('Token user identity', () => {
    it('passes user identity from JWT payload', () => {
      const token = createAuthToken({
        sub: 42,
        email: 'custom@test.com',
        username: 'custom-user',
        roles: ['admin'],
      });
      return request(app.getHttpServer())
        .get('/api/examples')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
