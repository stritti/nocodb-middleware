import { UnauthorizedException } from '@nestjs/common';
import { IdentityClaimsNormalizerService } from './identity-claims-normalizer.service';

describe('IdentityClaimsNormalizerService', () => {
  let service: IdentityClaimsNormalizerService;

  beforeEach(() => {
    service = new IdentityClaimsNormalizerService();
  });

  it('normalizes string and array claim formats', () => {
    const result = service.normalize(
      {
        sub: 'abc123',
        email: 'dev@example.com',
        preferred_username: 'dev-user',
        roles: 'admin,developer',
        scope: 'users:read users:write',
      },
      'external',
    );

    expect(result).toEqual({
      subject: 'abc123',
      provider: 'external',
      email: 'dev@example.com',
      emailVerified: false,
      username: 'dev-user',
      roles: ['admin', 'developer'],
      scope: ['users:read', 'users:write'],
    });
  });

  it.each([
    [true, true],
    ['true', true],
    [false, false],
    ['yes', false],
    [undefined, false],
  ])('maps email_verified %p to emailVerified %p', (value, expected) => {
    const result = service.normalize(
      { sub: 'abc', email_verified: value },
      'external',
    );
    expect(result.emailVerified).toBe(expected);
  });

  it('throws when sub is missing', () => {
    expect(() => service.normalize({}, 'local')).toThrow(UnauthorizedException);
  });
});
