import { TokenPair, TokenStorage } from '../types';

/**
 * Manages JWT tokens for the NocoDB Middleware client.
 *
 * The NocoDB Middleware validates JWTs but does **not** issue them — there is
 * no built-in login flow on the server.  Tokens must be obtained from your
 * external identity provider (NocoDB sign-in, Auth0, Keycloak, etc.) and
 * then injected here via {@link setTokens}.
 *
 * @example
 * ```typescript
 * // Obtain tokens from your IdP, then inject them:
 * const tokens = await myIdp.signIn(email, password);
 * client.auth.setTokens(tokens);
 * ```
 */
export class AuthService {
  constructor(private readonly tokenStorage: TokenStorage) {}

  /**
   * Persist a token pair obtained from an external identity provider.
   * All subsequent requests will use the stored access token.
   */
  setTokens(tokens: TokenPair): void {
    this.tokenStorage.set(tokens);
  }

  /**
   * Return the currently stored token pair, or `null` if not set.
   */
  getTokens(): TokenPair | null {
    return this.tokenStorage.get();
  }

  /**
   * Clear stored tokens (effectively signing the user out on the client side).
   */
  clearTokens(): void {
    this.tokenStorage.clear();
  }
}
