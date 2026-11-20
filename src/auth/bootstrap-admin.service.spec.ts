import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BootstrapAdminService } from './bootstrap-admin.service';
import { NocoDBService } from '../nocodb/nocodb.service';

describe('BootstrapAdminService', () => {
  let service: BootstrapAdminService;
  let nocoDBService: NocoDBService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        BOOTSTRAP_ADMIN_TOKEN: 'bootstrap-secret-token',
      };
      return config[key];
    }),
  };

  const mockNocoDBService = {
    getTableByName: jest.fn((name: string) => {
      if (name === 'users') return Promise.resolve({ id: 'users-id' });
      if (name === 'roles') return Promise.resolve({ id: 'roles-id' });
      if (name === 'user_roles')
        return Promise.resolve({ id: 'user-roles-id' });
      return Promise.resolve(null);
    }),
    findOne: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BootstrapAdminService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: NocoDBService,
          useValue: mockNocoDBService,
        },
      ],
    }).compile();

    service = module.get<BootstrapAdminService>(BootstrapAdminService);
    nocoDBService = module.get<NocoDBService>(NocoDBService);

    jest.clearAllMocks();
  });

  it('should bootstrap admin user when token and data are valid', async () => {
    mockNocoDBService.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, role_name: 'admin' });

    mockNocoDBService.create
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
    expect(mockNocoDBService.create).toHaveBeenNthCalledWith(
      1,
      'users-id',
      expect.objectContaining({
        username: 'admin',
        email: 'admin@example.com',
        is_active: true,
      }),
    );
    expect(mockNocoDBService.create).toHaveBeenNthCalledWith(
      2,
      'user-roles-id',
      expect.objectContaining({
        user_id: 10,
        role_id: 1,
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
    mockNocoDBService.findOne
      .mockResolvedValueOnce({ id: 99, username: 'admin' })
      .mockResolvedValueOnce({ id: 99, username: 'admin' })
      .mockResolvedValueOnce({ id: 1, role_name: 'admin' })
      .mockResolvedValueOnce(null) // user is not admin yet
      .mockResolvedValueOnce(null); // no admin exists

    mockNocoDBService.create.mockResolvedValue({ id: 777 });

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
    expect(mockNocoDBService.create).toHaveBeenCalledTimes(1);
    expect(mockNocoDBService.create).toHaveBeenCalledWith(
      'user-roles-id',
      expect.objectContaining({
        user_id: 99,
        role_id: 1,
      }),
    );
  });

  it('is locked once any admin exists', async () => {
    mockNocoDBService.findOne
      .mockResolvedValueOnce({ id: 99, username: 'victim' })
      .mockResolvedValueOnce({ id: 99, username: 'victim' })
      .mockResolvedValueOnce({ id: 1, role_name: 'admin' })
      .mockResolvedValueOnce(null) // victim is not admin
      .mockResolvedValueOnce({ id: 5, user_id: 1, role_id: 1 }); // admin exists

    await expect(
      service.bootstrapAdmin(
        {
          username: 'victim',
          email: 'victim@example.com',
          password: 'ComplexPassword#123',
        },
        'bootstrap-secret-token',
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(mockNocoDBService.create).not.toHaveBeenCalled();
  });

  it('does not create a second admin user once an admin exists', async () => {
    mockNocoDBService.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, role_name: 'admin' })
      .mockResolvedValueOnce({ id: 5, user_id: 1, role_id: 1 });

    await expect(
      service.bootstrapAdmin(
        {
          username: 'second-admin',
          email: 'second@example.com',
          password: 'ComplexPassword#123',
        },
        'bootstrap-secret-token',
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(mockNocoDBService.create).not.toHaveBeenCalled();
  });

  it('stays idempotent for a user who already is admin', async () => {
    mockNocoDBService.findOne
      .mockResolvedValueOnce({ id: 1, username: 'admin' })
      .mockResolvedValueOnce({ id: 1, username: 'admin' })
      .mockResolvedValueOnce({ id: 1, role_name: 'admin' })
      .mockResolvedValueOnce({ id: 5, user_id: 1, role_id: 1 });

    await expect(
      service.bootstrapAdmin(
        {
          username: 'admin',
          email: 'admin@example.com',
          password: 'ComplexPassword#123',
        },
        'bootstrap-secret-token',
      ),
    ).resolves.toEqual({
      success: true,
      userId: 1,
      username: 'admin',
      created: false,
    });
    expect(mockNocoDBService.create).not.toHaveBeenCalled();
  });

  it('should reject when email belongs to another user', async () => {
    mockNocoDBService.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 42, username: 'other-user' });

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
    mockNocoDBService.getTableByName.mockResolvedValue(null);

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

  it('should keep injected providers available', () => {
    expect(nocoDBService).toBeDefined();
  });
});
