import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Server } from 'http';
import { default as request } from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  let server: Server;

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
    server = app.getHttpServer();
  });

  afterEach(async () => {
    await app?.close();
  });

  describe('/ (GET)', () => {
    it('should return Hello World!', () => {
      return request(server).get('/').expect(200).expect('Hello World!');
    });
  });

  describe('/examples (Authenticated)', () => {
    it('should return 401 without auth token', () => {
      return request(server).get('/examples').expect(401);
    });
  });

  describe('Validation', () => {
    it('should reject invalid POST data', () => {
      return request(server)
        .post('/examples')
        .send({ invalid: 'data' })
        .expect(401);
    });
  });
});
