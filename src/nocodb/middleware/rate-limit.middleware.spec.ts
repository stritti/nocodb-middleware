import { RateLimitMiddleware } from './rate-limit.middleware';
import { Request, Response, NextFunction } from 'express';

describe('RateLimitMiddleware', () => {
  let middleware: RateLimitMiddleware;

  beforeEach(() => {
    middleware = new RateLimitMiddleware();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    it('should be instantiable', () => {
      expect(middleware).toBeInstanceOf(RateLimitMiddleware);
    });

    it('should have a use method', () => {
      expect(typeof middleware.use).toBe('function');
    });

    it('should not throw when called with valid request', () => {
      const req = {
        ip: '192.168.1.1',
        user: { id: 'user1', role: 'user' },
      } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      // Just verify it doesn't throw synchronously
      expect(() => middleware.use(req, res, next)).not.toThrow();
    });

    it('should not throw when called with request without user', () => {
      const req = {
        ip: '192.168.1.2',
      } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      expect(() => middleware.use(req, res, next)).not.toThrow();
    });

    it('should not throw when called with admin user', () => {
      const req = {
        ip: '192.168.1.3',
        user: { id: 'admin1', role: 'admin' },
      } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      expect(() => middleware.use(req, res, next)).not.toThrow();
    });
  });
});
