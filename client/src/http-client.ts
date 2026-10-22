import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import { MiddlewareError, TokenPair, TokenStorage } from './types.js';

/** Internal flag added to retried requests to break refresh loops. */
const RETRY_FLAG = '__nocodb_retry';

interface RetryableConfig extends InternalAxiosRequestConfig {
  [RETRY_FLAG]?: boolean;
}

/** Compares by value: storages may return a new object on every get(). */
function sameSession(a: TokenPair | null, b: TokenPair | null): boolean {
  return (
    a?.accessToken === b?.accessToken && a?.refreshToken === b?.refreshToken
  );
}

/**
 * Create and configure the shared Axios instance used by all services.
 *
 * Two interceptors are attached:
 * 1. **Request** – adds `Authorization: Bearer <accessToken>` when a token is stored.
 * 2. **Response (error)** – on 401, attempts a single token refresh via the
 *    optional `onRefresh` callback, then retries the original request.
 *    An `isRefreshing` guard prevents re-entry if the refresh call itself
 *    returns 401, avoiding an infinite recursive loop.
 *
 * @param baseUrl       The middleware base URL.
 * @param tokenStorage  Token persistence implementation.
 * @param timeout       Request timeout in ms (default 30 000).
 * @param onRefresh     Optional callback invoked by the interceptor to perform a
 *                      token refresh.  It returns the new access token on success,
 *                      or throws on failure.  When omitted, 401 responses are
 *                      propagated without a retry.
 */
export function createHttpClient(
  baseUrl: string,
  tokenStorage: TokenStorage,
  timeout: number,
  onRefresh?: () => Promise<string>,
): AxiosInstance {
  const instance = axios.create({
    baseURL: baseUrl,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // ── Request interceptor: attach bearer token ──────────────────────────────
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const tokens = tokenStorage.get();
    if (tokens?.accessToken) {
      config.headers = config.headers ?? {};
      config.headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }
    return config;
  });

  // ── Response interceptor: 401 → refresh → retry ───────────────────────────
  // Guard against re-entrant refresh calls: if the refresh request itself
  // returns 401, we must not call onRefresh() again.
  let isRefreshing = false;

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as RetryableConfig | undefined;

      // Only attempt refresh once per request, and only when not already refreshing
      if (
        error.response?.status === 401 &&
        originalRequest &&
        !originalRequest[RETRY_FLAG] &&
        !isRefreshing &&
        onRefresh
      ) {
        originalRequest[RETRY_FLAG] = true;
        isRefreshing = true;

        const sessionBefore = tokenStorage.get();
        let newAccessToken: string;
        try {
          newAccessToken = await onRefresh();
        } catch {
          // Refresh failed – clear tokens and propagate the original error
          tokenStorage.clear();
          throw normaliseError(error);
        } finally {
          isRefreshing = false;
        }

        // The session may have changed while the refresh was pending: signed
        // out (cleared) or switched to another account (different tokens).
        // The refreshed token belongs to the old session, so neither store
        // nor retry with it. A callback that stored the refreshed token
        // itself is fine.
        const sessionNow = tokenStorage.get();
        const unchanged = sameSession(sessionNow, sessionBefore);
        const storedByCallback = sessionNow?.accessToken === newAccessToken;
        if (!sessionNow || (!unchanged && !storedByCallback)) {
          throw normaliseError(error);
        }

        // The request interceptor sets the header from storage, also for the
        // retry below; keep a refresh token the callback may have stored.
        tokenStorage.set({ ...sessionNow, accessToken: newAccessToken });
        return instance(originalRequest);
      }

      throw normaliseError(error);
    },
  );

  return instance;
}

/**
 * Convert an Axios error into a {@link MiddlewareError} with a numeric status code.
 */
export function normaliseError(error: unknown): MiddlewareError {
  if (error instanceof MiddlewareError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data as
      | { message?: string; error?: string }
      | undefined;
    const message =
      data?.message ??
      data?.error ??
      error.message ??
      'An unknown error occurred';
    return new MiddlewareError(String(message), status);
  }

  const msg = error instanceof Error ? error.message : String(error);
  return new MiddlewareError(msg, 0);
}
