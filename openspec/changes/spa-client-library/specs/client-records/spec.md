## ADDED Requirements

### Requirement: List records
The `RecordsService` SHALL provide a `list(tableId, options?)` method that calls
`GET /api/v1/db/data/{tableId}` via the Middleware and returns a paginated result with
`{ list: T[], pageInfo: PageInfo }`.

#### Scenario: List with default options
- **WHEN** `records.list('tbl_abc')` is called
- **THEN** the promise resolves with an object containing `list` (array) and `pageInfo`

#### Scenario: List with filter and sort
- **WHEN** `records.list('tbl_abc', { where: '(Name,eq,Alice)', sort: '-CreatedAt', limit: 10 })`
- **THEN** the request includes the correct `where`, `sort`, and `limit` query parameters

### Requirement: Read single record
The `RecordsService` SHALL provide a `read(tableId, recordId, options?)` method that
calls `GET /api/v1/db/data/{tableId}/{recordId}` and returns the typed record.

#### Scenario: Successful read
- **WHEN** `records.read('tbl_abc', 1)` is called
- **THEN** the promise resolves with the record object

#### Scenario: Record not found
- **WHEN** the record does not exist
- **THEN** the promise rejects with a `MiddlewareError` with `statusCode === 404`

### Requirement: Create record
The `RecordsService` SHALL provide a `create(tableId, data)` method that calls
`POST /api/v1/db/data/{tableId}` and returns the created record.

#### Scenario: Successful create
- **WHEN** `records.create('tbl_abc', { Name: 'Alice' })` is called
- **THEN** the promise resolves with the newly created record including its `Id`

### Requirement: Update record
The `RecordsService` SHALL provide an `update(tableId, recordId, data)` method that
calls `PATCH /api/v1/db/data/{tableId}/{recordId}` and returns the updated record.

#### Scenario: Successful update
- **WHEN** `records.update('tbl_abc', 1, { Name: 'Bob' })` is called
- **THEN** the promise resolves with the updated record

### Requirement: Delete record
The `RecordsService` SHALL provide a `delete(tableId, recordId)` method that calls
`DELETE /api/v1/db/data/{tableId}/{recordId}`.

#### Scenario: Successful delete
- **WHEN** `records.delete('tbl_abc', 1)` is called
- **THEN** the promise resolves without a body

### Requirement: Find one record
The `RecordsService` SHALL provide a `findOne(tableId, where)` convenience method that
calls `list` with `limit: 1` and returns the first item or `null`.

#### Scenario: Record found
- **WHEN** `records.findOne('tbl_abc', '(Email,eq,alice@example.com)')` matches a record
- **THEN** the promise resolves with that record

#### Scenario: No match returns null
- **WHEN** the filter matches no records
- **THEN** the promise resolves with `null`
