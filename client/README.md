# nocodb-middleware-client

> Framework-agnostic TypeScript client library for the
> [NocoDB Middleware](../README.md) API.

Works out of the box with **Angular**, **Vue.js**, **React**, **Svelte**, and plain
Node.js scripts.

> **Note:** The NocoDB Middleware validates JWTs but does **not** issue them.
> There is no built-in login flow. Obtain tokens from your external identity
> provider (NocoDB sign-in, Auth0, Keycloak, etc.) and inject them with
> `client.auth.setTokens(tokens)`.

---

## Installation

```bash
# npm
npm install nocodb-middleware-client axios

# yarn
yarn add nocodb-middleware-client axios

# pnpm
pnpm add nocodb-middleware-client axios
```

`axios` is a peer dependency – you need to install it separately.

---

## Quick Start

### Plain TypeScript / Vanilla JS

```typescript
import { NocodbMiddlewareClient } from 'nocodb-middleware-client';

const client = new NocodbMiddlewareClient({
  baseUrl: 'https://api.example.com',
});

// Inject tokens obtained from your external IdP:
client.auth.setTokens({ accessToken: '<your-jwt>' });

// List tables exposed by the middleware:
const tables = await client.admin.listTables();
console.log(tables);

// Manage roles and permissions:
await client.admin.createRole('editor', 'Can create and edit content');
await client.admin.setTablePermissions(1, 'products', {
  canCreate: true,
  canRead: true,
  canUpdate: true,
  canDelete: false,
});
```

---

### Angular

```typescript
// app.config.ts
import { InjectionToken } from '@angular/core';
import { NocodbMiddlewareClient } from 'nocodb-middleware-client';

export const NOCODB_CLIENT = new InjectionToken<NocodbMiddlewareClient>(
  'NocodbClient',
  {
    factory: () =>
      new NocodbMiddlewareClient({
        baseUrl: 'https://api.example.com',
      }),
  },
);

// my.service.ts
import { inject, Injectable } from '@angular/core';
import { NOCODB_CLIENT } from '../app.config';

@Injectable({ providedIn: 'root' })
export class TableService {
  private client = inject(NOCODB_CLIENT);

  getTables() {
    return this.client.admin.listTables();
  }
}
```

---

### Vue 3 (Composition API)

```typescript
// composables/useNocodb.ts
import { NocodbMiddlewareClient } from 'nocodb-middleware-client';

const client = new NocodbMiddlewareClient({
  baseUrl: import.meta.env.VITE_API_URL,
});

export function useNocodb() {
  return client;
}

// RoleList.vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useNocodb } from '../composables/useNocodb';

const roles = ref([]);

onMounted(async () => {
  const client = useNocodb();
  // Inject token from your IdP before making authenticated calls
  client.auth.setTokens({ accessToken: myIdpToken });
  roles.value = await client.admin.listRoles();
});
</script>
```

---

### React

```tsx
// hooks/useNocodbClient.ts
import { useMemo } from 'react';
import { NocodbMiddlewareClient } from 'nocodb-middleware-client';

let _client: NocodbMiddlewareClient | null = null;

export function useNocodbClient() {
  return useMemo(() => {
    if (!_client) {
      _client = new NocodbMiddlewareClient({
        baseUrl: process.env.REACT_APP_API_URL!,
      });
    }
    return _client;
  }, []);
}

// RoleList.tsx
import { useEffect, useState } from 'react';
import { useNocodbClient } from '../hooks/useNocodbClient';

export function RoleList() {
  const client = useNocodbClient();
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    // Inject token from your IdP first
    client.auth.setTokens({ accessToken: myIdpToken });
    client.admin.listRoles().then(setRoles);
  }, [client]);

  return <ul>{roles.map(r => <li key={r.id}>{r.roleName}</li>)}</ul>;
}
```

---

## Custom Token Storage

By default tokens are stored in memory. Plug in `localStorage` or your
state-management store:

