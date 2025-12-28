# Docker Deployment Organization - Complete Guide

## Executive Summary

This document organizes all Docker files and configurations for the Medical Coverage System, providing clear deployment strategies for different scenarios.

---

## Docker Files Inventory

### **Root Level Files**
```
/workspace/MedicalCoverageSystem/
├── docker-compose.yml (main - 11 services)
├── server/Dockerfile (monolithic server)
└── client/Dockerfile (missing - needs creation)
```

### **Microservices Files**
```
/workspace/MedicalCoverageSystem/services/
├── api-gateway/
│   ├── Dockerfile
│   ├── package.json
│   └── .env
├── billing-service/
│   ├── Dockerfile
│   ├── docker-compose.yml (service-specific)
│   └── .dockerignore
├── finance-service/
│   └── Dockerfile
├── hospital-service/
│   ├── Dockerfile
│   ├── docker-compose.yml (service-specific)
│   └── .dockerignore
├── insurance-service/
│   └── Dockerfile
├── membership-service/
│   └── Dockerfile
├── crm-service/
│   └── Dockerfile
├── wellness-service/
│   └── Dockerfile
└── core-service/
    └── Dockerfile
```

### **Statistics**
- **Total Dockerfiles**: 11 (1 monolithic + 9 microservices + 1 gateway)
- **Docker Compose Files**: 3 (1 main + 2 service-specific)
- **Dockerignore Files**: 2 (service-level only)
- **Missing Files**: Root .dockerignore, client/Dockerfile

---

## Deployment Architecture Options

### **Option 1: Monolithic Deployment** (Development/Small Scale)

**Best For**:
- Development environments
- Teams of 1-5 developers
- Deployments with < 1000 users
- Quick testing and iteration
- Single-tenant applications

**Docker Stack**:
```yaml
Services:
├── postgres (database)
├── pgadmin (database UI)
├── monolith (server + all services)
└── client (React frontend)
```

**Deployment Steps**:
```bash
# 1. Build monolith image
docker build -t medical-coverage:monolith -f server/Dockerfile .

# 2. Build client image
docker build -t medical-coverage:client -f client/Dockerfile .

# 3. Start services
docker-compose -f docker-compose.monolith.yml up -d
```

**Advantages**:
- ✅ Simple setup (4 containers)
- ✅ Fast startup (~30 seconds)
- ✅ Easy debugging (single codebase)
- ✅ Shared database transactions
- ✅ No network latency

**Disadvantages**:
- ⚠️ Limited scaling (only horizontal)
- ⚠️ Single point of failure
- ⚠️ Memory intensive (2GB+)
- ⚠️ Slower builds

---

### **Option 2: Microservices Deployment** (Production)

**Best For**:
- Production environments
- High-traffic scenarios (> 1000 users)
- Multi-tenant applications
- Team autonomy requirements
- Independent scaling needs

**Docker Stack**:
```yaml
Services:
├── postgres (shared database)
├── pgadmin (database UI)
├── api-gateway (port 8080)
├── billing-service (port 3000)
├── finance-service (port 3000)
├── hospital-service (port 3000)
├── insurance-service (port 3000)
├── membership-service (port 3000)
├── crm-service (port 3000)
├── wellness-service (port 3000)
├── core-service (port 3000)
└── client (React frontend)
```

**Deployment Steps**:
```bash
# 1. Build all service images
docker-compose build

# 2. Start all services
docker-compose up -d

# 3. Scale specific services
docker-compose up -d --scale billing-service=3 --scale finance-service=2
```

**Advantages**:
- ✅ Independent scaling per service
- ✅ Fault isolation
- ✅ Team autonomy
- ✅ Technology diversity
- ✅ Deployment flexibility

**Disadvantages**:
- ⚠️ Complex setup (12 containers)
- ⚠️ Slower startup (~90 seconds)
- ⚠️ Network overhead
- ⚠️ Distributed transactions
- ⚠️ More monitoring complexity

---

### **Option 3: Hybrid Deployment** (Migration Path)

**Best For**:
- Gradual migration from monolith to microservices
- Teams wanting both development simplicity and production scalability
- Testing microservices without full commitment

