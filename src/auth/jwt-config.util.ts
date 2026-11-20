import { createPublicKey } from 'crypto';
import type { Algorithm } from 'jsonwebtoken';

/** Minimum length of HMAC secrets in bytes (256 bit, matching HS256). */
export const MIN_HMAC_SECRET_BYTES = 32;

/** Placeholder values from examples and docs that must never be used. */
const PLACEHOLDER_SECRETS = new Set([
  'your_jwt_secret_here',
  'your-jwt-secret',
  'your_secret_here',
  'changeme',
  'change-me',
  'change_me',
  'secret',
  'jwt_secret',
  'jwt-secret',
]);

const HMAC_ALGORITHMS = new Set<string>(['HS256', 'HS384', 'HS512']);
const ASYMMETRIC_ALGORITHMS = new Set<string>([
  'RS256',
  'RS384',
  'RS512',
  'PS256',
  'PS384',
  'PS512',
  'ES256',
  'ES384',
  'ES512',
]);

/**
 * Throws when an HMAC secret is shorter than {@link MIN_HMAC_SECRET_BYTES}
 * or a known placeholder. A weak secret lets anyone forge tokens with
 * arbitrary `sub` and `scope` claims.
 */
export function assertStrongHmacSecret(name: string, secret: string): void {
  if (PLACEHOLDER_SECRETS.has(secret.trim().toLowerCase())) {
    throw new Error(`${name} is a placeholder value; set a random secret`);
  }
  if (Buffer.byteLength(secret, 'utf8') < MIN_HMAC_SECRET_BYTES) {
    throw new Error(
      `${name} must be at least ${MIN_HMAC_SECRET_BYTES} bytes long ` +
        '(e.g. `openssl rand -base64 48`)',
    );
  }
}

function isPem(key: string): boolean {
  return key.includes('-----BEGIN');
}

/**
 * Algorithms accepted for external IdP tokens.
 *
 * - `EXTERNAL_JWT_ALGORITHMS` set: must only contain known algorithms and
 *   must not mix HMAC (`HS*`) with asymmetric ones, because one key cannot
 *   safely serve both.
 * - Not set: derived from the key. A PEM public key yields `RS256` (RSA) or
 *   `ES256` (EC); anything else is treated as an HMAC secret (`HS256`).
 */
export function resolveExternalJwtAlgorithms(
  configured: string | undefined,
  key: string,
): Algorithm[] {
  if (configured?.trim()) {
    const algorithms = configured
      .split(',')
      .map((a) => a.trim().toUpperCase())
      .filter((a) => a.length > 0);

    const unknown = algorithms.filter(
      (a) => !HMAC_ALGORITHMS.has(a) && !ASYMMETRIC_ALGORITHMS.has(a),
    );
    if (unknown.length > 0) {
      throw new Error(
        `EXTERNAL_JWT_ALGORITHMS contains unsupported algorithms: ${unknown.join(', ')}`,
      );
    }

    const hasHmac = algorithms.some((a) => HMAC_ALGORITHMS.has(a));
    const hasAsymmetric = algorithms.some((a) => ASYMMETRIC_ALGORITHMS.has(a));
    if (hasHmac && hasAsymmetric) {
      throw new Error(
        'EXTERNAL_JWT_ALGORITHMS must not mix HS* with RS*/PS*/ES* algorithms',
      );
    }

    return algorithms as Algorithm[];
  }

  if (!isPem(key)) {
    return ['HS256'];
  }

  const keyType = createPublicKey(key).asymmetricKeyType;
  if (keyType === 'rsa') {
    return ['RS256'];
  }
  if (keyType === 'ec') {
    return ['ES256'];
  }
  throw new Error(
    `Cannot derive a JWT algorithm for key type "${keyType}"; set EXTERNAL_JWT_ALGORITHMS`,
  );
}

/** Whether the algorithms verify with a shared secret. */
export function usesHmac(algorithms: Algorithm[]): boolean {
  return algorithms.some((a) => HMAC_ALGORITHMS.has(a));
}
