## ADDED Requirements

### Requirement: List tables
The `AdminService` SHALL provide a `listTables()` method that calls `GET /meta/tables`
and returns an array of table metadata objects.

#### Scenario: Successful table listing
- **WHEN** `admin.listTables()` is called with admin credentials
- **THEN** the promise resolves with an array of table descriptors

### Requirement: List roles
The `AdminService` SHALL provide a `listRoles()` method that calls
`GET /admin/permissions/roles` and returns the array of role objects.

#### Scenario: Successful role listing
- **WHEN** `admin.listRoles()` is called by an authenticated admin
- **THEN** the promise resolves with the array of roles

### Requirement: Create role
The `AdminService` SHALL provide a `createRole(roleName, description?, isSystemRole?)`
method that calls `POST /admin/permissions/roles`.

#### Scenario: Role created
- **WHEN** `admin.createRole('editor')` is called
- **THEN** the promise resolves with the created role object

### Requirement: Set table permissions
The `AdminService` SHALL provide a `setTablePermissions(roleId, tableName, permissions)`
method that calls `POST /admin/permissions/tables`.

#### Scenario: Permissions set
- **WHEN** valid role ID, table name, and permission flags are supplied
- **THEN** the promise resolves confirming the permissions were applied

### Requirement: Provision user
The `AdminService` SHALL provide a `createUser(dto)` method that calls `POST /users`.

#### Scenario: User provisioned
- **WHEN** valid user data is supplied
- **THEN** the promise resolves with the created user record

### Requirement: Health check
The `AdminService` SHALL provide a `healthCheck()` method that calls `GET /health` and
returns the health status payload.

#### Scenario: Service healthy
- **WHEN** `admin.healthCheck()` is called
- **THEN** the promise resolves with the health response (status 200)
