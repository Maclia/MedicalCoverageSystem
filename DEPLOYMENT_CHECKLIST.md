# Token System Deployment Checklist

## Pre-Deployment Verification

### ✅ Backend Files
- [x] `server/services/tokenWalletService.ts` - Wallet management
- [x] `server/services/tokenPackageService.ts` - Package pricing
- [x] `server/services/tokenPurchaseService.ts` - Purchase workflow
- [x] `server/services/tokenSubscriptionService.ts` - Subscription billing
- [x] `server/services/autoTopupService.ts` - Auto replenishment
- [x] `server/services/tokenNotificationService.ts` - Alerts
- [x] `server/services/tokenAuditService.ts` - Audit logging
- [x] `server/services/tokenBillingIntegration.ts` - Finance integration
- [x] `server/routes/tokens.ts` - API endpoints (27 routes)
- [x] `server/middleware/tokenPermissions.ts` - RBAC middleware
- [x] `server/jobs/tokenJobs.ts` - Background automation (9 jobs)

### ✅ Frontend Files
- [x] `client/src/api/tokens.ts` - API client
- [x] `client/src/components/tokens/TokenWalletWidget.tsx` - Balance widget
- [x] `client/src/components/finance/TokenRevenueCard.tsx` - Revenue display
- [x] `client/src/pages/tokens/TokenPurchasePage.tsx` - Purchase page
- [x] `client/src/pages/tokens/PurchaseHistoryPage.tsx` - History page
- [x] `client/src/pages/tokens/BalanceHistoryPage.tsx` - Balance history
- [x] `client/src/pages/tokens/SubscriptionManagementPage.tsx` - Subscriptions
- [x] `client/src/pages/tokens/TokenSettingsPage.tsx` - Settings page

### ✅ Integration Points
- [x] Token routes registered in `server/routes.ts`
- [x] Token routes imported: `import tokenRoutes from "./routes/tokens"`
- [x] Token routes mounted: `app.use("/api/tokens", tokenRoutes)`
- [x] TokenRevenueCard integrated into FinanceDashboard
- [x] TokenWalletWidget integrated into Dashboard
- [x] Token pages registered in App.tsx routing

### ✅ Database Schema
- [x] `organizationTokenWallets` table defined
- [x] `tokenPackages` table defined
- [x] `tokenPurchases` table defined
- [x] `tokenSubscriptions` table defined
- [x] `autoTopupPolicies` table defined
- [x] `tokenBalanceHistory` table defined
- [x] `lowBalanceNotifications` table defined
- [x] `tokenUsageForecasts` table defined
- [x] `tokenAuditLogs` table defined
- [x] Users table modified (permissions field added)
- [x] 7 enums defined (purchaseType, purchaseStatus, subscriptionStatus, etc.)

### ✅ Configuration
- [x] Environment variables documented in `.env.example`
- [x] Token-specific env vars added (ENABLE_TOKEN_SYSTEM, DEFAULT_TOKEN_PRICE, etc.)
- [x] Background jobs configured
- [x] Permission system documented

### ✅ Documentation
- [x] `TOKEN_SYSTEM_DEPLOYMENT.md` - Complete deployment guide
- [x] `FINANCE_INTEGRATION_SUMMARY.md` - Finance integration details
- [x] `DEPLOYMENT_CHECKLIST.md` - This checklist
- [x] Verification script created: `scripts/verify-token-system.sh`

### ✅ Code Quality
- [x] No TypeScript compilation errors in token code
- [x] No circular dependencies
- [x] All services properly exported
- [x] Error handling implemented throughout
- [x] Logging added to critical operations

---

## Deployment Steps

### 1. Database Setup
```bash
# Run database migrations
npm run db:push

# Verify tables created
psql -U postgres -d medical_coverage -c "\dt *token*"

# Seed initial data (optional)
npm run db:seed:tokens
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Update token configuration
# Set ENABLE_TOKEN_SYSTEM=true
# Configure other token-specific variables
```

### 3. Grant Permissions
```sql
-- Grant token permissions to admin users
UPDATE users
SET permissions = ARRAY['tokens.view', 'tokens.purchase', 'tokens.configure']
WHERE role = 'admin';

-- Grant view/purchase to organization users
UPDATE users
SET permissions = ARRAY['tokens.view', 'tokens.purchase']
WHERE user_type = 'insurance';
```

### 4. Build Application
```bash
# Install dependencies
npm install

# Run type checking
npm run check

# Build for production
npm run build
```

### 5. Start Services
```bash
# Development
npm run dev

# Production (PM2)
pm2 start npm --name "medical-coverage-system" -- start

# Production (Docker)
docker-compose up -d
```

---

## Post-Deployment Verification

