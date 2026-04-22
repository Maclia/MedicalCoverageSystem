# Dependency Standardization & Service Integration Guide

**Date:** April 20, 2026  
**Status:** ✅ Standardized  
**Version:** 1.0.0

---

## Executive Summary

This document establishes standardized dependency versions across all microservices to ensure consistency, reduce version conflicts, and simplify maintenance. It also documents the service integration patterns used throughout the Medical Coverage System.

---

## 1. Standardized Dependency Versions

### Core Framework Dependencies

All services MUST use these exact versions (using `^` for patch updates only):

| Package | Standard Version | Purpose | Required |
|---------|------------------|---------|----------|
| `express` | `^4.21.2` | Web framework | ✅ Yes |
| `typescript` | `^5.6.3` | TypeScript compiler | ✅ Yes |
| `drizzle-orm` | `^0.45.2` | Database ORM | ✅ Yes |
| `cors` | `^2.8.5` | CORS middleware | ✅ Yes |
| `helmet` | `^7.1.0` | Security headers | ✅ Yes |
| `compression` | `^1.7.4` | Response compression | ✅ Yes |
| `winston` | `^3.11.0` | Logging framework | ✅ Yes |
| `jsonwebtoken` | `^9.0.2` | JWT authentication | ✅ Yes |
| `bcryptjs` | `^3.0.3` | Password hashing | ✅ Yes |
| `zod` | `^3.23.8` | Data validation | ✅ Yes |
| `joi` | `^17.11.0` | Schema validation | ⚠️ Optional |
| `uuid` | `^9.0.1` | UUID generation | ⚠️ Optional |
| `dotenv` | `^16.3.1` | Environment variables | ✅ Yes |

### Database Drivers

| Package | Standard Version | Use Case | Required |
|---------|------------------|----------|----------|
| `postgres` | `^3.4.3` | PostgreSQL driver (preferred) | ✅ Yes |
| `pg` | `^8.11.3` | Alternative PostgreSQL driver | ⚠️ Alternative |
| `@neondatabase/serverless` | `^0.10.4` | Serverless PostgreSQL | ⚠️ Optional |
| `redis` | `^4.6.10` | Redis client | ⚠️ Optional |

### Development Dependencies

| Package | Standard Version | Purpose | Required |
|---------|------------------|---------|----------|
| `@types/node` | `^20.16.11` | Node.js types | ✅ Yes |
| `@types/express` | `^4.17.21` | Express types | ✅ Yes |
| `@types/jest` | `^29.5.8` | Jest types | ✅ Yes |
| `@types/jsonwebtoken` | `^9.0.5` | JWT types | ✅ Yes |
| `@types/cors` | `^2.8.17` | CORS types | ✅ Yes |
| `@types/compression` | `^1.7.5` | Compression types | ✅ Yes |
| `@types/bcryptjs` | `^2.4.6` | Bcrypt types | ✅ Yes |
| `@types/uuid` | `^9.0.7` | UUID types | ⚠️ Optional |
| `@typescript-eslint/eslint-plugin` | `^6.12.0` | ESLint TypeScript plugin | ✅ Yes |
| `@typescript-eslint/parser` | `^6.12.0` | ESLint TypeScript parser | ✅ Yes |
| `eslint` | `^8.57.0` | Code linting | ✅ Yes |
| `jest` | `^30.2.0` | Testing framework | ✅ Yes |
| `ts-jest` | `^29.4.5` | TypeScript for Jest | ✅ Yes |
| `tsx` | `^4.19.1` | TypeScript executor | ✅ Yes |
| `drizzle-kit` | `^0.31.10` | Drizzle migrations | ✅ Yes |

### Service-Specific Dependencies

#### API Gateway Only
```json
{
  "http-proxy-middleware": "^2.0.6",
  "express-rate-limit": "^7.1.5",
  "express-validator": "^7.0.1",
  "axios": "^1.6.2",
  "swagger-ui-express": "^4.6.3",
  "swagger-jsdoc": "^6.2.8"
}
```

#### Finance Service Only
```json
{
  "@opentelemetry/api": "^1.4.1",
  "@opentelemetry/auto-instrumentations-node": "^0.39.4",
  "@opentelemetry/sdk-node": "^0.41.2",
  "bull": "^4.11.3",
  "currency.js": "^2.0.4",
  "exceljs": "^4.3.0",
  "ioredis": "^5.3.2",
  "stripe": "^12.0.0",
  "paypal-rest-sdk": "^1.8.1",
  "mpesa-api": "^3.0.2",
  "pdfkit": "^0.13.0",
  "puppeteer": "^24.41.0",
  "node-cron": "^3.0.2",
  "nodemailer": "^8.0.5"
}
```

#### Billing Service Only
```json
{
  "moment": "^2.29.4",
  "nodemailer": "^8.0.5"
}
```

---

## 2. Version Consistency Rules

### ✅ ALLOWED Version Variations
- Patch version updates (e.g., `^4.21.2` → `^4.21.3`)
- Using `^` for minor/patch updates
- Optional dependencies for service-specific features

