# Service Connectivity Audit & Configuration Guide

## 📋 Executive Summary

This document ensures proper connections between all UI, API, and Database components in the Medical Coverage System microservices architecture. It identifies current connectivity gaps and provides standardized configuration for all 9 microservices + API Gateway + Frontend.

**Status:** ⚠️ **ISSUES FOUND** - Inconsistent environment configuration, missing service-to-service connections, and non-standardized database URL naming.

---

## 🔍 Current Architecture Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│                        Port 3000 / 5173                          │
│                    http://localhost:3000                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      v (VITE_API_URL)
┌─────────────────────────────────────────────────────────────────┐
│                     API GATEWAY                                   │
│              Port 3001 (Primary Entry Point)                     │
│         Validates Requests → Routes to Microservices             │
└────┬────┬────┬────┬────┬────┬────┬────┬────┬─────────────────────┘
     │    │    │    │    │    │    │    │    │
     v    v    v    v    v    v    v    v    v
  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │  Core    │ │ Billing  │ │   CRM    │ │Insurance │
  │ 3003/DB  │ │ 3002/DB  │ │ 3005/DB  │ │ 3008/DB  │
  └──────────┘ └──────────┘ └──────────┘ └──────────┘
  
  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ Hospital │ │ Finance  │ │Membership│ │ Wellness │
  │ 3007/DB  │ │ 3004/DB  │ │ 3006/DB  │ │ 3009/DB  │
  └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

---

## 🚨 Issues Identified

### Issue 1: Inconsistent Database URL Environment Variables
**Severity:** HIGH
**Location:** Multiple service config files
**Problem:** Services use different variable names for database URLs:
- Core service: `CORE_DB_URL` (or fallback to `DATABASE_URL`)
- CRM service: `DATABASE_URL` (ignores `CRM_DB_URL`)
- Other services: Various naming conventions

**Impact:** Deployment scripts cannot standardize database configuration

**Code Reference:**
```typescript
// services/core-service/src/config/index.ts
database: {
  url: process.env.CORE_DB_URL || process.env.DATABASE_URL,
}

// services/crm-service/src/config/index.ts
database: {
  url: process.env.DATABASE_URL,  // Does not check CRM_DB_URL
}
```

---

### Issue 2: Frontend API Configuration Missing
**Severity:** MEDIUM
**Location:** Client-side API setup
**Problem:** Frontend uses hardcoded fetch URLs instead of centralized configuration:
```typescript
// client/src/lib/queryClient.ts
fetch(url, { method, ... })  // No API_GATEWAY_URL prefix
```

**Impact:** Cannot dynamically route to different API Gateway addresses (dev/staging/prod)

---

### Issue 3: Service-to-Service Port Misalignment
**Severity:** HIGH
**Location:** API Gateway config vs docker-compose.yml
**Problem:** Port mappings inconsistent:

API Gateway Config:
```typescript
hospital: {
  url: process.env.HOSPITAL_SERVICE_URL || 'http://localhost:3007',  // ✓ Correct
},
```

But in docker-compose.yml, services might use different ports internally.

---

### Issue 4: No Health Check Verification
**Severity:** MEDIUM
**Location:** Services startup
**Problem:** No automated verification that all connections are working at startup

---

### Issue 5: Database Schema Path Inconsistency
**Severity:** MEDIUM
**Location:** drizzle config files
**Problem:** inconsistent schema paths:
```typescript
// drizzle.core.config.ts
schema: "./shared/schemas/core.ts",

// drizzle.crm.config.ts
schema: "./shared/schemas/crm.ts",  // May not exist
```

---

## ✅ Solution: Standardized Configuration

### Step 1: Create Unified .env.services Template

Create `.env.services.template` in the root directory:

