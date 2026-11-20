import { AuthProviderConfigService } from './auth-provider-config.service';
import { ConfigService } from '@nestjs/config';

describe('AuthProviderConfigService', () => {
  it('defaults to local provider', () => {
    const service = new AuthProviderConfigService({
      get: jest.fn(() => undefined),
    } as unknown as ConfigService);

    expect(service.getProvider()).toBe('local');
  });

  it('throws on invalid provider value', () => {
    const service = new AuthProviderConfigService({
      get: jest.fn((key: string) =>
        key === 'AUTH_PROVIDER' ? 'invalid' : 'secret',
      ),
    } as unknown as ConfigService);

    expect(() => service.getProvider()).toThrow(
      'AUTH_PROVIDER must be either "local" or "external"',
    );
  });

  it('fails closed when external secret is missing', () => {
    const service = new AuthProviderConfigService({
      get: jest.fn((key: string) => {
        if (key === 'AUTH_PROVIDER') return 'external';
        return undefined;
      }),
    } as unknown as ConfigService);

    expect(() => service.onModuleInit()).toThrow(
      'EXTERNAL_JWT_SECRET is required when AUTH_PROVIDER=external',
    );
  });

  function service(values: Record<string, string | undefined>) {
    return new AuthProviderConfigService({
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService);
  }

  const external = {
    AUTH_PROVIDER: 'external',
    EXTERNAL_JWT_ISSUER: 'https://idp.example.com',
    EXTERNAL_JWT_AUDIENCE: 'middleware',
  };

  it('rejects a short local JWT_SECRET', () => {
    expect(() => service({ JWT_SECRET: 'short' }).onModuleInit()).toThrow(
      'JWT_SECRET must be at least 32 bytes long',
    );
  });

  it('rejects the placeholder from .env.example', () => {
    expect(() =>
      service({ JWT_SECRET: 'your_jwt_secret_here' }).onModuleInit(),
    ).toThrow('placeholder');
  });

  it('accepts a strong local JWT_SECRET', () => {
    expect(() =>
      service({ JWT_SECRET: 'a'.repeat(32) }).onModuleInit(),
    ).not.toThrow();
  });

  it('rejects a short external HMAC secret', () => {
    expect(() =>
      service({ ...external, EXTERNAL_JWT_SECRET: 'short' }).onModuleInit(),
    ).toThrow('EXTERNAL_JWT_SECRET must be at least 32 bytes long');
  });

  it('rejects mixed external algorithms at startup', () => {
    expect(() =>
      service({
        ...external,
        EXTERNAL_JWT_SECRET: 'a'.repeat(32),
        EXTERNAL_JWT_ALGORITHMS: 'RS256,HS256',
      }).onModuleInit(),
    ).toThrow('must not mix');
  });
});
