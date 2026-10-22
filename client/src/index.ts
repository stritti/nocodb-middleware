/**
 * nocodb-middleware-client
 *
 * Framework-agnostic TypeScript client library for the NocoDB Middleware API.
 *
 * @packageDocumentation
 */

export { NocodbMiddlewareClient } from './client.js';
export { AuthService } from './services/auth.service.js';
export { AdminService } from './services/admin.service.js';
export { RecordsService } from './services/records.service.js';
export type {
  ListOptions,
  PageInfo,
  RecordList,
} from './services/records.service.js';
export type {
  TableMeta,
  Role,
  TablePermissions,
  ProvisionedUser,
  HealthStatus,
} from './services/admin.service.js';
export { InMemoryTokenStorage } from './token-storage.js';
export type {
  ClientConfig,
  TokenPair,
  TokenStorage,
} from './types.js';
export { MiddlewareError } from './types.js';