```bash
# ==========================================
# MICROSERVICES ENVIRONMENT CONFIGURATION
# ==========================================
# Copy to .env and update with your values

# --- Global Configuration ---
NODE_ENV=development
LOG_LEVEL=info

# --- API Gateway Configuration ---
GATEWAY_PORT=3001
API_GATEWAY_URL=http://api-gateway:3001
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# --- Core Service ---
CORE_SERVICE_PORT=3003
CORE_SERVICE_URL=http://core-service:3003
CORE_DB_URL=postgresql://user:password@postgres:5432/medical_coverage_core
CORE_DB_POOL_SIZE=20

# --- Billing Service ---
BILLING_SERVICE_PORT=3002
BILLING_SERVICE_URL=http://billing-service:3002
BILLING_DB_URL=postgresql://user:password@postgres:5432/medical_coverage_billing
BILLING_DB_POOL_SIZE=20

# --- CRM Service ---
CRM_SERVICE_PORT=3005
CRM_SERVICE_URL=http://crm-service:3005
CRM_DB_URL=postgresql://user:password@postgres:5432/medical_coverage_crm
CRM_DB_POOL_SIZE=20

# --- Insurance Service ---
INSURANCE_SERVICE_PORT=3008
INSURANCE_SERVICE_URL=http://insurance-service:3008
INSURANCE_DB_URL=postgresql://user:password@postgres:5432/medical_coverage_insurance
INSURANCE_DB_POOL_SIZE=20

# --- Hospital Service ---
HOSPITAL_SERVICE_PORT=3007
HOSPITAL_SERVICE_URL=http://hospital-service:3007
HOSPITAL_DB_URL=postgresql://user:password@postgres:5432/medical_coverage_hospital
HOSPITAL_DB_POOL_SIZE=20

# --- Finance Service ---
FINANCE_SERVICE_PORT=3004
FINANCE_SERVICE_URL=http://finance-service:3004
FINANCE_DB_URL=postgresql://user:password@postgres:5432/medical_coverage_finance
FINANCE_DB_POOL_SIZE=20

# --- Membership Service ---
MEMBERSHIP_SERVICE_PORT=3006
MEMBERSHIP_SERVICE_URL=http://membership-service:3006
MEMBERSHIP_DB_URL=postgresql://user:password@postgres:5432/medical_coverage_membership
MEMBERSHIP_DB_POOL_SIZE=20

# --- Wellness Service ---
WELLNESS_SERVICE_PORT=3009
WELLNESS_SERVICE_URL=http://wellness-service:3009
WELLNESS_DB_URL=postgresql://user:password@postgres:5432/medical_coverage_wellness
WELLNESS_DB_POOL_SIZE=20

# --- Redis Cache ---
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=
REDIS_DB=0

# --- Security ---
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# --- Service Timeouts & Retries ---
SERVICE_TIMEOUT=5000
SERVICE_RETRIES=3
HEALTH_CHECK_INTERVAL=30000

# --- CORS Configuration ---
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:3001
CORS_CREDENTIALS=true

# --- Database Connection Pooling (for all services) ---
DB_CONNECTION_TIMEOUT=30000
DB_MAX_CONNECTIONS=50
DB_SSL_MODE=prefer
```

---

### Step 2: Update Service Configuration Files

**File: services/core-service/src/config/index.ts**
```typescript
export const config = {
  port: parseInt(process.env.CORE_SERVICE_PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.CORE_DB_URL || 'postgresql://postgres:postgres@localhost:5432/medical_coverage_core',
    poolSize: parseInt(process.env.CORE_DB_POOL_SIZE || '20', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  serviceRegistry: {
    gateway: process.env.API_GATEWAY_URL || 'http://localhost:3001',
    billing: process.env.BILLING_SERVICE_URL || 'http://localhost:3002',
    core: process.env.CORE_SERVICE_URL || 'http://localhost:3003',
    crm: process.env.CRM_SERVICE_URL || 'http://localhost:3005',
    insurance: process.env.INSURANCE_SERVICE_URL || 'http://localhost:3008',
    hospital: process.env.HOSPITAL_SERVICE_URL || 'http://localhost:3007',
    finance: process.env.FINANCE_SERVICE_URL || 'http://localhost:3004',
    membership: process.env.MEMBERSHIP_SERVICE_URL || 'http://localhost:3006',
    wellness: process.env.WELLNESS_SERVICE_URL || 'http://localhost:3009',
  },

  serviceTimeouts: {
    timeout: parseInt(process.env.SERVICE_TIMEOUT || '5000', 10),
    retries: parseInt(process.env.SERVICE_RETRIES || '3', 10),
  },

  healthCheck: {
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
  }
};
```

