import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the API info', () => {
      expect(appController.getHello()).toEqual({
        name: 'NocoDB Middleware API',
        version: process.env.npm_package_version ?? '1.0',
        description: 'Robust NestJS middleware for NocoDB',
        swagger: '/api',
        health: '/health',
        documentation: '/api',
      });
    });
  });
});
