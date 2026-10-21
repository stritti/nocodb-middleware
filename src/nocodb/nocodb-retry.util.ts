import { AxiosError } from 'axios';

/** Methods that only read data and are therefore safe to send again. */
const READ_METHODS = new Set(['get', 'head', 'options']);

/** Network error codes that indicate a transient connectivity problem. */
const TRANSIENT_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ECONNABORTED',
  'EAI_AGAIN',
  'EPIPE',
]);

/**
 * Decides whether a failed NocoDB request may be sent again.
 *
 * - 429: always retried, the server rejected the request without processing it.
 * - Read requests (GET/HEAD/OPTIONS): retried on 5xx and transient network errors.
 * - Write requests (POST/PUT/PATCH/DELETE): never retried otherwise, because
 *   the server may already have applied the change before the error occurred.
 * - 4xx client errors are never retried.
 */
export function shouldRetryNocoDBRequest(error: AxiosError): boolean {
  const status = error.response?.status;

  if (status === 429) {
    return true;
  }

  const method = error.config?.method?.toLowerCase();
  if (!method || !READ_METHODS.has(method)) {
    return false;
  }

  if (status === undefined) {
    return error.code !== undefined && TRANSIENT_NETWORK_CODES.has(error.code);
  }

  return status >= 500;
}
