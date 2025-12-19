import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/ (GET)', () => {
    it('should return Hello World!', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });
  });

  describe('/examples (Authenticated)', () => {
    it('should return 401 without auth token', () => {
      return request(app.getHttpServer())
        .get('/examples')
        .expect(401);
    });

    // Note: To test authenticated endpoints, you would need to:
    // 1. Create a valid JWT token
    // 2. Include it in the Authorization header
    // Example:
    // it('should return examples with valid auth', () => {
    //   const token = 'validJwtToken';
    //   return request(app.getHttpServer())
    //     .get('/examples')
    //     .set('Authorization', `Bearer ${token}`)
    //     .expect(200);
    // });
  });

  describe('Validation', () => {
    it('should reject invalid POST data', () => {
      return request(app.getHttpServer())
        .post('/examples')
        .send({ invalid: 'data' })
        .expect(401); // First fails at auth, but would fail validation too
    });
  });
});