### ❌ NOT ALLOWED
- Major version differences (e.g., `express@4` vs `express@5`)
- Mixing `pg` and `postgres` drivers in the same service
- Using outdated security packages (e.g., old `jsonwebtoken` versions)
- Inconsistent TypeScript versions across services

---

## 3. Service Integration Patterns

### 3.1 Communication Architecture

```
┌─────────────────┐
│   API Gateway   │ Port 3001
└────────┬────────┘
         │
         ├──> Core Service (3003) - Auth, Users, Cards
         │
         ├──> Billing Service (3002) - Invoices, Payments
         │
         ├──> Insurance Service (3008) - Schemes, Benefits
         │
         ├──> Hospital Service (3007) - Patients, Appointments
         │
         ├──> Finance Service (3004) - Ledger, Payments
         │
         ├──> CRM Service (3005) - Leads, Agents, Commissions
         │
         ├──> Membership Service (3006) - Enrollments, Renewals
         │
         ├──> Wellness Service (3009) - Programs, Activities
         │
         ├──> Claims Service (3010) - Claims Processing
         │
         └──> Fraud Detection (5009) - Fraud Analysis
```

### 3.2 Service-to-Service Communication

#### Pattern 1: API Gateway Proxy (Primary)
```typescript
// All external requests go through API Gateway
// Services communicate via HTTP/REST through gateway
// Example: Client → Gateway → Core Service → Database
```

#### Pattern 2: Direct Service Communication (Internal)
```typescript
// Services can communicate directly for internal operations
// Use environment variables for service URLs
// Example: Claims Service → Finance Service (for payment verification)
```

#### Pattern 3: Event-Driven Communication (Future)
```typescript
// Use Redis pub/sub or message queues for async operations
// Example: Membership Service publishes "member.enrolled" event
//          Billing Service subscribes and creates invoice
```

### 3.3 Database Integration

#### Pattern: Database-per-Service
```
Each service has its own isolated database:
- Core Service → medical_coverage_core
- Billing Service → medical_coverage_billing
- Claims Service → medical_coverage_claims
- etc.
```

**Benefits:**
- ✅ Service isolation
- ✅ Independent scaling
- ✅ Technology flexibility
- ✅ Fault isolation

**Challenges:**
- ❌ Cross-service queries require API calls
- ❌ Data consistency across services
- ❌ Complex transactions (use Saga pattern)

### 3.4 Authentication & Authorization Flow

```
1. Client sends credentials to /api/auth/login
2. Core Service validates and returns JWT token
3. Client includes token in Authorization header
4. API Gateway validates token on each request
5. Gateway forwards user info to downstream services
6. Services enforce role-based authorization
```

### 3.5 Error Handling & Resilience

#### Circuit Breaker Pattern
```typescript
// API Gateway implements circuit breakers for each service
// If service fails > threshold, circuit opens
// Prevents cascade failures
// Automatically retries after cooldown period
```

#### Retry Pattern
```typescript
// All service calls include retry logic
// Exponential backoff: 1s, 2s, 4s, 8s
// Max 3 retries before failing
```

#### Timeout Pattern
```typescript
// All service calls have timeout limits
// Default: 5 seconds
// Prevents hanging requests
```

---

## 4. Service Integration Examples

### Example 1: Member Enrollment Flow

```typescript
// 1. Client → API Gateway → Membership Service
POST /api/membership/enrollments
{
  "userId": 123,
  "schemeId": 456,
  "effectiveDate": "2025-01-01"
}

// 2. Membership Service creates enrollment
// 3. Membership Service → API Gateway → Billing Service
POST /api/billing/invoices
{
  "userId": 123,
  "type": "enrollment_fee",
  "amount": 5000
}

// 4. Billing Service creates invoice
// 5. Billing Service → API Gateway → Core Service
GET /api/core/users/123

// 6. Core Service returns user details
// 7. Billing Service sends invoice via email
// 8. Response sent back to client
```

### Example 2: Claims Processing Flow

```typescript
// 1. Hospital submits claim
POST /api/claims/submit
{
  "patientId": 789,
  "procedures": [...],
  "amount": 150000
}

// 2. Claims Service validates claim
// 3. Claims Service → API Gateway → Insurance Service
GET /api/insurance/coverage?userId=789

// 4. Insurance Service returns coverage details
// 5. Claims Service → API Gateway → Fraud Detection
POST /api/fraud/analyze
{
  "claimData": {...},
  "patientHistory": {...}
}

// 6. Fraud Detection returns risk score
// 7. Claims Service processes claim based on risk
// 8. Claims Service → API Gateway → Finance Service
POST /api/finance/ledger/credit
{
  "accountId": "hospital_123",
  "amount": 150000,
  "reference": "claim_456"
}

// 9. Finance Service updates ledger
// 10. Response sent to hospital
```

### Example 3: Payment Processing Flow

