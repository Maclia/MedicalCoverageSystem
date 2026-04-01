# Service Connectivity Implementation Plan

## 🎯 Objective

Ensure proper, standardized connections between:
1. **Frontend UI** (React 3000/5173) → **API Gateway** (3001)
2. **API Gateway** (3001) → **Microservices** (3002-3009)
3. **Each Microservice** → **Dedicated PostgreSQL Database**
4. **All Services** → **Shared Redis Cache**

---

## 📋 Pre-Implementation Checklist

- [ ] All 9 microservices are running
- [ ] PostgreSQL server has 9 databases created
- [ ] Redis is accessible
- [ ] Docker network is properly configured (if Docker)
- [ ] Current `.env` file is backed up
- [ ] Team notified of upcoming changes

---

## 🚀 Phase 1: Environment Configuration Setup (15 minutes)

### Step 1.1: Create Environment Files

```bash
# Navigate to project root
cd /path/to/MedicalCoverageSystem

# Copy the service configuration template
cp .env.services.template .env

# Verify the .env file was created
ls -la .env
```

### Step 1.2: Update Environment Variables

**For Development (Docker):**
```bash
# Edit .env file
nano .env  # or vim, vscode, etc.

# Key updates:
NODE_ENV=development
VITE_API_URL=http://localhost:3001

# Core Service
CORE_SERVICE_URL=http://core-service:3003
CORE_DB_URL=postgresql://postgres:postgres@postgres:5432/medical_coverage_core

# Billing Service
BILLING_SERVICE_URL=http://billing-service:3002
BILLING_DB_URL=postgresql://postgres:postgres@postgres:5432/medical_coverage_billing

# ... update all services database URLs

REDIS_URL=redis://redis:6379
```

**For Production (Neon):**
```bash
# Update with Neon connection strings
CORE_DB_URL=postgresql://user:pass@ep-xxxxx.neon.tech/medical_coverage_core?sslmode=require
BILLING_DB_URL=postgresql://user:pass@ep-xxxxx.neon.tech/medical_coverage_billing?sslmode=require
# ... etc

# Update service URLs to production domain
VITE_API_URL=https://api.yourdomain.com
API_GATEWAY_URL=https://api.yourdomain.com
CORE_SERVICE_URL=http://core-service.default.svc.cluster.local:3003  # If using Kubernetes
```

### Step 1.3: Verify Environment File

```bash
# Check all required variables are set
grep -E "SERVICE_URL|DB_URL|REDIS_URL|API_URL" .env

# Should see output for all 9 services + API gateway
```

---

## 🔧 Phase 2: Update Service Configuration Files (30 minutes)

### Step 2.1: Update API Gateway Config

**File:** `services/api-gateway/src/config/index.ts`

No changes needed - already properly configured. Just verify the structure matches.

### Step 2.2: Update Core Service Config

**File:** `services/core-service/src/config/index.ts`

```bash
# Replace the database.url section with:
database: {
  url: process.env.CORE_DB_URL || 'postgresql://postgres:postgres@localhost:5432/medical_coverage_core',
  poolSize: parseInt(process.env.CORE_DB_POOL_SIZE || '20', 10),
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
}
```

### Step 2.3: Update Other Services Config Files

Apply similar updates to:
- `services/billing-service/src/config/index.ts`
- `services/crm-service/src/config/index.ts`
- `services/insurance-service/src/config/index.ts`
- `services/hospital-service/src/config/index.ts`
- `services/finance-service/src/config/index.ts`
- `services/membership-service/src/config/index.ts`
- `services/wellness-service/src/config/index.ts`

**Template for each:**
```typescript
database: {
  url: process.env.{SERVICE}_DB_URL || 'postgresql://postgres:postgres@localhost:5432/medical_coverage_{service}',
  poolSize: parseInt(process.env.{SERVICE}_DB_POOL_SIZE || '20', 10),
}
```

### Step 2.4: Update Drizzle Config Files

Update all drizzle config files in `config/` directory:

**Example: config/drizzle.core.config.ts**
```typescript
if (!process.env.CORE_DB_URL) {
  throw new Error("CORE_DB_URL is required for Core service database");
}

export default defineConfig({
  dbCredentials: {
    url: process.env.CORE_DB_URL,
  },
  // ... rest of config
});
```

