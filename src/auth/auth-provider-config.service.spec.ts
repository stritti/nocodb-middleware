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
});