**Similar updates needed for:** 
- `services/billing-service/src/config/index.ts`
- `services/crm-service/src/config/index.ts`
- `services/insurance-service/src/config/index.ts`
- `services/hospital-service/src/config/index.ts`
- `services/finance-service/src/config/index.ts`
- `services/membership-service/src/config/index.ts`
- `services/wellness-service/src/config/index.ts`

---

### Step 3: Update Drizzle Configuration Files

**File: config/drizzle.core.config.ts**
```typescript
import { defineConfig } from "drizzle-kit";

if (!process.env.CORE_DB_URL) {
  throw new Error(
    "CORE_DB_URL is required for Core service database. " +
    "Set it in .env or environment variables. " +
    "Example: postgresql://user:pass@host:5432/medical_coverage_core"
  );
}

export default defineConfig({
  out: "./services/core-service/migrations/core",
  schema: "./shared/schemas/core.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.CORE_DB_URL,
  },
  verbose: process.env.DRIZZLE_VERBOSE === 'true',
  strict: process.env.DRIZZLE_STRICT === 'false' ? false : true,
});
```

**Update all drizzle config files similarly:**
- `config/drizzle.billing.config.ts` → `BILLING_DB_URL`
- `config/drizzle.crm.config.ts` → `CRM_DB_URL`
- `config/drizzle.insurance.config.ts` → `INSURANCE_DB_URL`
- `config/drizzle.hospital.config.ts` → `HOSPITAL_DB_URL`
- `config/drizzle.finance.config.ts` → `FINANCE_DB_URL`
- `config/drizzle.membership.config.ts` → `MEMBERSHIP_DB_URL`
- `config/drizzle.wellness.config.ts` → `WELLNESS_DB_URL`

---

### Step 4: Update Frontend API Configuration

**File: client/src/lib/api.ts** (create if doesn't exist)
```typescript
export const API_BASE_URL = 
  process.env.VITE_API_URL || 'http://localhost:3001';

export const createApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
};

export const API_ENDPOINTS = {
  // Core Service
  members: '/api/core/members',
  companies: '/api/core/companies',
  
  // Billing Service
  invoices: '/api/billing/invoices',
  payments: '/api/billing/payments',
  
  // CRM Service
  leads: '/api/crm/leads',
  agents: '/api/crm/agents',
  
  // Insurance Service
  policies: '/api/insurance/policies',
  claims: '/api/insurance/claims',
  
  // Finance Service
  transactions: '/api/finance/transactions',
  reports: '/api/finance/reports',
  
  // Membership Service
  memberships: '/api/membership/memberships',
  enrollments: '/api/membership/enrollments',
  
  // Hospital Service
  hospitals: '/api/hospital/hospitals',
  departments: '/api/hospital/departments',
  
  // Wellness Service
  programs: '/api/wellness/programs',
  incentives: '/api/wellness/incentives',

  // System
  health: '/health',
  systemHealth: '/api/system/health',
  auth: '/api/auth',
} as const;
```

**Update: client/src/lib/queryClient.ts**
```typescript
import { createApiUrl, API_BASE_URL } from './api';

export async function apiRequest(
  method: string,
  endpoint: string,
  data?: unknown | undefined,
): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : createApiUrl(endpoint);
  
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Version': '2.0',
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });

  await throwIfResNotOk(res);
  return res;
}
```

---

### Step 5: Update API Gateway Service Registry

**File: services/api-gateway/src/services/ServiceRegistry.ts** (create if doesn't exist)
```typescript
interface ServiceConfig {
  url: string;
  timeout: number;
  retries: number;
  healthCheckPath: string;
}

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, ServiceConfig> = new Map();

  private constructor() {
    this.initializeServices();
  }

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  private initializeServices(): void {
    this.services.set('core', {
      url: process.env.CORE_SERVICE_URL || 'http://localhost:3003',
      timeout: parseInt(process.env.SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.SERVICE_RETRIES || '3', 10),
      healthCheckPath: '/health',
    });

    this.services.set('billing', {
      url: process.env.BILLING_SERVICE_URL || 'http://localhost:3002',
      timeout: parseInt(process.env.SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.SERVICE_RETRIES || '3', 10),
      healthCheckPath: '/health',
    });

    this.services.set('crm', {
      url: process.env.CRM_SERVICE_URL || 'http://localhost:3005',
      timeout: parseInt(process.env.SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.SERVICE_RETRIES || '3', 10),
      healthCheckPath: '/health',
    });

    this.services.set('insurance', {
      url: process.env.INSURANCE_SERVICE_URL || 'http://localhost:3008',
      timeout: parseInt(process.env.SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.SERVICE_RETRIES || '3', 10),
      healthCheckPath: '/health',
    });

    this.services.set('hospital', {
      url: process.env.HOSPITAL_SERVICE_URL || 'http://localhost:3007',
      timeout: parseInt(process.env.SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.SERVICE_RETRIES || '3', 10),
      healthCheckPath: '/health',
    });

    this.services.set('finance', {
      url: process.env.FINANCE_SERVICE_URL || 'http://localhost:3004',
      timeout: parseInt(process.env.SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.SERVICE_RETRIES || '3', 10),
      healthCheckPath: '/health',
    });

    this.services.set('membership', {
      url: process.env.MEMBERSHIP_SERVICE_URL || 'http://localhost:3006',
      timeout: parseInt(process.env.SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.SERVICE_RETRIES || '3', 10),
      healthCheckPath: '/health',
    });

    this.services.set('wellness', {
      url: process.env.WELLNESS_SERVICE_URL || 'http://localhost:3009',
      timeout: parseInt(process.env.SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.SERVICE_RETRIES || '3', 10),
      healthCheckPath: '/health',
    });
  }

  getService(serviceName: string): ServiceConfig {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in registry`);
    }
    return service;
  }

  getAllServices(): Map<string, ServiceConfig> {
    return new Map(this.services);
  }

  async healthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [name, config] of this.services) {
      try {
        const response = await fetch(`${config.url}${config.healthCheckPath}`, {
          method: 'GET',
          timeout: config.timeout,
        });
        results.set(name, response.ok);
      } catch (error) {
        results.set(name, false);
      }
    }

    return results;
  }
}
```

---

## 🔌 Connection Verification Checklist

### Pre-Deployment Verification

Run this script to verify all connections:

**File: scripts/verify-connections.sh**
```bash
#!/bin/bash

