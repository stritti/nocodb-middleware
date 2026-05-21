import { MiddlewareError } from '../src/types';
import { InMemoryTokenStorage } from '../src/token-storage';
import { normaliseError } from '../src/http-client';
import { NocodbMiddlewareClient } from '../src/client';
import axios from 'axios';

describe('MiddlewareError', () => {
  it('should carry statusCode and message', () => {
    const err = new MiddlewareError('Not found', 404);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('MiddlewareError');
    expect(err instanceof Error).toBe(true);
  });

  it('should default statusCode 0 for network errors', () => {
    const err = new MiddlewareError('Network error', 0);
    expect(err.statusCode).toBe(0);
  });
});

describe('InMemoryTokenStorage', () => {
  it('starts empty', () => {
    const s = new InMemoryTokenStorage();
    expect(s.get()).toBeNull();
  });

  it('stores and retrieves tokens', () => {
    const s = new InMemoryTokenStorage();
    const pair = { accessToken: 'at', refreshToken: 'rt' };
    s.set(pair);
    expect(s.get()).toEqual(pair);
  });

  it('clears tokens', () => {
    const s = new InMemoryTokenStorage();
    s.set({ accessToken: 'at', refreshToken: 'rt' });
    s.clear();
    expect(s.get()).toBeNull();
  });
});

describe('normaliseError', () => {
  it('returns the same MiddlewareError if already one', () => {
    const err = new MiddlewareError('x', 400);
    expect(normaliseError(err)).toBe(err);
  });

  it('wraps an Axios 404 response error', () => {
    const axiosErr = {
      isAxiosError: true,
      response: {
        status: 404,
        data: { message: 'Resource not found' },
      },
      message: 'Request failed',
    };
    jest.spyOn(axios, 'isAxiosError').mockReturnValueOnce(true);
    const result = normaliseError(axiosErr);
    expect(result).toBeInstanceOf(MiddlewareError);
    expect(result.statusCode).toBe(404);
    expect(result.message).toBe('Resource not found');
  });

  it('wraps a plain Error with statusCode 0', () => {
    const err = normaliseError(new Error('boom'));
    expect(err.statusCode).toBe(0);
    expect(err.message).toBe('boom');
  });

  it('wraps a string with statusCode 0', () => {
    const err = normaliseError('something bad');
    expect(err.statusCode).toBe(0);
    expect(err.message).toBe('something bad');
  });
});

describe('NocodbMiddlewareClient', () => {
  it('throws MiddlewareError when baseUrl is missing', () => {
    expect(() => new NocodbMiddlewareClient({ baseUrl: '' })).toThrow(
      MiddlewareError,
    );
  });

  it('exposes auth and admin services', () => {
    const client = new NocodbMiddlewareClient({
      baseUrl: 'http://localhost:3000',
    });
    expect(client.auth).toBeDefined();
    expect(client.admin).toBeDefined();
  });

  it('accepts custom token storage', () => {
    const storage = new InMemoryTokenStorage();
    const client = new NocodbMiddlewareClient({
      baseUrl: 'http://localhost:3000',
      tokenStorage: storage,
    });
    expect(client.auth).toBeDefined();
  });
});
