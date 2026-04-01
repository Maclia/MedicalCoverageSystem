# Docker Configuration & Startup Guide

## Overview

This document verifies the Docker configuration for the Medical Coverage microservices system. All legacy files have been removed and the configuration is now clean.

## ✅ Docker Cleanup Completed

### Removed Files
- `Dockerfile` - (root) Legacy production multi-stage build
- `Dockerfile.dev` - (root) Legacy development build  
- `docker-compose.yml.q` - Duplicate/variant configuration file
- `server/Dockerfile` - Old backend Dockerfile (node:18, outdated structure)

These files were remnants from the pre-microservices architecture and could interfere with the current setup.

### Remaining Files
- **`docker-compose.yml`** - Main orchestration file for all services ✓
- **`client/Dockerfile`** - Frontend build (multi-target: development/production) ✓
- **`services/*/Dockerfile`** - 9 individual service Dockerfiles ✓
- **`database/init/00-create-databases.sql`** - Database initialization script ✓
- **`.env.example`** - Environment configuration template ✓

## Architecture

### Services (12 total)

**Infrastructure:**
- `postgres` - PostgreSQL 15-alpine (port 5432)
- `redis` - Redis 7-alpine (port 6379)

**Frontend & Gateway:**
- `frontend` - React + Vite (port 3000)
- `api-gateway` - Request routing & auth (port 3001)

**Microservices (9 services on ports 3002-3009):**
1. `billing-service` - Port 3002
2. `core-service` - Port 3003
3. `finance-service` - Port 3004
4. `crm-service` - Port 3005
5. `membership-service` - Port 3006
6. `hospital-service` - Port 3007
7. `insurance-service` - Port 3008
8. `wellness-service` - Port 3009

**Optional:**
- `nginx` - Reverse proxy (disabled by default, port 80/443)

### Databases (9 total)

Each service has its own PostgreSQL database:

| Service | Database Name | Port |
|---------|---------------|------|
| API Gateway | `api_gateway` | 5432 |
| Billing | `medical_coverage_billing` | 5432 |
| Core | `medical_coverage_core` | 5432 |
| CRM | `medical_coverage_crm` | 5432 |
| Finance | `medical_coverage_finance` | 5432 |
| Hospital | `medical_coverage_hospital` | 5432 |
| Insurance | `medical_coverage_insurance` | 5432 |
| Membership | `medical_coverage_membership` | 5432 |
| Wellness | `medical_coverage_wellness` | 5432 |

## Configuration Files

### Environment Variables (`.env`)

Copy from `.env.example` to `.env`:

```bash
cp .env.example .env
```

Key variables for Docker:
- `NODE_ENV=development` or `production`
- `DB_USER=postgres`
- `DB_PASSWORD=postgres_password_2024` 
- `DB_HOST=postgres` (container name in Docker)
- `REDIS_URL=redis://redis:6379`
- `JWT_SECRET=change_me_in_production_...`

### Docker Compose Configuration

**File:** `docker-compose.yml` (version 3.8)