```typescript
// 1. Client initiates payment
POST /api/finance/payments
{
  "invoiceId": "inv_123",
  "method": "stripe",
  "amount": 5000
}

// 2. Finance Service processes payment
// 3. Finance Service → Stripe API (external)
// 4. Stripe returns payment confirmation
// 5. Finance Service updates ledger
POST /api/finance/ledger/debit
{
  "accountId": "customer_456",
  "amount": 5000,
  "reference": "payment_789"
}

// 6. Finance Service → API Gateway → Billing Service
PATCH /api/billing/invoices/inv_123
{
  "status": "paid",
  "paidAt": "2025-01-15T10:30:00Z"
}

// 7. Billing Service updates invoice
// 8. Finance Service sends receipt via email
// 9. Response sent to client
```

---

## 5. Configuration Management

### Environment Variables Standard

All services MUST use these standard environment variables:

```bash
# Server Configuration
PORT=300X  # Service-specific port
NODE_ENV=production|development|test

# Database Configuration
DATABASE_URL=postgresql://postgres:password@postgres:5432/database_name
DB_HOST=postgres
DB_PORT=5432
DB_NAME=medical_coverage_service
DB_USER=postgres
DB_PASSWORD=password

# Redis Configuration
REDIS_URL=redis://redis:6379

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_ISSUER=medical-coverage-system
JWT_AUDIENCE=medical-api

# Service URLs (API Gateway only)
CORE_SERVICE_URL=http://core-service:3003
BILLING_SERVICE_URL=http://billing-service:3002
INSURANCE_SERVICE_URL=http://insurance-service:3008
# ... etc for all services

# Logging Configuration
LOG_LEVEL=info|debug|warn|error
LOGGING_ENABLED=true

# Security Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
ENABLE_CSP=true
TRUST_PROXY=true
```

---

## 6. Health Check Standards

All services MUST implement a `/health` endpoint:

```typescript
// Standard health check response
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00Z",
  "service": "service-name",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 3600,
  "database": {
    "status": "connected",
    "responseTime": 12
  },
  "redis": {
    "status": "connected",
    "responseTime": 5
  }
}
```

---

## 7. Logging Standards

All services MUST use Winston with this format:

```typescript
{
  "timestamp": "2025-01-15T10:30:00Z",
  "level": "info",
  "service": "claims-service",
  "message": "Claim processed successfully",
  "correlationId": "req_123456",
  "userId": 789,
  "claimId": "claim_456",
  "duration": 234
}
```

**Log Levels:**
- `error`: System errors requiring immediate attention
- `warn`: Recoverable errors or degraded functionality
- `info`: Important business events (user actions, transactions)
- `debug`: Detailed technical information for debugging

---

## 8. API Response Standards

All services MUST return standardized responses:

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully",
  "correlationId": "req_123456",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": { /* validation errors */ }
  },
  "correlationId": "req_123456",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

## 9. Testing Standards

### Unit Tests
- All services MUST have unit tests
- Minimum 80% code coverage
- Use Jest framework
- Mock external dependencies

### Integration Tests
- Test service-to-service communication
- Test database operations
- Test API endpoints
- Use test containers for databases

### Example Test Structure
```typescript
describe('ClaimsService', () => {
  describe('processClaim', () => {
    it('should process valid claim successfully', async () => {
      // Test implementation
    });
    
    it('should reject claim with invalid data', async () => {
      // Test implementation
    });
    
    it('should call fraud detection service', async () => {
      // Test implementation
    });
  });
});
```

---

## 10. Deployment Standards

### Docker Configuration
All services MUST have:
- ✅ `Dockerfile` with multi-stage build
- ✅ `.dockerignore` file
- ✅ Health check in Dockerfile
- ✅ Non-root user
- ✅ Minimal base image (node:alpine)

### Docker Compose
All services MUST be included in `docker-compose.yml`:
- ✅ Service definition
- ✅ Health check
- ✅ Environment variables
- ✅ Port mapping
- ✅ Dependencies (`depends_on`)
- ✅ Network configuration

---

## 11. Monitoring & Observability

### Metrics to Collect
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (errors/total requests)
- Database query time
- Redis operations
- Memory usage
- CPU usage

### Health Indicators
- Service uptime
- Database connectivity
- Redis connectivity
- Circuit breaker status
- Queue lengths (if using message queues)

---

## 12. Security Standards

### Authentication
- ✅ JWT tokens for all authenticated requests
- ✅ Token expiration (default: 1 hour)
- ✅ Refresh token mechanism
- ✅ Secure token storage

### Authorization
- ✅ Role-based access control (RBAC)
- ✅ Resource-level permissions
- ✅ API key authentication for service-to-service

### Data Protection
- ✅ HTTPS/TLS for all external communication
- ✅ Encrypted database connections
- ✅ Secure password hashing (bcrypt)
- ✅ Input validation and sanitization

---

## Conclusion

This standardization ensures:
- ✅ **Consistency** across all microservices
- ✅ **Maintainability** with uniform patterns
- ✅ **Scalability** with proven integration patterns
- ✅ **Security** with standardized security measures
- ✅ **Reliability** with proper error handling and resilience

**All new services MUST follow these standards.**
**Existing services SHOULD be updated to comply.**

---

**Document Version:** 1.0.0  
**Last Updated:** April 20, 2026  
**Next Review:** After major dependency updates