```typescript
import { TokenStorage, TokenPair } from 'nocodb-middleware-client';

const localStorageAdapter: TokenStorage = {
  get(): TokenPair | null {
    const raw = localStorage.getItem('nocodb_tokens');
    return raw ? JSON.parse(raw) : null;
  },
  set(tokens: TokenPair): void {
    localStorage.setItem('nocodb_tokens', JSON.stringify(tokens));
  },
  clear(): void {
    localStorage.removeItem('nocodb_tokens');
  },
};

const client = new NocodbMiddlewareClient({
  baseUrl: 'https://api.example.com',
  tokenStorage: localStorageAdapter,
});
```

---

## Silent Token Refresh

If your IdP supports silent refresh (e.g. a rotating refresh-token flow),
supply an `onRefresh` callback. The HTTP client calls it automatically on
any `401` response to obtain a new access token and retry the request.
The interceptor is guarded against re-entrant calls, so a failed refresh
propagates the original 401 instead of looping.

Use a shared `TokenStorage` instance so the callback can update stored
tokens without a circular reference to the client itself:

```typescript
import {
  NocodbMiddlewareClient,
  InMemoryTokenStorage,
} from 'nocodb-middleware-client';

const storage = new InMemoryTokenStorage();

const client = new NocodbMiddlewareClient({
  baseUrl: 'https://api.example.com',
  tokenStorage: storage,
  onRefresh: async () => {
    const tokens = await myIdp.silentRenew();
    storage.set(tokens);
    return tokens.accessToken;
  },
});
```

---

## API Reference

### `NocodbMiddlewareClient`

| Constructor option | Type                      | Default      | Description                                   |
| ------------------ | ------------------------- | ------------ | --------------------------------------------- |
| `baseUrl`          | `string`                  | **required** | Base URL of the NocoDB Middleware             |
| `tokenStorage`     | `TokenStorage`            | in-memory    | Custom token persistence adapter              |
| `timeout`          | `number`                  | `30000`      | Request timeout in milliseconds               |
| `onRefresh`        | `() => Promise<string>`   | –            | Optional silent-refresh callback (see above)  |

### `client.auth` – `AuthService`

| Method                        | Description                                          |
| ----------------------------- | ---------------------------------------------------- |
| `setTokens(tokens)`           | Inject a `TokenPair` obtained from your IdP          |
| `getTokens()`                 | Return the currently stored `TokenPair` or `null`    |
| `clearTokens()`               | Clear stored tokens (client-side sign-out)           |

### `client.admin` – `AdminService`

| Method                                               | Description                           |
| ---------------------------------------------------- | ------------------------------------- |
| `listTables()`                                       | List all exposed tables               |
| `listRoles()`                                        | List all roles                        |
| `createRole(roleName, description?, isSystemRole?)`  | Create a new role                     |
| `setTablePermissions(roleId, tableName, flags)`      | Set CRUD flags for a role on a table  |
| `createUser(dto)`                                    | Provision a new user                  |
| `healthCheck()`                                      | Check Middleware health status        |

---

## Error Handling

All methods throw `MiddlewareError` on failure:

```typescript
import { MiddlewareError } from 'nocodb-middleware-client';

try {
  await client.admin.listTables();
} catch (err) {
  if (err instanceof MiddlewareError) {
    console.error(`HTTP ${err.statusCode}: ${err.message}`);
  }
}
```

| `statusCode` | Meaning                              |
| ------------ | ------------------------------------ |
| `0`          | Network error (server unreachable)   |
| `401`        | Unauthorized / token expired         |
| `403`        | Forbidden                            |
| `404`        | Resource not found                   |
| `409`        | Conflict (e.g. duplicate role name)  |
| `5xx`        | Server-side error                    |

---

## Development

```bash
# from client/
npm install          # install dev deps
npm test             # run unit tests (Jest)
npm run build        # compile ESM + CJS outputs
npm run lint         # lint source
```
