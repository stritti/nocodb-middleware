import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { RolesService } from './roles.service';
import { NocoDBService } from '../nocodb/nocodb.service';

describe('RolesService', () => {
  let service: RolesService;
  let nocoDBService: jest.Mocked<Partial<NocoDBService>>;

  beforeEach(async () => {
    nocoDBService = {
      getTableByName: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      list: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: NocoDBService, useValue: nocoDBService },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRole', () => {
    it('should create a new role when it does not exist', async () => {
      (nocoDBService.getTableByName as jest.Mock)
        .mockResolvedValueOnce({ id: 'roles_table_id' }) // for createRole
        .mockResolvedValueOnce({ id: 'roles_table_id' }); // for findRoleByName
      (nocoDBService.findOne as jest.Mock).mockResolvedValue(null);
      (nocoDBService.create as jest.Mock).mockResolvedValue({
        id: 1,
        role_name: 'admin',
      });

      const result = await service.createRole({
        roleName: 'admin',
        description: 'Administrator',
        isSystemRole: true,
      });

      expect(nocoDBService.create).toHaveBeenCalledWith(
        'roles_table_id',
        expect.objectContaining({
          role_name: 'admin',
          description: 'Administrator',
          is_system_role: true,
        }),
      );
      expect(result).toEqual({ id: 1, role_name: 'admin' });
    });

    it('should throw NotFoundException when roles table is not found', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createRole({ roleName: 'admin' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when role already exists', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'roles_table_id',
      });
      (nocoDBService.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        role_name: 'admin',
      });

      await expect(
        service.createRole({ roleName: 'admin' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should use defaults for optional fields', async () => {
      (nocoDBService.getTableByName as jest.Mock)
        .mockResolvedValueOnce({ id: 'roles_table_id' })
        .mockResolvedValueOnce({ id: 'roles_table_id' });
      (nocoDBService.findOne as jest.Mock).mockResolvedValue(null);
      (nocoDBService.create as jest.Mock).mockResolvedValue({ id: 2 });

      await service.createRole({ roleName: 'viewer' });

      expect(nocoDBService.create).toHaveBeenCalledWith(
        'roles_table_id',
        expect.objectContaining({
          role_name: 'viewer',
          description: '',
          is_system_role: false,
        }),
      );
    });
  });

  describe('findRoleByName', () => {
    it('should return a role by name', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'roles_table_id',
      });
      (nocoDBService.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        role_name: 'admin',
      });

      const result = await service.findRoleByName('admin');
      expect(result).toEqual({ id: 1, role_name: 'admin' });
      expect(nocoDBService.findOne).toHaveBeenCalledWith(
        'roles_table_id',
        '(role_name,eq,admin)',
      );
    });

    it('should return null when roles table not found', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);

      const result = await service.findRoleByName('nonexistent');
      expect(result).toBeNull();
    });

    it('should throw BadRequestException for role names containing filter injection characters', async () => {
      await expect(
        service.findRoleByName('admin),~(id,gt,0'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for role names with parentheses', async () => {
      await expect(service.findRoleByName('a(b')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for role names with commas', async () => {
      await expect(service.findRoleByName('a,b')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for role names with tilde', async () => {
      await expect(service.findRoleByName('a~b')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for role names with leading spaces', async () => {
      await expect(service.findRoleByName(' admin')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for role names with trailing spaces', async () => {
      await expect(service.findRoleByName('admin ')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should accept valid role names with allowed characters', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'roles_table_id',
      });
      (nocoDBService.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findRoleByName('Valid Role-Name_123'),
      ).resolves.toBeNull();
    });
  });

  describe('getAllRoles', () => {
    it('should return all roles', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'roles_table_id',
      });
      (nocoDBService.list as jest.Mock).mockResolvedValue({
        list: [{ id: 1, role_name: 'admin' }, { id: 2, role_name: 'user' }],
      });

      const roles = await service.getAllRoles();
      expect(roles).toHaveLength(2);
    });

    it('should return empty array when roles table not found', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);

      const roles = await service.getAllRoles();
      expect(roles).toEqual([]);
    });

    it('should return empty array when response list is empty', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'roles_table_id',
      });
      (nocoDBService.list as jest.Mock).mockResolvedValue({});

      const roles = await service.getAllRoles();
      expect(roles).toEqual([]);
    });
  });

  describe('deleteRole', () => {
    it('should delete a role by id', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue({
        id: 'roles_table_id',
      });
      (nocoDBService.delete as jest.Mock).mockResolvedValue(undefined);

      await service.deleteRole(1);
      expect(nocoDBService.delete).toHaveBeenCalledWith('roles_table_id', 1);
    });

    it('should throw NotFoundException when roles table not found', async () => {
      (nocoDBService.getTableByName as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteRole(1)).rejects.toThrow(NotFoundException);
    });
  });
});
