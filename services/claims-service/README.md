# Claims Service
> Medical Coverage System - Claim Processing Microservice

---

## 📌 Overview
Claims Service is responsible for processing, validating, and managing medical insurance claims across the platform. It follows the standard microservice architecture pattern used throughout the Medical Coverage System.

**Service Port:** `3005`  
**Service Name:** `claims-service`  
**Database Schema:** `claims_schema`

---

## 📐 Architecture

### Standard 3-Layer Architecture
```
src/
├── routes/                # HTTP Routes layer
│   ├── index.ts           # Main router aggregator
│   └── health.ts          # Health check endpoints
├── controllers/           # HTTP Request handlers (Presentation Layer)
│   └── ClaimsController.ts
├── services/              # Pure Business Logic Layer ✅ ALL BUSINESS LOGIC HERE
│   ├── ClaimsService.ts   # Core claim operations & business rules
│   └── ClaimAdjudicationEngine.ts  # 6-STAGE ADJUDICATION PIPELINE
├── middleware/            # HTTP Middleware
│   ├── auth.ts
│   └── claimValidation.ts
├── config/
│   └── database.ts        # Database connection configuration
├── models/
│   └── schema.ts          # Drizzle ORM schema definitions
├── types/
│   ├── index.ts
│   └── enums.ts           # Centralized constants & enumerations
├── utils/
│   └── logger.ts
├── index.ts               # Express app setup & middleware configuration
└── server.ts              # Server initialization & graceful shutdown
```

✅ **Proper Architecture Enforcement**:
- Routes only handle routing
- Controllers only handle HTTP request/response formatting
- **All business logic lives exclusively in Services layer**
- No business logic leakage anywhere else

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
| Method | Path | Permissions | Description |
|--------|------|-------------|-------------|
| `GET` | `/api/claims` | `claim:read` | Get paginated claims list with filtering |
| `GET` | `/api/claims/:claimId` | `claim:read` | Get single claim by ID |
| `POST` | `/api/claims` | `claim:create` | Create new claim (runs full adjudication pipeline) |
| `PATCH` | `/api/claims/:claimId/status` | `claim:update` | Update claim status |
| `DELETE` | `/api/claims/:claimId` | `claim:delete` | Delete claim |
| `POST` | `/api/claims/:claimId/submit` | `claim:submit` | Submit claim for processing |
| `POST` | `/api/claims/:claimId/approve` | `claim:approve` | Approve claim |
| `POST` | `/api/claims/:claimId/deny` | `claim:approve` | Deny claim |

### Statistics & Reports
| Method | Path | Permissions | Description |
|--------|------|-------------|-------------|
| `GET` | `/api/claims/stats/summary` | `claim:read` | Claim statistics summary |
| `GET` | `/api/claims/stats/trends` | `claim:read` | Claim trends over time |

### System
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check endpoint |
| `GET` | `/api/claims/health` | Module health check |

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
PORT=3005
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medical_coverage
DB_USER=postgres
DB_PASSWORD=password
SERVICE_NAME=claims-service
NODE_ENV=development
LOG_LEVEL=info
```

---

## ✅ BUSINESS RULES IMPLEMENTATION

All business logic is implemented in **`ClaimsService.ts`**

| Business Rule | Location | Description |
|---------------|----------|-------------|
| 🔍 **Duplicate Claim Detection** | Lines 354-397 | Prevents #1 most common fraud pattern. Detects identical claims submitted within 72 hours. |
| 👤 **Member Eligibility Verification** | Lines 181-247 | Validates active membership status, enrollment dates, coverage validity periods. |
| 🏥 **Provider Authorization Checks** | Lines 253-348 | Critical fraud prevention. Verifies provider status, license validity, blacklist status. |
| 💰 **Benefit Balance Validation** | Lines 120-175 | Checks remaining benefit balance, calculates utilized vs remaining amounts. |
| 🚫 **Blacklist Detection** | Line 286-292 | Immediate rejection for claims from blacklisted providers. |
| 📅 **Date Range Validation** | Lines 221, 229, 311 | Validates service dates against enrollment, termination, and license expiry dates. |

---

## 🔄 **6-STAGE CLAIM ADJUDICATION PIPELINE**

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
✅ **Graceful shutdown handlers (SIGINT / SIGTERM)**

---

## 🔒 Security
- JWT Authentication
- Role based access control
- Module level access restrictions
- Granular permission based authorization
- Request rate limiting
- Input sanitization & validation
- Audit logging for all operations
- PII data protection

---

## 📚 Related Documentation
- [System Architecture](../../SYSTEM_LAYOUT.md)
- [Service Integration Patterns](../shared/integration-examples/)
- [API Documentation](./docs/api.md)
- [Development Guide](./DEVELOPMENT.md)
- [Troubleshooting](./TROUBLESHOOTING.md)