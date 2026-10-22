import { Request } from 'express';
import { clientIpKey, userRateLimitKey } from './rate-limit.middleware';

const req = (ip: string | undefined, user?: { userId: number }) =>
  ({ ip, user }) as unknown as Request;

describe('rate limit keys', () => {
  describe('clientIpKey', () => {
    it('keeps IPv4 addresses', () => {
      expect(clientIpKey(req('203.0.113.7'))).toBe('203.0.113.7');
    });

    it('treats IPv4-mapped IPv6 addresses as IPv4', () => {
      expect(clientIpKey(req('::ffff:203.0.113.7'))).toBe('203.0.113.7');
    });

    it('groups IPv6 addresses of the same /56 network into one bucket', () => {
      const a = clientIpKey(req('2001:db8:1234:5600::1'));
      const b = clientIpKey(req('2001:db8:1234:56ff:ffff::42'));

      expect(a).toBe(b);
    });

    it('separates different IPv6 networks', () => {
      expect(clientIpKey(req('2001:db8:1234:5600::1'))).not.toBe(
        clientIpKey(req('2001:db8:1234:5700::1')),
      );
    });

    it('uses a shared bucket when the address is unknown', () => {
      expect(clientIpKey(req(undefined))).toBe('unknown');
    });
  });

  describe('userRateLimitKey', () => {
    it('keys authenticated requests by user id', () => {
      expect(userRateLimitKey(req('203.0.113.7', { userId: 42 }))).toBe(
        'user:42',
      );
    });

    it('falls back to the client network without a user', () => {
      expect(userRateLimitKey(req('2001:db8:1234:5600::1'))).toBe(
        clientIpKey(req('2001:db8:1234:56aa::1')),
      );
    });
  });
});
