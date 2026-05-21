import { AxiosInstance } from 'axios';
import { normaliseError } from '../http-client';
import { TokenPair, TokenStorage } from '../types';

/** Shape of the sign-in / sign-up / refresh response. */
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

/** Shape of the user profile response. */
export interface UserProfile {
  userId: string;
  email: string;
  username: string;
  role: string;
}

/**
 * Provides authentication operations against the NocoDB Middleware.
 *
 * Tokens are automatically persisted in the configured {@link TokenStorage}
 * after every successful auth call.
 */
export class AuthService {
  constructor(
    private readonly http: AxiosInstance,
    private readonly tokenStorage: TokenStorage,
  ) {}

  /**
   * Sign in with an email/username and password.
   * Stores the returned token pair in token storage.
   */
  async signIn(identifier: string, password: string): Promise<TokenPair> {
    try {
      const response = await this.http.post<AuthResponse>('/auth/signin', {
        identifier,
        password,
      });
      const tokens: TokenPair = {
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      };
      this.tokenStorage.set(tokens);
      return tokens;
    } catch (error) {
      throw normaliseError(error);
    }
  }

  /**
   * Register a new account.
   * Stores the returned token pair in token storage.
   */
  async signUp(
    username: string,
    email: string,
    password: string,
  ): Promise<TokenPair> {
    try {
      const response = await this.http.post<AuthResponse>('/auth/signup', {
        username,
        email,
        password,
      });
      const tokens: TokenPair = {
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      };
      this.tokenStorage.set(tokens);
      return tokens;
    } catch (error) {
      throw normaliseError(error);
    }
  }

  /**
   * Refresh the access token using the stored refresh token.
   * Updates token storage with the new token pair on success.
   * Clears storage and throws on failure.
   */
  async refresh(): Promise<string> {
    const tokens = this.tokenStorage.get();
    if (!tokens?.refreshToken) {
      this.tokenStorage.clear();
      throw normaliseError(new Error('No refresh token available'));
    }

    try {
      const response = await this.http.post<AuthResponse>(
        '/auth/refresh',
        {},
        {
          headers: { Authorization: `Bearer ${tokens.refreshToken}` },
        },
      );
      const newTokens: TokenPair = {
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      };
      this.tokenStorage.set(newTokens);
      return newTokens.accessToken;
    } catch (error) {
      this.tokenStorage.clear();
      throw normaliseError(error);
    }
  }

  /**
   * Sign out the current user.
   * Calls the logout endpoint and clears token storage regardless of the response.
   */
  async logout(): Promise<void> {
    try {
      await this.http.post('/auth/logout');
    } catch {
      // Best-effort: always clear local tokens regardless of server response
    } finally {
      this.tokenStorage.clear();
    }
  }

  /**
   * Retrieve the profile of the currently authenticated user.
   */
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await this.http.get<UserProfile>('/auth/profile');
      return response.data;
    } catch (error) {
      throw normaliseError(error);
    }
  }
}
