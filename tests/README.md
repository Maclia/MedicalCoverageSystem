# Test Module Organization

## Overview

The Medical Coverage System uses a unified testing framework with Jest, supporting unit, integration, and end-to-end (E2E) tests. All tests are organized in the `/tests` directory with a clear structure for maintainability.

## Directory Structure

```
tests/
├── unit/                    # Unit tests for individual services and components
│   ├── core/               # Core service unit tests
│   ├── insurance/          # Insurance service unit tests
│   ├── billing/            # Billing service unit tests
│   ├── finance/            # Finance service unit tests
│   ├── crm/                # CRM service unit tests
│   ├── hospital/           # Hospital service unit tests
│   ├── membership/         # Membership service unit tests
│   ├── wellness/           # Wellness service unit tests
│   └── client/             # Frontend component unit tests
├── integration/            # Integration tests (cross-service)
│   ├── api-gateway.test.ts
│   ├── payment-flow.test.ts
│   ├── member-onboarding.test.ts
│   ├── claims-processing.test.ts
│   └── ... (other integration tests)
├── e2e/                    # End-to-end tests (Cypress, user workflows)
│   ├── auth.test.ts
│   ├── member-portal.test.ts
│   ├── admin-dashboard.test.ts
│   └── ... (other E2E tests)
├── utilities/              # Test helpers and utilities
│   ├── api-client.ts       # Reusable API client for testing
│   ├── mock-data.ts        # Mock data generators
│   ├── database-helper.ts  # Database test utilities
│   └── assertions.ts       # Custom test assertions
├── fixtures/               # Test data and mock responses
│   ├── users.json
│   ├── claims.json
│   ├── invoices.json
│   └── ... (other test data)
├── TestModule.ts           # Centralized test configuration and exports
├── jest.config.js          # Jest configuration
├── jest.setup.js           # Jest setup and teardown
└── README.md               # This file
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run specific test suite
```bash
npm test -- tests/unit/core
npm test -- tests/integration
npm test -- tests/e2e
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run tests for specific service
```bash
npm test -- tests/unit/core
npm test -- tests/integration/member-onboarding
```

## Test Types

### Unit Tests
- **Location**: `tests/unit/{service}/`
- **Purpose**: Test individual functions, methods, and components in isolation
- **Scope**: Single service or component
- **Dependencies**: None (mocked where needed)
- **Example**:
  ```typescript
  describe('UserService', () => {
    it('should create user', async () => {
      const user = await userService.create({ email: 'test@test.com' });
      expect(user.id).toBeDefined();
    });
  });
  ```

### Integration Tests
- **Location**: `tests/integration/`
- **Purpose**: Test interactions between multiple services
- **Scope**: Cross-service workflows and APIs
- **Dependencies**: Running services, real databases (test instances)
- **Example**:
  ```typescript
  describe('Member Onboarding', () => {
    it('should onboard member across services', async () => {
      const member = await api.post('/api/core/members', memberData);
      const policy = await api.post('/api/insurance/policies', policyData);
      expect(member.id).toBeDefined();
      expect(policy.memberId).toBe(member.id);
    });
  });
  ```

### E2E Tests
- **Location**: `tests/e2e/`
- **Purpose**: Test complete user workflows from UI to database
- **Scope**: Full application flow
- **Dependencies**: All services running, browser/headless browser
- **Tools**: Cypress
- **Example**:
  ```typescript
  describe('Member Portal', () => {
    it('should login and view claims', () => {
      cy.visit('http://localhost:5173');
      cy.login('member@example.com', 'password');
      cy.get('[data-testid="claims-tab"]').click();
      cy.get('[data-testid="claim-item"]').should('have.length', 3);
    });
  });
  ```

## Using TestModule

The `TestModule.ts` provides centralized utilities and helpers:

```typescript
import {
  TEST_CONFIG,
  TestApiClient,
  TestDatabase,
  MockDataGenerator,
  TestAssertions,
  ServiceTestHelper,
  setupTestEnvironment,
  cleanupTestEnvironment
} from '../../TestModule';

describe('User API', () => {
  let api: TestApiClient;
  let db: TestDatabase;

  beforeAll(async () => {
    const env = await setupTestEnvironment();
    api = env.api;
    db = env.db;
  });

  afterAll(async () => {
    await cleanupTestEnvironment(api, db);
  });

  it('should create user', async () => {
    const userData = MockDataGenerator.user();
    const response = await api.post('/api/core/users', userData);
    TestAssertions.assertValidResponse(response);
  });
});
```

## Test Utilities

### TestApiClient
Provides methods for making HTTP requests to services:
- `authenticate(email, password)` - Authenticate and store token
- `get(url, params)` - Make GET request
- `post(url, data)` - Make POST request
- `put(url, data)` - Make PUT request
- `delete(url)` - Make DELETE request
- `getRaw(url, method, data)` - Get raw response

