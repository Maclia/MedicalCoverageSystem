# Finance Service

Central financial reporting and aggregation service for the Medical Coverage System.
Acts as the single source of truth for all billing, premium and financial metrics across all system services.

---

## Overview

Finance Service is responsible for:
- Aggregating financial data from all upstream services
- Generating consolidated financial reports
- Providing unified billing and premium reporting
- Caching frequent reports for performance
- Scheduled report generation and materialized views

---

## Architecture

```
┌──────────────────┐      ┌─────────────────────┐      ┌─────────────────┐
│ Billing Service  │─────▶│                     │─────▶│  API Endpoints  │
└──────────────────┘      │                     │      └─────────────────┘
                          │                     │
┌──────────────────┐      │  Finance Service    │      ┌─────────────────┐
│ Insurance Service│─────▶│                     │─────▶│  Caching Layer  │
└──────────────────┘      │                     │      └─────────────────┘
                          │  Aggregation Engine │
┌──────────────────┐      │                     │      ┌─────────────────┐
│ Claims Service   │─────▶│                     │─────▶│  Auth Middleware│
└──────────────────┘      │                     │      └─────────────────┘
┌──────────────────┐      │                     │      ┌─────────────────┐
│ Core Service     │─────▶│                     │─────▶│  Scheduled Jobs │
└──────────────────┘      └─────────────────────┘      └─────────────────┘
```

---

## API Endpoints

### Reports

| Method | Endpoint | Description | Query Parameters |
|--------|----------|-------------|------------------|
| `GET` | `/api/finance/reports/consolidated` | Unified cross-service financial report | `startDate`, `endDate` |
| `GET` | `/api/finance/reports/billing` | Billing service detailed report | `startDate`, `endDate`, `status` |
| `GET` | `/api/finance/reports/premiums` | Insurance premium collection report | `startDate`, `endDate`, `schemeId` |
| `GET` | `/api/finance/reports/performance` | Service performance metrics | `period` (daily/weekly/monthly) |

---

## Service Clients

The service implements a standardized client pattern for communication with all upstream services:

| Client | Purpose |
|--------|---------|
| **BaseServiceClient** | Abstract base class with fetch retry pattern |
| **BillingServiceClient** | Invoices, payments, commissions, revenue breakdown, company billing stats |
| **InsuranceServiceClient** | Premium collections, scheme statistics, billing cycles, company premium stats |
| **CoreServiceClient** | Card statistics, member enrollment data |
| **ClaimsServiceClient** | Claim payments, expenses, adjudication costs |
| **FraudDetectionServiceClient** | Risk assessment, fraud scoring, transaction analysis |

---

## Core Services

| Service | Responsibility |
|---------|----------------|
| **ReportAggregatorService** | Parallel data fetching, consolidation, fault tolerance |
| **ReportCachingService** | Redis based caching with TTL management |
| **CompanyBalanceService** | Company-level financial balance and premium utilization |
| **SagaOrchestrator** | Distributed transaction coordination |
| **ErrorRecoveryService** | Failed transaction recovery handling |

---

## Business Rules Integration

Finance Service now integrates with the **Modular Business Rules Engine** from Core Service as the Single Source of Truth for all financial calculations:

✅ **Standardized Business Rules:**
- Premium allocation ratios
- Commission calculation rules
- Settlement window policies
- Company balance validation thresholds
- Payment status transition rules
- Double entry bookkeeping validation

✅ **Implementation Pattern:**
```typescript
// ✅ Recommended - direct import from core service
import { FinancialRulesService } from '@core/services/business-rules/index.js';

// All financial calculations go through central business rules
const allocation = await FinancialRulesService.calculatePremiumAllocation(amount, scheme);
const commission = await FinancialRulesService.calculateCommission(base, type, metrics);
const balanceCheck = await FinancialRulesService.validateCompanyBalance(companyId, claimAmount);
```

⚠️ **Legacy Compatibility:**
Existing `BusinessRulesEngine` facade remains fully functional with deprecation warnings. Migrate to modular imports for v2.0 compatibility.


---

## Caching Strategy

- Default TTL: 5 minutes (300 seconds)
- Cache Keys: `report:{report_type}:{hash(filters)}`
- Automatic fallback if Redis is unavailable
- Graceful degradation: returns live data on cache failure
- Bulk invalidation supported

---

## Environment Variables

```env
# Service Configuration
FINANCE_SERVICE_PORT=3007
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medical_coverage
DB_USER=postgres
DB_PASSWORD=postgres

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Service URLs
CORE_SERVICE_URL=http://localhost:3001
BILLING_SERVICE_URL=http://localhost:3003
INSURANCE_SERVICE_URL=http://localhost:3002
CLAIMS_SERVICE_URL=http://localhost:3004
MEMBERSHIP_SERVICE_URL=http://localhost:3005

# Background Jobs
RECOVERY_JOB_INTERVAL=*/15 * * * *
REPORT_REFRESH_INTERVAL=0 */1 * * *

# Logging
LOG_LEVEL=info
```

---

## Project Structure

```
finance-service/
├── src/
│   ├── api/
│   │   └── reportsController.ts    # REST API endpoints
│   ├── clients/
│   │   ├── BaseServiceClient.ts    # Abstract base client
│   │   ├── BillingServiceClient.ts
│   │   └── InsuranceServiceClient.ts
│   ├── services/
│   │   ├── ReportAggregatorService.ts
│   │   ├── ReportCachingService.ts
│   │   └── SagaOrchestrator.ts
│   ├── jobs/
│   │   └── RecoveryScheduler.ts
│   ├── middleware/
│   │   ├── auth.ts                    # JWT Authentication
│   │   ├── auditMiddleware.ts         # Audit logging
│   │   ├── responseMiddleware.ts      # Standard response formatting
│   │   └── validation.ts              # Request validation
│   ├── models/
│   ├── config/
│   ├── utils/
│   ├── index.ts                    # Service entry point
│   └── server.ts                   # Express server setup
├── .env.example
├── package.json
└── README.md
```

---

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

---

## Integration Pattern

All upstream services must implement the following API patterns for integration:
- Standard JSON response format
- Health check endpoint `/health`
- Financial export endpoints
- Transaction idempotency keys
- Standard error handling format

---

## Fault Tolerance

- All service calls use `Promise.allSettled()`
- Individual service outages do not break report generation
- Partial results are returned with warning metadata
- Automatic retries with exponential backoff
- Circuit breaker pattern implemented

---

## See Also

- [TEMPLATE-STANDARD-SERVICE.md](../TEMPLATE-STANDARD-SERVICE.md)
- [SYSTEM_LAYOUT.md](../../SYSTEM_LAYOUT.md)
- [Insurance Service Documentation](../insurance-service/README.md)
- [Billing Service Documentation](../billing-service/README.md)