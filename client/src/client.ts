import { createHttpClient } from './http-client';
import { AuthService } from './services/auth.service';
import { RecordsService } from './services/records.service';
import { AdminService } from './services/admin.service';
import { InMemoryTokenStorage } from './token-storage';
import { ClientConfig, MiddlewareError } from './types';

/**
 * Main entry-point for the NocoDB Middleware client library.
 *
 * @example
 * ```typescript
 * const client = new NocodbMiddlewareClient({ baseUrl: 'https://api.example.com' });
 * await client.auth.signIn('alice@example.com', 'P@ssword1');
 * const { list } = await client.records.list('tbl_abc123');
 * ```
 */
export class NocodbMiddlewareClient {
  private readonly _auth: AuthService;
  private readonly _records: RecordsService;
  private readonly _admin: AdminService;

  constructor(config: ClientConfig) {
    if (!config?.baseUrl) {
      throw new MiddlewareError(
        'NocodbMiddlewareClient requires a non-empty baseUrl',
        0,
      );
    }

    const storage = config.tokenStorage ?? new InMemoryTokenStorage();
    const timeout = config.timeout ?? 30_000;

    const http = createHttpClient(
      config.baseUrl,
      storage,
      timeout,
      // Refresh callback used by the 401 interceptor
      () => authService.refresh(),
    );

    const authService = new AuthService(http, storage);
    this._auth = authService;
    this._records = new RecordsService(http);
    this._admin = new AdminService(http);
  }

  /** Authentication service (sign-in, sign-up, refresh, logout, profile). */
  get auth(): AuthService {
    return this._auth;
  }

  /** Records service (CRUD + list/filter for any table). */
  get records(): RecordsService {
    return this._records;
  }

  /** Admin service (roles, permissions, user provisioning, health). */
  get admin(): AdminService {
    return this._admin;
  }
}
