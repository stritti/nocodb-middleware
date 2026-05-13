import { parseAndValidateCorsOrigins } from './cors.config';

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

    it('warns about wildcard in production', () => {
      const result = parseAndValidateCorsOrigins('*', true);
      expect(result.valid).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('wildcard');
    });

    it('warns for each problematic origin', () => {
      const result = parseAndValidateCorsOrigins(
        '*,http://localhost:3000',
        true,
      );
      expect(result.valid).toBe(false);
      expect(result.warnings).toHaveLength(2);
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
});