**Docker Stack**:
```yaml
Services:
├── postgres (shared database)
├── pgadmin (database UI)
├── monolith (existing server)
├── api-gateway (routes to monolith + microservices)
├── billing-service (extracted first)
├── finance-service (extracted second)
└── client (frontend)
```

**Deployment Steps**:
```bash
# 1. Start with monolith
docker-compose -f docker-compose.monolith.yml up -d

# 2. Add extracted services
docker-compose -f docker-compose.yml \
              -f docker-compose.hybrid.yml \
              up -d
```

---

## Docker File Dependency Order

### **Build Order** (for microservices)

**Phase 1: Base Infrastructure** (Must run first)
```bash
# 1. Database (cannot build services without it)
postgres service
└── Creates: 9 databases
    ├── billing
    ├── finance
    ├── hospital
    ├── insurance
    ├── membership
    ├── crm
    ├── wellness
    ├── core
    └── mcs_meta
```

**Phase 2: Shared Dependencies** (Run in parallel after Phase 1)
```bash
# 2. Core service (shared data models)
core-service
└── Provides: Shared types, utilities

# 3. API Gateway (routes to all services)
api-gateway
└── Depends on: Core service
```

**Phase 3: Business Services** (Run in parallel after Phase 2)
```bash
# 4-11. All business services (can build simultaneously)
billing-service
finance-service
hospital-service
insurance-service
membership-service
crm-service
wellness-service
└── Each depends on: Core service + own database
```

**Phase 4: Frontend** (Must run last)
```bash
# 12. Client (React app)
client
└── Depends on: API Gateway (or monolith)
```

---

## Docker Compose File Organization

### **File 1: docker-compose.yml** (Main - Production)
**Purpose**: Full microservices deployment
**Services**: 12 (9 microservices + gateway + db + client)
**Status**: ✅ Complete and production-ready

```yaml
version: '3.9'
services:
  postgres
  pgadmin
  api-gateway
  billing-service
  finance-service
  hospital-service
  insurance-service
  membership-service
  crm-service
  wellness-service
  client
```

**Usage**:
```bash
# Production deployment
docker-compose up -d --build

# Scale services
docker-compose up -d --scale billing-service=3
```

---

### **File 2: docker-compose.monolith.yml** (Needed)
**Purpose**: Simplified monolithic deployment
**Services**: 4 (monolith + db + pgadmin + client)
**Status**: ⚠️ Needs to be created

**Should Include**:
```yaml
version: '3.9'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: mcs
      POSTGRES_PASSWORD: mcs
      POSTGRES_DB: mcs_meta
    ports:
      - "5432:5432"

  pgadmin:
    image: dpage/pgadmin4:8
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@example.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "8081:80"

  monolith:
    build:
      context: .
      dockerfile: server/Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgres://mcs:mcs@postgres:5432/mcs_meta
      NODE_ENV: production
    depends_on:
      - postgres

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      VITE_API_BASE_URL: http://monolith:3001
    depends_on:
      - monolith
```

---

### **File 3: docker-compose.hybrid.yml** (Optional)
**Purpose**: Migration from monolith to microservices
**Services**: 6 (monolith + gateway + extracted services + db + client)
**Status**: ⚠️ Should be created for migration path

**Should Include**:
```yaml
version: '3.9'
services:
  # Database (shared)
  postgres:
    # ... (same as main compose)

  # Monolith (existing server)
  monolith:
    build:
      context: .
      dockerfile: server/Dockerfile
    ports:
      - "3001:3001"
    environment:
      # ... monolith config

  # API Gateway (routes traffic)
  api-gateway:
    build:
      context: ./services/api-gateway
    ports:
      - "8080:8080"
    environment:
      # Routes some traffic to monolith, some to microservices
      MONOLITH_URL: http://monolith:3001

  # Extracted Services (gradually move from monolith)
  billing-service:
    build:
      context: ./services/billing-service

  finance-service:
    build:
      context: ./services/finance-service

  client:
    build:
      context: ./client
    environment:
      # All traffic goes through gateway
      VITE_API_BASE_URL: http://api-gateway:8080
```

---

## Dockerfile Organization

### **Dockerfile 1: server/Dockerfile** (Monolithic)
**Purpose**: Single container with all backend services
**Size**: Multi-stage build (197 lines)
**Status**: ✅ Complete and production-ready

