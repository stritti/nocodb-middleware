import 'reflect-metadata';
import { validate } from './env.validation';

describe('EnvironmentVariables', () => {
  describe('validate', () => {
    it('should pass with empty config (all optional)', () => {
      const result = validate({});
      expect(result).toBeDefined();
      expect(result.NOCODB_API_URL).toBeUndefined();
      expect(result.NOCODB_API_TOKEN).toBeUndefined();
    });

    it('should pass with valid partial config', () => {
      const result = validate({
        NOCODB_API_URL: 'https://example.com',
        NOCODB_API_TOKEN: 'token123',
        NOCODB_BASE_ID: 'base123',
        PORT: '3000',
        LOG_LEVEL: 'info',
      });
      expect(result).toBeDefined();
      expect(result.NOCODB_API_URL).toBe('https://example.com');
      expect(result.NOCODB_API_TOKEN).toBe('token123');
      expect(result.PORT).toBe(3000);
    });

    it('should fail with invalid number for PORT', () => {
      expect(() => {
        validate({
          PORT: 'not-a-number',
        });
      }).toThrow('Environment validation failed');
    });

    it('should accept valid partial config without NOCODB vars', () => {
      const result = validate({
        JWT_SECRET: 'my-secret',
        LOG_LEVEL: 'debug',
      });
      expect(result).toBeDefined();
      expect(result.JWT_SECRET).toBe('my-secret');
    });

    it('should preserve NODE_ENV when provided', () => {
      const result = validate({
        NODE_ENV: 'production',
        NOCODB_API_URL: 'https://example.com',
        NOCODB_API_TOKEN: 'token',
        NOCODB_BASE_ID: 'base',
      });
      expect(result).toBeDefined();
      expect(result.NODE_ENV).toBe('production');
    });

    it('should whitelist unknown properties', () => {
      const result = validate({
        UNKNOWN_VAR: 'should be stripped',
        NOCODB_API_URL: 'https://example.com',
        NOCODB_API_TOKEN: 'token',
        NOCODB_BASE_ID: 'base',
      });
      expect(result).toBeDefined();
      expect((result as any).UNKNOWN_VAR).toBeUndefined();
    });
  });
});
