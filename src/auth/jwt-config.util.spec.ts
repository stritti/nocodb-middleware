import { generateKeyPairSync } from 'crypto';
import {
  assertStrongHmacSecret,
  resolveExternalJwtAlgorithms,
  usesHmac,
} from './jwt-config.util';

const rsaPublicKey = generateKeyPairSync('rsa', { modulusLength: 2048 })
  .publicKey.export({ type: 'spki', format: 'pem' })
  .toString();
const ecPublicKey = generateKeyPairSync('ec', { namedCurve: 'P-256' })
  .publicKey.export({ type: 'spki', format: 'pem' })
  .toString();
const strongSecret = 'x'.repeat(32);

describe('assertStrongHmacSecret', () => {
  it('accepts a secret of at least 32 bytes', () => {
    expect(() =>
      assertStrongHmacSecret('JWT_SECRET', strongSecret),
    ).not.toThrow();
  });

  it('rejects short secrets', () => {
    expect(() => assertStrongHmacSecret('JWT_SECRET', 'x'.repeat(31))).toThrow(
      'JWT_SECRET must be at least 32 bytes long',
    );
  });

  it.each(['your_jwt_secret_here', 'changeme', ' Secret '])(
    'rejects the placeholder %p',
    (value) => {
      expect(() => assertStrongHmacSecret('JWT_SECRET', value)).toThrow(
        'placeholder',
      );
    },
  );
});

describe('resolveExternalJwtAlgorithms', () => {
  it('uses HS256 for a shared secret by default', () => {
    expect(resolveExternalJwtAlgorithms(undefined, strongSecret)).toEqual([
      'HS256',
    ]);
  });

  it('derives RS256 from an RSA public key', () => {
    expect(resolveExternalJwtAlgorithms(undefined, rsaPublicKey)).toEqual([
      'RS256',
    ]);
  });

  it('derives ES256 from an EC public key', () => {
    expect(resolveExternalJwtAlgorithms('', ecPublicKey)).toEqual(['ES256']);
  });

  it('accepts an explicit list of one family', () => {
    expect(resolveExternalJwtAlgorithms('rs256, ps256', rsaPublicKey)).toEqual([
      'RS256',
      'PS256',
    ]);
  });

  it('rejects mixing HMAC and asymmetric algorithms', () => {
    expect(() =>
      resolveExternalJwtAlgorithms('RS256,ES256,HS256', rsaPublicKey),
    ).toThrow('must not mix');
  });

  it('rejects unknown algorithms such as none', () => {
    expect(() => resolveExternalJwtAlgorithms('none', strongSecret)).toThrow(
      'unsupported algorithms: NONE',
    );
  });
});

describe('usesHmac', () => {
  it('detects HMAC algorithms', () => {
    expect(usesHmac(['HS256'])).toBe(true);
    expect(usesHmac(['RS256'])).toBe(false);
  });
});
