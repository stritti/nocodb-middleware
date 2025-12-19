# API Documentation

This document describes the RESTful API endpoints available in the NocoDB Middleware.

## Interactive Documentation

The API is documented using OpenAPI (Swagger). You can explore and test the API interactively at:

**Swagger UI**: [http://localhost:3000/api](http://localhost:3000/api)

## Authentication

Most endpoints require JWT authentication. Include your token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### Examples Resource

#### `GET /examples`
- **Description**: Get all examples with pagination
- **Auth**: Required
- **Query Parameters**:
  - `page` (optional): Page number (default: 1)
  - `take` (optional): Items per page (default: 10, max: 50)
  - `order` (optional): Sort order (`ASC` or `DESC`, default: `ASC`)
- **Response**: Paginated list of examples

#### `POST /examples`
- **Description**: Create a new example
- **Auth**: Required
- **Request Body**:
  ```json
  {
    "title": "My Example"
  }
  ```
- **Response**: Created example object

## Global Validation

All endpoints use `ValidationPipe` to ensure:
- Only whitelisted properties are accepted
- Data is automatically transformed to the correct types
- Invalid requests return a `400 Bad Request` error

## Error Handling

Errors follow the standard format documented in [error-handling.md](./error-handling.md).
