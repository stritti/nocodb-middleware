import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { UserProvisioningController } from './user-provisioning.controller';
import { UserProvisioningService } from './user-provisioning.service';
import { RolesGuard } from './guards/roles.guard';

describe('UserProvisioningController', () => {
  let app: INestApplication;
  let userProvisioningService: {
    createLocalUser: jest.Mock;
    setUserStatus: jest.Mock;
  };

  beforeAll(async () => {
    userProvisioningService = {
      createLocalUser: jest.fn(),
      setUserStatus: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [UserProvisioningController],
      providers: [
        {
          provide: UserProvisioningService,
          useValue: userProvisioningService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users', () => {
    it('creates a local user', async () => {
      userProvisioningService.createLocalUser.mockResolvedValue({
        userId: 5,
        username: 'alice',
      });

      await request(app.getHttpServer())
        .post('/users')
        .send({
          username: 'alice',
          email: 'alice@example.com',
          password: 'secret-password',
        })
        .expect(201)
        .expect({ userId: 5, username: 'alice' });
      expect(userProvisioningService.createLocalUser).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'alice' }),
      );
    });

    it('rejects an invalid payload with 400', async () => {
      await request(app.getHttpServer()).post('/users').send({}).expect(400);
      expect(userProvisioningService.createLocalUser).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /users/:id/status', () => {
    it('updates the user status', async () => {
      userProvisioningService.setUserStatus.mockResolvedValue({
        userId: 5,
        isActive: false,
      });

      await request(app.getHttpServer())
        .patch('/users/5/status')
        .send({ isActive: false })
        .expect(200)
        .expect({ userId: 5, isActive: false });
      expect(userProvisioningService.setUserStatus).toHaveBeenCalledWith(
        5,
        false,
      );
    });

    it('rejects a non-numeric id with 400', async () => {
      await request(app.getHttpServer())
        .patch('/users/abc/status')
        .send({ isActive: false })
        .expect(400);
      expect(userProvisioningService.setUserStatus).not.toHaveBeenCalled();
    });

    it('rejects a missing isActive flag with 400', async () => {
      await request(app.getHttpServer())
        .patch('/users/5/status')
        .send({})
        .expect(400);
    });
  });
});
