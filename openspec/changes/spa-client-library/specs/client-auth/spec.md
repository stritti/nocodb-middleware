## ADDED Requirements

### Requirement: Sign-in
The `AuthService` SHALL provide a `signIn(identifier, password)` method that calls
`POST /auth/signin` and stores the returned token pair in the configured token storage.

#### Scenario: Successful sign-in stores tokens
- **WHEN** `auth.signIn('user@example.com', 'P@ssword1')` is called with valid credentials
- **THEN** the promise resolves with `{ accessToken, refreshToken }` and both tokens are
  persisted in token storage

#### Scenario: Invalid credentials rejected
- **WHEN** `auth.signIn` is called with wrong credentials
- **THEN** the promise rejects with a `MiddlewareError` with `statusCode === 401`

### Requirement: Sign-up
The `AuthService` SHALL provide a `signUp(username, email, password)` method that calls
`POST /auth/signup` and stores the returned token pair.

#### Scenario: Successful registration
- **WHEN** valid registration data is provided
- **THEN** the promise resolves with `{ accessToken, refreshToken }` and tokens are stored

### Requirement: Token refresh
The `AuthService` SHALL provide a `refresh()` method that calls `POST /auth/refresh`
using the stored refresh token. On success the new token pair SHALL be persisted.

#### Scenario: Successful refresh
- **WHEN** `auth.refresh()` is called with a valid refresh token
- **THEN** new tokens are returned and stored, replacing the old pair

#### Scenario: Expired refresh token
- **WHEN** the refresh token is expired
- **THEN** the promise rejects with a `MiddlewareError` with `statusCode === 401` and
  token storage is cleared

### Requirement: Logout
The `AuthService` SHALL provide a `logout()` method that calls `POST /auth/logout` and
clears token storage.

#### Scenario: Successful logout clears tokens
- **WHEN** `auth.logout()` is called
- **THEN** the API is called, token storage is cleared, and the promise resolves

### Requirement: Profile retrieval
The `AuthService` SHALL provide a `getProfile()` method that calls `GET /auth/profile`
and returns the current user's profile.

#### Scenario: Authenticated profile fetch
- **WHEN** `auth.getProfile()` is called with a valid access token
- **THEN** the promise resolves with the user profile object

### Requirement: Automatic token refresh on 401
The Axios interceptor SHALL intercept 401 responses on non-auth endpoints, attempt a
single token refresh, and retry the original request. If the refresh also fails the
original error SHALL be propagated.

#### Scenario: Transparent retry after 401
- **WHEN** an API request returns 401 and the refresh token is still valid
- **THEN** the client silently refreshes tokens and retries the request without the
  caller receiving a 401

#### Scenario: Refresh fails – error propagated
- **WHEN** an API request returns 401 and the subsequent refresh also fails
- **THEN** the original request rejects with `MiddlewareError` statusCode 401
