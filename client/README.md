# nocodb-middleware-client

> Framework-agnostic TypeScript client library for the
> [NocoDB Middleware](../README.md) API.

Works out of the box with **Angular**, **Vue.js**, **React**, **Svelte**, and plain
Node.js scripts.

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

await client.auth.signIn('alice@example.com', 'P@ssword1');

const { list } = await client.records.list('tbl_abc123', {
  where: '(Status,eq,active)',
  sort: '-CreatedAt',
  limit: 25,
});

console.log(list);
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
export class ProductsService {
  private client = inject(NOCODB_CLIENT);

  getProducts() {
    return this.client.records.list('tbl_products');
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

// ProductList.vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useNocodb } from '../composables/useNocodb';

const products = ref([]);

onMounted(async () => {
  const client = useNocodb();
  await client.auth.signIn(username, password);
  const result = await client.records.list('tbl_products');
  products.value = result.list;
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

// ProductList.tsx
import { useEffect, useState } from 'react';
import { useNocodbClient } from '../hooks/useNocodbClient';

export function ProductList() {
  const client = useNocodbClient();
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    client.records
      .list('tbl_products')
      .then(({ list }) => setProducts(list));
  }, [client]);

  return <ul>{products.map(p => <li key={p.Id}>{p.Name}</li>)}</ul>;
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

## API Reference

### `NocodbMiddlewareClient`

| Constructor option | Type             | Default      | Description                          |
| ------------------ | ---------------- | ------------ | ------------------------------------ |
| `baseUrl`          | `string`         | **required** | Base URL of the NocoDB Middleware    |
| `tokenStorage`     | `TokenStorage`   | in-memory    | Custom token persistence adapter     |
| `timeout`          | `number`         | `30000`      | Request timeout in milliseconds      |

### `client.auth` – `AuthService`

| Method                              | Description                                       |
| ----------------------------------- | ------------------------------------------------- |
| `signIn(identifier, password)`      | Sign in, store tokens, return `TokenPair`         |
| `signUp(username, email, password)` | Register, store tokens, return `TokenPair`        |
| `refresh()`                         | Refresh access token, return new access token     |
| `logout()`                          | Invalidate server session, clear token storage    |
| `getProfile()`                      | Return the current user's `UserProfile`           |

### `client.records` – `RecordsService`

| Method                              | Description                                       |
| ----------------------------------- | ------------------------------------------------- |
| `list(tableId, options?)`           | List records with filter/sort/pagination          |
| `read(tableId, recordId, options?)` | Read a single record by ID                       |
| `create(tableId, data)`             | Create a new record                               |
| `update(tableId, recordId, data)`   | Patch an existing record                          |
| `delete(tableId, recordId)`         | Delete a record                                   |
| `findOne(tableId, where)`           | Return the first matching record or `null`        |

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
  await client.records.read('tbl_abc', 999);
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
| `404`        | Record or resource not found         |
| `409`        | Conflict (e.g. duplicate username)   |
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