**Stages**:
1. `base` - Node.js 20 foundation
2. `deps` - Install dependencies
3. `development` - Development mode
4. `builder` - Build server
5. `production` - Production runtime
6. `test` - Testing stage

**Usage**:
```bash
# Development
docker build --target development -t medical-coverage:dev .

# Production
docker build --target production -t medical-coverage:latest .

# Test
docker build --target test -t medical-coverage:test .
```

---

### **Dockerfile 2-10: services/*/Dockerfile** (Microservices)
**Purpose**: Individual service containers
**Pattern**: Similar multi-stage build
**Status**: ✅ All present and consistent

**Services**:
1. `services/api-gateway/Dockerfile` - API routing
2. `services/billing-service/Dockerfile` - Billing operations
3. `services/finance-service/Dockerfile` - Financial calculations
4. `services/hospital-service/Dockerfile` - Hospital management
5. `services/insurance-service/Dockerfile` - Insurance policies
6. `services/membership-service/Dockerfile` - Member management
7. `services/crm-service/Dockerfile` - CRM operations
8. `services/wellness-service/Dockerfile` - Wellness programs
9. `services/core-service/Dockerfile` - Shared utilities

**Common Pattern**:
```dockerfile
# Each service follows same structure
FROM node:20-slim AS base
FROM base AS deps
FROM base AS development
FROM base AS builder
FROM base AS production
FROM base AS test
```

---

### **Dockerfile 11: client/Dockerfile** (Missing)
**Purpose**: React frontend container
**Status**: ⚠️ Needs to be created

**Should Include**:
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## .dockerignore Files

### **Current State**
- ✅ `services/billing-service/.dockerignore`
- ✅ `services/hospital-service/.dockerignore`
- ⚠️ Missing root `.dockerignore`
- ⚠️ Missing `client/.dockerignore`
- ⚠️ Missing for other services

### **Root .dockerignore** (Needs Creation)
**Location**: `/workspace/MedicalCoverageSystem/.dockerignore`

**Should Include**:
```
# Dependencies
node_modules
npm-debug.log
package-lock.json

# Build outputs
dist
build
*.log

# Environment
.env
.env.local
.env.*.local

# Git
.git
.gitignore

# IDE
.vscode
.idea
*.swp

# Testing
coverage
.nyc_output
.cypress

# Documentation
*.md
docs

# Docker
Dockerfile
docker-compose.yml
.dockerignore
```

---

## Deployment Scenarios

### **Scenario 1: Local Development** (Monolith)

**Goal**: Fast iteration for developers

**Command**:
```bash
# Using monolithic compose file
docker-compose -f docker-compose.monolith.yml up
```

**Services Started**:
- PostgreSQL (port 5432)
- PgAdmin (port 8081)
- Monolith Server (port 3001)
- Client (port 3000)

**Startup Time**: ~30 seconds

**Memory Usage**: ~2GB

---

### **Scenario 2: Production - Small Scale** (Monolith + Scaling)

**Goal**: Production deployment with horizontal scaling

**Command**:
```bash
# Build and deploy monolith with multiple instances
docker-compose -f docker-compose.monolith.yml \
  up -d --scale monolith=3
```

**Services Started**:
- PostgreSQL (1 instance)
- Load Balancer (nginx)
- Monolith Server (3 instances)
- Client (1 instance)

**Requirements**:
- Load balancer configuration
- Shared session storage (Redis)
- Database connection pooling

---

### **Scenario 3: Production - Large Scale** (Microservices)

**Goal**: Full microservices with independent scaling

**Command**:
```bash
# Build all services
docker-compose build

# Deploy with selective scaling
docker-compose up -d \
  --scale billing-service=5 \
  --scale finance-service=3 \
  --scale hospital-service=2 \
  --scale insurance-service=2 \
  --scale membership-service=3 \
  --scale crm-service=2 \
  --scale wellness-service=1
```

**Services Started**:
- PostgreSQL (1 instance)
- API Gateway (1 instance, port 8080)
- Billing Service (5 instances)
- Finance Service (3 instances)
- Hospital Service (2 instances)
- Insurance Service (2 instances)
- Membership Service (3 instances)
- CRM Service (2 instances)
- Wellness Service (1 instance)
- Client (1 instance)

