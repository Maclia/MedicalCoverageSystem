# Claims Service
> Medical Coverage System - Claim Processing Microservice

---

## 📌 Overview
Claims Service is responsible for processing, validating, and managing medical insurance claims across the platform. It follows the standard microservice architecture pattern used throughout the Medical Coverage System.

**Service Port:** `3002`  
**Service Name:** `claims-service`  
**Database Schema:** `claims_schema`

---

## 📐 Architecture

### Standard 3-Layer Architecture
```
src/
├── api/                  # HTTP Routes layer
│   ├── index.ts          # Route aggregator
│   ├── claims.routes.ts  # Claims domain endpoints
│   └── stats.routes.ts   # Statistics endpoints
├── controllers/          # HTTP Request handlers
│   └── ClaimsController.ts
├── services/             # Pure business logic layer
│   ├── ClaimsService.ts
│   └── ClaimAdjudicationEngine.ts  ✅ **NEW: 6-STAGE ADJUDICATION PIPELINE**
├── middleware/           # HTTP Middleware
│   └── claimValidation.ts
├── config/
│   └── database.ts
├── models/
│   └── schema.ts
├── utils/
│   └── logger.ts
├── index.ts              # Service entry point
└── server.ts             # Express server setup
```

---

## 🔗 System Integration Points

### Connected Services
| Service | Integration Method | Purpose |
|---------|--------------------|---------|
| ✅ **Core Service** | Synchronous HTTP | Centralized Business Rules Engine |
| ✅ **Membership Service** | Synchronous HTTP | Member eligibility, card status verification |
| ✅ **Insurance Service** | Synchronous HTTP | Benefit definitions, scheme authorization |
| **Billing Service** | Async Event Bus | Invoicing, payment processing, commission calculations |
| **Finance Service** | Saga Orchestration | Distributed transaction coordination |
| **Fraud Detection** | Async Event Bus | Real-time fraud risk analysis |
| **Analytics Service** | Async Event Bus | Metrics, reporting, business intelligence |
| **CRM Service** | Async Event Bus | Agent dashboard updates, customer communications |

### Communication Patterns
✅ **Synchronous**: `shared/service-communication/HttpClient` with automatic retries, load balancing, fallbacks  
✅ **Asynchronous**: `shared/message-queue/EventBus` with at-least-once delivery  
✅ **Distributed Transactions**: Saga pattern with automatic compensating actions

---

## 📡 API Endpoints

### Claims Management
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/claims` | Get paginated claims list with filtering |
| `GET` | `/api/claims/:id` | Get single claim by ID |
| `POST` | `/api/claims` | Create new claim |
| `PUT` | `/api/claims/:id` | Update existing claim |
| `DELETE` | `/api/claims/:id` | Delete claim |
| `PATCH` | `/api/claims/:id/status` | Update claim status |
| `POST` | `/api/claims/:id/submit` | Submit claim for processing |
| `POST` | `/api/claims/:id/approve` | Approve claim |
| `POST` | `/api/claims/:id/deny` | Deny claim |

### Statistics & Reports
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/stats/summary` | Claim statistics summary |
| `GET` | `/api/stats/trends` | Claim trends over time |
| `GET` | `/api/stats/metrics` | Performance metrics |
| `GET` | `/api/stats/reports` | Generate reports |

### System
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check endpoint |
| `GET` | `/health/ready` | Readiness probe |
| `GET` | `/health/live` | Liveness probe |

---

## 🚀 Usage

### Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run TypeScript check
npm run type-check

# Run tests
npm run test
```

### Production
```bash
# Build service
npm run build

# Start production server
npm start
```

### Environment Variables
```env
PORT=3002
DATABASE_URL=postgresql://user:pass@localhost:5432/medical_db?schema=claims_schema
SERVICE_NAME=claims-service
NODE_ENV=development
LOG_LEVEL=info
```

---

## ✅ Validation Rules
Claims are validated against:
- Required fields verification
- Member eligibility checks
- Benefit coverage validation
- Business rule enforcement
- Fraud risk scoring
- Duplicate claim detection

---

## 🔄 **✅ FINALIZED 6-STAGE CLAIM ADJUDICATION PIPELINE**

```
📌 CLAIM ADJUDICATION ENGINE - STRICT EXECUTION SEQUENCE

🔹 STAGE 1: Duplicate Claim Detection
   ✅ Prevents #1 most common fraud pattern
   ✅ 72 hour duplicate detection window
   ✅ Automatic rejection on duplicate detection

🔹 STAGE 2: Provider Authorization Verification
   ✅ Provider license validation
   ✅ Blacklist check
   ✅ Benefit type authorization check
   ✅ License expiry validation

🔹 STAGE 3: Member Eligibility Verification
   ✅ Membership status validation
   ✅ Active coverage check
   ✅ Service date within coverage period
   ✅ Termination date validation

🔹 STAGE 4: Benefit Balance Check
   ✅ Current benefit utilization tracking
   ✅ Remaining balance verification
   ✅ Annual limit enforcement
   ✅ Period reset handling

🔹 STAGE 5: ✅ CENTRALIZED BUSINESS RULES ENGINE (CORE SERVICE)
   ✅ Standard business policy validation
   ✅ Global policy enforcement
   ✅ Pre-authorization requirements
   ✅ Special coverage rules

🔹 STAGE 6: Final Adjudication & Claim Creation
   ✅ Final approval decision
   ✅ Claim record creation
   ✅ Metadata tracking
   ✅ Event publication

✅ OUTCOME STATES:
   - ✅ APPROVED
   - ❌ REJECTED
   - ⏳ PENDING
   - 📋 PENDING_AUTHORIZATION
   - 🔍 PENDING_MANUAL_REVIEW
```

All stages execute in sequence. Pipeline fails fast with appropriate decision outcome. All steps have automatic compensation actions on failure ensuring system-wide data consistency.

---

## 🧩 Standard Compliance
✅ **Follows TEMPLATE-STANDARD-SERVICE.md** architecture pattern  
✅ **100% TypeScript type safety**  
✅ **Standard audit logging middleware**  
✅ **Standard error handling patterns**  
✅ **Standard health check implementation**  
✅ **Idempotent operations**  
✅ **Correlation ID propagation across all services**

---

## 🔒 Security
- JWT Authentication
- Role based access control
- Request rate limiting
- Input sanitization
- Audit logging for all operations
- PII data protection

---

## 📚 Related Documentation
- [System Architecture](../../SYSTEM_LAYOUT.md)
- [Service Integration Patterns](../shared/integration-examples/)
- [API Documentation](./docs/api.md)
- [Development Guide](./DEVELOPMENT.md)
- [Troubleshooting](./TROUBLESHOOTING.md)