import { HttpStatus } from '@nestjs/common';
import { NocoDBException } from './nocodb.exception';

describe('NocoDBException', () => {
  it('should create exception with message and default status', () => {
    const exception = new NocoDBException('Something went wrong');
    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    const response = exception.getResponse() as any;
    expect(response.message).toBe('Something went wrong');
    expect(response.error).toBe('NocoDB Error');
    expect(response.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('should create exception with custom status', () => {
    const exception = new NocoDBException('Not found', HttpStatus.NOT_FOUND);
    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    const response = exception.getResponse() as any;
    expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
  });

  describe('tableNotFound', () => {
    it('should create a NOT_FOUND exception for a missing table', () => {
      const exception = NocoDBException.tableNotFound('users');
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      const response = exception.getResponse() as any;
      expect(response.message).toContain("users");
      expect(response.message).toContain('not found');
    });
  });

  describe('recordNotFound', () => {
    it('should create a NOT_FOUND exception for a missing record', () => {
      const exception = NocoDBException.recordNotFound('users', 42);
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      const response = exception.getResponse() as any;
      expect(response.message).toContain('42');
      expect(response.message).toContain('users');
    });

    it('should work with string record id', () => {
      const exception = NocoDBException.recordNotFound('orders', 'abc-123');
      const response = exception.getResponse() as any;
      expect(response.message).toContain('abc-123');
    });
  });

  describe('unauthorized', () => {
    it('should create an UNAUTHORIZED exception with default message', () => {
      const exception = NocoDBException.unauthorized();
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      const response = exception.getResponse() as any;
      expect(response.message).toBe('Unauthorized access to NocoDB');
    });

    it('should create an UNAUTHORIZED exception with custom message', () => {
      const exception = NocoDBException.unauthorized('Custom unauthorized message');
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      const response = exception.getResponse() as any;
      expect(response.message).toBe('Custom unauthorized message');
    });
  });
});
