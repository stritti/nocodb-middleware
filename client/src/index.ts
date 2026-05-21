/**
 * nocodb-middleware-client
 *
 * Framework-agnostic TypeScript client library for the NocoDB Middleware API.
 *
 * @packageDocumentation
 */

export { NocodbMiddlewareClient } from './client';
export { AuthService } from './services/auth.service';
export type { UserProfile } from './services/auth.service';
export { RecordsService } from './services/records.service';
export { AdminService } from './services/admin.service';
export type {
  TableMeta,
  Role,
  TablePermissions,
  ProvisionedUser,
  HealthStatus,
} from './services/admin.service';
export { InMemoryTokenStorage } from './token-storage';
export type {
  ClientConfig,
  TokenPair,
  TokenStorage,
  PageInfo,
  PaginatedResult,
  ListOptions,
  ReadOptions,
} from './types';
export { MiddlewareError } from './types';
