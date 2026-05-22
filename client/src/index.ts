/**
 * nocodb-middleware-client
 *
 * Framework-agnostic TypeScript client library for the NocoDB Middleware API.
 *
 * @packageDocumentation
 */

export { NocodbMiddlewareClient } from './client';
export { AuthService } from './services/auth.service';
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
} from './types';
export { MiddlewareError } from './types';
