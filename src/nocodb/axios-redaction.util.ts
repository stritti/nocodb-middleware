import type { AxiosError, AxiosInstance } from 'axios';
import { isAxiosError } from 'axios';

/** Request headers that carry NocoDB credentials. */
export const SENSITIVE_HEADERS = ['xc-token', 'xc-auth', 'authorization'];

export const REDACTED = '[REDACTED]';

function redactHeaders(headers: unknown): void {
  if (!headers || typeof headers !== 'object') {
    return;
  }
  // Plain objects and AxiosHeaders both expose header names as own keys.
  const record = headers as Record<string, unknown>;
  for (const name of Object.keys(record)) {
    if (SENSITIVE_HEADERS.includes(name.toLowerCase())) {
      record[name] = REDACTED;
    }
  }
}

/**
 * Removes credentials from an Axios error before it is logged or rethrown.
 *
 * An `AxiosError` carries the request config (with the `xc-token` header)
 * and the Node `ClientRequest`, whose raw `_header` string contains the token
 * as well. Loggers that inspect the error (e.g. Nest's ConsoleLogger) would
 * otherwise print the NocoDB API token in full.
 */
export function redactAxiosError<T>(error: T): T {
  if (!isAxiosError(error)) {
    return error;
  }
  const axiosError = error as AxiosError;
  redactHeaders(axiosError.config?.headers);
  // The ClientRequest holds the raw request headers; it is not needed after
  // the request has failed.
  axiosError.request = undefined;
  if (axiosError.response) {
    redactHeaders(axiosError.response.config?.headers);
    axiosError.response.request = undefined;
  }
  return error;
}

/**
 * Registers a response interceptor that redacts credentials from failed
 * requests. Register it after retry interceptors (axios-retry), so retries
 * still use the original headers.
 */
export function installAxiosErrorRedaction(client: AxiosInstance): void {
  client.interceptors.response.use(undefined, (error: unknown) =>
    Promise.reject(redactAxiosError(error)),
  );
}