**Repeat for all services:**
- `config/drizzle.billing.config.ts` → `BILLING_DB_URL`
- `config/drizzle.crm.config.ts` → `CRM_DB_URL`
- `config/drizzle.insurance.config.ts` → `INSURANCE_DB_URL`
- `config/drizzle.hospital.config.ts` → `HOSPITAL_DB_URL`
- `config/drizzle.finance.config.ts` → `FINANCE_DB_URL`
- `config/drizzle.membership.config.ts` → `MEMBERSHIP_DB_URL`
- `config/drizzle.wellness.config.ts` → `WELLNESS_DB_URL`

---

## 🎨 Phase 3: Frontend API Configuration (15 minutes)

### Step 3.1: Create API Configuration File

Already created at: `client/src/lib/api.ts`

This file provides:
- Centralized API_BASE_URL
- All API endpoints organized by service
- Helper functions for building URLs

### Step 3.2: Update queryClient

**File:** `client/src/lib/queryClient.ts`

Update the fetch calls to use:
```typescript
import { createApiUrl } from './api';

async function apiRequest(method: string, url: string, data?: unknown) {
  const fullUrl = url.startsWith('http') ? url : createApiUrl(url);
  
  const res = await fetch(fullUrl, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });
  
  // ... rest of logic
}
```

### Step 3.3: Update API Calls

Find all fetch/axios calls in components that hardcode URLs:

```bash
# Find hardcoded URLs
grep -r "http://localhost:3001\|/api/\|fetch(" client/src --include="*.tsx" --include="*.ts"

# Examples to update:
# OLD: fetch('http://localhost:3001/api/core/members')
# NEW: fetch(createApiUrl(API_ENDPOINTS.core.members))
```

---

## 🔌 Phase 4: Service Registry Setup (10 minutes)

### Step 4.1: Verify ServiceRegistry Exists

**File:** `services/api-gateway/src/services/ServiceRegistry.ts`

Already created. This provides:
- Centralized service configuration
- Health check orchestration
- Dynamic service discovery

### Step 4.2: Initialize ServiceRegistry in API Gateway

**File:** `services/api-gateway/src/index.ts`

```typescript
import { ServiceRegistry } from './services/ServiceRegistry';

// On startup
const registry = ServiceRegistry.getInstance();
const validation = registry.validate();

if (!validation.valid) {
  console.error('Service Registry Configuration Errors:');
  validation.errors.forEach(err => console.error('  -', err));
  process.exit(1);
}

// Run health check every 30 seconds
setInterval(async () => {
  const health = await registry.healthCheck();
  console.log('Service Health:', Object.fromEntries(health));
}, 30000);
```

---

## ✅ Phase 5: Verification & Testing (20 minutes)

### Step 5.1: Verify Environment Variables

```bash
# Test that environment is loaded
node -e "require('dotenv').config(); console.log(process.env.CORE_DB_URL)"

# Should output: postgresql://postgres:postgres@localhost:5432/medical_coverage_core
```

### Step 5.2: Test Database Connections

```bash
# Test each database connection
PGPASSWORD=postgres psql -h localhost -U postgres -d medical_coverage_core -c "SELECT COUNT(*) FROM information_schema.tables;"

# Repeat for all 9 databases
```

### Step 5.3: Run Connectivity Script

```bash
# Linux/Mac
chmod +x scripts/verify-connections.sh
./scripts/verify-connections.sh

# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -File scripts/verify-connections.bat
```

**Expected Output:**
```
✓ Frontend (React) - OK
✓ API Gateway - OK
✓ Core Service - OK
✓ Billing Service - OK
✓ CRM Service - OK
✓ Insurance Service - OK
✓ Hospital Service - OK
✓ Finance Service - OK
✓ Membership Service - OK
✓ Wellness Service - OK
✓ PostgreSQL Databases - All Connected
✓ Redis - Connected

All connectivity checks passed!
```

---

## 📊 Phase 6: Health Check Endpoints (10 minutes)

### Step 6.1: Verify Service Health Endpoints

```bash
# API Gateway health
curl http://localhost:3001/health

# System health
curl http://localhost:3001/api/system/health

# Individual services
curl http://localhost:3003/health  # Core
curl http://localhost:3002/health  # Billing
curl http://localhost:3005/health  # CRM
curl http://localhost:3008/health  # Insurance
curl http://localhost:3007/health  # Hospital
curl http://localhost:3004/health  # Finance
curl http://localhost:3006/health  # Membership
curl http://localhost:3009/health  # Wellness
```

---

## 🐛 Phase 7: Troubleshooting (As Needed)

### Issue: Service Connection Failed

```bash
# Check service is running
docker-compose ps
docker ps | grep service-name

# Check logs
docker-compose logs core-service
docker-compose logs api-gateway

# Verify port availability
netstat -an | grep 3000-3009  # Linux
netstat -ano | findstr "3000:3009"  # Windows
```

