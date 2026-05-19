import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserProvisioningService } from './user-provisioning.service';
import { NocoDBService } from '../nocodb/nocodb.service';

describe('UserProvisioningService', () => {
  let service: UserProvisioningService;

  const mockNocoDBService = {
    getTableByName: jest.fn().mockResolvedValue({ id: 'users-table' }),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProvisioningService,
        {
          provide: NocoDBService,
          useValue: mockNocoDBService,
        },
      ],
    }).compile();

    service = module.get<UserProvisioningService>(UserProvisioningService);
    jest.clearAllMocks();
  });

  it('creates a new identity user when no existing mapping is found', async () => {
    mockNocoDBService.findOne.mockResolvedValue(null);
    mockNocoDBService.create.mockResolvedValue({
      id: 7,
      username: 'new-user',
      email: 'new@example.com',
      is_active: true,
    });

    const result = await service.upsertIdentityUser({
      subject: 'sub-1',
      provider: 'external',
      email: 'new@example.com',
      username: 'new-user',
      roles: ['developer'],
      scope: ['users:read'],
    });

    expect(result).toEqual({
      userId: 7,
      username: 'new-user',
      email: 'new@example.com',
      active: true,
      roles: ['developer'],
    });
  });

  it('throws on conflicting subject and email mappings', async () => {
    mockNocoDBService.findOne
      .mockResolvedValueOnce({ id: 11, username: 'subject-user' })
      .mockResolvedValueOnce({ id: 22, username: 'email-user' });

    await expect(
      service.upsertIdentityUser({
        subject: 'sub-2',
        provider: 'external',
        email: 'conflict@example.com',
        roles: [],
        scope: [],
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('updates existing subject mapping without creating a new user', async () => {
    mockNocoDBService.findOne.mockResolvedValueOnce({
      id: '10',
      username: 'legacy-user',
      email: 'legacy@example.com',
      is_active: true,
    });
    mockNocoDBService.update.mockResolvedValueOnce({
      id: '10',
      username: 'legacy-user',
      email: 'legacy@example.com',
      is_active: true,
    });

    const result = await service.upsertIdentityUser({
      subject: 'subject-legacy',
      provider: 'external',
      roles: ['admin'],
      scope: [],
    });

    expect(mockNocoDBService.update).toHaveBeenCalledWith('users-table', 10, {
      email: 'legacy@example.com',
      username: 'legacy-user',
    });
    expect(mockNocoDBService.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      userId: 10,
      username: 'legacy-user',
      email: 'legacy@example.com',
      active: true,
      roles: ['admin'],
    });
  });

  it('links existing email user to provider subject when subject mapping is missing', async () => {
    mockNocoDBService.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 55,
        username: 'mail-user',
        email: 'mail@example.com',
        is_active: true,
      });
    mockNocoDBService.update.mockResolvedValueOnce({
      id: 55,
      username: 'mail-user',
      email: 'mail@example.com',
      is_active: true,
    });

    const result = await service.upsertIdentityUser({
      subject: 'subject-mail',
      provider: 'external',
      email: 'mail@example.com',
      roles: ['developer'],
      scope: ['users:read'],
    });

    expect(mockNocoDBService.update).toHaveBeenCalledWith('users-table', 55, {
      auth_provider: 'external',
      external_subject: 'subject-mail',
      username: 'mail-user',
    });
    expect(result.roles).toEqual(['developer']);
    expect(result.userId).toBe(55);
  });

  it('creates a local user and assigns only resolvable non-duplicate roles', async () => {
    mockNocoDBService.getTableByName.mockImplementation((name: string) => {
      if (name === 'users') return Promise.resolve({ id: 'users-table' });
      if (name === 'roles') return Promise.resolve({ id: 'roles-table' });
      if (name === 'user_roles')
        return Promise.resolve({ id: 'user-roles-table' });
      return Promise.resolve(null);
    });

    mockNocoDBService.findOne
      // username + email uniqueness checks
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      // role lookup: admin exists
      .mockResolvedValueOnce({ id: 1, role_name: 'admin' })
      // existing assignment for admin does not exist
      .mockResolvedValueOnce(null)
      // role lookup: developer missing -> skipped
      .mockResolvedValueOnce(null)
      // role lookup: viewer exists
      .mockResolvedValueOnce({ id: 3, role_name: 'viewer' })
      // existing assignment for viewer already exists -> skipped
      .mockResolvedValueOnce({ id: 99 });

    mockNocoDBService.create
      .mockResolvedValueOnce({
        id: 77,
        username: 'local-admin',
        email: 'local@example.com',
        is_active: true,
      })
      .mockResolvedValueOnce({ id: 501 });

    const result = await service.createLocalUser({
      username: 'local-admin',
      email: 'local@example.com',
      password: 'VeryStrongPassword#2026',
      isActive: true,
      roles: ['admin', 'developer', 'viewer'],
    });

    expect(mockNocoDBService.create).toHaveBeenNthCalledWith(
      1,
      'users-table',
      expect.objectContaining({
        username: 'local-admin',
        email: 'local@example.com',
        auth_provider: 'local',
        external_subject: 'local@example.com',
        password_hash: expect.stringMatching(/^scrypt\$/),
      }),
    );
    expect(mockNocoDBService.create).toHaveBeenNthCalledWith(
      2,
      'user-roles-table',
      expect.objectContaining({
        user: [{ id: 77 }],
        role: [{ id: 1 }],
      }),
    );
    expect(result.userId).toBe(77);
    expect(result.roles).toEqual(['admin', 'developer', 'viewer']);
  });

  it('rejects local user creation when username already exists', async () => {
    mockNocoDBService.findOne.mockResolvedValueOnce({ id: 5 });

    await expect(
      service.createLocalUser({
        username: 'already-there',
        email: 'unique@example.com',
        password: 'VeryStrongPassword#2026',
      }),
    ).rejects.toThrow(ConflictException);

    expect(mockNocoDBService.create).not.toHaveBeenCalled();
  });

  it('updates user activation status', async () => {
    mockNocoDBService.update.mockResolvedValueOnce({
      id: 321,
      username: 'deactivated-user',
      email: 'deactivated@example.com',
      is_active: false,
    });

    const result = await service.setUserStatus(321, false);

    expect(mockNocoDBService.update).toHaveBeenCalledWith('users-table', 321, {
      is_active: false,
    });
    expect(result).toEqual({
      userId: 321,
      username: 'deactivated-user',
      email: 'deactivated@example.com',
      active: false,
      roles: [],
    });
  });

  it('fails closed when users table metadata is missing', async () => {
    mockNocoDBService.getTableByName.mockResolvedValueOnce(null);

    await expect(
      service.upsertIdentityUser({
        subject: 'missing-table-subject',
        provider: 'local',
        roles: [],
        scope: [],
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
