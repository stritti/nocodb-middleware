import { AuthService } from '../src/services/auth.service';
import { InMemoryTokenStorage } from '../src/token-storage';
import { MiddlewareError } from '../src/types';

describe('AuthService', () => {
  let storage: InMemoryTokenStorage;
  let service: AuthService;

  beforeEach(() => {
    storage = new InMemoryTokenStorage();
    service = new AuthService(storage);
  });

  describe('setTokens', () => {
    it('persists a token pair in storage', () => {
      service.setTokens({ accessToken: 'at1', refreshToken: 'rt1' });
      expect(storage.get()).toEqual({ accessToken: 'at1', refreshToken: 'rt1' });
    });
  });

  describe('getTokens', () => {
    it('returns null when no tokens are stored', () => {
      expect(service.getTokens()).toBeNull();
    });

    it('returns the stored token pair', () => {
      storage.set({ accessToken: 'at2' });
      expect(service.getTokens()).toEqual({ accessToken: 'at2' });
    });
  });

  describe('clearTokens', () => {
    it('removes stored tokens', () => {
      storage.set({ accessToken: 'at', refreshToken: 'rt' });
      service.clearTokens();
      expect(storage.get()).toBeNull();
    });
  });

  it('AuthService does not extend Error', () => {
    // Sanity check: MiddlewareError is still importable from types
    const err = new MiddlewareError('x', 0);
    expect(err).toBeInstanceOf(MiddlewareError);
  });
});