### API Endpoints Check
```bash
# Health check
curl http://localhost:3000/api/health

# Wallet endpoint (requires auth)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/tokens/wallet/1

# Packages endpoint
curl http://localhost:3000/api/tokens/packages

# Revenue endpoint (requires auth)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3000/api/tokens/revenue?startDate=2025-01-01&endDate=2025-12-01"
```

### Frontend Check
Visit these URLs:
- http://localhost:3000/tokens/purchase
- http://localhost:3000/tokens/history
- http://localhost:3000/tokens/subscription
- http://localhost:3000/tokens/settings
- http://localhost:3000/finance (check token revenue card)

### Database Verification
```sql
-- Check wallet count
SELECT COUNT(*) FROM organization_token_wallets;

-- Check packages
SELECT * FROM token_packages WHERE is_active = true;

-- Check purchases
SELECT COUNT(*) FROM token_purchases;

-- Check subscriptions
SELECT COUNT(*) FROM token_subscriptions WHERE status = 'active';
```

### Background Jobs Check
```bash
# Check logs for job execution
tail -f logs/app.log | grep "token"

# Should see periodic job execution messages
```

---

## Monitoring Setup

### Key Metrics to Track
1. **Purchase Volume**: Daily/weekly/monthly purchase counts
2. **Revenue**: Total token revenue and trends
3. **Wallet Balances**: Average, min, max across organizations
4. **Active Subscriptions**: Count and health
5. **Failed Payments**: Subscription and auto top-up failures
6. **Low Balance Alerts**: Organizations below thresholds

### Logging
Enable appropriate log levels:
```env
LOG_LEVEL=info  # production
LOG_LEVEL=debug # debugging
```

Monitor logs:
```bash
tail -f logs/app.log | grep -E "(token|purchase|subscription)"
```

### Alerts
Configure alerts for:
- Failed subscription payments
- Auto top-up failures
- Critical balance thresholds
- Unusual purchase patterns
- Service errors

---

## Rollback Plan

If issues occur:

### 1. Disable Token System
```env
ENABLE_TOKEN_SYSTEM=false
```

### 2. Revert Database Changes (if needed)
```sql
-- Backup first!
pg_dump medical_coverage > backup_before_rollback.sql

-- Drop token tables
DROP TABLE IF EXISTS token_audit_logs CASCADE;
DROP TABLE IF EXISTS token_usage_forecasts CASCADE;
DROP TABLE IF EXISTS low_balance_notifications CASCADE;
DROP TABLE IF EXISTS token_balance_history CASCADE;
DROP TABLE IF EXISTS auto_topup_policies CASCADE;
DROP TABLE IF EXISTS token_subscriptions CASCADE;
DROP TABLE IF EXISTS token_purchases CASCADE;
DROP TABLE IF EXISTS token_packages CASCADE;
DROP TABLE IF EXISTS organization_token_wallets CASCADE;

-- Remove permissions field from users (if needed)
ALTER TABLE users DROP COLUMN IF EXISTS permissions;
```

### 3. Revert Code Changes
```bash
git revert <commit-hash>
npm install
npm run build
pm2 restart medical-coverage-system
```

---

## Success Criteria

The deployment is successful when:

- ✅ All API endpoints respond correctly
- ✅ Frontend pages load without errors
- ✅ Purchase workflow completes successfully
- ✅ Invoices generate automatically
- ✅ Token revenue appears in finance dashboard
- ✅ Background jobs execute on schedule
- ✅ Permissions enforce correctly
- ✅ No TypeScript compilation errors
- ✅ No runtime errors in logs
- ✅ Database tables populated correctly

---

## Support Resources

- **Deployment Guide**: `TOKEN_SYSTEM_DEPLOYMENT.md`
- **Finance Integration**: `FINANCE_INTEGRATION_SUMMARY.md`
- **Verification Script**: `scripts/verify-token-system.sh`
- **Environment Template**: `.env.example`
- **Logs**: `logs/app.log`, `logs/error.log`

---

## Final Sign-Off

| Check | Status | Notes |
|-------|--------|-------|
| All files present | ✅ | Verified |
| Routes registered | ✅ | /api/tokens mounted |
| Database migrated | ⏳ | Run db:push |
| Permissions granted | ⏳ | Run SQL scripts |
| Environment configured | ⏳ | Update .env |
| Build successful | ⏳ | Run npm run build |
| Services started | ⏳ | Start application |
| Endpoints verified | ⏳ | Test API calls |
| Frontend working | ⏳ | Check UI pages |
| Jobs running | ⏳ | Monitor logs |

**Deployment Status**: ✅ READY FOR DEPLOYMENT

**Date**: 2025-12-01

**Deployed By**: _____________

**Verified By**: _____________

---

*This checklist should be completed during deployment and kept for records.*