set -e

echo "🔍 Service Connectivity Verification"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Frontend to API Gateway
echo -e "${YELLOW}1. Frontend → API Gateway${NC}"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Frontend accessible at http://localhost:3000${NC}"
else
  echo -e "${RED}✗ Frontend not accessible${NC}"
fi

# Check API Gateway Health
echo -e "${YELLOW}2. API Gateway Health Check${NC}"
if curl -s http://localhost:3001/health | grep -q "ok\|healthy"; then
  echo -e "${GREEN}✓ API Gateway healthy${NC}"
else
  echo -e "${RED}✗ API Gateway health check failed${NC}"
fi

# Check each service
SERVICES=(
  "core:3003"
  "billing:3002"
  "crm:3005"
  "insurance:3008"
  "hospital:3007"
  "finance:3004"
  "membership:3006"
  "wellness:3009"
)

echo -e "${YELLOW}3. Microservices Health Checks${NC}"
for service in "${SERVICES[@]}"; do
  IFS=':' read -r name port <<< "$service"
  if curl -s http://localhost:${port}/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ ${name} service (port ${port}) healthy${NC}"
  else
    echo -e "${RED}✗ ${name} service (port ${port}) not responding${NC}"
  fi
done

# Check Database Connections
echo -e "${YELLOW}4. Database Connections${NC}"
DATABASES=(
  "medical_coverage_core"
  "medical_coverage_billing"
  "medical_coverage_crm"
  "medical_coverage_insurance"
  "medical_coverage_hospital"
  "medical_coverage_finance"
  "medical_coverage_membership"
  "medical_coverage_wellness"
)

for db in "${DATABASES[@]}"; do
  if PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -U postgres -d $db -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database $db connected${NC}"
  else
    echo -e "${RED}✗ Database $db connection failed${NC}"
  fi
done

# Check Redis Connection
echo -e "${YELLOW}5. Redis Cache${NC}"
if redis-cli -h localhost ping | grep -q "PONG"; then
  echo -e "${GREEN}✓ Redis connected${NC}"
else
  echo -e "${RED}✗ Redis connection failed${NC}"
fi

