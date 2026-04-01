# Medical Coverage System - Setup & Deployment Guide

**Status**: 🟢 Production Ready  
**Last Updated**: April 2, 2026

## 📋 Quick Navigation

- [5-Minute Quick Start](#5-minute-quick-start)
- [Docker Setup (Recommended)](#docker-setup-recommended)
- [Environment Configuration](#environment-configuration)
- [Deployment Commands](#deployment-commands)
- [Vercel Deployment](#vercel-deployment)
- [Troubleshooting](#troubleshooting)
- [Health Checks & Monitoring](#health-checks--monitoring)

---

## 🚀 5-Minute Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker & Docker Compose (for containerized setup)
- Git

### Local Development Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd MedicalCoverageSystem

# 2. Install dependencies (all services + root)
npm install

# 3. Configure environment
cp .env.example .env

# 4. Start development environment
./orchestrate.sh dev start full  # Linux/macOS
orchestrate.bat dev start full   # Windows

# 5. Access the system
# Frontend: http://localhost:3000
# API Gateway: http://localhost:3001/health
# Swagger Docs: http://localhost:3001/api-docs
```

---

## Docker Setup (Recommended)

### Architecture Overview

```
Medical Coverage System
├── Frontend (React + Vite)
│   └── Port 3000
├── API Gateway (Node.js)
│   └── Port 3001
├── 9 Microservices
│   ├── Billing Service (3002)
│   ├── Core Service (3003)
│   ├── Finance Service (3004)
│   ├── CRM Service (3005)
│   ├── Membership Service (3006)
│   ├── Hospital Service (3007)
│   ├── Insurance Service (3008)
│   └── Wellness Service (3009)
├── PostgreSQL (port 5432)
│   └── 9 separate databases (one per service + api_gateway)
├── Redis (port 6379)
└── Nginx (port 80/443, optional)
```

### Docker Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env
# Edit .env with your configuration

# 3. Start with docker-compose
docker-compose up -d --build

# 4. Verify services
docker-compose ps

# 5. Check service health
curl http://localhost:3001/health
```

### Docker Files Structure

**Root-level Docker configuration:**
- `docker-compose.yml` - Main orchestration file (12 services)
- `client/Dockerfile` - Frontend multi-target build
- `services/*/Dockerfile` - Individual microservice builds

**Database initialization:**
- `database/init/00-create-databases.sql` - Creates 9 databases
- `database/init/01-init-database.sql` - Initializes schemas

### Key Docker Services

| Service | Image | Port | Database |
|---------|-------|------|----------|
| PostgreSQL | postgres:15-alpine | 5432 | 9 databases |
| Redis | redis:7-alpine | 6379 | N/A |
| Frontend | node:20-alpine | 3000 | N/A |
| API Gateway | Node.js | 3001 | api_gateway |
| Microservices | Node.js | 3002-3009 | medical_coverage_* |

### Docker Volumes & Persistence

```yaml
volumes:
  postgres_data:     # PostgreSQL data persistence
  redis_data:        # Redis data persistence
  nginx_logs:        # Nginx access logs (if using Nginx)
```

---

## Environment Configuration

### Setting Up .env File

Copy `.env.example` to `.env` and configure:

```bash
# Node environment
NODE_ENV=development

# Database configuration
DB_USER=postgres
DB_PASSWORD=postgres_password_2024
DB_PORT=5432
DB_HOST=postgres              # localhost for local, postgres for Docker

# Redis configuration
REDIS_URL=redis://redis:6379  # localhost:6379 for local
REDIS_PORT=6379

# Frontend configuration
FRONTEND_PORT=3000
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_ENVIRONMENT=development

# API Gateway
GATEWAY_PORT=3001

# Service ports (Docker only)
BILLING_PORT=3002
CORE_PORT=3003
FINANCE_PORT=3004
CRM_PORT=3005
MEMBERSHIP_PORT=3006
HOSPITAL_PORT=3007
INSURANCE_PORT=3008
WELLNESS_PORT=3009

# Service URLs (inter-service communication)
CORE_SERVICE_URL=http://core-service:3003
INSURANCE_SERVICE_URL=http://insurance-service:3008
HOSPITAL_SERVICE_URL=http://hospital-service:3007
BILLING_SERVICE_URL=http://billing-service:3002
FINANCE_SERVICE_URL=http://finance-service:3004
CRM_SERVICE_URL=http://crm-service:3005
MEMBERSHIP_SERVICE_URL=http://membership-service:3006
WELLNESS_SERVICE_URL=http://wellness-service:3009

# Security
JWT_SECRET=change_me_in_production_min_32_chars
JWT_REFRESH_SECRET=change_me_refresh_secret_production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Optional: Email configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Feature flags
ENABLE_ANALYTICS=true
ENABLE_NOTIFICATIONS=true
SERVICE_TIMEOUT=30000
```

### Local vs Docker Configuration

**Local Development (localhost):**
```
DB_HOST=localhost
REDIS_URL=redis://localhost:6379
SERVICE_URLS=http://localhost:300X
```

**Docker Containers (container names):**
```
DB_HOST=postgres
REDIS_URL=redis://redis:6379
SERVICE_URLS=http://service-name:port
```

---

## Deployment Commands

### Development Deployment

```bash
# Start full development environment with databases
./orchestrate.sh dev start full

# Start services only (databases already running)
./orchestrate.sh dev start

# Check service status
./orchestrate.sh dev status

# View logs
./orchestrate.sh dev logs

# Stop services
./orchestrate.sh dev stop

# Complete cleanup
./orchestrate.sh dev clean all
```

### Production Deployment

```bash
# Prepare production environment
cp .env.example .env.production
# Edit .env.production with production secrets

# Start production environment
./orchestrate.sh prod start

# Check production health
./orchestrate.sh prod status

# View production logs
./orchestrate.sh prod logs

# Scale services (if needed)
./orchestrate.sh prod scale core-service 3
```

### Docker Compose Commands

```bash
# Build and start all services
docker-compose up -d --build

# Start without rebuild
docker-compose up -d

# Check service status
docker-compose ps

# View service logs
docker-compose logs -f service-name
docker-compose logs -f api-gateway

# Stop services (keep data)
docker-compose down

# Stop and remove data (WARNING: destructive)
docker-compose down -v

# Rebuild specific service
docker-compose build --no-cache service-name
docker-compose up -d service-name
```

---

## Vercel Deployment

### Setup

1. **Connect Repository**
   - Push code to GitHub
   - Link repository in Vercel dashboard

2. **Configure Environment Variables**
   ```
   NODE_ENV=production
   DATABASE_URL=your_neon_database_url
   JWT_SECRET=your_secret_key
   STRIPE_SECRET_KEY=your_stripe_key (optional)
   EMAIL_SERVICE_API_KEY=your_email_key (optional)
   ```

3. **Deploy**
   ```bash
   # Option 1: Automatic deployment from GitHub
   # Push to main branch and Vercel auto-deploys

   # Option 2: Manual deployment via CLI
   npm install -g vercel
   npm run vercel:deploy
   ```

### Vercel Configuration

**Root `vercel.json`:**
- Builds client with Vite
- Configures serverless functions
- Sets CORS headers for API access
- Memory: 1024MB, Timeout: 30s

**API Routes:**
```
https://your-app.vercel.app/api/*
```

---

## Database Initialization

### PostgreSQL Database Setup

All 9 databases are created automatically during docker-compose startup:

```sql
-- Automatically created databases:
api_gateway
medical_coverage_billing
medical_coverage_core
medical_coverage_crm
medical_coverage_finance
medical_coverage_hospital
medical_coverage_insurance
medical_coverage_membership
medical_coverage_wellness
```

### Manual Database Creation

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres

# Create databases
CREATE DATABASE medical_coverage_core;
CREATE DATABASE medical_coverage_crm;
CREATE DATABASE medical_coverage_finance;
-- ... create other databases

# Exit
\q
```

### Schema Initialization

Schemas are automatically initialized from:
- `database/init/01-init-database.sql`
- `database/init/02-{service}-schema.sql`

---

## Health Checks & Monitoring

### Service Health Endpoints

```bash
# API Gateway health
curl http://localhost:3001/health

# Service health (per service)
curl http://localhost:3002/health  # Billing
curl http://localhost:3003/health  # Core
curl http://localhost:3004/health  # Finance
curl http://localhost:3005/health  # CRM
curl http://localhost:3006/health  # Membership
curl http://localhost:3007/health  # Hospital
curl http://localhost:3008/health  # Insurance
curl http://localhost:3009/health  # Wellness

# Database health
docker-compose exec postgres pg_isready -U postgres

# Redis health
docker-compose exec redis redis-cli ping

# Full system status
./scripts/verify-connections.bat   # Windows
./scripts/verify-connections.sh    # Linux/macOS
```

### Health Check Configuration

All services include:
- **Check interval**: 30s
- **Check timeout**: 10s
- **Retries**: 5
- **HTTP endpoint**: `/health`

---

## Troubleshooting

### Docker Compose Issues

**Issue: Services fail to start (exit code 1)**

```bash
# Check logs
docker-compose logs -f service-name

# Common causes:
# 1. Port conflict
netstat -ano | findstr :3001

# 2. Environment variables
docker-compose config  # Validates YAML

# 3. Database connection
docker-compose exec postgres psql -U postgres -l
```

**Issue: "Cannot connect to database"**

```bash
# Verify database exists
docker-compose exec postgres psql -U postgres -l

# Check database URL in service
docker-compose exec service-name env | grep DATABASE_URL

# Verify network
docker network inspect medical_services_network
```

**Issue: Services timeout on startup**

```bash
# Increase startup time
docker-compose down -v  # Clean start
docker-compose up -d --build --force-recreate

# Check for resource constraints
docker stats
```

### Service Communication Issues

**Frontend can't reach API Gateway:**

```
Check VITE_API_URL in .env:
- Local dev: http://localhost:3001
- Docker: http://api-gateway:3001
- Vercel: https://api.your-domain.com
```

**Services can't communicate:**

```bash
# Verify network connectivity
docker-compose exec core-service ping api-gateway

# Check service URL configuration
docker-compose exec core-service env | grep SERVICE_URL
```

### Database Issues

**"database does not exist" error**

```bash
# Create missing database
docker-compose exec postgres psql -U postgres -c \
  "CREATE DATABASE medical_coverage_core;"

# Or run initialization script
docker-compose exec postgres psql -U postgres \
  -f /docker-entrypoint-initdb.d/00-create-databases.sql
```

**"port already in use" error**

```bash
# Find process using port (Windows)
netstat -ano | findstr :5432

# Kill process
taskkill /PID <pid> /F

# Or change port in docker-compose.yml
ports:
  - "5433:5432"  # Use 5433 instead
```

---

## Maintenance & Operations

### Backup & Restore

```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres medical_coverage_core \
  > backup_core_$(date +%Y%m%d).sql

# Restore database
docker-compose exec -T postgres psql -U postgres medical_coverage_core \
  < backup_core_20260402.sql

# Backup Redis data
docker-compose exec redis redis-cli BGSAVE
docker cp medical_redis:/data/dump.rdb ./redis_backup_$(date +%Y%m%d).rdb
```

### Scaling Services

```bash
# Scale specific service (dev environment)
./orchestrate.sh dev scale core-service 3

# Docker approach
docker-compose up -d --scale core-service=3
```

### Cleaning Up

```bash
# Stop all services (keep data)
docker-compose down

# Clean up volumes (WARNING: deletes all data)
docker-compose down -v

# Remove unused images
docker image prune -a

# Full cleanup script
./orchestrate.sh dev clean all
```

---

## Next Steps

1. **Local Setup**: Use `./orchestrate.sh dev start full` for development
2. **Docker Setup**: Use `docker-compose up -d --build` for containerized environment
3. **Production**: Use Vercel deployment with environment variables
4. **Monitoring**: Use `/health` endpoints and `./scripts/verify-connections.sh`
5. **Documentation**: See [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) for detailed architecture
6. **API Reference**: See [API_REFERENCE.md](API_REFERENCE.md) for all endpoints
7. **Development**: See [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) for contribution guidelines

---

**Need help?** Check the troubleshooting section above or reference the specific service documentation in `services/*/README.md`
