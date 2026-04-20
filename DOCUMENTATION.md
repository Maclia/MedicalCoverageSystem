# Medical Coverage System - Complete Documentation

**Single Source of Truth** | Last Updated: April 20, 2026 | Status: 🟢 Production Ready

---

## 📋 Table of Contents

1. [Quick Start](#-quick-start)
2. [System Architecture](#-architecture)
3. [Technology Stack](#-technology-stack)
4. [Microservices](#-microservices)
5. [Database Management](#-database-management)
6. [Development Guide](#-development-guide)
7. [Deployment](#-deployment)
8. [API Reference](#-api-reference)
9. [Security & Compliance](#-security--compliance)
10. [Monitoring & Operations](#-monitoring--operations)
11. [Troubleshooting](#-troubleshooting)
12. [Contributing](#-contributing)

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: 18+ (18.17.0 or higher recommended)
- **Docker**: Docker Engine 20.10+ and Docker Compose 1.29+
- **PostgreSQL**: 15+ (or use Docker container)
- **Redis**: 7+ (or use Docker container)
- **Git**: For cloning the repository
- **Disk Space**: ~5GB for full setup with containers
- **Memory**: 8GB minimum (16GB recommended for full stack)

### 5-Minute Docker Setup (Recommended)

```bash
# 1. Clone repository
git clone <repository-url>
cd MedicalCoverageSystem

# 2. Install dependencies (installs all service dependencies)
npm install

# 3. Copy environment file and configure
cp .env.example .env
# Edit .env with your configuration if needed

# 4. Start entire stack with Docker
docker-compose up -d --build

# Verify all containers are running
docker-compose ps

# 5. Access the system (wait 30 seconds for startup)
# Frontend: http://localhost:3000
# API Gateway: http://localhost:3001
# API Documentation: http://localhost:3001/api-docs
# Database Studio: npm run db:studio
```

### Alternative: Local Development (No Docker)

```bash
# Prerequisites: PostgreSQL and Redis must be running locally

# 1. Install dependencies for all services
npm install

# 2. Create databases for each service
psql -U postgres -c "CREATE DATABASE medical_coverage_core;"
psql -U postgres -c "CREATE DATABASE medical_coverage_billing;"
psql -U postgres -c "CREATE DATABASE medical_coverage_finance;"
# ... create remaining 8 databases

# 3. Run database migrations
npm run db:push:all

# 4. Start all services in development mode
npm run dev:all

# Alternative: Start individual services
npm run dev:gateway  # API Gateway (port 3001)
npm run dev:core     # Core Service (port 3003)
npm run dev:client   # Frontend (port 5173)
npm run dev:fraud    # Fraud Detection (port 5009)
```

### Verify Installation

```bash
# Check services are running
curl http://localhost:3001/health

# Verify frontend is accessible
curl http://localhost:3000 | head -20

# Verify database connections
npm run db:studio  # Opens Drizzle Studio

# View logs from all services
docker-compose logs -f
```

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx (80/443)                        │
│                     Reverse Proxy & SSL                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                     API Gateway (3001)                       │
│              Request Routing • Auth • Rate Limiting          │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                  Microservices Network                       │
├─────────────┬─────────────┬─────────────┬────────────────────┤
│   Core      │   Finance   │  Billing    │       CRM          │
│   (3003)    │   (3004)    │   (3002)    │     (3005)         │
├─────────────┼─────────────┼─────────────┼────────────────────┤
│ Membership  │  Hospital   │  Insurance  │     Wellness       │
│   (3006)    │   (3007)    │   (3008)    │     (3009)         │
├─────────────┴─────────────┴─────────────┴────────────────────┤
│   Claims (3010) • Fraud Detection (5009) • Analytics (3009)  │
└─────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                     Data Layer                               │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL (11 Databases)  │  Redis (Cache/Sessions)       │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Principles

1. **Microservices Architecture**
   - 10 independent services + 1 API Gateway
   - Each service owns its domain and database
   - Services communicate via REST APIs
   - Async communication via Redis pub/sub (for future events)

2. **Database Per Service**
   - Data isolation and security
   - Independent scaling
   - Fault isolation
   - Team autonomy

3. **API-First Design**
   - RESTful APIs with JSON
   - OpenAPI/Swagger documentation
   - Versioning support
   - Authentication via JWT

4. **Cloud-Native**
   - Docker containerization
   - Kubernetes-ready
   - 12-factor compliance
   - Horizontal scalability

### Service Responsibilities

| Service | Port | Domain | Key Responsibilities |
|---------|------|--------|----------------------|
| **API Gateway** | 3001 | Cross-cutting | Routing, Auth, Rate limiting, Load balancing |
| **Core** | 3003 | Members & Companies | Member profiles, company management, member cards |
| **Finance** | 3004 | Financial Operations | Premium billing, ledger, saga pattern orchestration |
| **Billing** | 3002 | Invoicing & Payments | Invoice generation, payment processing |
| **CRM** | 3005 | Sales & Lead Management | Lead management, agent commission tracking |
| **Membership** | 3006 | Enrollment & Renewals | Member enrollment, plan renewals, benefits |
| **Hospital** | 3007 | Hospital Management | Hospital data, network management |
| **Insurance** | 3008 | Policies & Underwriting | Policy creation, underwriting decisions |
| **Wellness** | 3009 | Health Programs | Wellness programs, health incentives |
| **Fraud Detection** | 5009 | Risk & Compliance | Fraud analysis, anomaly detection, risk scoring |
| **Claims** | 3010 | Claims Processing | Claim submission, approval, payment (Phase 3) |
| **Analytics** | 3009 | Monitoring & Metrics | Event collection, aggregation, business metrics (Phase 4) |

### Data Flow Architecture

```
Client Request Flow:
1. User Request → Nginx (80/443)
2. Nginx → API Gateway (3001) [SSL termination]
3. API Gateway → [Auth Check, Rate Limit, Validation]
4. API Gateway → Target Microservice (3002-3010, 5009)
5. Microservice → PostgreSQL Database [Service-specific]
6. Microservice → Response to API Gateway
7. API Gateway → Response to Client

Inter-Service Communication:
- Service A → HTTP Call to Service B (via API Gateway or direct)
- Service A → Publishes Event via Redis
- Service B → Subscribes to Event via Redis
- Services don't access other services' databases directly

Real-time Updates (Analytics):
- Service → POST to Analytics Service (/api/analytics/events)
- Analytics Service → Buffers & stores events
- Aggregation Service → Pre-computes hourly/daily metrics
- Dashboard → Queries aggregated metrics for display
```

### Technology Stack Details

#### Frontend (Client)
- **React 18.2+**: Modern UI framework with hooks
- **TypeScript 5.x**: Type-safe development
- **Vite 4.x**: Fast build tool and dev server
- **Tailwind CSS 3.x**: Utility-first CSS framework
- **Radix UI 1.x**: Accessible component library
- **React Query 3.x**: Server state management
- **Wouter**: Lightweight client-side routing
- **Axios**: HTTP client for API calls
- **Zod**: Schema validation

#### Backend (Services)
- **Node.js 18.x+**: JavaScript runtime
- **Express 4.x**: Web framework
- **TypeScript 5.x**: Type-safe backend
- **Drizzle ORM 0.27+**: Type-safe database ORM
- **PostgreSQL 15**: Primary database
- **Redis 7**: Caching & sessions
- **Zod**: Runtime validation
- **Pino**: Structured logging
- **JWT**: Token-based authentication

#### Infrastructure
- **Docker 20.10+**: Containerization
- **Docker Compose 1.29+**: Container orchestration
- **Nginx 1.23+**: Reverse proxy & load balancing
- **PostgreSQL 15-alpine**: Optimized database image
- **Redis 7-alpine**: Optimized cache image

### Service Interaction Patterns

#### 1. Synchronous Communication (REST)
```typescript
// Service A calls Service B
const response = await fetch(
  'http://core-service:3003/api/members/123',
  { 
    headers: { 'Authorization': `Bearer ${token}` },
    timeout: 5000
  }
);
```

#### 2. Asynchronous Communication (Event-based - Future)
```typescript
// Service publishes event
await redis.publish('member.created', JSON.stringify({
  memberId: '123',
  timestamp: new Date()
}));

// Service subscribes to event
redis.subscribe('member.created', (message) => {
  // Handle event
});
```

#### 3. Saga Pattern (Distributed Transactions - Phase 3)
```
Client Request → Finance Service (Saga Orchestrator)
  ├── Step 1: Create Transaction → Finance DB
  ├── Step 2: Call Billing Service → Process Invoice
  ├── Step 3: Call Payment Service → Process Payment
  ├── Step 4: Call Claims Service → Create Claim
  └── Compensate if any step fails (rollback)
```

---

## 🛠 Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| Tailwind CSS | Styling |
| Radix UI | Component Library |
| React Query | Data Fetching |
| Wouter | Routing |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express | Web Framework |
| TypeScript | Type Safety |
| Drizzle ORM | Database ORM |
| Zod | Validation |
| Winston | Logging |
| JWT | Authentication |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| PostgreSQL 15 | Primary Database |
| Redis 7 | Caching & Sessions |
| Docker | Containerization |
| Nginx | Reverse Proxy |
| Vercel | Frontend Hosting |
| Neon | Serverless PostgreSQL |

---

## 📦 Microservices

### Service Overview

| Service | Port | Database | Responsibility |
|---------|------|----------|----------------|
| **API Gateway** | 3001 | api_gateway | Routing, Auth, Rate Limiting |
| **Billing** | 3002 | medical_coverage_billing | Invoicing, Payments |
| **Core** | 3003 | medical_coverage_core | Members, Companies, Cards |
| **Finance** | 3004 | medical_coverage_finance | Premiums, Ledger |
| **CRM** | 3005 | medical_coverage_crm | Leads, Agents, Commissions |
| **Membership** | 3006 | medical_coverage_membership | Enrollment, Renewals |
| **Hospital** | 3007 | medical_coverage_hospital | Hospital Data, Integrations |
| **Insurance** | 3008 | medical_coverage_insurance | Policies, Underwriting |
| **Wellness** | 3009 | medical_coverage_wellness | Health Programs |
| **Fraud Detection** | 5009 | medical_coverage_fraud_detection | Fraud Analysis |
| **Claims** | 3010 | medical_coverage_claims | Claims Processing |

### Service Communication

```typescript
// Inter-service communication pattern
const response = await fetch('http://core-service:3003/api/members/123', {
  headers: { 'Authorization': `Bearer ${serviceToken}` }
});

// Event-driven communication via Redis
redis.publish('member.created', JSON.stringify({ memberId: '123' }));
```

---

## 🗄️ Database Management

### Multi-Database Architecture

Each service has its own PostgreSQL database for:
- **Data Isolation**: Security and compliance
- **Independent Scaling**: Scale databases based on service load
- **Fault Isolation**: Database issues don't cascade
- **Team Autonomy**: Services own their data schema

### Database Commands

```bash
# Run all migrations
npm run db:push:all

# Run specific service migration
npm run db:push:core
npm run db:push:billing

# Open Drizzle Studio
npm run db:studio

# Seed database
npm run db:seed
```

### Connection Strings

```bash
# Docker Environment
DATABASE_URL=postgresql://postgres:password@postgres:5432/database_name

# Production (Neon)
DATABASE_URL=postgresql://user:pass@host.database.neon.tech/database_name?sslmode=require
```

---

## 💻 Development Guide

### Project Structure

```
MedicalCoverageSystem/
├── client/                          # React Frontend (Vite)
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── common/              # Global components (Navbar, Footer)
│   │   │   ├── layout/              # Layout components
│   │   │   ├── features/            # Feature-specific components
│   │   │   └── ui/                  # Radix UI custom components
│   │   ├── pages/                   # Page components (routing)
│   │   │   ├── member/              # Member management pages
│   │   │   ├── claims/              # Claims pages
│   │   │   ├── admin/               # Admin pages
│   │   │   └── ...                  # Other feature pages
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useAuth              # Authentication
│   │   │   ├── useApi               # API calls
│   │   │   └── useForm              # Form management
│   │   ├── services/                # API client services
│   │   │   ├── api.ts               # Axios instance & config
│   │   │   ├── authService.ts       # Authentication endpoints
│   │   │   ├── memberService.ts     # Member endpoints
│   │   │   └── ...                  # Service endpoints per feature
│   │   ├── lib/                     # Utilities & helpers
│   │   │   ├── utils.ts             # General utilities
│   │   │   ├── formatters.ts        # Data formatting
│   │   │   └── validators.ts        # Input validation
│   │   ├── types/                   # TypeScript types
│   │   ├── context/                 # React Context (global state)
│   │   ├── App.tsx                  # Root component
│   │   └── main.tsx                 # Entry point
│   ├── index.html                   # HTML template
│   ├── package.json                 # Dependencies
│   ├── tsconfig.json                # TypeScript config
│   └── vite.config.ts               # Vite configuration
│
├── services/                        # Microservices
│   ├── api-gateway/                 # Request routing & auth
│   │   ├── src/
│   │   │   ├── index.ts             # Express app setup
│   │   │   ├── routes/              # Route handlers
│   │   │   ├── middleware/          # Auth, logging, validation
│   │   │   └── utils/               # Helper functions
│   │   └── package.json
│   │
│   ├── core-service/                # Member & company management
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── modules/             # Feature modules
│   │   │   │   ├── members/
│   │   │   │   ├── companies/
│   │   │   │   └── cards/
│   │   │   ├── services/            # Business logic
│   │   │   ├── api/                 # REST endpoints
│   │   │   └── types/               # Domain types
│   │   └── package.json
│   │
│   ├── finance-service/             # Billing & payments
│   ├── billing-service/             # Invoicing
│   ├── crm-service/                 # Sales & leads
│   ├── membership-service/          # Enrollment & renewals
│   ├── hospital-service/            # Hospital data
│   ├── insurance-service/           # Policies
│   ├── wellness-service/            # Health programs
│   ├── fraud-detection-service/     # Fraud analysis (port 5009)
│   ├── claims-service/              # Claims processing
│   └── analytics-service/           # Metrics & analytics (port 3009)
│
├── shared/                          # Shared code & schemas
│   ├── schema.ts                    # Database schemas (Drizzle)
│   ├── types.ts                     # Shared TypeScript types
│   ├── validators.ts                # Validation schemas
│   └── utils.ts                     # Shared utilities
│
├── config/                          # Configuration files
│   ├── drizzle.*.config.ts          # Drizzle configs per service
│   └── ...
│
├── scripts/                         # Automation & utilities
│   ├── docker-start.sh              # Docker startup
│   ├── deploy-production.sh         # Deployment script
│   ├── verify-connections.sh        # Connection verification
│   └── ...
│
├── docs/                            # Documentation
│   ├── api/                         # API documentation
│   ├── architecture/                # Architecture diagrams
│   ├── implementation/              # Implementation guides
│   ├── testing/                     # Testing guides
│   ├── user-guides/                 # End-user documentation
│   └── ui-integration/              # UI integration notes
│
├── database/                        # Database setup scripts
│   ├── init/                        # Initialization scripts
│   └── scripts/                     # Maintenance scripts
│
├── tests/                           # Test suites
│   ├── unit/                        # Unit tests
│   ├── integration/                 # Integration tests
│   └── e2e/                         # End-to-end tests
│
├── docker-compose.yml               # Docker Compose config
├── package.json                     # Root npm config
├── tsconfig.json                    # Root TypeScript config
├── DOCUMENTATION.md                 # THIS FILE (Single Source of Truth)
└── README.md                        # Quick overview
```

### Code Organization Standards

#### Service Structure
Each microservice follows this pattern:
```
src/
├── index.ts                  # Express app initialization & startup
├── config/                   # Service configuration
├── middleware/               # Express middleware (auth, logging, validation)
├── modules/                  # Feature modules (DDD approach)
│   └── [feature]/
│       ├── module.ts        # Module definition & setup
│       ├── routes/          # Express routes for feature
│       ├── services/        # Business logic
│       ├── types/           # Feature-specific types
│       └── validators/      # Input validation
├── services/                # Cross-cutting services
│   ├── Database.ts          # Database connection
│   ├── Logger.ts            # Logging
│   └── ...                  # Other services
├── api/                     # REST endpoint definitions
├── types/                   # Global service types
└── utils/                   # Utility functions
```

#### Component Structure (Frontend)
```
components/
├── ComponentName/
│   ├── ComponentName.tsx    # Component logic
│   ├── ComponentName.module.css  # Styling
│   ├── types.ts             # Component prop types
│   ├── hooks.ts             # Component-specific hooks
│   └── __tests__/           # Component tests
```

### Development Workflow

#### 1. Adding a New Feature

**Step 1: Create/Update Schema**
```bash
# Edit shared/schema.ts to add new tables/columns
# Using Drizzle ORM schema definition

nano shared/schema.ts
```

**Step 2: Create Database Migration**
```bash
# Run migration for the service
npm run db:push:core  # For core service
npm run db:push:finance  # For finance service
```

**Step 3: Create Service Module**
```typescript
// services/core-service/src/modules/newfeature/module.ts
export class NewFeatureModule implements IModule {
  async initialize(app: Express): Promise<void> {
    // Initialize module
    app.use('/api/newfeature', newFeatureRoutes());
  }
}
```

**Step 4: Add API Routes**
```typescript
// services/core-service/src/modules/newfeature/routes/index.ts
export function newFeatureRoutes(router: Router) {
  router.get('/', async (req, res) => { /* ... */ });
  router.post('/', async (req, res) => { /* ... */ });
  return router;
}
```

**Step 5: Implement Business Logic**
```typescript
// services/core-service/src/modules/newfeature/services/NewFeatureService.ts
export class NewFeatureService {
  async create(data: CreateInput): Promise<Result> {
    // Business logic
  }
}
```

**Step 6: Add Frontend Component**
```typescript
// client/src/components/features/NewFeature.tsx
export function NewFeatureComponent() {
  const [data, setData] = useState(null);
  useEffect(() => {
    // Call API
  }, []);
  return <div>{/* UI */}</div>;
}
```

**Step 7: Write Tests**
```bash
# Add unit tests
npm run test:unit

# Add integration tests
npm run test:integration

# Add E2E tests (optional)
npm run test:e2e
```

**Step 8: Document Changes**
```bash
# Update DOCUMENTATION.md with new endpoints/features
# Update API_REFERENCE.md if endpoints changed
# Add examples to docs/
```

#### 2. Adding a New Microservice

```bash
# 1. Create service directory
mkdir services/new-service
cd services/new-service

# 2. Initialize npm package
npm init -y

# 3. Create directory structure
mkdir -p src/{modules,services,api,config}

# 4. Create src/index.ts (express app)
# 5. Create service-specific drizzle config
# 6. Add service to root package.json scripts
# 7. Update docker-compose.yml with new service
# 8. Update API Gateway routes
# 9. Document in DOCUMENTATION.md
```

### Running Development Tasks

```bash
# Development mode (auto-reload)
npm run dev:all           # All services + frontend
npm run dev:gateway       # Just API Gateway
npm run dev:core          # Just Core Service
npm run dev:client        # Just Frontend

# Production builds
npm run build:all         # Build everything
npm run build:client      # Build frontend only
npm run build:services    # Build all services

# Database operations
npm run db:push:all       # Run all migrations
npm run db:push:core      # Run specific migration
npm run db:studio         # Open Drizzle Studio (database GUI)
npm run db:seed           # Seed test data

# Testing
npm run test:all          # Run all tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:e2e          # E2E tests only
npm run test:watch        # Watch mode

# Code quality
npm run lint              # Run ESLint
npm run format            # Run Prettier
npm run type:check        # TypeScript check

# Docker operations
docker-compose up -d      # Start all services
docker-compose down       # Stop all services
docker-compose logs -f    # View logs
docker-compose ps         # Show status
```

### Code Style & Standards

#### TypeScript
- **Strict Mode**: Always enabled (`strict: true` in tsconfig.json)
- **No Implicit Any**: `noImplicitAny: true`
- **Null Checks**: `strictNullChecks: true`
- **Type Exports**: Always export types from modules

#### Naming Conventions
```typescript
// Files
- PascalCase for components: UserProfile.tsx
- camelCase for utilities: formatDate.ts
- snake_case for database tables: user_profiles
- kebab-case for directories: user-profile

// Code
- camelCase for variables & functions: const userName
- PascalCase for classes: class UserService
- UPPER_SNAKE_CASE for constants: const API_TIMEOUT
- Prefix booleans with 'is': isActive, hasAccess
- Prefix event handlers with 'on': onClick, onSubmit
```

#### Comments
```typescript
// Single-line comments
/// Triple-slash for documentation comments
/**
 * Multi-line documentation comments
 * explain the purpose and usage
 */
```

#### Error Handling
```typescript
// Always handle errors
try {
  const result = await operation();
} catch (error) {
  logger.error('Operation failed', { error, context });
  throw new ApiError('User-friendly message', statusCode);
}

// Validate inputs
const schema = z.object({ email: z.string().email() });
const validated = schema.parse(input);
```

### Environment Configuration

Create `.env` file in root directory:

```bash
# Frontend
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# API Gateway
PORT=3001
JWT_SECRET=your-secret-key
JWT_EXPIRE=24h
RATE_LIMIT=100  # requests per minute

# Services
CORE_SERVICE_URL=http://core-service:3003
FINANCE_SERVICE_URL=http://finance-service:3004
# ... other services

# Database (Docker)
DATABASE_URL=postgresql://postgres:password@postgres:5432

# Redis
REDIS_URL=redis://redis:6379

# Email Service (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password

# Payment Gateway (Optional)
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLIC_KEY=pk_...

# Analytics (Optional)
ANALYTICS_DATABASE_URL=postgresql://postgres:password@postgres:5432/analytics
```

### Common Development Tasks

#### Debugging a Service
```bash
# 1. Enable debug mode
DEBUG=* npm run dev:core

# 2. Use Chrome DevTools
node --inspect-brk node_modules/.bin/ts-node src/index.ts

# 3. Check logs
docker-compose logs -f core-service

# 4. Connect to database directly
npm run db:studio
```

#### Adding Database Columns
```typescript
// 1. Update schema in shared/schema.ts
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: varchar('email').notNull(),
  newColumn: varchar('new_column'),  // Add this
});

// 2. Run migration
npm run db:push:core

// 3. Update TypeScript types
// 4. Update API endpoints
// 5. Update frontend components
```

#### Testing API Endpoints
```bash
# Using curl
curl -X POST http://localhost:3001/api/members \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe"}'

# Using REST Client (VS Code extension)
# Create test.http file with requests
POST http://localhost:3001/api/members
Content-Type: application/json

{
  "name": "John Doe"
}

# Using Postman
# Import docs/MedicalCoverageSystemAPI.postman_collection.json
```

#### Making Database Queries
```typescript
// Using Drizzle ORM
import { db } from './database';
import { users } from '../schema';

// Query
const allUsers = await db.select().from(users);
const filtered = await db.select().from(users).where(eq(users.email, 'test@example.com'));

// Insert
await db.insert(users).values({ email: 'new@example.com' });

// Update
await db.update(users).set({ name: 'New Name' }).where(eq(users.id, '123'));

// Delete
await db.delete(users).where(eq(users.id, '123'));
```

---

## 🚀 Deployment

### Docker Deployment (Recommended)

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild specific service
docker-compose up -d --no-deps --build billing-service
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd client && vercel --prod

# Deploy serverless functions
cd server && vercel --prod
```

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] Health checks passing
- [ ] Rate limiting configured
- [ ] CORS settings updated

---

## 📡 API Reference

### Base URLs
```
Development:  http://localhost:3001/api
Staging:      https://staging-api.yourdomain.com/api
Production:   https://api.yourdomain.com/api
```

### Authentication

All endpoints require JWT token (except `/auth/login`):

```bash
# Get authentication token
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}

# Response
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "role": "admin"
  }
}

# Use token in requests
Authorization: Bearer <token>
```

### Core Service APIs

#### Members Management
```
GET    /api/members                    # List all members
GET    /api/members/:id                # Get member details
POST   /api/members                    # Create new member
PUT    /api/members/:id                # Update member
DELETE /api/members/:id                # Delete member
GET    /api/members/:id/cards          # List member's cards
POST   /api/members/:id/cards          # Issue new card
GET    /api/members/:memberId/policies # List policies
```

**Example Requests:**

```bash
# List members (paginated)
GET /api/members?page=1&limit=20&sort=name&order=asc

# Get member
GET /api/members/123

# Create member
POST /api/members
Content-Type: application/json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "dateOfBirth": "1985-01-15",
  "address": "123 Main St"
}

# Update member
PUT /api/members/123
Content-Type: application/json
{
  "firstName": "Jane"
}
```

#### Companies Management
```
GET    /api/companies                  # List companies
GET    /api/companies/:id              # Get company details
POST   /api/companies                  # Create company
PUT    /api/companies/:id              # Update company
DELETE /api/companies/:id              # Delete company
GET    /api/companies/:id/members      # List company members
```

### Claims Service APIs

```
GET    /api/claims                     # List claims
GET    /api/claims/:id                 # Get claim details
POST   /api/claims                     # Submit claim
PUT    /api/claims/:id                 # Update claim
POST   /api/claims/:id/submit          # Submit for processing
POST   /api/claims/:id/approve         # Approve claim
POST   /api/claims/:id/reject          # Reject claim
GET    /api/claims/:id/documents       # List claim documents
POST   /api/claims/:id/documents       # Upload document
```

**Example: Submit Claim**

```bash
POST /api/claims
Content-Type: application/json

{
  "memberId": "123",
  "providerId": "456",
  "claimType": "inpatient",
  "amount": 5000.00,
  "currency": "USD",
  "diagnosis": "Appendicitis",
  "dateOfService": "2026-04-15",
  "description": "Emergency surgery"
}
```

### Billing Service APIs

```
GET    /api/invoices                   # List invoices
GET    /api/invoices/:id               # Get invoice details
POST   /api/invoices                   # Create invoice
PUT    /api/invoices/:id               # Update invoice
POST   /api/invoices/:id/pay           # Process payment
GET    /api/payments                   # List payments
GET    /api/payments/:id               # Get payment details
POST   /api/payments/:id/refund        # Refund payment
```

**Example: Process Payment**

```bash
POST /api/invoices/INV-001/pay
Content-Type: application/json

{
  "amount": 500.00,
  "paymentMethod": "credit_card",
  "cardToken": "tok_visa"
}
```

### Finance Service APIs (Phase 3)

```
GET    /api/transactions               # List transactions
GET    /api/transactions/:id           # Get transaction
POST   /api/sagas                      # Start saga transaction
GET    /api/sagas/:sagaId              # Get saga status
POST   /api/sagas/:sagaId/recover      # Recover failed saga
GET    /api/ledger                     # Get ledger entries
```

### Fraud Detection Service APIs

```
GET    /api/fraud/rules                # List fraud rules
GET    /api/fraud/rules/:id            # Get rule details
POST   /api/fraud/rules                # Create rule
PUT    /api/fraud/rules/:id            # Update rule
POST   /api/fraud/analyze              # Analyze for fraud
GET    /api/fraud/alerts               # Get fraud alerts
```

### Analytics Service APIs

```
GET    /api/analytics/health           # Service health
POST   /api/analytics/events           # Record events
GET    /api/analytics/events           # Query events
GET    /api/analytics/events/:correlationId  # Get saga trace
GET    /api/analytics/metrics          # Get metrics
GET    /api/analytics/claims           # Claims analytics
GET    /api/analytics/payments         # Payments analytics
GET    /api/analytics/sagas            # Sagas analytics
GET    /api/analytics/services         # Service health
GET    /api/analytics/summary          # Executive summary
```

### Common Response Formats

**Success Response:**
```json
{
  "success": true,
  "data": { /* resource data */ },
  "meta": {
    "timestamp": "2026-04-20T10:30:00Z",
    "requestId": "req-123-abc"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [
      {
        "field": "email",
        "message": "Required"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-04-20T10:30:00Z",
    "requestId": "req-123-abc"
  }
}
```

**Paginated Response:**
```json
{
  "success": true,
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created |
| 204 | No Content - Success, no response body |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Business logic violation |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limited |
| 500 | Server Error - Internal error |
| 503 | Service Unavailable - Service down |

### API Documentation

For interactive API documentation:
```
Development:  http://localhost:3001/api-docs
Production:   https://api.yourdomain.com/api-docs
```

**Postman Collection**: Available at `docs/MedicalCoverageSystemAPI.postman_collection.json`

To import in Postman:
1. Open Postman
2. Click "Import"
3. Upload `docs/MedicalCoverageSystemAPI.postman_collection.json`
4. Set environment variables
5. Start testing

---

## 🔒 Security & Compliance

### Authentication
- **JWT Tokens**: Stateless authentication
- **Refresh Tokens**: Token rotation
- **Role-Based Access**: Admin, Provider, Member roles
- **API Keys**: Service-to-service authentication

### Data Protection
- **Encryption**: TLS 1.3 for all connections
- **Data Masking**: Sensitive data protection
- **Audit Logging**: All actions logged
- **Rate Limiting**: DDoS protection

### Compliance
- **HIPAA**: Healthcare data protection
- **GDPR**: Data privacy compliance
- **PCI DSS**: Payment card security
- **SOC 2**: Security controls

### Security Headers

```nginx
# Nginx configuration
add_header Strict-Transport-Security "max-age=31536000" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Content-Security-Policy "default-src 'self'" always;
```

---

## 📊 Monitoring & Operations

### Health Checks

```bash
# Check all services
curl http://localhost:3001/health

# Check specific service
curl http://localhost:3002/health  # Billing
curl http://localhost:3003/health  # Core
```

### Logging

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api-gateway

# Search logs
docker-compose logs -f --tail=100 | grep "error"
```

### Metrics

Key metrics to monitor:
- **Response Time**: Target < 500ms
- **Error Rate**: Target < 0.1%
- **Availability**: Target > 99.9%
- **Concurrent Users**: Monitor peak usage

### Alerting

Configure alerts for:
- Service downtime
- High error rates
- Database connection issues
- Memory/CPU usage
- Disk space

---

## 🔌 Integration Status

### Current Module Integration Overview

| Component | Status | Details | Last Updated |
|-----------|--------|---------|--------------|
| **API Gateway** | ✅ Ready | All routes configured, auth working | Apr 20, 2026 |
| **Core Service** | ✅ Ready | Member mgmt, companies, cards | Apr 20, 2026 |
| **Billing Service** | ✅ Ready | Invoices, payment processing | Apr 20, 2026 |
| **Finance Service** | ✅ Ready | Premium billing, ledger, Phase 3 saga support | Apr 20, 2026 |
| **CRM Service** | ✅ Ready | Lead management, commission tracking | Apr 20, 2026 |
| **Membership Service** | ✅ Ready | Enrollment, renewals, benefits | Apr 20, 2026 |
| **Hospital Service** | ✅ Ready | Hospital data, network management | Apr 20, 2026 |
| **Insurance Service** | ✅ Ready | Policies, underwriting | Apr 20, 2026 |
| **Wellness Service** | ✅ Ready | Wellness programs, incentives | Apr 20, 2026 |
| **Fraud Detection** | ✅ Ready | Risk analysis, anomaly detection (Phase 1) | Apr 20, 2026 |
| **Claims Service** | ✅ Ready | Claim processing, submission (Phase 3) | Apr 20, 2026 |
| **Analytics Service** | ✅ Ready | Event collection, aggregation, metrics (Phase 4) | Apr 20, 2026 |
| **Frontend Components** | ✅ Ready | All UI components integrated with APIs | Apr 20, 2026 |
| **Database Migrations** | ✅ Ready | All service schemas deployed | Apr 20, 2026 |
| **Authentication** | ✅ Ready | JWT-based, role-based access control | Apr 20, 2026 |
| **Error Recovery** | ✅ Ready | Phase 2 recovery pattern implemented | Apr 20, 2026 |
| **Saga Pattern** | ✅ Ready | Phase 3 distributed transactions (Finance) | Apr 20, 2026 |

### Detailed Integration Verification

#### Frontend Integration Status

| Feature | Status | Endpoint | Notes |
|---------|--------|----------|-------|
| Member Management | ✅ Ready | `/api/members` | Create, read, update, delete |
| Company Management | ✅ Ready | `/api/companies` | Company CRUD operations |
| Claims Submission | ✅ Ready | `/api/claims` | Submit and track claims |
| Invoice Management | ✅ Ready | `/api/invoices` | View and pay invoices |
| Card Management | ✅ Ready | `/api/members/:id/cards` | Issue and manage member cards |
| Authentication | ✅ Ready | `/api/auth` | Login, logout, token refresh |
| Fraud Detection | ✅ Ready | `/api/fraud/analyze` | Real-time fraud scoring |
| Analytics Dashboard | ✅ Ready | `/api/analytics/summary` | Real-time metrics display |

#### API Gateway Integration Status

| Route | Status | Target Service | Verified |
|-------|--------|-----------------|----------|
| `/api/members` | ✅ Ready | Core Service (3003) | Apr 20 |
| `/api/companies` | ✅ Ready | Core Service (3003) | Apr 20 |
| `/api/cards` | ✅ Ready | Core Service (3003) | Apr 20 |
| `/api/claims` | ✅ Ready | Claims Service (3010) | Apr 20 |
| `/api/invoices` | ✅ Ready | Billing Service (3002) | Apr 20 |
| `/api/payments` | ✅ Ready | Billing Service (3002) | Apr 20 |
| `/api/transactions` | ✅ Ready | Finance Service (3004) | Apr 20 |
| `/api/sagas` | ✅ Ready | Finance Service (3004) | Apr 20 |
| `/api/leads` | ✅ Ready | CRM Service (3005) | Apr 20 |
| `/api/providers` | ✅ Ready | Hospital Service (3007) | Apr 20 |
| `/api/policies` | ✅ Ready | Insurance Service (3008) | Apr 20 |
| `/api/wellness` | ✅ Ready | Wellness Service (3009) | Apr 20 |
| `/api/fraud` | ✅ Ready | Fraud Detection (5009) | Apr 20 |
| `/api/analytics` | ✅ Ready | Analytics Service (3009) | Apr 20 |
| `/api/auth` | ✅ Ready | API Gateway | Apr 20 |

#### Database Integration Status

| Service | Database | Tables | Migrations | Status |
|---------|----------|--------|-----------|--------|
| Core | medical_coverage_core | 15+ | ✅ Applied | ✅ Ready |
| Billing | medical_coverage_billing | 8+ | ✅ Applied | ✅ Ready |
| Finance | medical_coverage_finance | 12+ | ✅ Applied | ✅ Ready |
| CRM | medical_coverage_crm | 10+ | ✅ Applied | ✅ Ready |
| Membership | medical_coverage_membership | 8+ | ✅ Applied | ✅ Ready |
| Hospital | medical_coverage_hospital | 6+ | ✅ Applied | ✅ Ready |
| Insurance | medical_coverage_insurance | 10+ | ✅ Applied | ✅ Ready |
| Wellness | medical_coverage_wellness | 8+ | ✅ Applied | ✅ Ready |
| Fraud | medical_coverage_fraud_detection | 8+ | ✅ Applied | ✅ Ready |
| Claims | medical_coverage_claims | 10+ | ✅ Applied | ✅ Ready |
| Analytics | medical_coverage_analytics | 7 | ✅ Applied | ✅ Ready |

#### Service-to-Service Communication Status

| Communication | Pattern | Status | Details |
|---------------|---------|--------|---------|
| Core ↔ Finance | REST | ✅ Ready | Transaction management |
| Finance ↔ Billing | REST | ✅ Ready | Invoice creation |
| Billing ↔ Payment Gateway | REST | ✅ Ready | Payment processing |
| Claims ↔ Finance | REST | ✅ Ready | Saga pattern (Phase 3) |
| Finance ↔ Analytics | HTTP POST | ✅ Ready | Event collection |
| All Services ↔ Analytics | HTTP POST | ✅ Ready | Metrics collection |
| Services ↔ Redis | Pub/Sub | 🟡 Ready | Event-based (future use) |

### Known Issues & Resolutions

| Issue | Status | Resolution |
|-------|--------|-----------|
| Service startup order | ✅ Fixed | Docker Compose handles dependencies |
| Database connection pooling | ✅ Fixed | Configured in each service |
| JWT token expiration | ✅ Fixed | Refresh token endpoint working |
| CORS configuration | ✅ Fixed | API Gateway handles CORS headers |
| Rate limiting | ✅ Configured | 100 req/min per IP |
| Error handling | ✅ Complete | Structured error responses across services |
| Logging & monitoring | ✅ Configured | Pino logging with correlation IDs |
| Request validation | ✅ Complete | Zod schemas on all endpoints |

### Integration Checklist for New Developers

When adding a new feature, verify:

- [ ] Service database migrations run successfully: `npm run db:push:[service]`
- [ ] Service starts without errors: `npm run dev:[service]`
- [ ] API Gateway has route configured: Check `services/api-gateway/src/routes/`
- [ ] Frontend component calls correct endpoint
- [ ] Error handling is consistent with other services
- [ ] Authentication check is in place (JWT token validation)
- [ ] Database schema matches TypeScript types
- [ ] Unit tests passing: `npm run test:unit`
- [ ] Integration tests passing: `npm run test:integration`
- [ ] API documentation updated: Comment in route handler
- [ ] DOCUMENTATION.md updated with new endpoints

### Common Integration Patterns

#### Pattern 1: CRUD Endpoint Integration

```typescript
// Backend (Express route)
router.get('/:id', async (req, res) => {
  const item = await service.getById(req.params.id);
  res.json({ success: true, data: item });
});

// Frontend (React component)
useEffect(() => {
  axios.get(`/api/resource/${id}`).then(res => {
    setData(res.data.data);
  });
}, [id]);
```

#### Pattern 2: Saga Integration (Phase 3)

```typescript
// Service A initiates saga
const saga = await sagaOrchestrator.executeSaga({
  type: 'claim_to_payment',
  steps: [
    { service: 'claims', action: 'create' },
    { service: 'billing', action: 'invoice' },
    { service: 'payment', action: 'process' }
  ]
});

// Finance Service coordinates
// Analytics Service logs events via correlation ID
```

#### Pattern 3: Analytics Event Collection

```typescript
// Any service can log events
await analyticsClient.post('/events', {
  events: [{
    eventType: 'claim_created',
    claimId: claim.id,
    correlationId: req.id,
    status: 'SUCCESS',
    source: 'claims-service'
  }]
});

// Query later
const metrics = await analyticsClient.get('/metrics?hoursBack=24');
```

### Testing Integration

```bash
# Test all integrations
npm run test:integration

# Test specific service integration
npm run test:integration -- claims-service

# Test E2E flow
npm run test:e2e

# Manual testing with curl
curl -X GET http://localhost:3001/api/members/123 \
  -H "Authorization: Bearer <token>"
```

### Monitoring Integration Health

```bash
# Health check all services
curl http://localhost:3001/health

# View logs for integration issues
docker-compose logs -f

# Check specific service
curl http://localhost:3003/health  # Core Service
curl http://localhost:3004/health  # Finance Service
curl http://localhost:3009/health  # Analytics Service
```

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U postgres -c "SELECT 1;"
```

#### Service Won't Start
```bash
# Check service logs
docker-compose logs [service-name]

# Verify environment variables
docker-compose exec [service-name] env | grep DATABASE

# Check port conflicts
lsof -i :3001
```

#### Migration Errors
```bash
# Reset database (development only!)
docker-compose down -v
docker-compose up -d postgres
npm run db:push:all

# Check migration status
npm run db:studio
```

#### Frontend Build Failures
```bash
# Clear cache
rm -rf client/node_modules client/dist
cd client && npm install

# Rebuild
npm run build:client
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run dev:all

# Verbose Docker logs
docker-compose --verbose up
```

---

## 🤝 Contributing

### Development Workflow

1. **Create Branch**
   ```bash
   git checkout -b feature/service/feature-name
   ```

2. **Make Changes**
   - Update code
   - Add tests
   - Update documentation

3. **Run Tests**
   ```bash
   npm run test:all
   npm run lint
   ```

4. **Commit Changes**
   ```bash
   git commit -m "feat(service): add new feature"
   ```

5. **Create Pull Request**
   - Describe changes
   - Link related issues
   - Request review

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Run before commit
- **Prettier**: Auto-format on save
- **Conventional Commits**: Standard format

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

## 📚 Additional Resources

### Documentation
- [API Documentation](./API_REFERENCE.md)
- [Architecture Details](./SYSTEM_ARCHITECTURE.md)
- [Deployment Guide](./SETUP_AND_DEPLOYMENT.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)

### External Links
- [React Documentation](https://react.dev)
- [Node.js Documentation](https://nodejs.org)
- [PostgreSQL Documentation](https://postgresql.org)
- [Docker Documentation](https://docker.com)

### Support
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Community support
- **Email**: support@yourdomain.com

---

## 📄 License

MIT License - See LICENSE file for details.

---

**Built with ❤️ using modern web technologies and microservices architecture**

*This is the single source of truth for the Medical Coverage System. All other documentation should reference this document.*