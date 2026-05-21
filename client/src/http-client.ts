import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import { MiddlewareError, TokenStorage } from './types';

/** Internal flag added to retried requests to break refresh loops. */
const RETRY_FLAG = '__nocodb_retry';

interface RetryableConfig extends InternalAxiosRequestConfig {
  [RETRY_FLAG]?: boolean;
}

/**
 * Create and configure the shared Axios instance used by all services.
 *
 * Two interceptors are attached:
 * 1. **Request** – adds `Authorization: Bearer <accessToken>` when a token is stored.
 * 2. **Response (error)** – on 401, attempts a single token refresh, then retries the
 *    original request. A `_isRetry` flag prevents infinite loops.
 *
 * @param baseUrl       The middleware base URL.
 * @param tokenStorage  Token persistence implementation.
 * @param timeout       Request timeout in ms (default 30 000).
 * @param onRefresh     Callback invoked by the interceptor to perform a token refresh.
 *                      It returns the new access token on success, or throws on failure.
 */
export function createHttpClient(
  baseUrl: string,
  tokenStorage: TokenStorage,
  timeout: number,
  onRefresh: () => Promise<string>,
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
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as RetryableConfig | undefined;

      // Only attempt refresh once per request
      if (
        error.response?.status === 401 &&
        originalRequest &&
        !originalRequest[RETRY_FLAG]
      ) {
        originalRequest[RETRY_FLAG] = true;

        try {
          const newAccessToken = await onRefresh();
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return instance(originalRequest);
        } catch {
          // Refresh failed – clear tokens and propagate the original error
          tokenStorage.clear();
          throw normaliseError(error);
        }
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
