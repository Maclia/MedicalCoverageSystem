# Service Configuration Standardization Guide

## Overview

This guide provides standardized configuration templates for all 9 microservices to ensure consistent database URLs, service registry, and API gateway connections.

---

## 1. Core Service Configuration

**File:** `services/core-service/src/config/index.ts`

```typescript
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  // Service identification
  serviceName: 'core-service',
  port: parseInt(process.env.CORE_SERVICE_PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database connection
  database: {
    url:
      process.env.CORE_DB_URL ||
      'postgresql://postgres:postgres@localhost:5432/medical_coverage_core',
    poolSize: parseInt(process.env.CORE_DB_POOL_SIZE || '20', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
    sslMode: process.env.DB_SSL_MODE || 'prefer',
  },

  // Redis cache
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // JWT authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'core-service-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'core-service-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Internal service discovery
  serviceRegistry: {
    gateway: process.env.API_GATEWAY_URL || 'http://localhost:3001',
    billing: process.env.BILLING_SERVICE_URL || 'http://localhost:3002',
    crm: process.env.CRM_SERVICE_URL || 'http://localhost:3005',
    insurance: process.env.INSURANCE_SERVICE_URL || 'http://localhost:3008',
    hospital: process.env.HOSPITAL_SERVICE_URL || 'http://localhost:3007',
    finance: process.env.FINANCE_SERVICE_URL || 'http://localhost:3004',
    membership: process.env.MEMBERSHIP_SERVICE_URL || 'http://localhost:3006',
    wellness: process.env.WELLNESS_SERVICE_URL || 'http://localhost:3009',
  },

  // Service timeouts and retries
  serviceTimeouts: {
    timeout: parseInt(process.env.SERVICE_TIMEOUT || '5000', 10),
    retries: parseInt(process.env.SERVICE_RETRIES || '3', 10),
  },

  // Health checks
  healthCheck: {
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enabled: process.env.LOGGING_ENABLED !== 'false',
  },

  // Security settings
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(','),
    corsCredentials: process.env.CORS_CREDENTIALS === 'true',
  },
};
```

---

## 2. Billing Service Configuration

**File:** `services/billing-service/src/config/index.ts`

```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  serviceName: 'billing-service',
  port: parseInt(process.env.BILLING_SERVICE_PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url:
      process.env.BILLING_DB_URL ||
      'postgresql://postgres:postgres@localhost:5432/medical_coverage_billing',
    poolSize: parseInt(process.env.BILLING_DB_POOL_SIZE || '20', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
    sslMode: process.env.DB_SSL_MODE || 'prefer',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'billing-service-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'billing-service-refresh-secret',
  },

  serviceRegistry: {
    gateway: process.env.API_GATEWAY_URL || 'http://localhost:3001',
    core: process.env.CORE_SERVICE_URL || 'http://localhost:3003',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
```

---

## 3. CRM Service Configuration

**File:** `services/crm-service/src/config/index.ts`

```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  serviceName: 'crm-service',
  port: parseInt(process.env.CRM_SERVICE_PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url:
      process.env.CRM_DB_URL ||
      'postgresql://postgres:postgres@localhost:5432/medical_coverage_crm',
    poolSize: parseInt(process.env.CRM_DB_POOL_SIZE || '20', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
    sslMode: process.env.DB_SSL_MODE || 'prefer',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'crm-service-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'crm-service-refresh-secret',
  },

  serviceRegistry: {
    gateway: process.env.API_GATEWAY_URL || 'http://localhost:3001',
    core: process.env.CORE_SERVICE_URL || 'http://localhost:3003',
    finance: process.env.FINANCE_SERVICE_URL || 'http://localhost:3004',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
```

---

## 4. Insurance Service Configuration

**File:** `services/insurance-service/src/config/index.ts`

```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  serviceName: 'insurance-service',
  port: parseInt(process.env.INSURANCE_SERVICE_PORT || '3008', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url:
      process.env.INSURANCE_DB_URL ||
      'postgresql://postgres:postgres@localhost:5432/medical_coverage_insurance',
    poolSize: parseInt(process.env.INSURANCE_DB_POOL_SIZE || '20', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
    sslMode: process.env.DB_SSL_MODE || 'prefer',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'insurance-service-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'insurance-service-refresh-secret',
  },

  serviceRegistry: {
    gateway: process.env.API_GATEWAY_URL || 'http://localhost:3001',
    core: process.env.CORE_SERVICE_URL || 'http://localhost:3003',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
```

---

## 5. Hospital Service Configuration

**File:** `services/hospital-service/src/config/index.ts`

```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  serviceName: 'hospital-service',
  port: parseInt(process.env.HOSPITAL_SERVICE_PORT || '3007', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url:
      process.env.HOSPITAL_DB_URL ||
      'postgresql://postgres:postgres@localhost:5432/medical_coverage_hospital',
    poolSize: parseInt(process.env.HOSPITAL_DB_POOL_SIZE || '20', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
    sslMode: process.env.DB_SSL_MODE || 'prefer',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'hospital-service-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'hospital-service-refresh-secret',
  },

  serviceRegistry: {
    gateway: process.env.API_GATEWAY_URL || 'http://localhost:3001',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
```

---

## 6. Finance Service Configuration

**File:** `services/finance-service/src/config/index.ts`

