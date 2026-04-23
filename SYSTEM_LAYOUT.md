# Medical Coverage System - Complete Architecture Layout

## 📌 System Overview
This is a modern microservices-based medical insurance platform with separate frontend and backend architectures, built with TypeScript / Node.js / React.

---

## 🎨 FRONTEND LAYOUT (Client)
**Location:** `/client/`

### Frontend Structure
```
client/
├── src/
│   ├── App.tsx              # Main application entry component
│   ├── main.tsx             # Application bootstrap
│   ├── index.css            # Global styles
│   ├──
│   ├── 📁 api/              # API client definitions
│   ├── 📁 app/              # Application state / store
│   ├── 📁 assets/           # Static assets (images, fonts)
│   ├── 📁 config/           # Environment configurations
│   ├── 📁 features/         # Feature-based modular components
│   │   ├── dashboards/
│   │   ├── members/
│   │   ├── companies/
│   │   ├── schemes/
│   │   ├── providers/
│   │   ├── regions/
│   │   ├── crm/
│   │   ├── finance/
│   │   ├── wellness/
│   │   └── ...
│   ├── 📁 hooks/            # Custom React hooks
│   ├── 📁 lib/              # Third party library wrappers
│   ├── 📁 pages/            # Page level components / routing
│   ├── 📁 services/         # API service layer
│   │   ├── api/
│   │   │   ├── billingApi.ts
│   │   │   ├── hospitalApi.ts
│   │   │   └── index.ts
│   ├── 📁 shared/           # Shared reusable components
│   ├── 📁 types/            # TypeScript type definitions
│   ├── 📁 ui/               # Base UI component library
│   └── 📁 utils/            # Utility functions
│
├── vite.config.ts           # Vite build configuration
├── package.json             # Frontend dependencies
├── tsconfig.json            # TypeScript configuration
├── Dockerfile               # Container definition
└── nginx.conf               # Production web server config
```

### Frontend Tech Stack:
✅ React 18 + TypeScript
✅ Vite Build System
✅ Feature-Sliced Design Architecture
✅ Centralized API Services
✅ Modular Feature Organization

---

## 🔧 BACKEND LAYOUT (Microservices)
**Location:** `/services/`

### 📋 Microservices Inventory (12 Independent Services)
| Service | Port | Responsibility |
|---------|------|----------------|
| **api-gateway** | 3000 | Single entry point, routing, rate limiting, audit logging |
| **core-service** | 3001 | Authentication, Authorization, Users, System Core |
| **claims-service** | 3002 | Claim processing, validation, workflow management |
| **insurance-service** | 3003 | Policy plans, benefits, scheme management |
| **billing-service** | 3004 | Payments, invoices, commissions, token billing system |
| **membership-service** | 3005 | Member profiles, card management, eligibility |
| **hospital-service** | 3006 | Provider management, appointments, facility data |
| **crm-service** | 3007 | Agents, leads, customer relationships |
| **finance-service** | 3008 | Financial transactions, saga orchestration, recovery |
| **fraud-detection-service** | 3009 | Real-time fraud detection, ML patterns, investigation |
| **wellness-service** | 3010 | Wellness programs, health tracking |
| **analytics-service** | 3011 | Reporting, metrics, business intelligence |

---

### 📦 Standard Microservice Structure
Each service follows this consistent internal layout:
```
service-name/
├── src/
│   ├── index.ts / server.ts    # Service entry point
│   ├── config/                 # Environment & database config
│   ├── models/                 # Database schemas
│   ├── routes/                 # HTTP API routes
│   ├── api/                    # Controllers / request handlers
│   ├── services/               # Business logic layer
│   ├── middleware/             # HTTP middleware
│   ├── utils/                  # Utilities, logger, errors
│   └── types/                  # Type definitions
│
├── tests/                      # Unit + Integration tests
├── package.json
├── tsconfig.json
└── *.sh scripts (dev, deploy, health, backup)
```

---

## 🔗 Shared Infrastructure
**Location:** `/services/shared/`

```
services/shared/
├── service-communication/      # HTTP Client / inter-service communication
├── message-queue/              # Event bus + Saga Orchestrator
├── schemas/                    # Common database schemas
├── schema.ts                   # Shared validation schemas
└── integration-examples/       # System integration examples
```

---

## 💾 Database & Configuration Layout
**Location:** `/config/`

### Database Configuration:
✅ 13 Separate Database Schemas (one per service + gateway)
✅ Drizzle ORM for all database operations
✅ Each service has isolated database access

```
config/
├── drizzle.api-gateway.config.ts
├── drizzle.core.config.ts
├── drizzle.claims.config.ts
├── drizzle.insurance.config.ts
├── drizzle.billing.config.ts
├── drizzle.membership.config.ts
├── drizzle.hospital.config.ts
├── drizzle.crm.config.ts
├── drizzle.finance.config.ts
├── drizzle.fraud.config.ts
├── drizzle.wellness.config.ts
├── drizzle.analytics.config.ts
└── drizzle.*.config.ts
```

---

## 🏗️ System Architecture Layers

```
┌───────────────────────────────────────────────────┐
│                     CLIENT                        │
│  React Frontend / SPA / Nginx                    │
└───────────────────┬───────────────────────────────┘
                    │
┌───────────────────▼───────────────────────────────┐
│                  API GATEWAY                      │
│  Rate Limiting • Audit Logs • Authentication      │
└───────────────────┬───────────────────────────────┘
                    │
┌───────────────────▼───────────────────────────────┐
│              MICROSERVICES LAYER                  │
│  ┌────────┐ ┌────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Claims │ │ Billing│ │Insurance│ │Membership│   │
│  └────────┘ └────────┘ └─────────┘ └─────────┘   │
│  ┌────────┐ ┌────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Hospital│ │  CRM   │ │ Finance │ │  Fraud  │   │
│  └────────┘ └────────┘ └─────────┘ └─────────┘   │
└───────────────────┬───────────────────────────────┘
                    │
┌───────────────────▼───────────────────────────────┐
│               DATABASE LAYER                      │
│  PostgreSQL (multi-schema)                        │
└───────────────────────────────────────────────────┘
```

---

## 📂 Root Project Structure
```
MedicalCoverageSystem/
├── client/                # Frontend React application
├── services/              # All backend microservices
├── config/                # Database ORM configurations
├── server/                # Legacy / common server code
├── scripts/               # Deployment, migration, seed scripts
├── database/              # Database initialization & migrations
├── nginx/                 # Reverse proxy configurations
├── deployment/            # Production deployment configs
├── docs/                  # Architecture, API, user documentation
├── tests/                 # E2E & Integration test suites
├── docker-compose.yml     # Local development orchestration
└── package.json           # Root monorepo dependencies
```

---

## ✅ Key Architecture Features
✅ **Microservices Architecture**: Each domain is completely isolated
✅ **Independent Deployments**: Every service can be deployed separately
✅ **Database Isolation**: Separate schema per service
✅ **Shared Infrastructure**: Common utilities & communication patterns
✅ **Feature Based Frontend**: Organized by business domain not technical type
✅ **Type Safety**: 100% TypeScript across entire stack
✅ **Docker Containerized**: All services run in containers
✅ **Audit Logging**: Standardized audit middleware across all services
✅ **Resilient Design**: Saga pattern, error recovery, health checks