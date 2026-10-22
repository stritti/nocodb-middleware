import { createHttpClient } from './http-client.js';
import { AuthService } from './services/auth.service.js';
import { AdminService } from './services/admin.service.js';
import { RecordsService } from './services/records.service.js';
import { InMemoryTokenStorage } from './token-storage.js';
import { ClientConfig, MiddlewareError } from './types.js';

/**
 * Main entry-point for the NocoDB Middleware client library.
 *
 * The NocoDB Middleware validates JWTs but does **not** issue them.  Obtain
 * tokens from your external identity provider and inject them with
 * `client.auth.setTokens(tokens)`.
 *
 * @example
 * ```typescript
 * const client = new NocodbMiddlewareClient({ baseUrl: 'https://api.example.com' });
 *
 * // Inject tokens obtained from your IdP:
 * client.auth.setTokens({ accessToken: '<token>' });
 *
 * // Read and write table data:
 * const { list } = await client.records.list('customers', { limit: 10 });
 *
 * // Manage roles and permissions:
 * const tables = await client.admin.listTables();
 * await client.admin.createRole('editor', 'Can create and edit content');
 * ```
 */
export class NocodbMiddlewareClient {
  private readonly _auth: AuthService;
  private readonly _admin: AdminService;
  private readonly _records: RecordsService;

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
      config.onRefresh,
    );

    // AuthService only manages token storage; it no longer needs the HTTP
    // client because the middleware does not expose auth endpoints.
    this._auth = new AuthService(storage);
    this._admin = new AdminService(http);
    this._records = new RecordsService(http);
  }

  /** Token management (set/get/clear tokens obtained from your identity provider). */
  get auth(): AuthService {
    return this._auth;
  }

  /** Admin service (roles, permissions, user provisioning, health). */
  get admin(): AdminService {
    return this._admin;
  }

  /** Record CRUD on NocoDB tables via the data API (`/data/:table`). */
  get records(): RecordsService {
    return this._records;
  }
}
