import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import * as request from 'supertest';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
      return request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
    });
  });

  describe('/examples (Authenticated)', () => {
    it('should return 401 without auth token', () => {
      return request(app.getHttpServer()).get('/examples').expect(401);
    });
  });

  describe('Validation', () => {
    it('should reject invalid POST data', () => {
      return request(app.getHttpServer())
        .post('/examples')
        .send({ invalid: 'data' })
        .expect(401);
    });
  });
});
