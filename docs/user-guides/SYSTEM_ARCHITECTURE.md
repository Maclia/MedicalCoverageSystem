# System Architecture - Complete Reference

**Status**: 🟢 Production Ready  
**Last Updated**: April 2, 2026

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Layers](#architecture-layers)
3. [Microservices Design](#microservices-design)
4. [Data Flow](#data-flow)
5. [Database Architecture](#database-architecture)
6. [Technology Stack](#technology-stack)
7. [Security Model](#security-model)
8. [Performance & Scalability](#performance--scalability)
9. [Deployment Architecture](#deployment-architecture)

---

## System Overview

### High-Level Vision

```
┌──────────────────────────────────────────────────────────┐
│         Medical Coverage System - Microservices          │
│              Single Platform, Multiple Views             │
└──────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER (Frontend)                           │
│ React + Vite, Radix UI, Tailwind CSS, TypeScript        │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ API GATEWAY (Port 3001)                                 │
│ - Authentication & Authorization                         │
│ - Request Routing & Load Balancing                       │
│ - Rate Limiting & Circuit Breaking                       │
│ - Request Validation & Transformation                    │
│ - Health Monitoring                                      │
└────────────────────────────────────────────────────────┘
              │        │        │        │        │
              ▼        ▼        ▼        ▼        ▼
┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│Core  │Insur.│Hosp. │Bill. │Fin.  │CRM   │Memb. │Well. │
│3003  │3008  │3007  │3002  │3004  │3005  │3006  │3009  │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
   │      │      │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│Core  │Insur.│Hosp. │Bill. │Fin.  │CRM   │Memb. │Well. │
│DB    │DB    │DB    │DB    │DB    │DB    │DB    │DB    │
│+GW   │      │      │      │      │      │      │      │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
        │               │               │
        ▼               ▼               ▼
    ┌────────┐     ┌────────┐     ┌────────┐
    │PostgreSQL   │Redis    │Nginx/HTTPS │
    │(15-alpine)  │(7-alpine)           │
    └────────┘     └────────┘     └────────┘
```

### Key Statistics

- **Services**: 9 microservices + 1 API Gateway
- **Databases**: 9 PostgreSQL databases (one per service)
- **Languages**: TypeScript, Node.js, React
- **Deployment**: Docker + Kubernetes Ready
- **Scalability**: Horizontal scaling per service
- **Performance**: <500ms response time, 10,000+ concurrent users
- **Security**: JWT authentication, role-based access control
- **Monitoring**: Health checks, audit logging, service mesh compatible

---

## Architecture Layers

### Layer 1: Client Layer

**Components**:
- Web application (React + Vite)
- Single-page application (SPA)
- Real-time notifications (WebSocket)
- Responsive design (Radix UI + Tailwind)

**Technology**:
```
Frontend Stack
├── React 18 (UI framework)
├── Vite (build tool)
├── TypeScript (type safety)
├── React Query (server state)
├── React Hook Form (form management)
├── Radix UI (accessible components)
├── Tailwind CSS (styling)
├── Wouter (routing)
├── TanStack Query (data fetching)
└── Axios (HTTP client)
```

**Access Points**:
- Port 3000 (local dev)
- Vercel (production)
- Nginx reverse proxy (can be enabled)

### Layer 2: API Gateway Layer

**Responsibilities**:
- Single entry point for all API requests
- JWT token validation
- Request routing to microservices
- Rate limiting & throttling
- Circuit breaker pattern
- Request/response transformation
- CORS handling
- Audit logging
- Health monitoring

**Port**: 3001

**Key Features**:
```javascript
// Authentication
- JWT Bearer token validation
- Token refresh mechanism
- Session management
- Role-based access control

// Routing
- Request path-based routing
- Service discovery
- Load balancing
- Fallback services

// Security
- Rate limiting (100/min per user)
- CORS headers
- Request validation
- SQL injection prevention
- XSS protection
```

### Layer 3: Service Layer (9 Microservices)

Each microservice is:
- **Independently deployable**: Own Docker container
- **Independently scalable**: Can scale per service
- **Domain-driven**: Bounded context architecture
- **Database-isolated**: No shared databases
- **API-communicating**: All via HTTP through gateway

### Layer 4: Data Layer

**PostgreSQL Architecture**:

```
PostgreSQL Instance
├── api_gateway (API Gateway database)
├── medical_coverage_core (User & Company)
├── medical_coverage_insurance (Policies)
├── medical_coverage_hospital (Hospital Ops)
├── medical_coverage_billing (Invoicing)
├── medical_coverage_finance (Payments)
├── medical_coverage_crm (Sales)
├── medical_coverage_membership (Enrollment)
└── medical_coverage_wellness (Health Programs)
```

**Features**:
- Separate database per service (data isolation)
- Dedicated connection pools
- Automatic schema creation
- Drizzle ORM for type-safe queries
- Support for Neon Serverless (production)

### Layer 5: Infrastructure Layer

**Components**:
- PostgreSQL 15 (data persistence)
- Redis 7 (caching & sessions)
- Nginx (reverse proxy - optional)
- Docker (containerization)
- Docker Compose (orchestration)

---

## Microservices Design

### Service Definitions

| Service | Responsibility | Database | Ports |
|---------|---------------|----------|-------|
| **API Gateway** | Request routing, auth | api_gateway | 3001 |
| **Core** | Users, companies, members, **member cards** | medical_coverage_core | 3003 |
| **Insurance** | Policies, benefits, schemes | medical_coverage_insurance | 3008 |
| **Hospital** | Facilities, appointments, medical records | medical_coverage_hospital | 3007 |
| **Billing** | Invoices, accounts receivable | medical_coverage_billing | 3002 |
| **Finance** | Payments, ledger, reconciliation | medical_coverage_finance | 3004 |
| **CRM** | Leads, agents, commissions | medical_coverage_crm | 3005 |
| **Membership** | Enrollments, renewals, benefits | medical_coverage_membership | 3006 |
| **Wellness** | Programs, activities, incentives | medical_coverage_wellness | 3009 |

### Service Communication Pattern

```
Frontend Request
    ↓
API Gateway (3001)
    │
    ├─ Validates JWT token
    ├─ Extracts user context
    ├─ Routes based on URL path
    │
    ├─ /api/core/* → Core Service (3003)
    ├─ /api/cards/* → Core Service (3003)
    ├─ /api/insurance/* → Insurance Service (3008)
    ├─ /api/hospital/* → Hospital Service (3007)
    ├─ /api/billing/* → Billing Service (3002)
    ├─ /api/finance/* → Finance Service (3004)
    ├─ /api/crm/* → CRM Service (3005)
    ├─ /api/membership/* → Membership Service (3006)
    └─ /api/wellness/* → Wellness Service (3009)
    ↓
Service Processes Request
    ├─ Validates input with Zod
    ├─ Queries database (Drizzle ORM)
    ├─ May call other services via HTTP
    └─ Returns structured response
    ↓
Response to Client
```

### Service Internal Structure

```
services/{service-name}/
├── src/
│   ├── modules/                    # Pluggable modules
│   │   ├── {feature}/
│   │   │   ├── config/module.config.ts
│   │   │   ├── services/          # Business logic
│   │   │   ├── routes/            # Express routes
│   │   │   ├── handlers/          # Request handlers
│   │   │   ├── types/             # TypeScript types
│   │   │   └── validators/        # Zod schemas
│   │   ├── {feature2}/
│   │   └── index.ts
│   ├── services/                  # External service clients
│   │   ├── GatewayClient.ts       # Call other services
│   │   └── DatabaseService.ts
│   ├── api/
│   │   ├── routes.ts              # Express routes
│   │   ├── middleware/            # Auth, validation
│   │   └── handlers/
│   ├── config/
│   │   ├── database.ts            # DB connection
│   │   └── env.ts                 # Environment vars
│   └── index.ts                   # Entry point
├── Dockerfile                      # Service container
└── package.json
```

---

## Data Flow

### Request Lifecycle

```
1. CLIENT REQUEST
   └─ POST /api/core/members
      Headers: Authorization: Bearer {token}
      Body: { name, email, ... }

2. API GATEWAY RECEIVES
   ├─ Middleware: Request logging
   ├─ Middleware: JWT validation
   ├─ Middleware: User context extraction
   └─ Router: Route matching → /api/core/* → :3003

3. CORE SERVICE RECEIVES
   ├─ Middleware: Express setup
   ├─ Middleware: Request validation
   ├─ Handler: POST /members
   ├─ Service: memberService.create(data)
   ├─ Database: INSERT into members table
   └─ Event: Emit member.created event

4. RESPONSE GENERATION
   ├─ Format: { success, data, timestamp }
   ├─ Status: 201 (Created)
   └─ Return to client

5. CLIENT RECEIVES
   └─ { success: true, data: { id, name, ... } }
```

### Cross-Service Communication

```
Service A needs data from Service B
    ↓
Service A makes HTTP request to Service B
    └─ URL: http://service-b:3008/api/...
    └─ Headers: Include JWT token
    └─ Timeout: 30 seconds
    ├─ Success: Process response
    ├─ Timeout: Return error
    └─ Circuit breaker: Fail fast if too many failures
```

### Database Transaction Flow

```
1. Begin transaction in PostgreSQL
   ├─ ACID guarantees
   └─ Isolated from other transactions

2. Execute multiple queries
   ├─ INSERT member
   ├─ INSERT insurance_policy
   └─ UPDATE ledger

3. On success: COMMIT
   └─ All changes persisted

4. On error: ROLLBACK
   └─ All changes discarded
   └─ Handle error gracefully
```

---

## Database Architecture

### Schema Organization

**File**: `shared/schema.ts` (5000+ lines)
- Single source of truth for all schemas
- Type-safe with Drizzle ORM
- Auto-generated Zod validation schemas
- 50+ domain-specific enums

### Key Tables by Service

**Core Service**:
```sql
users (id, email, password_hash, role, created_at)
companies (id, name, registration_number, created_by)
members (id, company_id, email, status, joined_date)
cards (id, member_id, card_number_hash, issued_date)
```

**Insurance Service**:
```sql
insurance_schemes (id, name, coverage_type, premium)
benefits (id, scheme_id, category, coverage_amount)
member_policies (id, member_id, scheme_id, effective_date)
coverage (id, member_id, benefit_id, remaining_amount)
```

**Billing Service**:
```sql
invoices (id, member_id, amount, due_date, status)
invoice_items (id, invoice_id, description, amount)
accounts (id, member_id, balance, last_payment_date)
```

### Relationships

```
companies (1)
    ↓ (1:N)
members (1)
    ├─ (1:1) cards
    ├─ (1:N) invoices
    ├─ (1:N) claims
    ├─ (1:N) policies
    └─ (1:N) enrollments
```

### Data Isolation & Consistency

- **Per-Service Databases**: No cross-database foreign keys
- **API-Based Joins**: Services call other services for related data
- **Eventual Consistency**: Services sync via APIs
- **Event-Driven Updates**: Services publish events on data changes
- **Audit Trails**: All changes logged with timestamps

---

## Technology Stack

### Frontend

```
React 18              - UI library
Vite                  - Build tool
TypeScript 5          - Type safety
Tailwind CSS          - Styling
Radix UI              - Component library
React Query           - Server state management
React Hook Form       - Form handling
Axios                 - HTTP client
Wouter                - Routing
Jest                  - Testing
```

### Backend

```
Node.js 20            - Runtime
Express               - Web framework
TypeScript 5          - Type safety
PostgreSQL 15         - Database
Drizzle ORM           - Type-safe queries
Zod                   - Schema validation
JWT                   - Authentication
Passport              - Strategies
Docker                - Containerization
pytest/Jest           - Testing
```

### Infrastructure

```
Docker                - Container runtime
Docker Compose        - Local orchestration
PostgreSQL 15-alpine  - Database
Redis 7-alpine        - Caching
Nginx                 - Reverse proxy
Vercel                - Serverless deployment
Neon                  - Serverless PostgreSQL
```

---

## Security Model

### Authentication

```
User Login
    ├─ Email + Password
    └─ Server validates against password_hash
    
    ↓
    
Token Generation
    ├─ accessToken (15 min expiry)
    ├─ refreshToken (7 day expiry)
    └─ Both JWT tokens

    ↓
    
Token Usage
    ├─ Every API request includes Authorization header
    ├─ API Gateway validates token
    ├─ Service checks JWT claims
    └─ Request proceeds if valid

    ↓
    
Token Refresh
    ├─ accessToken expires
    ├─ Client sends refreshToken
    ├─ Server issues new accessToken
    └─ Continue using new token
```

### Authorization

```
Role-Based Access Control (RBAC)
├─ admin     - Full system access
├─ manager   - Company/regional management
├─ agent     - Sales agent access
├─ user      - Member/individual access
└─ guest     - Public access (limited)

Endpoint Protection
├─ Public endpoints (no auth required)
│  └─ /api/core/auth/login
│
├─ Protected endpoints (auth required)
│  └─ requireAuth middleware
│
└─ Role-specific endpoints (role required)
   └─ requireRole('admin') middleware
```

### Data Protection

- **In Transit**: HTTPS/TLS encryption
- **At Rest**: Database encryption (production)
- **Passwords**: bcrypt hashing (12 rounds)
- **Secrets**: Environment variables (never in code)
- **Api Keys**: Stored hashed in database
- **Audit Logging**: All user actions logged

### Network Security

```
┌─────────────────────────────────────┐
│ External Network (Public Internet) │
└──────────────────┬──────────────────┘
                   │ HTTPS/TLS
                   ▼
┌─────────────────────────────────────┐
│ Nginx/Load Balancer (Rate Limiting) │
└──────────────────┬──────────────────┘
                   │ Internal Network
                   ▼
┌─────────────────────────────────────┐
│ API Gateway (JWT Validation)        │
└──────────────────┬──────────────────┘
                   │ Internal Network
      ┌────────────┼────────────┐
      ▼            ▼            ▼
Services & Databases
(Protected by Network Policies)
```

---

## Performance & Scalability

### Performance Metrics

- **Response Time**: <500ms median
- **P95 Response Time**: <1s
- **Throughput**: 1000+ requests/sec
- **Concurrent Users**: 10,000+
- **Availability**: 99.9% uptime target

### Optimization Strategies

**Frontend**:
- Code splitting (Vite)
- Image optimization
- Lazy loading
- Caching (browser cache)
- CDN distribution

**Backend**:
- Database indexing
- Connection pooling
- Query optimization
- Caching (Redis)
- Microservices scaling

**Database**:
- Indexes on frequent queries
- Partitioning strategy
- Query analysis
- Connection limits
- Read replicas (production)

### Horizontal Scaling

```
Service Scaling
├─ Multiple instances of same service
├─ Load balancer routes requests
├─ Each instance has DB connection pool
├─ Stateless design (no session data)
└─ Auto-scaling based on load

Example:
docker-compose up -d --scale core-service=3
```

---

## Deployment Architecture

### Local Development

```
┌───────────────────────────────────┐
│ Host Machine                      │
├───────────────────────────────────┤
│ Docker Desktop / Colima           │
├───────────────────────────────────┤
│ docker-compose.yml                │
│ ├─ Frontend (3000)                │
│ ├─ API Gateway (3001)             │
│ ├─ 8 Microservices (3002-3009)   │
│ ├─ PostgreSQL (5432)              │
│ ├─ Redis (6379)                   │
│ └─ Nginx (80/443) [optional]      │
└───────────────────────────────────┘
```

### Production Deployment

#### Option 1: Self-Hosted (VPS)

```
┌──────────────────────────────┐
│ Cloud Provider (AWS/GCP/etc) │
├──────────────────────────────┤
│ Kubernetes Cluster           │
├──────────────────────────────┤
│ Namespace: medical-coverage  │
│ ├─ Frontend Pod              │
│ ├─ API Gateway Pod           │
│ ├─ Service Pods (8)          │
│ ├─ PostgreSQL StatefulSet    │
│ ├─ Redis StatefulSet         │
│ └─ Nginx Ingress             │
└──────────────────────────────┘
```

#### Option 2: Vercel Deployment

```
┌──────────────────────────────┐
│ Vercel                       │
├──────────────────────────────┤
│ Frontend                     │
│ ├─ Static assets (CDN)       │
│ └─ API routes (Serverless)   │
└──────────────────────────────┘
         ↓
┌──────────────────────────────┐
│ Neon (Serverless PostgreSQL) │
└──────────────────────────────┘
```

### Environment Progression

```
Development (local)
    ↓
Staging (QA environment)
    ├─ Test deployment
    ├─ Performance testing
    └─ Security testing
    ↓
Production (Customer-facing)
    ├─ High availability
    ├─ Monitoring & alerting
    └─ Automated backups
```

---

## Monitoring & Observability

### Health Checks

```
Every Service
├─ Endpoint: GET /health
├─ Interval: 30 seconds
├─ Timeout: 10 seconds
├─ Retries: 5 before marking unhealthy
└─ Returns: { status, timestamp, details }

API Gateway also checks:
├─ Database connectivity
├─ Redis connectivity
└─ All downstream services
```

### Logging

```
Request Logging
├─ Method, URL, status code
├─ Request body (sensitive data masked)
├─ Response time
├─ User ID & IP address
└─ Correlation ID for tracing

Error Logging
├─ Stack traces
├─ Request context
├─ User context
└─ Severity level (ERROR, WARN, INFO)
```

### Distributed Tracing

```
X-Correlation-ID Header
├─ Generated at API Gateway
├─ Passed to all services
├─ Included in logs
└─ Enables request tracing across services
```

---

## Summary

**Architecture Type**: Microservices with API Gateway pattern

**Key Strengths**:
- ✅ Independent service scaling
- ✅ Technology flexibility per service
- ✅ Data isolation & security
- ✅ High availability design
- ✅ Type-safe development (TypeScript)
- ✅ Production-ready deployment patterns

**Trade-offs**:
- Network latency between services
- Data consistency challenges
- Operational complexity
- Increased monitoring needs

**This architecture is suitable for**:
- Enterprise healthcare systems
- High-concurrency applications
- Geographically distributed systems
- Teams with specialized expertise

---

**Related Documentation**:
- [SETUP_AND_DEPLOYMENT.md](SETUP_AND_DEPLOYMENT.md) - Deployment procedures
- [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) - Development workflow
- [API_REFERENCE.md](API_REFERENCE.md) - API endpoints & integration