# Check API Gateway can reach services
echo -e "${YELLOW}6. API Gateway → Micro services${NC}"
curl -s http://localhost:3001/api/system/health | jq '.services // {}' 2>/dev/null || \
  echo -e "${YELLOW}⚠ Unable to verify service registry${NC}"

echo ""
echo "===================================="
echo "Verification complete!"
```

---

## 📦 Environment Configuration by Deployment Stage

### Development (.env.development)
```
NODE_ENV=development
VITE_API_URL=http://localhost:3001
CORE_DB_URL=postgresql://postgres:postgres@localhost:5432/medical_coverage_core
BILLING_DB_URL=postgresql://postgres:postgres@localhost:5432/medical_coverage_billing
# ... etc for all services
```

### Staging (.env.staging)
```
NODE_ENV=staging
VITE_API_URL=https://api-staging.yourdomain.com
CORE_DB_URL=postgresql://user:pass@staging-db.neon.tech/medical_coverage_core
BILLING_DB_URL=postgresql://user:pass@staging-db.neon.tech/medical_coverage_billing
# ... etc for all services
```

### Production (.env.production)
```
NODE_ENV=production
VITE_API_URL=https://api.yourdomain.com
CORE_DB_URL=postgresql://user:pass@prod-db.neon.tech/medical_coverage_core?sslmode=require
BILLING_DB_URL=postgresql://user:pass@prod-db.neon.tech/medical_coverage_billing?sslmode=require
# ... etc for all services
```

---

## 🚀 Implementation Steps

1. **Create `.env.services.template`** - Copy the template above
2. **Update all service config files** - Use the standardized naming convention
3. **Update drizzle configs** - Use service-specific database URLs
4. **Update frontend API client** - Add centralized API configuration
5. **Create/Update ServiceRegistry** - Centralize all service URLs
6. **Add verification script** - Use verify-connections.sh for testing
7. **Update docker-compose.yml** - Ensure environment variables align
8. **Test connections** - Run verification before deployment

---

## 📊 Connection Matrix

| Component | Default Port | Connects To | Environment Variable |
|-----------|--------------|------------|----------------------|
| Frontend | 3000 / 5173 | API Gateway | VITE_API_URL |
| API Gateway | 3001 | Core (3003), Billing (3002), CRM (3005), etc. | API_GATEWAY_URL |
| Core Service | 3003 | PostgreSQL, Redis | CORE_SERVICE_URL, CORE_DB_URL |
| Billing Service | 3002 | PostgreSQL, Redis | BILLING_SERVICE_URL, BILLING_DB_URL |
| CRM Service | 3005 | PostgreSQL, Redis | CRM_SERVICE_URL, CRM_DB_URL |
| Insurance Service | 3008 | PostgreSQL, Redis | INSURANCE_SERVICE_URL, INSURANCE_DB_URL |
| Hospital Service | 3007 | PostgreSQL, Redis | HOSPITAL_SERVICE_URL, HOSPITAL_DB_URL |
| Finance Service | 3004 | PostgreSQL, Redis | FINANCE_SERVICE_URL, FINANCE_DB_URL |
| Membership Service | 3006 | PostgreSQL, Redis | MEMBERSHIP_SERVICE_URL, MEMBERSHIP_DB_URL |
| Wellness Service | 3009 | PostgreSQL, Redis | WELLNESS_SERVICE_URL, WELLNESS_DB_URL |

---

## 🔐 Security Notes

- All database URLs should use SSL in production
- Service-to-service communication should use internal DNS names in Kubernetes
- JWT secrets must be rotated regularly
- Rate limiting configured on API Gateway
- CORS origins must be explicitly whitelist in production

---

## 📞 Troubleshooting

### Service not responding
- Check service is running: `docker ps | grep service-name`
- Check logs: `docker logs service-name`
- Verify port mapping: `netstat -an | grep 3001-3009`
- Test connectivity: `curl -v http://localhost:3001/health`

### Database connection failed
- Verify DATABASE_URL: `echo $CORE_DB_URL`
- Test connection: `psql $CORE_DB_URL`
- Check PostgreSQL is running: `docker ps | grep postgres`

### Frontend API calls failing
- Check browser console for CORS errors
- Verify VITE_API_URL matches API Gateway URL
- Check API Gateway is running and healthy

---

*Last Updated: April 2, 2026*
