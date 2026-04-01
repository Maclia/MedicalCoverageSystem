# Service Connectivity Quick Reference

## 🎯 Connection Map

```
┌──────────────────┐
│   Frontend UI    │ (port 3000 / 5173)
│  React + Vite    │
└────────┬─────────┘
         │ (VITE_API_URL)
         ↓
┌──────────────────────────────┐
│      API GATEWAY             │ (port 3001)
│  Central Route & Auth        │
└──┬──┬─┬──┬──┬──┬──┬──┬───────┘
   │  │ │  │  │  │  │  │
   ↓  ↓ ↓  ↓  ↓  ↓  ↓  ↓
  Core Billing CRM Ins... Hospital Finance Member... Wellness
  3003  3002   3005 3008 3007    3004   3006     3009
   │    │      │    │    │       │      │        │
   ↓    ↓      ↓    ↓    ↓       ↓      ↓        ↓
  [PostgreSQL Database per Service]
   ├─ medical_coverage_core
   ├─ medical_coverage_billing
   ├─ medical_coverage_crm
   ├─ medical_coverage_insurance
   ├─ medical_coverage_hospital
   ├─ medical_coverage_finance
   ├─ medical_coverage_membership
   └─ medical_coverage_wellness

[Redis Cache - Shared]
```

---

## 📋 Environment Variables Checklist

### Frontend
- [ ] `VITE_API_URL=http://localhost:3001` (or production URL)
- [ ] `VITE_WS_URL=ws://localhost:3001` (for WebSocket)

### API Gateway
- [ ] `GATEWAY_PORT=3001`
- [ ] `API_GATEWAY_URL=http://localhost:3001`

### Core Service
- [ ] `CORE_SERVICE_PORT=3003`
- [ ] `CORE_SERVICE_URL=http://localhost:3003`
- [ ] `CORE_DB_URL=postgresql://postgres:postgres@localhost:5432/medical_coverage_core`

### Billing Service
- [ ] `BILLING_SERVICE_PORT=3002`
- [ ] `BILLING_SERVICE_URL=http://localhost:3002`
- [ ] `BILLING_DB_URL=postgresql://postgres:postgres@localhost:5432/medical_coverage_billing`

### CRM Service
- [ ] `CRM_SERVICE_PORT=3005`
- [ ] `CRM_SERVICE_URL=http://localhost:3005`
- [ ] `CRM_DB_URL=postgresql://postgres:postgres@localhost:5432/medical_coverage_crm`

### Insurance Service
- [ ] `INSURANCE_SERVICE_PORT=3008`
- [ ] `INSURANCE_SERVICE_URL=http://localhost:3008`
- [ ] `INSURANCE_DB_URL=postgresql://postgres:postgres@localhost:5432/medical_coverage_insurance`

### Hospital Service
- [ ] `HOSPITAL_SERVICE_PORT=3007`
- [ ] `HOSPITAL_SERVICE_URL=http://localhost:3007`
- [ ] `HOSPITAL_DB_URL=postgresql://postgres:postgres@localhost:5432/medical_coverage_hospital`

### Finance Service
- [ ] `FINANCE_SERVICE_PORT=3004`
- [ ] `FINANCE_SERVICE_URL=http://localhost:3004`
- [ ] `FINANCE_DB_URL=postgresql://postgres:postgres@localhost:5432/medical_coverage_finance`

### Membership Service
- [ ] `MEMBERSHIP_SERVICE_PORT=3006`
- [ ] `MEMBERSHIP_SERVICE_URL=http://localhost:3006`
- [ ] `MEMBERSHIP_DB_URL=postgresql://postgres:postgres@localhost:5432/medical_coverage_membership`

### Wellness Service
- [ ] `WELLNESS_SERVICE_PORT=3009`
- [ ] `WELLNESS_SERVICE_URL=http://localhost:3009`
- [ ] `WELLNESS_DB_URL=postgresql://postgres:postgres@localhost:5432/medical_coverage_wellness`

### Shared Services
- [ ] `REDIS_URL=redis://localhost:6379`
- [ ] `JWT_SECRET=your-secret-key-min-32-chars`
- [ ] `JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars`

---

## 🔗 API Endpoint Structure

All endpoints go through the API Gateway at `http://localhost:3001`

