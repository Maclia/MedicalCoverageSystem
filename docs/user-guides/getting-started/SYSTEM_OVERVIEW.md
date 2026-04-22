# Medical Coverage System - Complete Overview

**Status**: ✅ Production Ready | **Version**: 1.0 | **Last Updated**: April 2, 2026

---

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Current Implementation Status](#current-implementation-status)
5. [Key Components](#key-components)
6. [Recent Updates](#recent-updates)
7. [Getting Started](#getting-started)

---

## System Architecture

### Microservices Overview

The Medical Coverage System is built on a **9-service microservices architecture**, each with independent domain responsibility and dedicated PostgreSQL database:

| Service | Port | Database | Purpose |
|---------|------|----------|---------|
| **API Gateway** | 3001 | N/A | Request routing, authentication, service orchestration |
| **Core Service** | 3003 | medical-coverage-core | User management, authentication, member registry |
| **Insurance Service** | 3008 | medical-coverage-insurance | Insurance schemes, benefits, coverage management |
| **Hospital Service** | 3007 | medical-coverage-hospital | Hospital operations, patient management, medical records |
| **Billing Service** | 3002 | medical-coverage-billing | Invoice generation, payment processing |
| **Claims Service** | 3010 | medical-coverage-claims | Claims processing, disputes, reconciliation |
| **Finance Service** | 3004 | medical-coverage-finance | Payment processing, financial operations |
| **CRM Service** | 3005 | medical-coverage-crm | Sales management, leads, agent performance |
| **Membership Service** | 3006 | medical-coverage-membership | Member lifecycle, enrollments, renewals |
| **Wellness Service** | 3009 | medical-coverage-wellness | Wellness programs, health incentives |

### System Diagram

```
┌──────────────────────────────────────────┐
│         Frontend (React 18 + Vite)       │
│      Port 5173 | http://localhost:5173  │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│    API Gateway (Express)                 │
│    Port 3001 | Authentication/Routing    │
│    Swagger Docs: /api-docs               │
└──────────────────┬───────────────────────┘
   ┌──────────────┼──────────────┬─────────────┬─────────────┬──────────┐
   ▼              ▼              ▼             ▼             ▼          ▼
┌─────────┐  ┌─────────┐  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐
│ Core    │  │Insurance│  │Hospital  │ │Billing  │ │Finance   │ │ CRM      │
│:3003    │  │:3008    │  │:3007     │ │:3002    │ │:3004     │ │:3005     │
└────┬────┘  └────┬────┘  └─────┬────┘ └────┬────┘ └────┬─────┘ └────┬─────┘
     │            │             │            │            │           │
     ▼            ▼             ▼            ▼            ▼           ▼
   ┌──────────────────────────── PostgreSQL ────────────────────────────┐
   │ 8 Dedicated Databases (One per Service)                           │
   │ - Neon Serverless (Production)                                    │
   │ - Local PostgreSQL (Development)                                  │
   └──────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **React 18** - UI Framework with TypeScript
- **Vite** - Build tooling and development server
- **Radix UI** - Accessible component library
- **Tailwind CSS** - Utility-first styling
- **React Query** - Server state management
- **React Hook Form** - Form management
- **Wouter** - Lightweight routing
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type-safe development
- **Drizzle ORM** - Type-safe database operations
- **PostgreSQL** - Relational database (Neon Serverless)
- **JWT** - Authentication tokens
- **Winston** - Logging
- **Zod** - Schema validation

### Infrastructure & DevOps
- **Docker** - Containerization
- **Vercel** - Frontend deployment
- **Neon** - Serverless PostgreSQL
- **nginx** - Reverse proxy (optional)
- **Redis** - Caching (optional)

### Testing & Quality
- **Jest** - Unit and integration testing
- **Cypress** - E2E testing
- **ESLint** - Code quality
- **Prettier** - Code formatting

---

## Project Structure

```
MedicalCoverageSystem/
├── client/                           # Frontend React Application
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   ├── pages/                   # Page-level components
│   │   ├── services/                # API client functions
│   │   ├── api/                     # API integration
│   │   ├── contexts/                # React contexts
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── utils/                   # Utility functions
│   │   └── main.tsx                 # Application entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── services/                         # Microservices
│   ├── api-gateway/                 # API Gateway (Port 3001)
│   ├── core-service/                # Core Service (Port 3003)
│   ├── insurance-service/           # Insurance Service (Port 3008)
│   ├── hospital-service/            # Hospital Service (Port 3007)
│   ├── billing-service/             # Billing Service (Port 3002)
│   ├── claims-service/              # Claims Service (Port 3010)
│   ├── finance-service/             # Finance Service (Port 3004)
│   ├── crm-service/                 # CRM Service (Port 3005)
│   ├── membership-service/          # Membership Service (Port 3006)
│   ├── wellness-service/            # Wellness Service (Port 3009)
│   ├── shared/                      # Shared schemas and types
│   └── [service]/src/
│       ├── api/                     # REST endpoints
│       ├── services/                # Business logic
│       ├── models/                  # Database models
│       ├── middleware/              # Express middleware
│       ├── config/                  # Configuration
│       └── index.ts                 # Service entry point
│
├── shared/                           # Shared Resources
│   ├── schema.ts                    # Database schema definitions
│   ├── types/                       # TypeScript type definitions
│   └── schemas/                     # Validation schemas
│
├── docs/                             # Documentation (This Folder!)
│   ├── getting-started/             # Overview and setup docs
│   ├── api/                         # API documentation
│   ├── architecture/                # System design docs
│   ├── implementation/              # Feature implementations
│   ├── testing/                     # Testing guides
│   ├── ui-integration/              # Frontend integration
│   └── user-guides/                 # End-user manuals
│
├── tests/                            # Test suites
│   ├── unit/                        # Unit tests
│   ├── integration/                 # Integration tests
│   └── e2e/                         # End-to-end tests
│
├── scripts/                          # Utility scripts
│   ├── development/                 # Dev scripts
│   ├── production/                  # Production scripts
│   └── testing/                     # Test scripts
│
├── package.json                      # Root dependencies
├── tsconfig.json                     # TypeScript configuration
├── README.md                         # Quick start guide
├── SYSTEM_ARCHITECTURE.md            # Detailed architecture
└── SETUP_AND_DEPLOYMENT.md           # Setup instructions
```

---

## Current Implementation Status

### ✅ Complete Features (100%)

#### Core Infrastructure
- ✅ API Gateway with routing for all 9 services
- ✅ JWT authentication with role-based access control
- ✅ Swagger/OpenAPI documentation
- ✅ Health monitoring and circuit breakers
- ✅ Comprehensive audit logging

#### Database & Schema
- ✅ 8 separate PostgreSQL databases (one per service)
- ✅ Type-safe Drizzle ORM schema
- ✅ 50+ domain-specific enums
- ✅ All necessary tables for each service domain
- ✅ Foreign key relationships and constraints

#### Services Implemented

1. **Core Service** - User authentication, member management, profiles
2. **Insurance Service** - Schemes, benefits, coverage management
3. **Hospital Service** - Provider management, patient records
4. **Billing Service** - Invoice generation, payment processing
5. **Claims Service** - Claims processing, adjudication, disputes
6. **Finance Service** - Payment processing, ledger management
7. **CRM Service** - Lead management, sales operations
8. **Membership Service** - Enrollment, renewals, benefits tracking
9. **Wellness Service** - Wellness programs, health tracking

#### Advanced Features
- ✅ Analytics engine with predictive capabilities
- ✅ Premium calculation engine
- ✅ Claims adjudication with rules engine
- ✅ Provider network management
- ✅ Card generation and verification
- ✅ Tokenized billing system
- ✅ Fraud detection and management

### 🚀 Recent Major Updates (API Gateway Implementation)

#### Swagger Documentation
- Complete OpenAPI 3.0 specification for all 9 services
- Interactive API documentation at `/api-docs`
- Machine-readable JSON schema at `/swagger.json`

#### Security & Performance
- Rate limiting per endpoint and user type
- Circuit breaker pattern for service resilience
- Request correlation IDs for debugging
- Comprehensive audit logging
- Security headers (CORS, Helmet, etc.)

#### Service Integration
- Dynamic service discovery with health checks
- Error handling and fallback mechanisms
- Request/response transformation
- Load balancing preparation

---

## Key Components

### Frontend Components
- Dashboard with analytics
- Member management interface
- Claims submission and tracking
- Insurance scheme configuration
- Provider network management
- Wellness program interface
- Billing and payments

### Backend Services APIs
- RESTful endpoints for all business domains
- JWT Bearer token authentication
- Standard response format with pagination
- Comprehensive error handling
- Input validation with Zod
- Audit trail logging

### Database Features
- Transactional integrity
- Type-safe queries with Drizzle
- Proper indexing for performance
- Foreign key constraints
- Migration support

---

## Getting Started

### Quick Start

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env

# Start development environment
npm run dev:all

# Services will be available at:
# - Frontend: http://localhost:5173
# - API Gateway: http://localhost:3001
# - API Docs: http://localhost:3001/api-docs
```

### Development Commands

```bash
# Development
npm run dev:all        # Start all services
npm run dev:client     # Frontend only
npm run dev:gateway    # API Gateway only

# Building
npm run build:all      # Build all services
npm run build:client   # Client only
npm run build:services # Services only

# Database
npm run db:push:all    # Deploy all schemas
npm run db:studio      # Open Drizzle Studio

# Testing
npm run test:all       # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report

# Code Quality
npm run check          # TypeScript check
npm run lint           # ESLint
```

### Environment Setup

Create `.env` file with:

```env
# Database URLs (one per service)
CORE_DB_URL=postgresql://...
INSURANCE_DB_URL=postgresql://...
HOSPITAL_DB_URL=postgresql://...
BILLING_DB_URL=postgresql://...
CLAIMS_DB_URL=postgresql://...
FINANCE_DB_URL=postgresql://...
CRM_DB_URL=postgresql://...
MEMBERSHIP_DB_URL=postgresql://...
WELLNESS_DB_URL=postgresql://...

# JWT Secrets
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret

# Environment
NODE_ENV=development
```

---

## Documentation Map

For detailed information, see:

- **[API Documentation](../api/API_DOCUMENTATION.md)** - Complete API reference
- **[Architecture & Integration](../architecture/ARCHITECTURE_AND_INTEGRATION.md)** - System design
- **[Implementation Status](../implementation/IMPLEMENTATION_STATUS.md)** - Feature details
- **[Testing & QA](../testing/TESTING_AND_QA.md)** - Quality assurance
- **[Setup & Deployment](../../SETUP_AND_DEPLOYMENT.md)** - Installation guide
- **[System Architecture](../../SYSTEM_ARCHITECTURE.md)** - Detailed architecture

---

## Support & Resources

- **API Reference**: `/api-docs` (when running)
- **GitHub Issues**: Report bugs and request features
- **Documentation**: See `docs/` folder
- **Testing**: Run `npm run test:all`
- **Database**: Use Drizzle Studio with `npm run db:studio`

---

**Total Services**: 9 | **Databases**: 8 | **Status**: ✅ Production Ready
