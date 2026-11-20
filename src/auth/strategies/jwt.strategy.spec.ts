import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { AuthProviderConfigService } from '../auth-provider-config.service';
import { IdentityClaimsNormalizerService } from '../identity/identity-claims-normalizer.service';
import { IDENTITY_PROVIDER } from '../identity/identity-provider.constants';
import { NocoDBService } from '../../nocodb/nocodb.service';
import { PermissionsService } from '../../permissions/permissions.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const mockAuthProviderConfig = {
    getProvider: jest.fn().mockReturnValue('local'),
  };
  const mockNocoDBService = {
    getTableByName: jest.fn().mockResolvedValue({ id: 'users-table-id' }),
    read: jest.fn().mockResolvedValue({
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      is_active: true,
    }),
  };

  const mockPermissionsService = {
    getUserPermissions: jest.fn(),
  };

  beforeEach(async () => {
    mockPermissionsService.getUserPermissions.mockReset();
    mockPermissionsService.getUserPermissions.mockResolvedValue({
      userId: 1,
      username: 'testuser',
      roles: ['admin'],
      permissions: new Map(),
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: AuthProviderConfigService,
          useValue: mockAuthProviderConfig,
        },
        IdentityClaimsNormalizerService,
        {
          provide: IDENTITY_PROVIDER,
          useValue: { resolveIdentity: jest.fn() },
        },
        {
          provide: NocoDBService,
          useValue: mockNocoDBService,
        },
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('constructor', () => {
    it('should throw when JWT_SECRET is missing', () => {
      const normalizer = new IdentityClaimsNormalizerService();

      expect(
        () =>
          new JwtStrategy(
            {
              get: jest.fn().mockReturnValue(undefined),
            } as unknown as ConfigService,
            mockAuthProviderConfig as unknown as AuthProviderConfigService,
            normalizer,
            { resolveIdentity: jest.fn() },
            mockNocoDBService as unknown as NocoDBService,
            mockPermissionsService as unknown as PermissionsService,
          ),
      ).toThrow('JWT_SECRET is required');
    });

    it('should use custom algorithms for external provider', () => {
      const normalizer = new IdentityClaimsNormalizerService();
      const externalAuthConfig = {
        getProvider: jest.fn().mockReturnValue('external'),
      };

      const strategy = new JwtStrategy(
        {
          get: jest.fn((key: string) => {
            if (key === 'EXTERNAL_JWT_SECRET') return 'external-secret';
            if (key === 'EXTERNAL_JWT_ALGORITHMS') return 'RS256,ES256';
            return undefined;
          }),
        } as unknown as ConfigService,
        externalAuthConfig as unknown as AuthProviderConfigService,
        normalizer,
        { resolveIdentity: jest.fn() },
        mockNocoDBService as unknown as NocoDBService,
        mockPermissionsService as unknown as PermissionsService,
      );

      expect(strategy).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should validate and return user data based on payload', async () => {
      const payload = { sub: 1, username: 'testuser', roles: ['admin'] };
      const result = await strategy.validate(payload);
      expect(result).toEqual({
        userId: 1,
        username: 'testuser',
        email: 'test@example.com',
        roles: ['admin'],
        scope: [],
      });
    });

    it('takes roles from the database, not from the token claim', async () => {
      mockPermissionsService.getUserPermissions.mockResolvedValueOnce({
        userId: 1,
        username: 'testuser',
        roles: ['viewer'],
        permissions: new Map(),
      });

      const result = await strategy.validate({ sub: 1, roles: ['admin'] });

      expect(result.roles).toEqual(['viewer']);
      expect(mockPermissionsService.getUserPermissions).toHaveBeenCalledWith(1);
    });

    it('ignores the role claim when the user has no role in the database', async () => {
      mockPermissionsService.getUserPermissions.mockResolvedValueOnce({
        userId: 1,
        username: 'testuser',
        roles: [],
        permissions: new Map(),
      });

      const result = await strategy.validate({ sub: 1, role: 'admin' });

      expect(result.roles).toEqual([]);
    });

    it('should pass OAuth scopes from a space-separated scope claim to the request user', async () => {
      const result = await strategy.validate({
        sub: 1,
        scope: 'roles:read roles:create',
      });
      expect(result.scope).toEqual(['roles:read', 'roles:create']);
    });

    it('should pass scopes from an scp array claim to the request user', async () => {
      const result = await strategy.validate({ sub: 1, scp: ['users:*'] });
      expect(result.scope).toEqual(['users:*']);
    });

    it('should pass scopes for the external provider', async () => {
      mockAuthProviderConfig.getProvider.mockReturnValueOnce('external');
      const identityProvider = (strategy as any).identityProvider;
      identityProvider.resolveIdentity.mockResolvedValueOnce({
        userId: 7,
        username: 'ext-user',
        email: 'ext@example.com',
        roles: ['user'],
        active: true,
      });

      const result = await strategy.validate({
        sub: 'ext-7',
        scope: 'roles:read',
      });

      expect(result.scope).toEqual(['roles:read']);
    });

    it('takes roles for the external provider from the database', async () => {
      mockAuthProviderConfig.getProvider.mockReturnValueOnce('external');
      const identityProvider = (strategy as any).identityProvider;
      identityProvider.resolveIdentity.mockResolvedValueOnce({
        userId: 7,
        username: 'ext-user',
        email: 'ext@example.com',
        roles: ['admin'],
        active: true,
      });
      mockPermissionsService.getUserPermissions.mockResolvedValueOnce({
        userId: 7,
        username: 'ext-user',
        roles: [],
        permissions: new Map(),
      });

      const result = await strategy.validate({ sub: 'ext-7', roles: 'admin' });

      expect(result.roles).toEqual([]);
      expect(mockPermissionsService.getUserPermissions).toHaveBeenCalledWith(7);
    });
  });
});
