import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';
import { NocoDBService } from './../src/nocodb/nocodb.service';
import { DatabaseInitializationService } from './../src/nocodb/database-initialization.service';

const ALLOWED_ORIGIN = 'https://app.example.com';

/**
 * Boots the application with the same HTTP pipeline as main.ts
 * (helmet, CORS, sanitization, rate limiting, validation, /api prefix).
 */
describe('Production HTTP pipeline (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret-for-setup-e2e';
    process.env.NODE_ENV = 'test';
    process.env.NOCODB_API_URL = 'http://localhost:8080';
    process.env.NOCODB_API_TOKEN = 'test-token';
    process.env.NOCODB_BASE_ID = 'test-base';
    process.env.AUTH_PROVIDER = 'local';
    process.env.LOG_LEVEL = 'silent';
    process.env.CORS_ORIGINS = ALLOWED_ORIGIN;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NocoDBService)
      .useValue({
        getTableByName: jest.fn().mockResolvedValue({ id: 'tbl' }),
        getBaseId: jest.fn().mockReturnValue('test-base'),
        getTablePrefix: jest.fn().mockReturnValue(''),
      })
      .overrideProvider(DatabaseInitializationService)
      .useValue({ onModuleInit: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  const http = () => request(app.getHttpServer());

  describe('request sanitization', () => {
    it('serves requests without query parameters', () => {
      return http().get('/api').expect(200);
    });

    it('serves requests with HTML in query parameters', () => {
      return http()
        .get('/api')
        .query({ q: '<script>alert(1)</script>' })
        .expect(200);
    });
  });

  describe('CORS', () => {
    it('allows a configured origin with credentials', () => {
      return http()
        .get('/api')
        .set('Origin', ALLOWED_ORIGIN)
        .expect(200)
        .expect('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
        .expect('Access-Control-Allow-Credentials', 'true');
    });

    it('answers a preflight for a configured origin', () => {
      return http()
        .options('/api/data/customers')
        .set('Origin', ALLOWED_ORIGIN)
        .set('Access-Control-Request-Method', 'PATCH')
        .set('Access-Control-Request-Headers', 'authorization,content-type')
        .expect(204)
        .expect('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
        .expect(({ headers }) => {
          expect(headers['access-control-allow-methods']).toContain('PATCH');
          expect(
            String(headers['access-control-allow-headers']).toLowerCase(),
          ).toContain('authorization');
        });
    });

    it('does not allow an unknown origin', () => {
      return http()
        .get('/api')
        .set('Origin', 'https://evil.example.com')
        .expect(({ headers }) => {
          // Without Allow-Origin the browser blocks the response; the cors
          // package sends Allow-Credentials regardless, which is harmless.
          expect(headers['access-control-allow-origin']).toBeUndefined();
        });
    });
  });

  it('sets security headers', () => {
    return http()
      .get('/api')
      .expect(200)
      .expect(({ headers }) => {
        expect(headers['x-content-type-options']).toBe('nosniff');
        expect(headers['content-security-policy']).toContain(
          "default-src 'none'",
        );
      });
  });
});