**Key Features:**
- X-service anchors for DRY configuration (don't repeat yourself)
- Health checks for all services (30s interval, 10s timeout, 5 retries)
- Dependency management (services wait for postgres/redis to be healthy)
- Named network `medical-services-network` for service communication
- Persistent volumes for postgres and redis data

## Startup Instructions

### Prerequisites
1. Docker & Docker Compose installed
2. Node.js dependencies installed (`npm install` in root)
3. Port availability: 3000-3009, 5432, 6379 (80/443 if using nginx)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
```bash
cp .env.example .env
# Edit .env if customization needed
```

### Step 3: Start Services

**Option A: Full start with build**
```bash
docker-compose up -d --build
```

**Option B: Start without rebuild (if images exist)**
```bash
docker-compose up -d
```

**Option C: Sequential build** (recommended for resource-constrained systems)
```bash
./docker-compose.build.sh
```

### Step 4: Verify Services

Check all services are running:
```bash
docker-compose ps
```

Expected output (12 services):
```
NAME                    STATUS        PORTS
medical_postgres        Up 30s        0.0.0.0:5432->5432/tcp
medical_redis           Up 30s        0.0.0.0:6379->6379/tcp
medical_frontend        Up 30s        0.0.0.0:3000->3000/tcp
medical_api_gateway     Up 30s        0.0.0.0:3001->3001/tcp
medical_billing_service Up (healthy)  0.0.0.0:3002->3002/tcp
medical_core_service    Up (healthy)  0.0.0.0:3003->3003/tcp
medical_finance_service Up (healthy)  0.0.0.0:3004->3004/tcp
medical_crm_service     Up (healthy)  0.0.0.0:3005->3005/tcp
medical_membership_service Up (healthy) 0.0.0.0:3006->3006/tcp
medical_hospital_service Up (healthy)  0.0.0.0:3007->3007/tcp
medical_insurance_service Up (healthy) 0.0.0.0:3008->3008/tcp
medical_wellness_service Up (healthy)  0.0.0.0:3009->3009/tcp
```

### Step 5: Access Application

- **Frontend:** http://localhost:3000
- **API Gateway:** http://localhost:3001
- **Database:** localhost:5432 (postgres/postgres_password_2024)
- **Redis:** localhost:6379

## Troubleshooting

### Services not starting (exit code 1)

1. **Check logs:**
   ```bash
   docker-compose logs -f service-name
   docker-compose logs -f api-gateway
   ```

2. **Verify databases exist:**
   ```bash
   docker-compose exec postgres psql -U postgres -l
   ```

3. **Check network:**
   ```bash
   docker network inspect medical_services_network
   ```

### Port conflicts
```bash
# Find process using a port (Windows)
netstat -ano | findstr :3001

# Find process using a port (macOS/Linux)
lsof -i :3001
```

### Reset everything
```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Rebuild from scratch
docker-compose up -d --build
```

### Database initialization failed
1. Check that `database/init/` SQL files exist
2. Verify database names match docker-compose.yml
3. Check database init script with:
   ```bash
   docker-compose logs postgres
   ```

## Service Communication

### Internal (within Docker network)
Services communicate via container names:
```
http://core-service:3003
http://api-gateway:3001
http://postgres:5432
http://redis:6379
```

### External (from localhost)
Access services via localhost and exposed ports:
```
http://localhost:3001    # API Gateway
http://localhost:3003    # Core Service
http://localhost:5432    # Database
http://localhost:6379    # Redis
```

### Frontend to Backend
The frontend connects to the API Gateway:
```
VITE_API_URL=http://localhost:3001
```

This is configured in:
- `.env` file
- `client/src/lib/api.ts`
- `docker-compose.yml` (frontend service)

## Health Checks

All services include health checks:

**Services check:**
```bash
curl http://localhost:3001/health
curl http://localhost:3003/health
```

**Database check:**
```bash
docker-compose exec postgres pg_isready -U postgres
```

**Redis check:**
```bash
docker-compose exec redis redis-cli ping
```

## Cleanup

### Stop services (keep data)
```bash
docker-compose down
```

### Stop services and remove data
```bash
docker-compose down -v
```

### Remove specific service
```bash
docker-compose rm -s service-name
```

## Production Deployment

For production deployment:

1. **Set NODE_ENV=production** in `.env`
2. **Change JWT_SECRET** to a strong, unique value (min 32 chars)
3. **Use environment-specific configuration** (use Neon for serverless databases)
4. **Enable HTTPS** (update VITE_API_URL to https://)
5. **Configure Nginx** for reverse proxy (uncomment in docker-compose.yml)
6. **Set up database backups** and monitoring
7. **Use Docker secrets** for sensitive values (don't hardcode in .env)

## File Structure Summary

```
.
├── docker-compose.yml          # Main orchestration (CLEAN ✓)
├── .env.example                # Environment template (UPDATED ✓)
├── .env                         # Your actual configuration
├── database/
│   └── init/
│       ├── 00-create-databases.sql    # Creates 9 databases (FIXED ✓)
│       └── 01-init-database.sql       # Initialize schemas
├── client/
│   └── Dockerfile              # Frontend build ✓
├── services/
│   ├── api-gateway/Dockerfile  # API Gateway ✓
│   ├── billing-service/Dockerfile
│   ├── core-service/Dockerfile
│   ├── crmservice/Dockerfile
│   ├── finance-service/Dockerfile
│   ├── hospital-service/Dockerfile
│   ├── insurance-service/Dockerfile
│   ├── membership-service/Dockerfile
│   └── wellness-service/Dockerfile
└── nginx/
    └── nginx.conf              # Optional reverse proxy
```

## Status: ✅ READY FOR DEPLOYMENT

- ✅ All legacy Docker files removed
- ✅ Database initialization script corrected
- ✅ Environment configuration updated
- ✅ Service configuration verified
- ✅ Documentation complete

Next steps:
1. Run `docker-compose up -d --build`
2. Verify all services with `docker-compose ps`
3. Run verification script: `./scripts/verify-connections.sh`or `.bat`
