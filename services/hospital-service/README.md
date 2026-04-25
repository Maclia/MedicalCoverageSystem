# 🏥 Hospital Service

Medical provider interface for the Medical Coverage System. Manages hospital appointments, patient registration, pre-authorization requests, and claim submissions.

---

## 📋 Overview

This service provides the complete hospital provider workflow:
- ✅ Patient registration and management
- ✅ Appointment scheduling and tracking
- ✅ Member eligibility and benefit verification
- ✅ Pre-authorization workflow
- ✅ Claim submission and tracking
- ✅ Provider settlement dashboard
- ✅ Supporting document validation

---

## 🔧 Technology Stack

| Component | Technology |
|---|---|
| Runtime | Node.js 20.x |
| Framework | Express 4.18 |
| Database | PostgreSQL + Drizzle ORM |
| Logging | Winston |
| Validation | Joi |
| Security | Helmet, CORS |
| Rate Limiting | express-rate-limit |
| TypeScript | ESModule mode with Node16 resolution |

---

## 🚀 Endpoints

### 🔐 Base Path: `/api/v1/hospital`

| Category | Endpoints | Count | Description |
|---|---|---|---|
| **Patients** | `GET /patients`, `GET /patients/search`, `GET /patients/stats`, `GET /patients/:id`, `POST /patients`, `PUT /patients/:id`, `POST /patients/:id/deactivate` | 7 | Patient registration, lookup, search, statistics |
| **Appointments** | `GET /appointments`, `GET /appointments/available-slots`, `GET /appointments/:id`, `POST /appointments`, `PUT /appointments/:id`, `POST /appointments/:id/cancel` | 6 | Booking, availability checking, cancellations |
| **Health** | `GET /health` | 1 | Service health monitoring |

> ⚠️ **Note:** Pre-Authorization, Claims and Benefits endpoints are planned for v1.1 release and not currently available.

---

## 🛡️ Validation & Security

### ✅ Provider Validation
All providers must be registered and verified before submitting claims or performing protected operations:
- Provider identity verified via JWT token authentication
- Valid provider profile required in system database
- Active status and approved network participation checked per request
- Provider scope and permissions verified for each operation

**Response:** `403 Forbidden` for unauthorized providers

### ✅ Duplicate Invoice Protection
Providers cannot submit claims with duplicate invoice numbers. Checked at submission time before claim enters processing pipeline.

**Response:** `409 Conflict` with existing claim details

### 📄 Supporting Document Validation
Automatic requirement checking based on procedure code:
| Procedure Code | Required Documents |
|---|---|
| 100.0 | Clinical Notes, Prescription |
| 200.0 | Lab Results, Radiology Report |
| 300.0 | Discharge Summary, Operative Note |
| 400.0 | Consultation Report, Referral |
| 500.0 | Emergency Note (Police Report optional) |

**Response:** `422 Unprocessable Entity` with missing document list

---

## 🔗 External Service Integrations

| Service | Integration Status | Purpose |
|---|---|---|
| Membership Service | ✅ | Member card verification |
| Insurance Service | ✅ | Benefit checking, pre-authorization |
| Claims Service | ✅ | Claim submission and tracking |
| Fraud Detection Service | ✅ | Automatic risk scoring |
| Document Service | ✅ | Supporting document management |

---

## 📐 Request Lifecycle

```
Request → Response Standardization → Audit Logging → **Provider Authentication & Validation** → Member Verification (write operations) → Member Verification Logging (read operations) → Rate Limiter (write operations) → Validation Middleware → Controller → Response
```

✅ **All requests receive correlation ID for full traceability**  
✅ **Complete audit logging for all protected operations**  
✅ **Graceful degradation on downstream service failures**

---

## 🏗️ Architecture

```
src/
├── server.ts                 # Service entry point
├── api/                      # REST Controllers
│   ├── patientsController.ts
│   └── appointmentsController.ts
├── controllers/              # Business Workflow Controllers (Planned)
│   ├── ClaimsController.ts
│   └── PreAuthorizationController.ts
├── clients/                  # External Service Clients
│   ├── ClaimsServiceClient.ts
│   ├── InsuranceServiceClient.ts
│   └── MembershipServiceClient.ts
├── middleware/               # Request Pipeline
│   ├── authMiddleware.ts
│   ├── memberVerificationMiddleware.ts
│   ├── memberVerificationLoggingMiddleware.ts
│   ├── responseStandardizationMiddleware.ts
│   ├── auditMiddleware.ts
│   ├── documentValidationMiddleware.ts
│   └── rateLimitMiddleware.ts
├── services/                 # Internal Business Logic
│   ├── PatientService.ts
│   └── AppointmentService.ts
├── models/                   # Database Schema
├── config/                   # Environment Configuration
└── utils/                    # Shared Utilities
```

---

## 🔧 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run TypeScript checks
npm run typecheck

# Run tests
npm test

# Build production
npm run build
```

### ⚠️ TypeScript Configuration Notes
This service uses **ECMAScript Modules (ESM)** with `moduleResolution: node16`:
- ✅ All relative imports **MUST** include `.js` file extensions
- ✅ Default imports are required for CommonJS packages (e.g. `import Joi from 'joi'`)
- ✅ Strict type checking is enabled (no implicit `any`)

> Recent fixes: All TypeScript errors resolved in `patientsController.ts` including import extensions, Joi import format, and explicit type annotations.

---

## 📊 Monitoring

✅ **Health Check:** `/api/v1/hospital/health`  
✅ **Structured logging with correlation IDs**  
✅ **Full audit logging for all protected operations**  

> ⚠️ Prometheus Metrics endpoint is planned for future release

---

## ✅ Production Features

- Graceful shutdown handlers (SIGINT/SIGTERM)
- Connection pooling with proper cleanup
- Circuit breakers for external service calls
- Idempotent request handling
- Distributed tracing integration
- **Rate limiting: 100 write requests per IP / 15 minutes**
- Security headers with Helmet
- Response standardization across all endpoints
- Member verification for all write operations

---

## 📚 Documentation

- **API Reference:** `/docs/api`
- **Procedure Requirements:** https://docs.medicalsystem.com/procedure-requirements
- **Error Codes:** https://docs.medicalsystem.com/error-codes

---

*Version: 1.0.1 | Last Updated: April 25, 2026*

---

## 🚧 Current Implementation Status

| Feature | Status |
|---|---|
| Patient Management | ✅ Production Ready |
| Appointment Scheduling | ✅ Production Ready |
| TypeScript Compliance | ✅ Fully compliant (v1.0.1) |
| Pre-Authorization | 🚧 In Development |
| Claim Submission | 📅 Planned v1.1 |
| Benefit Verification | 📅 Planned v1.1 |
| Provider Settlement | 📅 Planned v1.2 |
