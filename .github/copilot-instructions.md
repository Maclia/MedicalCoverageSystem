# AI Coding Assistant Instructions for Medical Coverage System

## 🏥 System Architecture Overview

This is a comprehensive medical coverage/insurance management system built as a **microservices architecture** with 9 independent services, each with its own database and domain responsibility.

### Core Components
- **Frontend**: React 18 + Vite, TypeScript, Radix UI, Tailwind CSS
- **Backend**: 9 Node.js microservices with Express, each with modular architecture
- **API Gateway**: Centralized routing and authentication service
- **Database**: 8 separate PostgreSQL databases (Neon Serverless) + shared database
- **Deployment**: Docker containerization with orchestration

### Microservices Overview

| Service | Database | Responsibility | Key Features |
|---------|----------|----------------|--------------|
| **API Gateway** | `medical-coverage-api-gateway` | API Routing & Authentication | Request routing, auth, rate limiting |
| **Billing** | `medical-coverage-billing` | Invoicing & Payments | Invoice generation, payment processing |
| **Core** | `medical-coverage-core` | Member & Company Management | Member registry, company management, cards |
| **CRM** | `medical-coverage-crm` | Sales & Commissions | Lead management, agent performance, commissions |
| **Finance** | `medical-coverage-finance` | Financial Operations | Premium billing, payment processing, ledger |
| **Hospital** | `medical-coverage-hospital` | Hospital Management | Hospital data, integrations |
| **Insurance** | `medical-coverage-insurance` | Insurance Policies | Policy management, underwriting |
| **Membership** | `medical-coverage-membership` | Membership Services | Enrollment, renewals, benefits |
| **Wellness** | `medical-coverage-wellness` | Wellness Programs | Health programs, incentives |

### Key Architectural Patterns

#### 1. Service Isolation
- Each microservice runs independently with its own database
- Services communicate via HTTP APIs through the API Gateway
- Shared schemas and types in `shared/` directory for consistency
- Independent deployment and scaling per service

#### 2. Modular Service Architecture
- Each service uses `ModuleRegistry` for dynamic loading of business modules
- Modules implement `IModule` interface with lifecycle hooks
- Service-specific modules in `services/{service-name}/src/modules/`
- Shared modules in `server/modules/` for common functionality

#### 3. Shared Schema System
- TypeScript schemas in `shared/schema.ts` define database tables and validation (5000+ lines)
- Auto-generated Zod schemas for type safety across services
- Complex medical domain enums (50+ defined): `memberTypeEnum`, `claimStatusEnum`, `benefitCategoryEnum`
- Database operations use Drizzle ORM with type-safe queries

## 🔧 Critical Developer Workflows

### Development Setup
```bash
# Install all dependencies
npm install

# For Docker development (recommended):
# Start PostgreSQL and Redis containers
docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15
docker run -d --name redis -p 6379:6379 redis:7

# Create databases for each service
docker exec -it postgres psql -U postgres -c "CREATE DATABASE medical_coverage_core;"
docker exec -it postgres psql -U postgres -c "CREATE DATABASE medical_coverage_crm;"
# ... create other databases

# Start all services in development
npm run dev:all        # Runs all 9 services + frontend
npm run dev:client     # Frontend only (port 5173)
npm run dev:gateway    # API Gateway only (port 5000)

# Individual service development
cd services/core-service && npm run dev
cd services/crm-service && npm run dev
```

### Building & Deployment
```bash
# Build all services
npm run build:all      # Builds all services and client
npm run build:client   # Client build to client/dist
npm run build:services # Build all microservices

# Docker deployment
./run-all-services.sh  # Orchestrates all service containers
docker build -t medical-api-gateway ./services/api-gateway
docker build -t medical-core-service ./services/core-service
# ... build other services

# Production start (individual services)
cd services/core-service && npm start
cd services/api-gateway && npm start
```

### Building & Deployment
```bash
# Build all services
npm run build:all      # Builds all services and client
npm run build:client   # Client build to client/dist
npm run build:services # Build all microservices

# Docker deployment
./run-all-services.sh  # Orchestrates all service containers
docker build -t medical-api-gateway ./services/api-gateway
docker build -t medical-core-service ./services/core-service
# ... build other services

# Production start (individual services)
cd services/core-service && npm start
cd services/api-gateway && npm start
```

### Database Operations
```bash
# Deploy schemas for all services
npm run db:push:all

# Individual service schemas
npm run db:push:core       # Core service (medical-coverage-core)
npm run db:push:crm        # CRM service (medical-coverage-crm)
npm run db:push:claims     # Claims service (medical-coverage-claims)
npm run db:push:providers  # Providers service (medical-coverage-providers)
npm run db:push:finance    # Finance service (medical-coverage-finance)
npm run db:push:tokens     # Tokens service (medical-coverage-tokens)
npm run db:push:schemes    # Schemes service (medical-coverage-schemes)
npm run db:push:analytics  # Analytics service (medical-coverage-analytics)

npm run db:studio     # Open Drizzle Studio for database management
```

### Database Configuration
Each microservice has its own dedicated PostgreSQL database:

**Development (Docker):**
- Uses local PostgreSQL container with multiple databases
- Connection: `postgresql://postgres:postgres@postgres:5432/{service_db}`

**Production (Neon):**
- Uses Neon Serverless with 8 separate databases
- Connection: `postgresql://user:pass@host/{service_db}?sslmode=require&channel_binding=require`