```
/api/core/*              → Core Service (3003)
/api/billing/*           → Billing Service (3002)
/api/crm/*               → CRM Service (3005)
/api/insurance/*         → Insurance Service (3008)
/api/hospital/*          → Hospital Service (3007)
/api/finance/*           → Finance Service (3004)
/api/membership/*        → Membership Service (3006)
/api/wellness/*          → Wellness Service (3009)
/api/system/*            → System Endpoints (Gateway)
/health                  → Gateway Health Check
/api/system/health       → System Health Check
```

---

## 🧪 Verification Commands

### Test Connectivity
```bash
# Linux/Mac
chmod +x scripts/verify-connections.sh
./scripts/verify-connections.sh

# Windows
powershell -ExecutionPolicy Bypass -File scripts/verify-connections.bat
```

### Individual Service Health Checks
```bash
# Gateway
curl http://localhost:3001/health

# Services
curl http://localhost:3003/health  # Core
curl http://localhost:3002/health  # Billing
curl http://localhost:3005/health  # CRM
curl http://localhost:3008/health  # Insurance
curl http://localhost:3007/health  # Hospital
curl http://localhost:3004/health  # Finance
curl http://localhost:3006/health  # Membership
curl http://localhost:3009/health  # Wellness
```

### Database Connection Test
```bash
# Format: PGPASSWORD=password psql -h host -U user -d database -c "SELECT 1"
PGPASSWORD=postgres psql -h localhost -U postgres -d medical_coverage_core -c "SELECT 1"
```

### Redis Connection Test
```bash
redis-cli ping
# Expected: PONG
```

---

## 🚀 Quick Start (Development)

1. **Copy environment template**
   ```bash
   cp .env.services.template .env
   ```

2. **Start services**
   ```bash
   docker-compose up -d
   ```

3. **Create databases** (if not exist)
   ```bash
   docker-compose exec postgres psql -U postgres -c "CREATE DATABASE medical_coverage_core;"
   # ... create all 8 databases
   ```

4. **Run migrations**
   ```bash
   npm run db:push:core
   npm run db:push:billing
   # ... etc for all services
   ```

5. **Verify connectivity**
   ```bash
   ./scripts/verify-connections.sh
   ```

6. **Access services**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:3001/api/docs
   - System Health: http://localhost:3001/api/system/health

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `.env.services.template` | Environment variable template |
| `services/*/src/config/index.ts` | Service configuration (8 files) |
| `config/drizzle.*.config.ts` | Database configuration (8 files) |
| `client/src/lib/api.ts` | Frontend API configuration |
| `services/api-gateway/src/services/ServiceRegistry.ts` | Service discovery |

---

## ⚠️ Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Service not responding | Check running: `docker-compose ps` |
| Database connection failed | Verify DATABASE_URL and PostgreSQL running |
| CORS error in frontend | Check CORS_ORIGINS in .env matches frontend URL |
| Redis connection failed | Verify Redis running: `redis-cli ping` |
| Service discovery failed | Check ServiceRegistry initialized in API Gateway |
| Health check timeout | Increase timeout or check service logs |
| Port already in use | Change port in .env or kill process using port |

---

## 📊 Database Naming Convention

**Format:** `medical_coverage_{service_name}`

- `medical_coverage_core` → Core service
- `medical_coverage_billing` → Billing service
- `medical_coverage_crm` → CRM service
- `medical_coverage_insurance` → Insurance service
- `medical_coverage_hospital` → Hospital service
- `medical_coverage_finance` → Finance service
- `medical_coverage_membership` → Membership service
- `medical_coverage_wellness` → Wellness service

---

## 📚 Documentation

- **Full Audit:** `SERVICE_CONNECTIVITY_AUDIT.md`
- **Configuration Templates:** `SERVICE_CONFIGURATION_TEMPLATES.md`
- **Implementation Plan:** `SERVICE_CONNECTIVITY_IMPLEMENTATION_PLAN.md`
- **This File:** `SERVICE_CONNECTIVITY_QUICK_REFERENCE.md`

---

## ✅ Implementation Checklist

- [ ] Understand current architecture
- [ ] Copy `.env.services.template` to `.env`
- [ ] Update all service config files
- [ ] Update all drizzle config files
- [ ] Create/verify `client/src/lib/api.ts`
- [ ] Create/verify `ServiceRegistry.ts` in API Gateway
- [ ] Update frontend fetch calls to use API config
- [ ] Run verification script
- [ ] Test all service-to-service communication
- [ ] Verify database connections
- [ ] Update team documentation
- [ ] Train team on new configuration
- [ ] Deploy to production

---

*Last Updated: April 2, 2026*
*Quick Reference Version 1.0*
