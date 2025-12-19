# AI Coding Assistant Instructions for Medical Coverage System

## 🏥 System Architecture Overview

This is a comprehensive medical coverage/insurance management system with a modular full-stack architecture:

### Core Components
- **Frontend**: React + Vite, TypeScript, Radix UI, Tailwind CSS
- **Backend**: Node.js + Express, modular services architecture
- **Database**: PostgreSQL with Drizzle ORM and Zod validation
- **Deployment**: Docker containerization with nginx reverse proxy

### Key Architectural Patterns

#### 1. Modular Registry System
- Uses `ModuleRegistry` for dynamic loading of business modules
- Each module implements `IModule` interface with lifecycle hooks
- Modules register routes, services, and database schemas
- Located in `server/modules/` with core registry in `server/modules/core/registry/`

#### 2. Shared Schema System
- TypeScript schemas in `shared/schema.ts` define database tables and validation
- Auto-generated Zod schemas for type safety across frontend/backend
- Complex medical domain enums (member types, claim statuses, benefit categories)

#### 3. Service Layer Architecture
- Business logic in `server/services/` (commission, finance, medical necessity validation)
- API routes in `server/api/` organized by domain (crm, finance, etc.)
- Storage abstraction in `server/storage.ts` and `server/databaseStorage.ts`

## 🔧 Critical Developer Workflows

### Development Setup
```bash
# Start both frontend and backend in development
npm run dev              # Runs both client (port 5173) and server (port 5000)
npm run dev:client       # Frontend only
npm run dev:server       # Backend only (via tsx)
```

### Building & Deployment
```bash
# Build process
npm run build            # Builds both client and server
npm run build:client     # Client build to client/dist
npm run build:server     # Server build to dist/ (ESM bundle)

# Docker deployment
./docker-start.sh dev    # Development containers
./docker-start.sh prod   # Production containers
```

### Database Operations
```bash
npm run db:push          # Apply schema changes to database
# Database URL configured in .env: postgresql://user:pass@localhost:5432/db
```

### Testing Strategy
```bash
npm run test:all         # Run all test suites
npm run test:unit        # Jest unit tests (client + server)
npm run test:integration # Integration tests with timeout 30s
npm run test:e2e         # Cypress end-to-end tests
npm run test:coverage    # Coverage reports
```

## 📋 Project-Specific Conventions

### Module Development
- **Location**: `server/modules/{module-name}/`
- **Structure**: `config/module.config.ts`, `routes/`, `services/`, `types/`
- **Registration**: Modules register with `moduleRegistry.registerModule(new MyModule())`
- **Dependencies**: Declare module dependencies in config for load ordering

### Database Schema Patterns
- **Enums**: Extensive domain-specific enums (50+ defined)
- **Relationships**: Foreign keys between companies → members → claims → providers
- **Validation**: Zod schemas auto-generated from Drizzle tables
- **Naming**: snake_case for database columns, camelCase for TypeScript

### API Design
- **Routes**: RESTful endpoints in `server/routes.ts` (4000+ lines)
- **Middleware**: Authentication via `authenticateUser`, role-based access
- **Validation**: Request validation using Zod schemas
- **Error Handling**: Structured error responses with status codes

### Frontend Patterns
- **Routing**: Wouter for client-side routing
- **State**: React Query for server state, Context for global state
- **Components**: Radix UI primitives with Tailwind styling
- **API Client**: Axios with TypeScript interfaces from shared schemas

## 🔍 Key Files & Directories

### Essential Entry Points
- `server/index.ts` - Main server startup with middleware and module loading
- `client/src/main.tsx` - React app entry point
- `shared/schema.ts` - Complete database schema and types (4700+ lines)

### Configuration Files
- `package.json` - Scripts for dev, build, test workflows
- `docker-compose.yml` - Container orchestration
- `config/jest.config.js` - Testing configuration
- `tsconfig.json` - TypeScript configuration

### Business Logic Locations
- `server/services/` - Core business services (commissions, finance, validation)
- `server/api/` - Domain-specific API endpoints (crm, finance, claims)
- `server/modules/` - Pluggable business modules
- `client/src/pages/` - Frontend page components

### Documentation
- `docs/` - Comprehensive system documentation
- `DOCKER_README.md` - Container deployment guide
- `scripts/` - Automation scripts for deployment and setup

## ⚠️ Common Pitfalls & Requirements

### Database Considerations
- Always run `npm run db:push` after schema changes
- Use transactions for multi-table operations
- Validate foreign key relationships before insertions

### Module Development
- Register modules in dependency order
- Implement all `IModule` lifecycle methods
- Test module isolation and integration

### Testing Requirements
- Unit tests for services and utilities
- Integration tests for API endpoints
- E2E tests for critical user journeys
- Maintain coverage above 80%

### Deployment Notes
- Environment variables critical for security (JWT secrets, DB credentials)
- Nginx configuration for production routing
- Health checks required for all services

## 🎯 Development Priorities

1. **Type Safety**: Leverage shared schemas for consistent types
2. **Modular Design**: Build features as pluggable modules
3. **Testing**: Comprehensive coverage across all layers
4. **Documentation**: Update docs/ for new features
5. **Performance**: Optimize database queries and API responses

## 🔗 Integration Points

- **External APIs**: Email service, payment processing (Stripe)
- **File Storage**: AWS S3 or equivalent for documents
- **Authentication**: JWT with refresh tokens
- **Caching**: Redis for session and data caching
- **Monitoring**: Health checks and metrics endpoints