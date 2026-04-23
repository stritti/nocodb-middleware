import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { IDENTITY_PROVIDER } from '../identity/identity-provider.constants';
import { IdentityClaimsNormalizerService } from '../identity/identity-claims-normalizer.service';
import { AuthProviderConfigService } from '../auth-provider-config.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockIdentityProvider = {
    resolveIdentity: jest.fn().mockResolvedValue({
      userId: 1,
      username: 'testuser',
      email: 'test@example.com',
      roles: ['admin'],
      active: true,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        IdentityClaimsNormalizerService,
        {
          provide: AuthProviderConfigService,
          useValue: {
            getProvider: jest.fn().mockReturnValue('local'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string | undefined> = {
                JWT_SECRET: 'test-secret',
                EXTERNAL_JWT_SECRET: 'external-secret',
                EXTERNAL_JWT_ISSUER: 'https://issuer.example.com',
                EXTERNAL_JWT_AUDIENCE: 'nocodb-middleware',
              };
              return values[key];
            }),
          },
        },
        {
          provide: IDENTITY_PROVIDER,
          useValue: mockIdentityProvider,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('constructor', () => {
    it('should throw when JWT_SECRET is missing', () => {
      expect(
        () =>
          new JwtStrategy(
            {
              get: jest.fn().mockReturnValue(undefined),
            } as unknown as ConfigService,
            {
              getProvider: jest.fn().mockReturnValue('local'),
            } as unknown as AuthProviderConfigService,
            new IdentityClaimsNormalizerService(),
            mockIdentityProvider,
          ),
      ).toThrow();
    });

    it('should require external secret for external provider', () => {
      expect(
        () =>
          new JwtStrategy(
            {
              get: jest.fn((key: string) =>
                key === 'EXTERNAL_JWT_SECRET' ? undefined : 'value',
              ),
            } as unknown as ConfigService,
            {
              getProvider: jest.fn().mockReturnValue('external'),
            } as unknown as AuthProviderConfigService,
            new IdentityClaimsNormalizerService(),
            mockIdentityProvider,
          ),
      ).toThrow('EXTERNAL_JWT_SECRET is required');
    });
  });

  describe('validate', () => {
    it('should validate and return normalized user data', async () => {
      const payload = {
        sub: 'subject-1',
        username: 'testuser',
        roles: ['admin'],
        scope: 'users:read users:write',
      };
      const result = await strategy.validate(payload);
      expect(result).toEqual({
        userId: 1,
        username: 'testuser',
        email: 'test@example.com',
        roles: ['admin'],
        scope: ['users:read', 'users:write'],
        subject: 'subject-1',
        authProvider: 'local',
      });
    });

    it('should reject inactive users', async () => {
      mockIdentityProvider.resolveIdentity.mockResolvedValueOnce({
        userId: 2,
        username: 'inactive',
        roles: [],
        active: false,
      });

      await expect(
        strategy.validate({ sub: 'subject-2', scope: '' }),
      ).rejects.toThrow('User account is deactivated');
    });
  });
});
