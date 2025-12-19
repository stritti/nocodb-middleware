# Error Handling Documentation

This document describes the error handling strategy and standard error responses in the NocoDB Middleware.

## Overview

The application uses a global exception filter (`NocoDBExceptionFilter`) to catch all HTTP exceptions and format them into a consistent JSON response.

## Standard Error Response

All errors returned by the API follow this structure:

```json
{
  "statusCode": 404,
  "timestamp": "2023-10-27T10:00:00.000Z",
  "path": "/api/resource",
  "message": "Record with ID '123' not found in table 'Users'",
  "error": "NocoDB Error"
}
```

## Custom Exceptions

### `NocoDBException`
- **Purpose**: Represents errors specific to NocoDB operations.
- **Usage**: Throw this exception when a NocoDB-related error occurs.

#### Helper Methods
- `NocoDBException.tableNotFound(tableName)`: Returns a 404 error.
- `NocoDBException.recordNotFound(tableName, id)`: Returns a 404 error.
- `NocoDBException.unauthorized(message)`: Returns a 401 error.

## Exception Filter

### `NocoDBExceptionFilter`
- **File**: `src/nocodb/filters/nocodb-exception.filter.ts`
- **Behavior**:
  - Catches `HttpException` and its subclasses (including `NocoDBException`).
  - Logs `NocoDBException` as warnings.
  - Logs other `HttpException` (500s) as errors with stack traces.
  - Formats the response payload.

## Usage Example

```typescript
// In a service or controller
import { NocoDBException } from '../exceptions/nocodb.exception';

if (!record) {
  throw NocoDBException.recordNotFound('MyTable', id);
}
```