| Service | Database Name | Docker URL | Neon URL |
|---------|---------------|------------|----------|
| Core | `medical_coverage_core` | `postgres:5432/medical_coverage_core` | `host/medical-coverage-core` |
| CRM | `medical_coverage_crm` | `postgres:5432/medical_coverage_crm` | `host/medical-coverage-crm` |
| Claims | `medical_coverage_claims` | `postgres:5432/medical_coverage_claims` | `host/medical-coverage-claims` |
| Providers | `medical_coverage_providers` | `postgres:5432/medical_coverage_providers` | `host/medical-coverage-providers` |
| Finance | `medical_coverage_finance` | `postgres:5432/medical_coverage_finance` | `host/medical-coverage-finance` |
| Tokens | `medical_coverage_tokens` | `postgres:5432/medical_coverage_tokens` | `host/medical-coverage-tokens` |
| Schemes | `medical_coverage_schemes` | `postgres:5432/medical_coverage_schemes` | `host/medical-coverage-schemes` |
| Analytics | `medical_coverage_analytics` | `postgres:5432/medical_coverage_analytics` | `host/medical-coverage-analytics` |

### Testing Strategy
```bash
npm run test:all         # Run all test suites across services
npm run test:unit        # Unit tests for all services
npm run test:integration # Cross-service integration tests
npm run test:e2e         # End-to-end tests with Cypress
npm run test:coverage    # Coverage reports for all services
```

## 📋 Project-Specific Conventions

### Service Development
- **Location**: `services/{service-name}/`
- **Structure**: `src/modules/`, `src/services/`, `src/api/`, `src/config/`
- **Entry Point**: `src/index.ts` with Express server setup
- **Database**: Each service has its own database connection
- **Communication**: Services communicate via HTTP through API Gateway

### Module Development (Per Service)
- **Location**: `services/{service-name}/src/modules/{module-name}/`
- **Structure**: `config/module.config.ts`, `routes/`, `services/`, `types/`
- **Registration**: Modules register with service's `ModuleRegistry`
- **Dependencies**: Declare module dependencies in config

### Database Schema Patterns
- **Enums**: Extensive domain-specific enums (50+ defined) like `claimStatusEnum`, `benefitCategoryEnum`
- **Relationships**: Foreign keys between companies → members → claims → providers
- **Validation**: Zod schemas auto-generated from Drizzle tables
- **Naming**: snake_case for database columns, camelCase for TypeScript
- **Migrations**: Use `npm run db:push:{service}` after schema changes

### API Design
- **Gateway Routes**: Centralized routing in `services/api-gateway/`
- **Service Routes**: RESTful endpoints in each service's `src/api/routes.ts`
- **Middleware**: Authentication via JWT, role-based access with `requireRole`
- **Validation**: Request validation using Zod schemas from shared/schema
- **Error Handling**: Structured error responses with status codes and audit logging

### Frontend Patterns
- **Routing**: Wouter for client-side routing
- **State**: React Query for server state, Context for global state
- **Components**: Radix UI primitives with Tailwind styling
- **API Client**: Axios calls to API Gateway endpoints
- **Forms**: React Hook Form with Zod validation

## 🔍 Key Files & Directories

### Essential Entry Points
- `services/api-gateway/src/index.ts` - API Gateway server startup
- `services/{service-name}/src/index.ts` - Individual service entry points
- `client/src/main.tsx` - React app entry point
- `shared/schema.ts` - Complete database schema and types (5000+ lines)

### Configuration Files
- `package.json` - Root scripts for multi-service operations
- `services/{service-name}/package.json` - Individual service dependencies
- `config/drizzle.{service}.config.ts` - Database configs for each service
- `client/vite.config.ts` - Frontend build configuration
- `jest.config.js` - Testing configuration

### Business Logic Locations
- `services/{service-name}/src/services/` - Service-specific business logic
- `services/{service-name}/src/modules/` - Pluggable business modules per service
- `server/modules/` - Shared modules used across services
- `client/src/pages/` - Frontend page components
- `client/src/components/` - Reusable UI components

### Documentation
- `docs/` - Comprehensive system documentation and integration reports
- `README.md` - Setup and architecture overview
- `services/{service-name}/README.md` - Individual service documentation

## ⚠️ Common Pitfalls & Requirements

### Service Communication
- Always route requests through API Gateway in production
- Use service discovery for inter-service communication
- Handle service failures gracefully with circuit breakers
- Maintain API contracts between services

### Database Considerations
- Each service owns its domain data exclusively
- Use `npm run db:push:{service}` after schema changes
- Cross-service data access via APIs, not direct database queries
- Handle distributed transactions carefully

### Module Development
- Register modules in dependency order within each service
- Implement all `IModule` lifecycle methods
- Test module isolation and cross-service integration
- Use service-specific routes under `/api/{service-name}`

### Testing Requirements
- Unit tests for individual services and modules
- Integration tests for cross-service workflows
- Contract tests for API compatibility
- E2E tests for complete user journeys
- Maintain coverage above 80% across all services

### Deployment Notes
- Environment variables required for each service (DB URLs, secrets)
- Docker containers for each service with proper networking
- Health checks required for all services
- Service startup order matters for dependencies

## 🎯 Development Priorities

1. **Service Boundaries**: Maintain clear domain separation between services
2. **API Contracts**: Well-defined APIs for inter-service communication
3. **Type Safety**: Leverage shared schemas for consistent types
4. **Testing**: Comprehensive coverage across all services and integrations
5. **Documentation**: Update docs/ for new services and integration points
6. **Performance**: Optimize database queries and inter-service calls

## 🔗 Integration Points

- **API Gateway**: Centralized routing, authentication, and rate limiting
- **Service Mesh**: Inter-service communication and discovery
- **Shared Libraries**: Common utilities and types in `shared/` directory
- **Database Federation**: Cross-service data access via APIs
- **Event Streaming**: Asynchronous communication between services (future)
- **External APIs**: Email service, payment processing (Stripe), file storage (AWS S3)