```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  serviceName: 'finance-service',
  port: parseInt(process.env.FINANCE_SERVICE_PORT || '3004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url:
      process.env.FINANCE_DB_URL ||
      'postgresql://postgres:postgres@localhost:5432/medical_coverage_finance',
    poolSize: parseInt(process.env.FINANCE_DB_POOL_SIZE || '20', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
    sslMode: process.env.DB_SSL_MODE || 'prefer',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'finance-service-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'finance-service-refresh-secret',
  },

  serviceRegistry: {
    gateway: process.env.API_GATEWAY_URL || 'http://localhost:3001',
    core: process.env.CORE_SERVICE_URL || 'http://localhost:3003',
    billing: process.env.BILLING_SERVICE_URL || 'http://localhost:3002',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
```

---

## 7. Membership Service Configuration

**File:** `services/membership-service/src/config/index.ts`

```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  serviceName: 'membership-service',
  port: parseInt(process.env.MEMBERSHIP_SERVICE_PORT || '3006', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url:
      process.env.MEMBERSHIP_DB_URL ||
      'postgresql://postgres:postgres@localhost:5432/medical_coverage_membership',
    poolSize: parseInt(process.env.MEMBERSHIP_DB_POOL_SIZE || '20', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
    sslMode: process.env.DB_SSL_MODE || 'prefer',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'membership-service-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'membership-service-refresh-secret',
  },

  serviceRegistry: {
    gateway: process.env.API_GATEWAY_URL || 'http://localhost:3001',
    core: process.env.CORE_SERVICE_URL || 'http://localhost:3003',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
```

---

## 8. Wellness Service Configuration

**File:** `services/wellness-service/src/config/index.ts`

```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  serviceName: 'wellness-service',
  port: parseInt(process.env.WELLNESS_SERVICE_PORT || '3009', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url:
      process.env.WELLNESS_DB_URL ||
      'postgresql://postgres:postgres@localhost:5432/medical_coverage_wellness',
    poolSize: parseInt(process.env.WELLNESS_DB_POOL_SIZE || '20', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
    sslMode: process.env.DB_SSL_MODE || 'prefer',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'wellness-service-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'wellness-service-refresh-secret',
  },

  serviceRegistry: {
    gateway: process.env.API_GATEWAY_URL || 'http://localhost:3001',
    core: process.env.CORE_SERVICE_URL || 'http://localhost:3003',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
```

---

## 9. API Gateway Configuration

**File:** `services/api-gateway/src/config/index.ts` (already has good structure)

```typescript
export const config = {
  port: parseInt(process.env.GATEWAY_PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Service registry for routing
  services: {
    core: {
      url: process.env.CORE_SERVICE_URL || 'http://localhost:3003',
      timeout: parseInt(process.env.SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.SERVICE_RETRIES || '3', 10),
    },
    billing: {
      url: process.env.BILLING_SERVICE_URL || 'http://localhost:3002',
      timeout: parseInt(process.env.SERVICE_TIMEOUT || '5000', 10),
      retries: parseInt(process.env.SERVICE_RETRIES || '3', 10),
    },
    // ... includes all 8 services
  },

  // Health check configuration
  healthCheck: {
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
  },

  // Security settings
  security: {
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(','),
  },
};
```

---

## Implementation Checklist

- [ ] Copy `.env.services.template` to `.env` and update values
- [ ] Update all service config/index.ts files with standardized configuration
- [ ] Update all drizzle config files to use {SERVICE}_DB_URL variables
- [ ] Create `client/src/lib/api.ts` with centralized API configuration
- [ ] Update `client/src/lib/queryClient.ts` to use API configuration
- [ ] Create `services/api-gateway/src/services/ServiceRegistry.ts`
- [ ] Create verification scripts: `verify-connections.sh` and `verify-connections.bat`
- [ ] Update docker-compose.yml environment variables section
- [ ] Run verification: `./scripts/verify-connections.sh` or `scripts\verify-connections.bat`
- [ ] Test all service-to-service communication
- [ ] Verify database connections for each service
- [ ] Update deployment documentation

---

## Environment Variable Summary

| Variable | Purpose | Example |
|----------|---------|---------|
| `{SERVICE}_SERVICE_PORT` | Service port | `CORE_SERVICE_PORT=3003` |
| `{SERVICE}_SERVICE_URL` | Service URL for inter-service communication | `CORE_SERVICE_URL=http://localhost:3003` |
| `{SERVICE}_DB_URL` | Database connection string | `CORE_DB_URL=postgresql://user:pass@host/db` |
| `{SERVICE}_DB_POOL_SIZE` | Connection pool size | `CORE_DB_POOL_SIZE=20` |
| `API_GATEWAY_URL` | API Gateway internal URL | `API_GATEWAY_URL=http://localhost:3001` |
| `VITE_API_URL` | Frontend API Gateway URL | `VITE_API_URL=http://localhost:3001` |
| `REDIS_URL` | Redis connection | `REDIS_URL=redis://localhost:6379` |
| `SERVICE_TIMEOUT` | Service call timeout | `SERVICE_TIMEOUT=5000` |
| `SERVICE_RETRIES` | Service call retries | `SERVICE_RETRIES=3` |
| `HEALTH_CHECK_INTERVAL` | Health check interval | `HEALTH_CHECK_INTERVAL=30000` |

---

*Last Updated: April 2, 2026*
