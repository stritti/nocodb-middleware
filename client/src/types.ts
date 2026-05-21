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
}

/** A JWT token pair returned by the auth endpoints. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Interface for pluggable token persistence. */
export interface TokenStorage {
  get(): TokenPair | null;
  set(tokens: TokenPair): void;
  clear(): void;
}

/** Pagination metadata returned by list endpoints. */
export interface PageInfo {
  totalRows: number;
  page: number;
  pageSize: number;
  isFirstPage: boolean;
  isLastPage: boolean;
}

/** A paginated result set. */
export interface PaginatedResult<T> {
  list: T[];
  pageInfo: PageInfo;
}

/** Options for list/filter operations on records. */
export interface ListOptions {
  /** NocoDB filter string, e.g. `(Name,eq,Alice)`. */
  where?: string;
  /** Sort string, e.g. `-CreatedAt` for descending. */
  sort?: string;
  /** Comma-separated field names to return. */
  fields?: string;
  /** Maximum number of records to return. */
  limit?: number;
  /** Number of records to skip. */
  offset?: number;
}

/** Options for reading a single record. */
export interface ReadOptions {
  /** Comma-separated field names to return. */
  fields?: string;
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
