import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toEqual({
        name: 'NocoDB Middleware API',
        version: '0.0.1',
        description: 'Robust NestJS middleware for NocoDB',
        swagger: '/api',
        health: '/health',
        documentation: {
          api: '/api',
          swagger: 'http://localhost:3000/api',
        },
      });
    });
  });
});