### TestDatabase
Database helper for seeding and querying test data:
- `query(sql, params)` - Execute SQL query
- `seed(data)` - Insert test data
- `clearTable(table)` - Clear table data
- `truncateAll(tables)` - Clear multiple tables
- `close()` - Close connection

### MockDataGenerator
Generate realistic test data:
- `user(overrides)` - Generate user data
- `member(companyId, overrides)` - Generate member data
- `invoice(memberId, overrides)` - Generate invoice data
- `claim(memberId, overrides)` - Generate claim data
- `insuredPlan(overrides)` - Generate insurance plan data

### TestAssertions
Custom assertions for common test scenarios:
- `assertValidResponse(response)` - Validate API response structure
- `assertErrorResponse(response, code)` - Validate error response
- `assertPaginatedResponse(response)` - Validate paginated response
- `assertValidToken(token)` - Validate JWT token

### ServiceTestHelper
Service health and readiness checks:
- `isServiceHealthy(baseUrl)` - Check if service is running
- `waitForService(baseUrl, timeout)` - Wait for service to become ready

## Configuration

Test configuration is in `TestModule.ts` and can be overridden via environment variables:

```typescript
// API Configuration
API_BASE_URL=http://localhost:3001
API_TIMEOUT=30000

// Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
TEST_DB=test_medical_coverage

// Service URLs
CORE_SERVICE_URL=http://localhost:3003
INSURANCE_SERVICE_URL=http://localhost:3008
HOSPITAL_SERVICE_URL=http://localhost:3007
BILLING_SERVICE_URL=http://localhost:3002
// ... other services
```

## Best Practices

### 1. Organize by Service/Feature
```
tests/
├── unit/core/                  # All Core service unit tests
├── unit/insurance/             # All Insurance service unit tests
├── integration/payment-flow/   # Cross-service payment tests
```

### 2. Use Descriptive Test Names
```typescript
// Good
it('should create member and assign policy', () => {});

// Avoid
it('should work', () => {});
```

### 3. Setup and Cleanup
```typescript
describe('User API', () => {
  beforeEach(async () => {
    // Setup before each test
    await db.clearTable('users');
  });

  afterEach(async () => {
    // Cleanup after each test
    await db.clearTable('users');
  });
});
```

### 4. Use Mock Data
```typescript
// Use generators instead of hardcoding
const user = MockDataGenerator.user();
const member = MockDataGenerator.member(companyId);
```

### 5. Test Edge Cases
```typescript
describe('Invoice Processing', () => {
  it('should reject invoice with zero amount', async () => {
    const invoice = MockDataGenerator.invoice(memberId, { amount: 0 });
    const response = await api.post('/api/billing/invoices', invoice);
    TestAssertions.assertErrorResponse(response);
  });
});
```

### 6. Use Appropriate Timeouts
```typescript
describe('Long-running test', () => {
  it('should process bulk claims', async () => {
    // ... test code
  }, TEST_CONFIG.timeouts.integration);
});
```

## Testing Services

### Prerequisites
Before running integration or E2E tests, ensure:
1. All services are running: `npm run dev:all`
2. Databases are created and migrations applied
3. Redis cache is available
4. API Gateway is accessible

### Running Integration Tests
```bash
# Start all services
npm run dev:all

# In another terminal, run integration tests
npm test -- tests/integration
```

### Running E2E Tests
```bash
# Start all services
npm run dev:all

# Run E2E tests with Cypress
npx cypress open   # Interactive mode
npx cypress run    # Headless mode
```

## Debugging Tests

### Enable Debug Output
```bash
DEBUG=medical-coverage:* npm test
```

### Run Single Test
```bash
npm test -- tests/integration/payment-flow.test.ts -t "should process payment"
```

### Debug with Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## CI/CD Integration

Tests are automatically run on pull requests and merges:
- Unit tests: Always run (fast ~30s)
- Integration tests: Run if services change (~2min)
- E2E tests: Run before release (~5min)

See `.github/workflows/test.yml` for CI configuration.

## Troubleshooting

### Tests fail with "Service not available"
- Ensure services are running: `npm run dev:all`
- Check service health: `curl http://localhost:3001/health`
- Wait for services to start: Services may need 10-15 seconds

### Database connection errors
- Verify PostgreSQL is running
- Check environment variables: `DB_HOST`, `DB_PORT`, etc.
- Ensure test database exists: `createdb test_medical_coverage`

### Tests timeout
- Increase timeout: `jest.setTimeout(60000)`
- Check service performance
- Free up system resources

### Mock data not working
- Verify seed data format
- Check table names and columns
- Review database schema

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Jest Matchers](https://jestjs.io/docs/using-matchers)
- [Cypress Documentation](https://docs.cypress.io/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Medical Coverage System API Reference](../docs/API_REFERENCE.md)

---

**Last Updated**: December 2025
