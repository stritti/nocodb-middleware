import * as crypto from 'crypto';

const SCRYPT_COST = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = crypto.scryptSync(password, salt, SCRYPT_COST).toString('hex');
  return `scrypt$${salt}$${digest}`;
}
