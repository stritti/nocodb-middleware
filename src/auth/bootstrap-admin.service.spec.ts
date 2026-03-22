import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BootstrapAdminService } from './bootstrap-admin.service';
import { NocoDBService } from '../nocodb/nocodb.service';
import { NocoDBV3Service } from '../nocodb/nocodb-v3.service';

describe('BootstrapAdminService', () => {
  let service: BootstrapAdminService;
  let configService: ConfigService;
  let nocoDBService: NocoDBService;
  let nocoDBV3Service: NocoDBV3Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BootstrapAdminService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                BOOTSTRAP_ADMIN_TOKEN: 'bootstrap-secret-token',
              };
              return config[key];
            }),
          },
        },
        {
          provide: NocoDBService,
          useValue: {
            getTableByName: jest.fn(async (name: string) => {
              if (name === 'users') return { id: 'users-id' };
              if (name === 'roles') return { id: 'roles-id' };
              if (name === 'user_roles') return { id: 'user-roles-id' };
              return null;
            }),
          },
        },
        {
          provide: NocoDBV3Service,
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BootstrapAdminService>(BootstrapAdminService);
    configService = module.get<ConfigService>(ConfigService);
    nocoDBService = module.get<NocoDBService>(NocoDBService);
    nocoDBV3Service = module.get<NocoDBV3Service>(NocoDBV3Service);
  });

  it('should bootstrap admin user when token and data are valid', async () => {
    (nocoDBV3Service.findOne as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, 'Role Name': 'admin' });

    (nocoDBV3Service.create as jest.Mock)
      .mockResolvedValueOnce({ id: 10 })
      .mockResolvedValueOnce({ id: 100 });

    const result = await service.bootstrapAdmin(
      {
        username: 'admin',
        email: 'admin@example.com',
        password: 'ComplexPassword#123',
      },
      'bootstrap-secret-token',
    );

    expect(result).toEqual({
      success: true,
      userId: 10,
      username: 'admin',
      created: true,
    });
    expect(nocoDBV3Service.create).toHaveBeenNthCalledWith(
      1,
      'users-id',
      expect.objectContaining({
        Username: 'admin',
        Email: 'admin@example.com',
        'Is Active': true,
      }),
    );
    expect(nocoDBV3Service.create).toHaveBeenNthCalledWith(
      2,
      'user-roles-id',
      expect.objectContaining({
        'User Id': 10,
        'Role Id': 1,
      }),
    );
  });

  it('should reject when token is missing', async () => {
    await expect(
      service.bootstrapAdmin(
        {
          username: 'admin',
          email: 'admin@example.com',
          password: 'ComplexPassword#123',
        },
        undefined,
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should return existing user and assign role if user already exists', async () => {
    (nocoDBV3Service.findOne as jest.Mock)
      .mockResolvedValueOnce({ id: 99, Username: 'admin' })
      .mockResolvedValueOnce({ id: 99, Username: 'admin' })
      .mockResolvedValueOnce({ id: 1, 'Role Name': 'admin' })
      .mockResolvedValueOnce(null);

    (nocoDBV3Service.create as jest.Mock).mockResolvedValueOnce({ id: 777 });

    const result = await service.bootstrapAdmin(
      {
        username: 'admin',
        email: 'admin@example.com',
        password: 'ComplexPassword#123',
      },
      'bootstrap-secret-token',
    );

    expect(result).toEqual({
      success: true,
      userId: 99,
      username: 'admin',
      created: false,
    });
    expect(nocoDBV3Service.create).toHaveBeenCalledTimes(1);
    expect(nocoDBV3Service.create).toHaveBeenCalledWith(
      'user-roles-id',
      expect.objectContaining({
        'User Id': 99,
        'Role Id': 1,
      }),
    );
  });

  it('should reject when email belongs to another user', async () => {
    (nocoDBV3Service.findOne as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 42, Username: 'other-user' });

    await expect(
      service.bootstrapAdmin(
        {
          username: 'admin',
          email: 'admin@example.com',
          password: 'ComplexPassword#123',
        },
        'bootstrap-secret-token',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should reject when required tables are missing', async () => {
    (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);

    await expect(
      service.bootstrapAdmin(
        {
          username: 'admin',
          email: 'admin@example.com',
          password: 'ComplexPassword#123',
        },
        'bootstrap-secret-token',
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
