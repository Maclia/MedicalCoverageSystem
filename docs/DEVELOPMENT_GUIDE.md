# Development Guide & Architecture

**Status**: 🟢 Current  
**Last Updated**: April 2, 2026

## 📋 Quick Navigation

- [Project Structure](#project-structure)
- [Microservices Architecture](#microservices-architecture)
- [Service Connectivity](#service-connectivity)
- [Database Schema](#database-schema)
- [Development Workflow](#development-workflow)
- [Module Development](#module-development)
- [Testing Strategy](#testing-strategy)
- [Contributing Guidelines](#contributing-guidelines)

---

## Project Structure

```
MedicalCoverageSystem/
├── client/                          # React + Vite frontend
│   ├── src/
│   │   ├── pages/                   # Page components
│   │   ├── components/              # Reusable UI components
│   │   ├── lib/
│   │   │   ├── api.ts              # Centralized API client
│   │   │   └── ...
│   │   └── main.tsx
│   ├── Dockerfile                   # Multi-target frontend build
│   └── package.json
│
├── services/                        # 9 Microservices
│   ├── api-gateway/                 # Central request router
│   │   ├── src/
│   │   │   ├── services/
│   │   │   ├── api/
│   │   │   └── index.ts            # Express server entry
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── core-service/                # User & company management
│   ├── insurance-service/           # Insurance policies
│   ├── hospital-service/            # Hospital operations
│   ├── billing-service/             # Invoicing & payments
│   ├── finance-service/             # Payment processing
│   ├── crm-service/                 # Sales & commissions
│   ├── membership-service/          # Enrollment & renewals
│   └── wellness-service/            # Health programs
│
├── shared/                          # Shared code across services
│   ├── schema.ts                    # Drizzle ORM schemas (5000+ lines)
│   └── types/                       # Common TypeScript types
│
├── database/                        # Database setup
│   ├── init/                        # Initialization scripts
│   │   ├── 00-create-databases.sql
│   │   ├── 01-init-database.sql
│   │   └── 02-{service}-schema.sql (8 files)
│   └── scripts/
│
├── deployment/                      # Deployment orchestration
│   ├── scripts/
│   │   ├── orchestrate.sh           # Unified deployment (Linux/macOS)
│   │   ├── orchestrate.bat          # Unified deployment (Windows)
│   │   └── services-config.sh       # Service configuration
│   └── configs/
│
├── docker-compose.yml               # Service orchestration
├── .env.example                     # Environment template
└── package.json                     # Root package management
```

---

## Microservices Architecture

### Core Components

| Service | Port | Database | Responsibility |
|---------|------|----------|-----------------|
| **API Gateway** | 3001 | api_gateway | Request routing, auth, rate limiting |
| **Core** | 3003 | medical_coverage_core | User & company management |
| **Insurance** | 3008 | medical_coverage_insurance | Insurance policies & benefits |
| **Hospital** | 3007 | medical_coverage_hospital | Hospital operations |
| **Billing** | 3002 | medical_coverage_billing | Invoicing & payments |
| **Finance** | 3004 | medical_coverage_finance | Payment processing |
| **CRM** | 3005 | medical_coverage_crm | Sales & commissions |
| **Membership** | 3006 | medical_coverage_membership | Enrollment & renewals |
| **Wellness** | 3009 | medical_coverage_wellness | Health programs |

### Architecture Principles

1. **Service Isolation** - Each service has its own database
2. **Modular Design** - Services use `ModuleRegistry` for dynamic feature loading
3. **API-First Communication** - Services communicate via HTTP through API Gateway
4. **Type Safety** - TypeScript + Zod schemas across all services
5. **Database Per Service** - Independent storage, no shared databases

---

## Service Connectivity

### Service-to-Service Communication

All service-to-service communication flows through the API Gateway:

```
Client (Port 3000)
    ↓
API Gateway (Port 3001)
    ├─→ Core Service (3003)
    ├─→ Insurance Service (3008)
    ├─→ Hospital Service (3007)
    ├─→ Billing Service (3002)
    ├─→ Finance Service (3004)
    ├─→ CRM Service (3005)
    ├─→ Membership Service (3006)
    └─→ Wellness Service (3009)
```

### Environment Configuration for Service URLs

**Docker (container names):**
```env
CORE_SERVICE_URL=http://core-service:3003
INSURANCE_SERVICE_URL=http://insurance-service:3008
HOSPITAL_SERVICE_URL=http://hospital-service:3007
BILLING_SERVICE_URL=http://billing-service:3002
FINANCE_SERVICE_URL=http://finance-service:3004
CRM_SERVICE_URL=http://crm-service:3005
MEMBERSHIP_SERVICE_URL=http://membership-service:3006
WELLNESS_SERVICE_URL=http://wellness-service:3009
```

**Local Development (localhost):**
```env
CORE_SERVICE_URL=http://localhost:3003
INSURANCE_SERVICE_URL=http://localhost:3008
HOSPITAL_SERVICE_URL=http://localhost:3007
BILLING_SERVICE_URL=http://localhost:3002
FINANCE_SERVICE_URL=http://localhost:3004
CRM_SERVICE_URL=http://localhost:3005
MEMBERSHIP_SERVICE_URL=http://localhost:3006
WELLNESS_SERVICE_URL=http://localhost:3009
```

### Frontend Configuration

**Centralized API client:** `client/src/lib/api.ts`

```typescript
// Environment-aware configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

// Usage in components
const response = await api.get('/core/members');
```

---

## Database Schema

### Database Architecture

- **Total Databases**: 9 (one per service + API Gateway)
- **Database Engine**: PostgreSQL 15+
- **ORM**: Drizzle (type-safe)
- **Type Generation**: Automatic Zod schemas

### Shared Schema File

**`shared/schema.ts`** (5000+ lines)
- Contains all database table definitions
- Auto-generates Zod validation schemas
- Defines 50+ domain-specific enums
- Single source of truth for data models

### Example Enums

```typescript
// Member types
export const memberTypeEnum = pgEnum('member_type', [
  'individual', 'employee', 'dependent', 'retiree'
]);

// Claim statuses
export const claimStatusEnum = pgEnum('claim_status', [
  'pending', 'approved', 'rejected', 'paid', 'disputed'
]);

// Benefit categories
export const benefitCategoryEnum = pgEnum('benefit_category', [
  'hospitalization', 'outpatient', 'dental', 'optical', 'preventive'
]);
```

### Database Initialization

```bash
# Create databases (automatic on docker-compose up)
npm run db:push:all

# Individual service schema deployment
npm run db:push:core
npm run db:push:insurance
npm run db:push:finance
```

---

## Development Workflow

### Setting Up for Development

```bash
# 1. Install dependencies
npm install

# 2. Install service dependencies
cd services/core-service && npm install
cd services/api-gateway && npm install
# ... repeat for other services

# 3. Copy environment
cp .env.example .env

# 4. Start development environment
./orchestrate.sh dev start full
```

### Running Services Individually

```bash
# Start API Gateway
cd services/api-gateway && npm run dev

# Start Core Service
cd services/core-service && npm run dev

# Start Frontend (separate terminal)
npm run dev:client
```

### Development Commands

```bash
# Build all services
npm run build:all

# Build specific service
cd services/core-service && npm run build

# Test all services
npm run test:all

# Watch mode for development
npm run dev:all

# Check for TypeScript errors
npm run type:check
```

---

## Module Development

### Module Architecture

Each microservice uses a modular design:

```
services/core-service/
├── src/modules/
│   ├── auth/
│   │   ├── index.ts                # Module export
│   │   ├── config/module.config.ts  # Module metadata
│   │   ├── services/               # Business logic
│   │   ├── routes/                 # Express routes
│   │   └── types/
│   ├── company/
│   ├── member/
│   └── ...
├── src/services/                   # Service-specific utilities
├── src/index.ts                    # Service entry point
└── package.json
```

### Creating a New Module

1. **Create module structure:**
   ```bash
   mkdir -p services/core-service/src/modules/new-feature
   mkdir -p services/core-service/src/modules/new-feature/{config,services,routes,types}
   ```

2. **Create module config** (`config/module.config.ts`):
   ```typescript
   export const moduleConfig: IModule = {
     name: 'new-feature',
     version: '1.0.0',
     dependencies: ['core'],
     routes: [],
     init: async (app) => {
       // Initialize module
     }
   };
   ```

3. **Register module** in service's `index.ts`:
   ```typescript
   import { moduleConfig } from './modules/new-feature/config/module.config';
   registry.register(moduleConfig);
   ```

### Module Interface

```typescript
interface IModule {
  name: string;
  version: string;
  dependencies?: string[];
  routes: RouteDefinition[];
  services?: ServiceDefinition[];
  init?: (app: Express.Application) => Promise<void>;
  shutdown?: () => Promise<void>;
}
```

---

## Testing Strategy

### Test Types

```bash
# Unit tests (isolated)
npm run test:unit

# Integration tests (inter-service)
npm run test:integration

# End-to-end tests
npm run test:e2e
npm run test:e2e:ui  # With UI viewer

# Coverage reports
npm run test:coverage

# All tests
npm run test:all
```

### Test Organization

```
services/service-name/
├── src/
└── __tests__/
    ├── unit/
    │   ├── services.test.ts
    │   └── utils.test.ts
    ├── integration/
    │   └── api.test.ts
    └── fixtures/
        └── mock-data.ts
```

### Writing Tests

```typescript
// Example unit test
describe('UserService', () => {
  it('should create user', async () => {
    const user = await userService.create({ 
      name: 'John Doe' 
    });
    expect(user.id).toBeDefined();
  });
});

// Example integration test
describe('User API', () => {
  it('should register new user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'user@test.com' })
      .expect(201);
    expect(response.body.id).toBeDefined();
  });
});
```

---

## API Development

### Service Routes Structure

Each service defines its routes:

```
services/service-name/
└── src/
    └── api/
        ├── routes.ts              # Main route definitions
        ├── middleware/
        │   ├── auth.ts
        │   ├── validation.ts
        │   └── ...
        └── handlers/
            ├── user.ts
            ├── billing.ts
            └── ...
```

### Route Definition Pattern

```typescript
// services/core-service/src/api/routes.ts
import { Router } from 'express';
import { requireAuth, requireRole } from './middleware/auth';

const router = Router();

// Protected routes
router.get('/users', requireAuth, async (req, res) => {
  // Handler
});

// Admin-only routes
router.post('/users', requireAuth, requireRole('admin'), async (req, res) => {
  // Handler
});

export default router;
```

### API Gateway Routing

The API Gateway routes requests to services based on URL prefixes:

```
/api/core/*       → core-service (port 3003)
/api/insurance/*  → insurance-service (port 3008)
/api/hospital/*   → hospital-service (port 3007)
/api/billing/*    → billing-service (port 3002)
/api/finance/*    → finance-service (port 3004)
/api/crm/*        → crm-service (port 3005)
/api/membership/* → membership-service (port 3006)
/api/wellness/*   → wellness-service (port 3009)
```

---

## Contributing Guidelines

### Code Style

- **Language**: TypeScript
- **Linter**: ESLint
- **Formatter**: Prettier
- **Database**: Drizzle ORM

```bash
# Run linter
npm run lint

# Format code
npm run format

# Type check
npm run type:check
```

### Commit Convention

```
feat: Add new feature
fix: Fix bug
docs: Documentation updates
refactor: Code refactoring
test: Add/update tests
chore: Maintenance
```

### Pull Request Process

1. **Create feature branch:** `git checkout -b feature/description`
2. **Make changes:** Implement feature with tests
3. **Test locally:** `npm run test:all`
4. **Lint & format:** `npm run lint && npm run format`
5. **Push changes:** `git push origin feature/description`
6. **Create PR:** Include description of changes
7. **Await review:** Respond to feedback
8. **Merge:** Once approved

### Code Review Checklist

- ✅ TypeScript types are correct
- ✅ Proper error handling
- ✅ Tests added/updated
- ✅ No code duplication
- ✅ Documentation updated
- ✅ No breaking changes to API
- ✅ Service boundaries respected (data isolation)

---

## Performance & Optimization

### Database Optimization

```bash
# Check slow queries
docker-compose exec postgres psql -U postgres \
  -d medical_coverage_core \
  -c "SELECT * FROM pg_stat_statements"
```

### Service Health Monitoring

```bash
# Check all services health
./scripts/verify-connections.sh

# Monitor performance
docker stats

# View service logs with filtering
docker-compose logs api-gateway | grep -E "ERROR|WARN"
```

---

## Useful Commands Reference

```bash
# Development
npm run dev:all              # Start all services
npm run dev:client           # Frontend only
npm run build:all            # Build all services

# Testing
npm run test:all             # Run all tests
npm run test:coverage        # Coverage report
npm run test:e2e             # End-to-end tests

# Database
npm run db:push:all          # Deploy all schemas
npm run db:studio            # Open Drizzle Studio

# Deployment
./orchestrate.sh dev start   # Development start
docker-compose up -d --build # Docker full start

# Cleanup
docker-compose down -v       # Complete cleanup
npm run clean:all            # Remove all artifacts
```

---

## Additional Resources

- **Frontend Component Library**: Radix UI + Tailwind CSS
- **State Management**: React Query + Context API
- **Form Handling**: React Hook Form + Zod validation
- **HTTP Client**: Axios
- **Routing**: Wouter (client), Express (backend)
- **Database**: PostgreSQL + Drizzle ORM

---

**For more details on specific services, see `services/{service-name}/README.md`**
