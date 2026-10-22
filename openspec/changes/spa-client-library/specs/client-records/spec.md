## ADDED Requirements

### Requirement: List records
The `RecordsService` SHALL provide a `list(table, options?)` method that calls
`GET /data/{table}` (Middleware data API) and returns a paginated result with
`{ list: T[], pageInfo: PageInfo }`.

#### Scenario: List with default options
- **WHEN** `records.list('customers')` is called
- **THEN** the promise resolves with an object containing `list` (array) and `pageInfo`

#### Scenario: List with filter and sort
- **WHEN** `records.list('customers', { where: '(Name,eq,Alice)', sort: '-CreatedAt', limit: 10 })`
- **THEN** the request includes the correct `where`, `sort`, and `limit` query parameters

### Requirement: Read single record
The `RecordsService` SHALL provide a `read(table, recordId)` method that
calls `GET /data/{table}/{recordId}` and returns the typed record.

#### Scenario: Successful read
- **WHEN** `records.read('customers', 1)` is called
- **THEN** the promise resolves with the record object

#### Scenario: Record not found
- **WHEN** the record does not exist
- **THEN** the promise rejects with a `MiddlewareError` with `statusCode === 404`

### Requirement: Create record
The `RecordsService` SHALL provide a `create(table, data)` method that calls
`POST /data/{table}` and returns the created record.

#### Scenario: Successful create
- **WHEN** `records.create('customers', { Name: 'Alice' })` is called
- **THEN** the promise resolves with the newly created record including its `Id`

### Requirement: Update record
The `RecordsService` SHALL provide an `update(table, recordId, data)` method that
calls `PATCH /data/{table}/{recordId}` and returns the updated record.

#### Scenario: Successful update
- **WHEN** `records.update('customers', 1, { Name: 'Bob' })` is called
- **THEN** the promise resolves with the updated record

### Requirement: Delete record
The `RecordsService` SHALL provide a `delete(table, recordId)` method that calls
`DELETE /data/{table}/{recordId}`.

#### Scenario: Successful delete
- **WHEN** `records.delete('customers', 1)` is called
- **THEN** the promise resolves without a body

### Requirement: Find one record
The `RecordsService` SHALL provide a `findOne(table, where)` convenience method that
calls `list` with `limit: 1` and returns the first item or `null`.

#### Scenario: Record found
- **WHEN** `records.findOne('customers', '(Email,eq,alice@example.com)')` matches a record
- **THEN** the promise resolves with that record

#### Scenario: No match returns null
- **WHEN** the filter matches no records
- **THEN** the promise resolves with `null`