### Issue: Database Connection Failed

```bash
# Verify database exists
PGPASSWORD=postgres psql -h localhost -U postgres -l

# Test connection string
PGPASSWORD=postgres psql postgresql://postgres:postgres@localhost:5432/medical_coverage_core

# Check PostgreSQL is running
docker-compose ps postgres
```

### Issue: CORS Error in Frontend

```bash
# Update CORS_ORIGINS in .env
# Make sure frontend URL matches
echo $CORS_ORIGINS
# Should include: http://localhost:3000,http://localhost:5173
```

### Issue: Redis Connection Failed

```bash
# Test Redis connection
redis-cli ping
# Should return: PONG

# Check Redis running
docker-compose ps redis
```

---

## 🚀 Phase 8: Deployment Guide

### Development (Docker)

```bash
# 1. Update .env
nano .env
# Set all {SERVICE}_DB_URL to use Docker containers

# 2. Start services
docker-compose up -d

# 3. Run migration for each service
npm run db:push:core
npm run db:push:billing
# ... etc

# 4. Verify connectivity
./scripts/verify-connections.sh
```

### Staging

```bash
# 1. Update .env with staging URLs
VITE_API_URL=https://staging-api.yourdomain.com
CORE_DB_URL=postgresql://user:pass@staging.neon.tech/medical_coverage_core
# ... etc

# 2. Deploy services to staging environment
kubectl apply -f deployment/staging/

# 3. Run migrations
kubectl exec -it core-service -- npm run db:push:core
# ... etc

# 4. Verify from staging environment
curl https://staging-api.yourdomain.com/health
```

### Production

```bash
# 1. Update .env with production URLs (with SSL)
VITE_API_URL=https://api.yourdomain.com
CORE_DB_URL=postgresql://user:pass@prod.neon.tech/medical_coverage_core?sslmode=require
# ... etc

# 2. Deploy to production
kubectl apply -f deployment/production/

# 3. Run migrations
kubectl exec -it core-service -- npm run db:push:core
# ... etc

# 4. Verify production connectivity
curl https://api.yourdomain.com/health
```

---

## 📝 Completion Checklist

- [ ] `.env` file created with all service URLs
- [ ] All service config files updated
- [ ] All drizzle config files updated
- [ ] Frontend API configuration created (`client/src/lib/api.ts`)
- [ ] ServiceRegistry is initialized in API Gateway
- [ ] All fetch/API calls updated in frontend
- [ ] Verification script runs successfully
- [ ] All health endpoints respond
- [ ] Database connections verified
- [ ] Redis connection verified
- [ ] Service-to-service communication working
- [ ] No CORS errors in browser
- [ ] All microservices are discoverable
- [ ] Documentation updated
- [ ] Team trained on new configuration

---

## 📊 Connection Summary

| Layer | Component | Port | Status |
|-------|-----------|------|--------|
| UI | React App | 3000 | ✓ |
| UI | Vite Dev Server | 5173 | ✓ |
| API | Gateway | 3001 | ✓ |
| Microservices | Core | 3003 | ✓ |
| Microservices | Billing | 3002 | ✓ |
| Microservices | CRM | 3005 | ✓ |
| Microservices | Insurance | 3008 | ✓ |
| Microservices | Hospital | 3007 | ✓ |
| Microservices | Finance | 3004 | ✓ |
| Microservices | Membership | 3006 | ✓ |
| Microservices | Wellness | 3009 | ✓ |
| Data | PostgreSQL | 5432 | ✓ |
| Cache | Redis | 6379 | ✓ |

---

## 🔐 Security Considerations

1. **Database URLs**: Never commit `.env` file to git
2. **SSL/TLS**: Use in production with `?sslmode=require`
3. **JWT Secrets**: Rotate regularly in production
4. **CORS Origins**: Whitelist only trusted domains
5. **Service-to-Service**: Use internal DNS names in K8s
6. **Rate Limiting**: Configured in API Gateway
7. **Connection Pooling**: Limit max connections per service

---

## 📞 Support Resources

- **Documentation**: `SERVICE_CONNECTIVITY_AUDIT.md`
- **Configuration**: `SERVICE_CONFIGURATION_TEMPLATES.md`
- **Verification**: `scripts/verify-connections.sh` or `.bat`
- **API Endpoints**: `client/src/lib/api.ts`
- **Service Registry**: `services/api-gateway/src/services/ServiceRegistry.ts`

---

*Last Updated: April 2, 2026*
