/**
 * Core types for the NocoDB Middleware client library.
 */

/** Configuration for creating a {@link NocodbMiddlewareClient}. */
export interface ClientConfig {
  /** Base URL of the NocoDB Middleware, e.g. `https://api.example.com`. */
  baseUrl: string;
  /** Optional custom token storage (defaults to in-memory). */
  tokenStorage?: TokenStorage;
  /** Optional request timeout in milliseconds (default: 30000). */
  timeout?: number;
  /**
   * Optional callback invoked by the 401 response interceptor to obtain a
   * fresh access token.  Implement this when your identity provider supports
   * silent token refresh (e.g. a rotating refresh-token flow).
   *
   * The callback should return the new access token on success, or throw on
   * failure (the client will then clear the stored tokens and propagate the
   * original 401 error).
   *
   * When omitted, 401 responses are propagated directly without a retry.
   */
  onRefresh?: () => Promise<string>;
}

/** A JWT token pair stored by the client. */
export interface TokenPair {
  accessToken: string;
  refreshToken?: string;
}

/** Interface for pluggable token persistence. */
export interface TokenStorage {
  get(): TokenPair | null;
  set(tokens: TokenPair): void;
  clear(): void;
}

/**
 * Typed error thrown by the client for any HTTP or network failure.
 */
export class MiddlewareError extends Error {
  /** HTTP status code, or 0 for network errors. */
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'MiddlewareError';
    this.statusCode = statusCode;
    // Maintains proper prototype chain in transpiled code
    Object.setPrototypeOf(this, MiddlewareError.prototype);
  }
}
