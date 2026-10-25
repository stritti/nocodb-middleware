import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TableCatalogController } from './table-catalog.controller';
import { TableCatalogService } from './table-catalog.service';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('TableCatalogController', () => {
  let app: INestApplication;
  let listExternalTables: jest.Mock;

  beforeAll(async () => {
    listExternalTables = jest.fn();

    const moduleRef = await Test.createTestingModule({
      controllers: [TableCatalogController],
    })
      .overrideProvider(TableCatalogService)
      .useValue({ listExternalTables })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /meta/tables returns the external table catalog', async () => {
    listExternalTables.mockResolvedValue([
      { id: 't0', tableName: 'customers', title: 'customers' },
    ]);

    await request(app.getHttpServer())
      .get('/meta/tables')
      .expect(200)
      .expect([{ id: 't0', tableName: 'customers', title: 'customers' }]);
    expect(listExternalTables).toHaveBeenCalledTimes(1);
  });

  it('propagates service errors as 500', async () => {
    listExternalTables.mockRejectedValue(new Error('NocoDB unavailable'));

    await request(app.getHttpServer()).get('/meta/tables').expect(500);
  });
});