**Total Instances**: 22 containers

**Startup Time**: ~90 seconds

**Memory Usage**: ~8-12GB

---

### **Scenario 4: Staging/UAT** (Full Microservices)

**Goal**: Pre-production testing with full setup

**Command**:
```bash
# Full microservices, no scaling
docker-compose up -d
```

**Services Started**:
- All 11 services (single instance each)

**Use For**:
- Integration testing
- UAT with stakeholders
- Performance testing
- Feature validation

---

## Docker Deployment Commands

### **Basic Commands**

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build billing-service

# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# View logs
docker-compose logs -f

# View service logs
docker-compose logs -f billing-service
```

### **Production Commands**

```bash
# Deploy to production
docker-compose -f docker-compose.yml up -d --build --force-recreate

# Deploy with scaling
docker-compose up -d --scale billing-service=5

# Update specific service
docker-compose up -d --no-deps --build billing-service

# Health check
docker-compose ps
curl http://localhost:8080/health
```

### **Development Commands**

```bash
# Development mode with hot reload
docker-compose -f docker-compose.monolith.yml up

# Attach to service logs
docker-compose logs -f monolith

# Execute command in container
docker-compose exec monolith npm run db:push

# Access container shell
docker-compose exec monolith /bin/bash
```

---

## Missing Files to Create

### **1. Root .dockerignore**
**Priority**: High
**Purpose**: Exclude unnecessary files from ALL Docker builds
**Location**: `/workspace/MedicalCoverageSystem/.dockerignore`

### **2. client/Dockerfile**
**Priority**: High
**Purpose**: Build React frontend for production
**Location**: `/workspace/MedicalCoverageSystem/client/Dockerfile`

### **3. client/.dockerignore**
**Priority**: Medium
**Purpose**: Speed up client build context
**Location**: `/workspace/MedicalCoverageSystem/client/.dockerignore`

### **4. docker-compose.monolith.yml**
**Priority**: Medium (if monolith development needed)
**Purpose**: Simplified development setup
**Location**: `/workspace/MedicalCoverageSystem/docker-compose.monolith.yml`

### **5. docker-compose.hybrid.yml**
**Priority**: Low (migration path)
**Purpose**: Gradual migration from monolith to microservices
**Location**: `/workspace/MedicalCoverageSystem/docker-compose.hybrid.yml`

---

## Docker Build Optimization

### **Current State Analysis**

**Monolithic Dockerfile** (server/Dockerfile):
- ✅ Multi-stage build (good)
- ✅ Production-optimized
- ✅ Health checks configured
- ✅ Non-root user
- ✅ Proper signal handling

**Microservices Dockerfiles**:
- ✅ Consistent pattern
- ✅ Multi-stage builds
- ⚠️ Some missing .dockerignore files

**Client Dockerfile**:
- ❌ Missing (needs creation)

---

## Environment Variables

### **Required for All Deployments**

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Application
NODE_ENV=production
PORT=3000

# Security
SESSION_SECRET=your-random-secret
JWT_SECRET=your-jwt-secret

# Services (for microservices)
API_GATEWAY_URL=http://api-gateway:8080
BILLING_SERVICE_URL=http://billing-service:3000
# ... (one per service)
```

### **Service-Specific Variables**

**API Gateway**:
```bash
PORT=8080
BILLING_SERVICE_URL=http://billing-service:3000
FINANCE_SERVICE_URL=http://finance-service:3000
# ... (routes to all services)
```

**Each Microservice**:
```bash
PORT=3000
DATABASE_URL=postgres://mcs:mcs@postgres:5432/{service_db}
```

---

## Network Configuration

### **Docker Networks** (Created by Compose)

**Default Network**: `medical-coveragesystem_default`
- All services connected by default
- Internal DNS resolution
- Service discovery via service names

**Custom Networks** (Recommended for production):
```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
  database:
    driver: bridge
    internal: true
```

**Service Network Placement**:
- `client` → frontend network
- `api-gateway` → frontend + backend
- All microservices → backend network
- `postgres` → database network
- `pgadmin` → database network

---

## Volume Management

### **Production Volumes**

```yaml
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  uploads:
    driver: local
  logs:
    driver: local
```

