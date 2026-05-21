import axios, { AxiosInstance } from 'axios';
import { AuthService } from '../src/services/auth.service';
import { InMemoryTokenStorage } from '../src/token-storage';
import { MiddlewareError } from '../src/types';

// Helper to create a mock Axios instance
function createMockHttp(): jest.Mocked<Pick<AxiosInstance, 'post' | 'get'>> {
  return {
    post: jest.fn(),
    get: jest.fn(),
  };
}

describe('AuthService', () => {
  let storage: InMemoryTokenStorage;
  let http: ReturnType<typeof createMockHttp>;
  let service: AuthService;

  beforeEach(() => {
    storage = new InMemoryTokenStorage();
    http = createMockHttp();
    service = new AuthService(http as unknown as AxiosInstance, storage);
  });

  describe('signIn', () => {
    it('stores tokens on success', async () => {
      http.post.mockResolvedValueOnce({
        data: { accessToken: 'at1', refreshToken: 'rt1' },
      });

      const result = await service.signIn('alice@example.com', 'P@ssword1');

      expect(result.accessToken).toBe('at1');
      expect(result.refreshToken).toBe('rt1');
      expect(storage.get()).toEqual({ accessToken: 'at1', refreshToken: 'rt1' });
      expect(http.post).toHaveBeenCalledWith('/auth/signin', {
        identifier: 'alice@example.com',
        password: 'P@ssword1',
      });
    });

    it('throws MiddlewareError on 401', async () => {
      const axiosErr = Object.assign(new Error('Unauthorized'), {
        response: { status: 401, data: { message: 'Bad credentials' } },
      });
      jest.spyOn(axios, 'isAxiosError').mockReturnValueOnce(true);
      http.post.mockRejectedValueOnce(axiosErr);

      await expect(
        service.signIn('bad@example.com', 'wrong'),
      ).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('signUp', () => {
    it('stores tokens on successful registration', async () => {
      http.post.mockResolvedValueOnce({
        data: { accessToken: 'at2', refreshToken: 'rt2' },
      });

      const result = await service.signUp(
        'alice',
        'alice@example.com',
        'P@ssword1',
      );
      expect(result).toEqual({ accessToken: 'at2', refreshToken: 'rt2' });
      expect(storage.get()).toEqual({ accessToken: 'at2', refreshToken: 'rt2' });
    });
  });

  describe('refresh', () => {
    it('updates token storage on success', async () => {
      storage.set({ accessToken: 'old_at', refreshToken: 'old_rt' });
      http.post.mockResolvedValueOnce({
        data: { accessToken: 'new_at', refreshToken: 'new_rt' },
      });

      const newAt = await service.refresh();

      expect(newAt).toBe('new_at');
      expect(storage.get()).toEqual({
        accessToken: 'new_at',
        refreshToken: 'new_rt',
      });
    });

    it('clears storage and throws when refresh token missing', async () => {
      // No token stored
      await expect(service.refresh()).rejects.toBeInstanceOf(MiddlewareError);
      expect(storage.get()).toBeNull();
    });

    it('clears storage when refresh request fails', async () => {
      storage.set({ accessToken: 'at', refreshToken: 'rt' });
      const axiosErr = Object.assign(new Error('Unauthorized'), {
        response: { status: 401, data: {} },
      });
      jest.spyOn(axios, 'isAxiosError').mockReturnValueOnce(true);
      http.post.mockRejectedValueOnce(axiosErr);

      await expect(service.refresh()).rejects.toBeInstanceOf(MiddlewareError);
      expect(storage.get()).toBeNull();
    });
  });

  describe('logout', () => {
    it('clears storage after calling the API', async () => {
      storage.set({ accessToken: 'at', refreshToken: 'rt' });
      http.post.mockResolvedValueOnce({});

      await service.logout();

      expect(storage.get()).toBeNull();
    });

    it('clears storage even if API call fails', async () => {
      storage.set({ accessToken: 'at', refreshToken: 'rt' });
      http.post.mockRejectedValueOnce(new Error('network error'));

      await service.logout();

      expect(storage.get()).toBeNull();
    });
  });

  describe('getProfile', () => {
    it('returns user profile', async () => {
      const profile = {
        userId: '1',
        email: 'a@b.com',
        username: 'alice',
        role: 'user',
      };
      http.get.mockResolvedValueOnce({ data: profile });

      const result = await service.getProfile();
      expect(result).toEqual(profile);
    });
  });
});
