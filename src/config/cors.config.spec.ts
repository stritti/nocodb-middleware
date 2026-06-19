import { parseAndValidateCorsOrigins, logCorsWarnings } from './cors.config';

describe('parseAndValidateCorsOrigins', () => {
  describe('development mode (isProduction=false)', () => {
    it('accepts a single origin', () => {
      const result = parseAndValidateCorsOrigins(
        'http://localhost:3000',
        false,
      );
      expect(result.origins).toEqual(['http://localhost:3000']);
      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it('accepts multiple comma-separated origins', () => {
      const result = parseAndValidateCorsOrigins(
        'http://localhost:3000,http://admin.localhost:3001',
        false,
      );
      expect(result.origins).toHaveLength(2);
      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it('trims whitespace around origins', () => {
      const result = parseAndValidateCorsOrigins(
        '  http://localhost:3000 , https://example.com  ',
        false,
      );
      expect(result.origins).toEqual([
        'http://localhost:3000',
        'https://example.com',
      ]);
    });

    it('warns on wildcard', () => {
      const result = parseAndValidateCorsOrigins('*', false);
      expect(result.origins).toEqual(['*']);
      expect(result.valid).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('wildcard');
    });

    it('returns empty origins when env var is empty', () => {
      const result = parseAndValidateCorsOrigins('', false);
      expect(result.origins).toEqual([]);
      expect(result.valid).toBe(false);
      expect(result.warnings).toHaveLength(1);
    });

    it('returns empty origins when env var is undefined', () => {
      const result = parseAndValidateCorsOrigins(undefined, false);
      expect(result.origins).toEqual([]);
      expect(result.valid).toBe(false);
    });

    it('filters out empty entries', () => {
      const result = parseAndValidateCorsOrigins(
        'http://a.com,,https://b.com',
        false,
      );
      expect(result.origins).toEqual(['http://a.com', 'https://b.com']);
    });

    it('does not warn about localhost in development', () => {
      const result = parseAndValidateCorsOrigins(
        'http://localhost:3000',
        false,
      );
      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual([]);
    });
  });

  describe('production mode (isProduction=true)', () => {
    it('accepts a production origin without warnings', () => {
      const result = parseAndValidateCorsOrigins(
        'https://app.example.com',
        true,
      );
      expect(result.origins).toEqual(['https://app.example.com']);
      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it('warns about localhost origins', () => {
      const result = parseAndValidateCorsOrigins(
        'http://localhost:3000,https://app.example.com',
        true,
      );
      expect(result.valid).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('localhost');
    });

    it('throws error for wildcard in production', () => {
      const result = parseAndValidateCorsOrigins('*', true);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('wildcard');
    });

    it('throws error for wildcard and warns for localhost in production', () => {
      const result = parseAndValidateCorsOrigins(
        '*,http://localhost:3000',
        true,
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('wildcard');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('localhost');
    });

    it('accepts multiple production origins', () => {
      const result = parseAndValidateCorsOrigins(
        'https://app.example.com,https://admin.example.com',
        true,
      );
      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual([]);
    });
  });

  describe('logCorsWarnings', () => {
    let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock };

    beforeEach(() => {
      mockLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };
    });

    it('should log origins when valid', () => {
      const result = parseAndValidateCorsOrigins(
        'https://app.example.com',
        true,
      );
      logCorsWarnings(result, mockLogger as any);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'CORS origins: https://app.example.com',
      );
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should warn when CORS is disabled', () => {
      const result = parseAndValidateCorsOrigins('', true);
      logCorsWarnings(result, mockLogger as any);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'CORS is disabled (no origins configured)',
      );
    });

    it('should error and throw in production for wildcard', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = parseAndValidateCorsOrigins('*', true);

      expect(() => {
        logCorsWarnings(result, mockLogger as any);
      }).toThrow(
        'CORS configuration error in production: CORS_ORIGINS contains wildcard "*" which is NOT allowed in production. Please set explicit origins.',
      );

      expect(mockLogger.error).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should warn for localhost in production', () => {
      const result = parseAndValidateCorsOrigins('http://localhost:3000', true);
      logCorsWarnings(result, mockLogger as any);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'localhost origins should not be used in production',
        ),
      );
    });
  });
});
