## ADDED Requirements

### Requirement: Client instantiation
The library SHALL export a `NocodbMiddlewareClient` class that accepts a configuration
object with at least a `baseUrl` string field. An optional `tokenStorage` field MAY be
provided; if omitted the client uses an in-memory token store.

#### Scenario: Successful instantiation with base URL
- **WHEN** a caller constructs `new NocodbMiddlewareClient({ baseUrl: 'http://...' })`
- **THEN** the instance is created without errors

#### Scenario: Missing baseUrl throws
- **WHEN** a caller constructs the client without `baseUrl`
- **THEN** the constructor SHALL throw a descriptive `Error`

### Requirement: Service accessors
The `NocodbMiddlewareClient` instance SHALL expose `.auth`, `.records`, and `.admin`
properties that return pre-configured service instances sharing the same Axios instance
and token storage.

#### Scenario: Accessing auth service
- **WHEN** caller accesses `client.auth`
- **THEN** a fully configured `AuthService` instance is returned

#### Scenario: Accessing records service
- **WHEN** caller accesses `client.records`
- **THEN** a fully configured `RecordsService` instance is returned

#### Scenario: Accessing admin service
- **WHEN** caller accesses `client.admin`
- **THEN** a fully configured `AdminService` instance is returned

### Requirement: Error normalisation
The client SHALL map all HTTP error responses to a typed `MiddlewareError` class that
extends `Error` and carries `statusCode: number` and `message: string`.

#### Scenario: HTTP 404 mapped to MiddlewareError
- **WHEN** an API request returns a 404 response
- **THEN** the rejected promise carries a `MiddlewareError` with `statusCode === 404`

#### Scenario: Network error wrapped
- **WHEN** the server is unreachable (network failure)
- **THEN** the rejected promise carries a `MiddlewareError` with `statusCode === 0`

### Requirement: Dual ESM and CJS exports
The built package SHALL expose both an ESM entry-point and a CommonJS entry-point via
the `exports` field in `package.json`.

#### Scenario: ESM import
- **WHEN** a bundler resolves the package using the `import` condition
- **THEN** the ESM output from `dist/esm/index.js` is resolved

#### Scenario: CJS require
- **WHEN** a Node.js script uses `require('nocodb-middleware-client')`
- **THEN** the CJS output from `dist/cjs/index.js` is resolved
