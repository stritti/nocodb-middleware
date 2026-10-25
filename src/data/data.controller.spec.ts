import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataController } from './data.controller';
import { DataService } from './data.service';
import { TablePermissionsGuard } from './table-permissions.guard';

describe('DataController (e2e-style unit)', () => {
  let app: INestApplication;
  let dataService: {
    list: jest.Mock;
    read: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeAll(async () => {
    dataService = {
      list: jest.fn(),
      read: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [DataController],
    })
      .overrideProvider(DataService)
      .useValue(dataService)
      .overrideGuard(TablePermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /data/:table', () => {
    it('returns a page of records', async () => {
      dataService.list.mockResolvedValue({
        list: [{ Id: 1, Name: 'Alice' }],
        pageInfo: { totalRows: 1 },
      });

      const response = await request(app.getHttpServer())
        .get('/data/customers')
        .expect(200);

      expect(response.body).toEqual({
        list: [{ Id: 1, Name: 'Alice' }],
        pageInfo: { totalRows: 1 },
      });
      expect(dataService.list).toHaveBeenCalledWith('customers', {
        limit: undefined,
        offset: undefined,
        sort: undefined,
        where: undefined,
      });
    });

    it('passes where/sort/limit/offset through to the service', async () => {
      dataService.list.mockResolvedValue({
        list: [],
        pageInfo: { totalRows: 0 },
      });

      await request(app.getHttpServer())
        .get('/data/customers')
        .query({
          where: '(Name,eq,Alice)',
          sort: '-Id',
          limit: '10',
          offset: '20',
        })
        .expect(200);

      expect(dataService.list).toHaveBeenCalledWith('customers', {
        where: '(Name,eq,Alice)',
        sort: '-Id',
        limit: 10,
        offset: 20,
      });
    });
  });

  describe('GET /data/:table/:id', () => {
    it('returns a single record', async () => {
      dataService.read.mockResolvedValue({ Id: 1, Name: 'Alice' });

      await request(app.getHttpServer())
        .get('/data/customers/1')
        .expect(200)
        .expect({ Id: 1, Name: 'Alice' });
      expect(dataService.read).toHaveBeenCalledWith('customers', 1);
    });

    it('rejects a non-numeric id with 400', async () => {
      await request(app.getHttpServer()).get('/data/customers/abc').expect(400);
      expect(dataService.read).not.toHaveBeenCalled();
    });
  });

  describe('POST /data/:table', () => {
    it('creates and returns the record', async () => {
      dataService.create.mockResolvedValue({ Id: 2, Name: 'Bob' });

      await request(app.getHttpServer())
        .post('/data/customers')
        .send({ Name: 'Bob' })
        .expect(201)
        .expect({ Id: 2, Name: 'Bob' });
      expect(dataService.create).toHaveBeenCalledWith('customers', {
        Name: 'Bob',
      });
    });
  });

  describe('PATCH /data/:table/:id', () => {
    it('updates and returns the record', async () => {
      dataService.update.mockResolvedValue({ Id: 1, Name: 'Bobby' });

      await request(app.getHttpServer())
        .patch('/data/customers/1')
        .send({ Name: 'Bobby' })
        .expect(200)
        .expect({ Id: 1, Name: 'Bobby' });
      expect(dataService.update).toHaveBeenCalledWith('customers', 1, {
        Name: 'Bobby',
      });
    });

    it('rejects a non-numeric id with 400', async () => {
      await request(app.getHttpServer())
        .patch('/data/customers/abc')
        .send({ Name: 'x' })
        .expect(400);
    });
  });

  describe('DELETE /data/:table/:id', () => {
    it('returns 204 and delegates to the service', async () => {
      dataService.delete.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/data/customers/1')
        .expect(204);
      expect(dataService.delete).toHaveBeenCalledWith('customers', 1);
    });
  });

  describe('error mapping', () => {
    it('maps service NotFoundException to 404', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      dataService.read.mockRejectedValue(
        new NotFoundException('Record not found'),
      );

      await request(app.getHttpServer()).get('/data/customers/99').expect(404);
    });

    it('maps service BadRequestException to 400', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      dataService.create.mockRejectedValue(
        new BadRequestException('Unknown fields'),
      );

      await request(app.getHttpServer())
        .post('/data/customers')
        .send({ Unknown: 1 })
        .expect(400);
    });
  });
});
