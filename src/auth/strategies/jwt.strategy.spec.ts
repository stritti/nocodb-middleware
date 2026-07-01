import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { AuthProviderConfigService } from '../auth-provider-config.service';
import { IdentityClaimsNormalizerService } from '../identity/identity-claims-normalizer.service';
import { IDENTITY_PROVIDER } from '../identity/identity-provider.constants';
import { NocoDBService } from '../../nocodb/nocodb.service';

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

  beforeEach(async () => {
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
      });
    });
  });
});