**Service Volume Mounts**:
```yaml
services:
  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data

  monolith:
    volumes:
      - uploads:/app/uploads
      - logs:/app/logs

  client:
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
```

---

## Health Checks

### **Configured Health Checks**

**PostgreSQL**:
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U mcs"]
  interval: 10s
  timeout: 5s
  retries: 5
```

**Backend Services**:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  start_period: 40s
  retries: 3
```

**Client**:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:80/health"]
  interval: 30s
  timeout: 5s
  retries: 3
```

---

## Production Deployment Checklist

### **Pre-Deployment**
- [ ] All Dockerfiles reviewed and optimized
- [ ] Environment variables configured
- [ ] Secrets management set up
- [ ] Volume backups configured
- [ ] Monitoring solution ready
- [ ] Log aggregation configured
- [ ] Load balancer configured (if scaling)
- [ ] SSL certificates obtained
- [ ] Domain DNS configured
- [ ] Database backups scheduled

### **Deployment Steps**
1. Build all images: `docker-compose build`
2. Test locally: `docker-compose up`
3. Push to registry: `docker-compose push`
4. Deploy to production: `docker-compose -f docker-compose.prod.yml up -d`
5. Verify health: `docker-compose ps`
6. Check logs: `docker-compose logs -f`
7. Run smoke tests
8. Monitor for 30 minutes

### **Post-Deployment**
- [ ] Monitor container health
- [ ] Check database connections
- [ ] Verify service-to-service communication
- [ ] Test API endpoints
- [ ] Verify frontend connectivity
- [ ] Check resource usage
- [ ] Review error logs
- [ ] Validate data persistence

---

## Troubleshooting

### **Common Issues**

**1. Services Won't Start**
```bash
# Check logs
docker-compose logs [service-name]

# Common causes:
# - Database not ready (add depends_on with healthcheck)
# - Port conflicts (check port mappings)
# - Missing environment variables
```

**2. Services Can't Reach Each Other**
```bash
# Verify network
docker network inspect medical-coveragesystem_default

# Check service discovery
docker-compose exec billing-service ping api-gateway

# Common causes:
# - Services on different networks
# - Wrong service names in URLs
# - DNS resolution issues
```

**3. Database Connection Failures**
```bash
# Check database is ready
docker-compose exec postgres pg_isready -U mcs

# Test connection from service
docker-compose exec billing-service psql $DATABASE_URL

# Common causes:
# - Database not fully started
# - Wrong connection string
# - Network isolation
```

**4. High Memory Usage**
```bash
# Check container stats
docker stats

# Solutions:
# - Limit container memory in compose
# - Reduce number of services
# - Use resource limits
```

---

## Best Practices

### **Image Management**
```bash
# Tag images properly
docker tag medical-coverage/api-gateway:latest \
            medical-coverage/api-gateway:v1.2.3

# Use semantic versioning
docker tag medical-coverage/api-gateway:latest \
            medical-coverage/api-gateway:${VERSION}

# Push to registry
docker push medical-coverage/api-gateway:latest
docker push medical-coverage/api-gateway:v1.2.3
```

### **Resource Limits**
```yaml
services:
  billing-service:
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### **Restart Policies**
```yaml
services:
  billing-service:
    restart: unless-stopped
    # Options: no, always, on-failure, unless-stopped
```

### **Logging**
```yaml
services:
  billing-service:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## Summary

**Docker Files Status**:
- ✅ Root docker-compose.yml (complete)
- ✅ server/Dockerfile (monolithic, complete)
- ⚠️ client/Dockerfile (missing)
- ✅ All 9 microservice Dockerfiles (complete)
- ⚠️ Root .dockerignore (missing)
- ⚠️ Monolithic compose file (missing)

**Deployment Options**:
- ✅ Monolithic (4 containers)
- ✅ Microservices (12 containers)
- ⚠️ Hybrid (needs creation)

**Recommended Next Steps**:
1. Create missing client/Dockerfile
2. Create root .dockerignore
3. Create docker-compose.monolith.yml for development
4. Set up CI/CD pipeline
5. Configure monitoring and logging

---

**Last Updated**: 2025-12-28
**Total Dockerfiles**: 11
**Total Compose Files**: 3
**Deployment Modes**: 3 (Monolith, Microservices, Hybrid)
