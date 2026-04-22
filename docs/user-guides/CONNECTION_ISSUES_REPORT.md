# System Connection Issues Report

**Date**: April 18, 2026  
**Status**: ⚠️ CRITICAL ERRORS FOUND  
**Affected Components**: Database, Services, API Gateway

---

## 🚨 Critical Issues Found

### 1. **DATABASE URL MISMATCH** - BLOCKS SERVICE STARTUP

**Problem**: Services expect `DATABASE_URL` environment variable but .env files use service-specific names.

**Affected Services** (will fail on startup):
- ❌ `wellness-service`: Code looks for `DATABASE_URL`, .env has `WELLNESS_DB_URL`
- ❌ `crm-service`: Code looks for `DATABASE_URL`, .env has `CRM_DB_URL`
- ❌ `membership-service`: Code looks for `DATABASE_URL`, .env has `MEMBERSHIP_DB_URL`
- ❌ `finance-service`: Code looks for `DATABASE_URL`, .env has `FINANCE_DB_URL`
- ❌ `insurance-service`: Code looks for `DATABASE_URL`, .env has `INSURANCE_DB_URL`

**Working Services** ✅:
- ✅ `billing-service`: Correctly uses `DATABASE_URL`
- ✅ `hospital-service`: Correctly uses `DATABASE_URL`
- ✅ `core-service`: Correctly uses both DATABASE_URL and service-specific vars

**Error Message** (when starting affected services):
```
Error: DATABASE_URL environment variable is required
```

**Fix**: Either update all Database.ts files to use service-specific variables OR rename all .env variables to DATABASE_URL.

---

### 2. **PORT CONFIGURATION MISMATCHES** - BLOCKS DOCKER DEPLOYMENT

Services have conflicting port numbers between .env files and Dockerfiles:

| Service | .env PORT | Dockerfile EXPOSE | Expected | Status |
|---------|-----------|-------------------|----------|--------|
| api-gateway | 3000 | 3001 | 3001 | ❌ **MISMATCH** |
| core-service | 3001 | 3002 | 3002 | ❌ **MISMATCH** |
| crm-service | 3007 | 3006 | 3006 | ❌ **MISMATCH** |
| membership-service | 3008 | 3005 | 3005 | ❌ **MISMATCH** |
| finance-service | 3010 | 3007 | 3007 | ❌ **MISMATCH** |
| wellness-service | 3009 | 3008 | 3008 | ❌ **MISMATCH** |
| hospital-service | 3003 | 3003 | 3003 | ✅ OK |
| billing-service | 3004 | 3004 | 3004 | ✅ OK |
| insurance-service | 3002 | 3002 | 3002 | ✅ OK |

**Impact**: Docker containers will start on wrong ports, docker-compose port mapping will fail.

**Fix**: Align .env PORT values with Dockerfile EXPOSE directives.

---

### 3. **API GATEWAY URL MISMATCH** - BLOCKS INTER-SERVICE COMMUNICATION

**Problem**: All services configured to reach API Gateway on wrong port.

**Current Configuration** (❌ WRONG):
```env
API_GATEWAY_URL=http://api-gateway:3000
```

**Should Be** (✅ CORRECT):
```env
API_GATEWAY_URL=http://api-gateway:3001
```

**Affected Services**: ALL services that call API Gateway
- wellness-service
- crm-service
- membership-service
- finance-service
- insurance-service

**Impact**: Services cannot communicate with API Gateway, authentication fails, request routing fails.

---

### 4. **INTER-SERVICE URL MISMATCHES**

**finance-service issues** (.env file):
```env
PAYMENT_SERVICE_URL=http://finance-service:3010  # ❌ WRONG (should be 3007)
CLAIMS_SERVICE_URL=http://claims-service:3005    # ❌ Service doesn't exist
```

**All services** point to API Gateway on port 3000:
```env
API_GATEWAY_URL=http://api-gateway:3000  # ❌ Should be 3001
```

---

### 5. **DATABASE NAME MISMATCH**

**billing-service** (.env):
```env
DATABASE_NAME=medical_coverage_finance  # ❌ WRONG (should be medical_coverage_billing)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/medical_coverage_finance
```

**Impact**: billing-service connects to finance database instead of its own.

---

## 📋 Connection Architecture Issues

### Database Connections
```
wellness-service → DATABASE_URL not set (WELLNESS_DB_URL unused) ❌
   ↓
   DATABASE: medical_coverage_wellness (exists but not connected)
```

### API Gateway Connections
```
All Services → API_GATEWAY_URL=http://api-gateway:3000 ❌
   ↓
   API Gateway listens on port 3001 (mismatch)
```

### Inter-Service Connections
```
finance-service → PAYMENT_SERVICE_URL=http://finance-service:3010
   ↓
   Finance service actually runs on port 3007 ❌
```

---

## ✅ How to Fix (by Priority)

### **Priority 1: Fix Database URL Configuration**
Choose ONE approach:

**Option A** - Update all .env files to use DATABASE_URL:
```bash
# wellness-service/.env
- WELLNESS_DB_URL=postgresql://postgres:postgres@postgres:5432/medical_coverage_wellness
+ DATABASE_URL=postgresql://postgres:postgres@postgres:5432/medical_coverage_wellness

# crm-service/.env
- CRM_DB_URL=postgresql://postgres:postgres@postgres:5432/medical_coverage_crm
+ DATABASE_URL=postgresql://postgres:postgres@postgres:5432/medical_coverage_crm

# Same for: membership-service, finance-service, insurance-service
```

**Option B** - Update Database.ts files to use service-specific variables:
```typescript
// In wellness-service/src/models/Database.ts
const databaseUrl = process.env.WELLNESS_DB_URL;
if (!databaseUrl) {
  throw new Error('WELLNESS_DB_URL environment variable is required');
}
```

**Recommendation**: Option A (standardize on DATABASE_URL for consistency).

---

### **Priority 2: Fix Port Configuration**

Update these .env files to match Dockerfile EXPOSE values:

```bash
# api-gateway/.env
- PORT=3000
+ PORT=3001

# core-service/.env
- PORT=3001
+ PORT=3002

# crm-service/.env
- PORT=3007
+ PORT=3006

# membership-service/.env
- PORT=3008
+ PORT=3005

# finance-service/.env
- PORT=3010
+ PORT=3007

# wellness-service/.env
- PORT=3009
+ PORT=3008
```

---

### **Priority 3: Fix API Gateway URLs**

Update all service .env files:
```bash
# wellness-service/.env
- API_GATEWAY_URL=http://api-gateway:3000
+ API_GATEWAY_URL=http://api-gateway:3001

# crm-service/.env
- API_GATEWAY_URL=http://api-gateway:3000
+ API_GATEWAY_URL=http://api-gateway:3001

# membership-service/.env
- API_GATEWAY_URL=http://api-gateway:3000
+ API_GATEWAY_URL=http://api-gateway:3001

# finance-service/.env
- API_GATEWAY_URL=http://api-gateway:3000
+ API_GATEWAY_URL=http://api-gateway:3001

# insurance-service/.env
- API_GATEWAY_URL=http://api-gateway:3000
+ API_GATEWAY_URL=http://api-gateway:3001
```

---

### **Priority 4: Fix Inter-Service URLs**

**finance-service/.env**:
```bash
- PAYMENT_SERVICE_URL=http://finance-service:3010
+ PAYMENT_SERVICE_URL=http://finance-service:3007

# Remove non-existent service
- CLAIMS_SERVICE_URL=http://claims-service:3005
```

**billing-service/.env**:
```bash
- DATABASE_NAME=medical_coverage_finance
+ DATABASE_NAME=medical_coverage_billing

- DATABASE_URL=postgresql://postgres:postgres@postgres:5432/medical_coverage_finance
+ DATABASE_URL=postgresql://postgres:postgres@postgres:5432/medical_coverage_billing
```

---

## 🔍 Verification Steps

### After Fixing Database URLs:
```bash
# Test wellness-service connection
cd services/wellness-service
npm run dev
# Should NOT see "DATABASE_URL environment variable is required" error
```

### After Fixing Ports:
```bash
# Verify all ports are correct in docker-compose
docker-compose config | grep -A 50 "ports:"

# Expected output:
# ports:
#  - "3001:3001"  # api-gateway
#  - "3002:3002"  # core-service
#  - "3006:3006"  # crm-service
#  etc...
```

### After Fixing API Gateway URLs:
```bash
# Test inter-service communication
curl http://api-gateway:3001/health
# Should return 200 OK
```

### Test Frontend Connection
```bash
# Dev mode
npm run dev:client
# Browser: http://localhost:5173
# Check browser console for API errors
# Should see API calls to http://localhost:3001
```

---

## 📊 Current Connection Status

| Component | Status | Issue |
|-----------|--------|-------|
| **Database Connection** | ❌ BROKEN | DATABASE_URL not set in 5 services |
| **API Gateway Port** | ❌ MISMATCHED | Config says 3000, runs on 3001 |
| **Service Ports** | ❌ MISMATCHED | 6 services have port conflicts |
| **Inter-Service URLs** | ❌ BROKEN | All point to wrong API Gateway port |
| **Frontend→API** | ⚠️ PARTIALLY OK | Client config correct, but gateway port wrong |
| **Database URLs** | ⚠️ PARTIALLY OK | Some services working, 5 will fail |

---

## 🚀 When Fully Fixed

Expected result:
- ✅ All services start without DATABASE_URL errors
- ✅ docker-compose port mappings work correctly
- ✅ Services can communicate with each other
- ✅ Frontend loads at localhost:5173
- ✅ Frontend connects to API Gateway at localhost:3001
- ✅ API Gateway routes to microservices correctly

---

**Next Steps**: 
1. Choose fix approach for database URLs
2. Run Priority 1 fixes
3. Run Priority 2 fixes
4. Run Priority 3 fixes
5. Run Priority 4 fixes
6. Test with `npm run dev:all` or `docker-compose up`
