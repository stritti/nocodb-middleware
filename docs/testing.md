# Testing Documentation

This document describes the testing strategy and how to run tests for the NocoDB Middleware.

## Testing Strategy

The project uses a comprehensive testing approach:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests (E2E)**: Test full request-response cycles
3. **Coverage Reporting**: Track code coverage to ensure quality

## Running Tests

### Unit Tests
Run all unit tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

### Integration Tests
Run E2E tests:
```bash
npm run test:e2e
```

### Coverage Report
Generate and view coverage:
```bash
npm run test:cov
```

The report will be generated in the `coverage/` directory.

## Test Structure

### Unit Tests
Located alongside the source files with `.spec.ts` extension:
- `src/nocodb/nocodb.service.spec.ts`
- `src/examples/examples.service.spec.ts`
- `src/nocodb/cache/nocodb-cache.service.spec.ts`

### E2E Tests
Located in `test/` directory:
- `test/app.e2e-spec.ts`

## Writing Tests

### Unit Test Example
```typescript
describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### E2E Test Example
```typescript
it('should return 200', () => {
  return request(app.getHttpServer())
    .get('/endpoint')
    .expect(200);
});
```

## Mocking

Use Jest mocks for dependencies:
```typescript
{
  provide: Repository,
  useValue: {
    findOne: jest.fn(),
  },
}
```

## Coverage Goals

- **Minimum**: 80% code coverage
- **Focus areas**: Services, Controllers, Middleware
