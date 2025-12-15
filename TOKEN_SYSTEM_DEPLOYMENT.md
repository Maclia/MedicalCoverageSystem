# Token System Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Database Setup](#database-setup)
6. [Configuration](#configuration)
7. [Deployment](#deployment)
8. [Verification](#verification)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Token System is a complete organizational token purchasing, management, and billing solution integrated into the Medical Coverage System. It provides:

- **Token Purchasing**: One-time, subscription, and auto top-up purchasing
- **Wallet Management**: Organization token wallets with balance tracking
- **Subscription Management**: Recurring token subscriptions with grace periods
- **Auto Top-Up**: Automated replenishment based on thresholds or schedules
- **Finance Integration**: Automatic invoice generation and revenue tracking
- **Permission System**: Role-based access control for token operations
- **Audit Trail**: Complete purchase and transaction history

---

## System Architecture

### Backend Services

```
server/
├── services/
│   ├── tokenWalletService.ts          # Wallet balance management
│   ├── tokenPackageService.ts         # Package pricing
│   ├── tokenPurchaseService.ts        # Purchase workflow
│   ├── tokenSubscriptionService.ts    # Subscription billing
│   ├── autoTopupService.ts            # Auto replenishment
│   ├── tokenNotificationService.ts    # Alerts and notifications
│   ├── tokenAuditService.ts           # Audit logging
│   └── tokenBillingIntegration.ts     # Finance integration
├── routes/
│   └── tokens.ts                      # API endpoints (27 routes)
├── middleware/
│   └── tokenPermissions.ts            # RBAC middleware
└── jobs/
    └── tokenJobs.ts                   # Background automation (9 jobs)
```

### Frontend Components

```
client/
├── src/
│   ├── api/
│   │   └── tokens.ts                  # API client
│   ├── components/
│   │   ├── tokens/
│   │   │   └── TokenWalletWidget.tsx  # Balance widget
│   │   └── finance/
│   │       └── TokenRevenueCard.tsx   # Revenue display
│   └── pages/
│       └── tokens/
│           ├── TokenPurchasePage.tsx
│           ├── PurchaseHistoryPage.tsx
│           ├── BalanceHistoryPage.tsx
│           ├── SubscriptionManagementPage.tsx
│           └── TokenSettingsPage.tsx
```

### Database Schema

**New Tables** (9):
- `organization_token_wallets` - Wallet balances
- `token_packages` - Purchasable packages
- `token_purchases` - Purchase records
- `token_subscriptions` - Recurring subscriptions
- `auto_topup_policies` - Auto replenishment rules
- `token_balance_history` - Balance change audit
- `low_balance_notifications` - Alert thresholds
- `token_usage_forecasts` - Consumption predictions
- `token_audit_logs` - Complete audit trail

**Modified Tables**:
- `users` - Added `permissions` array field

---

## Prerequisites

### Software Requirements
- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm >= 9.x
- Redis >= 6.x (for background jobs)

### Database Requirements
- Existing Medical Coverage System database
- Database user with CREATE TABLE privileges
- ~50MB additional storage for token system tables

### Environment Requirements
- Production: 2GB+ RAM, 2+ CPU cores
- Development: 1GB RAM, 1 CPU core

---

## Installation

### 1. Pull Latest Code

```bash
cd MedicalCoverageSystem
git pull origin main
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Verify Installation

```bash
# Check TypeScript compilation
npm run check

# Should show no errors related to token system
```

---

## Database Setup

### 1. Run Migrations

The token system uses Drizzle ORM with schema defined in `shared/schema.ts`. Run migrations:

```bash
npm run db:push
```

This will create:
- 9 new tables
- 7 new enums
- Modify users table to add permissions field

### 2. Verify Schema

```sql
-- Connect to your database
psql -U postgres -d medical_coverage

-- Check token tables exist
\dt *token*

-- Should show:
-- organization_token_wallets
-- token_packages
-- token_purchases
-- token_subscriptions
-- auto_topup_policies
-- token_balance_history
-- low_balance_notifications
-- token_usage_forecasts
-- token_audit_logs
```

### 3. Seed Initial Data (Optional)

```bash
# Seed default token packages
npm run db:seed:tokens
```

This creates standard packages:
- Starter Pack: 100 tokens
- Business Pack: 500 tokens
- Enterprise Pack: 2000 tokens
- Premium Pack: 5000 tokens

---

## Configuration

### 1. Environment Variables

Copy and update `.env.example`:

```bash
cp .env.example .env
```

Add token-specific configuration:

```env
# --- Token Management Configuration ---
ENABLE_TOKEN_SYSTEM=true
DEFAULT_TOKEN_PRICE=0.50
TOKEN_EXPIRATION_ENABLED=false
TOKEN_EXPIRATION_DAYS=365
TOKEN_LOW_BALANCE_THRESHOLD=100
TOKEN_CRITICAL_BALANCE_THRESHOLD=50
TOKEN_AUTO_TOPUP_ENABLED=true
TOKEN_SUBSCRIPTION_GRACE_PERIOD_DAYS=7
TOKEN_INVOICE_TAX_RATE=0.16
TOKEN_INVOICE_DUE_DAYS=30
```

### 2. Permission Configuration

Grant token permissions to users:

```sql
-- Grant all token permissions to admin users
UPDATE users
SET permissions = array_append(permissions, 'tokens.view')
WHERE role = 'admin';

UPDATE users
SET permissions = array_append(permissions, 'tokens.purchase')
WHERE role = 'admin';

UPDATE users
SET permissions = array_append(permissions, 'tokens.configure')
WHERE role = 'admin';

-- Grant view and purchase to organization users
UPDATE users
SET permissions = array_append(permissions, 'tokens.view')
WHERE user_type = 'insurance';

UPDATE users
SET permissions = array_append(permissions, 'tokens.purchase')
WHERE user_type = 'insurance';
```

### 3. Background Jobs Configuration

Token system includes 9 background jobs:

1. **processSubscriptionBilling** - Every hour
2. **checkAutoTopupTriggers** - Every 30 minutes
3. **checkLowBalanceThresholds** - Every 15 minutes
4. **updateUsageForecasts** - Daily at midnight
5. **sendSubscriptionRenewalReminders** - Daily at 8 AM
6. **cleanupExpiredTokens** - Daily at 2 AM
7. **reconcileWalletBalances** - Daily at 3 AM
8. **generateMonthlyReports** - Monthly on 1st at midnight
9. **cleanupOldAuditLogs** - Weekly on Sunday at midnight

Jobs are automatically registered in `server/backgroundScheduler.ts`.

---

## Deployment

### Development Deployment

```bash
# Start development server
npm run dev
```

The token system will be available at:
- API: `http://localhost:3000/api/tokens`
- UI: `http://localhost:3000/tokens/*`
- Finance: `http://localhost:3000/finance` (token revenue visible)

### Production Deployment

#### Option 1: Docker Deployment

```bash
# Build Docker image
docker build -t medical-coverage-system .

# Run container
docker run -d \
  --name medical-coverage-system \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e ENABLE_TOKEN_SYSTEM=true \
  medical-coverage-system
```

#### Option 2: PM2 Deployment

```bash
# Install PM2 globally
npm install -g pm2

# Build application
npm run build

# Start with PM2
pm2 start npm --name "medical-coverage-system" -- start

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

#### Option 3: Systemd Service

Create `/etc/systemd/system/medical-coverage-system.service`:

```ini
[Unit]
Description=Medical Coverage System
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/medical-coverage-system
Environment="NODE_ENV=production"
Environment="ENABLE_TOKEN_SYSTEM=true"
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable medical-coverage-system
sudo systemctl start medical-coverage-system
```

---

## Verification

### 1. Health Check

```bash
curl http://localhost:3000/api/health

# Should return status: "healthy"
```

### 2. Token Routes Check

```bash
# Check wallet endpoint (requires authentication)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/tokens/wallet/1

# Should return wallet data
```

### 3. Frontend Check

Navigate to:
- `http://localhost:3000/tokens/purchase` - Purchase page
- `http://localhost:3000/tokens/history` - History page
- `http://localhost:3000/finance` - Finance dashboard (check token revenue card)

### 4. Background Jobs Check

```bash
# Check logs for job execution
tail -f logs/app.log | grep "token"

# Should see periodic job execution logs
```

### 5. Database Verification

```sql
-- Check wallet creation
SELECT COUNT(*) FROM organization_token_wallets;

-- Check packages
SELECT * FROM token_packages WHERE is_active = true;

-- Check purchases
SELECT COUNT(*) FROM token_purchases;
```

---

## Monitoring

### Key Metrics to Monitor

1. **Wallet Balances**
   ```sql
   SELECT
     AVG(CAST(current_balance AS NUMERIC)) as avg_balance,
     MIN(CAST(current_balance AS NUMERIC)) as min_balance,
     MAX(CAST(current_balance AS NUMERIC)) as max_balance
   FROM organization_token_wallets;
   ```

2. **Purchase Volume**
   ```sql
   SELECT
     DATE(created_at) as date,
     COUNT(*) as purchases,
     SUM(CAST(total_amount AS NUMERIC)) as revenue
   FROM token_purchases
   WHERE status = 'completed'
     AND created_at > CURRENT_DATE - INTERVAL '30 days'
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```

3. **Active Subscriptions**
   ```sql
   SELECT COUNT(*)
   FROM token_subscriptions
   WHERE status = 'active';
   ```

4. **Low Balance Alerts**
   ```sql
   SELECT COUNT(*)
   FROM organization_token_wallets w
   WHERE CAST(w.current_balance AS NUMERIC) < 100;
   ```

### Logging

Token system logs include:
- Purchase attempts and completions
- Subscription billing cycles
- Auto top-up triggers
- Failed payments
- Balance changes
- Permission denials

Access logs:
```bash
# Application logs
tail -f logs/app.log | grep -E "(token|purchase|subscription)"

# Error logs
tail -f logs/error.log | grep token
```

### Alerts Setup

Configure alerts for:
- Failed subscription payments
- Auto top-up failures
- Critical balance thresholds
- Unusual purchase patterns
- Service errors

---

## Troubleshooting

### Common Issues

#### 1. Routes Not Found (404)

**Problem**: `/api/tokens/*` returns 404

**Solution**:
```bash
# Check routes are registered
grep "app.use.*tokens" server/routes.ts

# Should show:
# app.use("/api/tokens", tokenRoutes);

# Restart server
npm run dev
```

#### 2. Permission Denied (403)

**Problem**: Token endpoints return 403 Forbidden

**Solution**:
```sql
-- Check user permissions
SELECT id, email, permissions FROM users WHERE id = YOUR_USER_ID;

-- Grant required permissions
UPDATE users
SET permissions = ARRAY['tokens.view', 'tokens.purchase', 'tokens.configure']
WHERE id = YOUR_USER_ID;
```

#### 3. TypeScript Compilation Errors

**Problem**: `npm run check` shows errors

**Solution**:
```bash
# Clean build
rm -rf node_modules dist
npm install
npm run check

# Check specific token files
npx tsc --noEmit server/services/token*.ts
```

#### 4. Database Migration Issues

**Problem**: Token tables not created

**Solution**:
```bash
# Drop and recreate (CAUTION: Development only!)
npm run db:drop
npm run db:push

# Or run specific migration
npm run db:migrate
```

#### 5. Background Jobs Not Running

**Problem**: Subscriptions not billing automatically

**Solution**:
```bash
# Check background scheduler
grep "backgroundScheduler" server/index.ts

# Verify jobs are registered
grep "tokenJobs" server/backgroundScheduler.ts

# Check job execution logs
tail -f logs/app.log | grep "processSubscriptionBilling"
```

#### 6. Invoice Generation Fails

**Problem**: Purchases complete but no invoice generated

**Solution**:
```javascript
// Check tokenBillingIntegration service
// Verify it's imported in tokenPurchaseService.ts

// Check logs
tail -f logs/app.log | grep "invoice"

// Manual invoice generation for existing purchase
// In Node REPL:
const { tokenBillingIntegration } = require('./server/services/tokenBillingIntegration');
await tokenBillingIntegration.generateTokenPurchaseInvoice('REF-xxxxx');
```

#### 7. Frontend Not Displaying Token UI

**Problem**: Token pages show blank or 404

**Solution**:
```bash
# Check routes are registered in App.tsx
grep "tokens" client/src/App.tsx

# Rebuild frontend
npm run build

# Clear browser cache
# In browser: Ctrl+Shift+R or Cmd+Shift+R
```

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
DEV_ENABLE_CORS_DEBUG=true
```

Then check detailed logs:
```bash
tail -f logs/app.log
```

### Support Contacts

For issues:
1. Check this documentation
2. Review error logs
3. Check database state
4. Consult `FINANCE_INTEGRATION_SUMMARY.md`
5. Review source code comments

---

## Maintenance

### Regular Tasks

**Daily**:
- Monitor purchase volumes
- Check for failed payments
- Review low balance alerts

**Weekly**:
- Review subscription health
- Check auto top-up performance
- Verify invoice generation

**Monthly**:
- Revenue reconciliation
- Audit log cleanup
- Performance optimization

### Backup Recommendations

Backup these tables regularly:
```sql
-- Critical data
pg_dump -t organization_token_wallets \
        -t token_purchases \
        -t token_subscriptions \
        -t token_balance_history \
        medical_coverage > token_backup.sql
```

### Scaling Considerations

**Database**:
- Index on `token_purchases.organization_id`
- Index on `token_purchases.status`
- Index on `token_balance_history.wallet_id`
- Partition `token_audit_logs` by month

**Background Jobs**:
- Consider dedicated job worker processes
- Use Redis for job queue in production
- Implement job result caching

**API**:
- Enable Redis caching for wallet balances
- Cache active packages
- Rate limit purchase endpoints

---

## Security Considerations

1. **Permission Enforcement**: All routes protected by RBAC middleware
2. **Payment Security**: Integration with secure payment gateways
3. **Audit Trail**: Immutable purchase ledger
4. **Data Validation**: Input validation on all endpoints
5. **SQL Injection Protection**: Parameterized queries via Drizzle ORM
6. **XSS Protection**: React auto-escaping
7. **CSRF Protection**: Token-based authentication

---

## Performance Optimization

### Recommended Indexes

```sql
-- Wallet lookups
CREATE INDEX idx_token_wallets_org ON organization_token_wallets(organization_id);

-- Purchase queries
CREATE INDEX idx_token_purchases_org_status ON token_purchases(organization_id, status);
CREATE INDEX idx_token_purchases_ref ON token_purchases(purchase_reference_id);
CREATE INDEX idx_token_purchases_created ON token_purchases(created_at DESC);

-- Balance history
CREATE INDEX idx_balance_history_wallet ON token_balance_history(wallet_id, created_at DESC);

-- Subscriptions
CREATE INDEX idx_subscriptions_org_status ON token_subscriptions(organization_id, status);
CREATE INDEX idx_subscriptions_next_billing ON token_subscriptions(next_billing_date)
  WHERE status = 'active';
```

### Caching Strategy

```javascript
// Cache wallet balances (5 minute TTL)
// Cache active packages (1 hour TTL)
// Cache usage forecasts (30 minute TTL)
```

---

## Conclusion

The Token System is now fully deployed and integrated with the Medical Coverage System. All services are configured for production use with proper error handling, monitoring, and maintenance procedures in place.

For questions or issues, refer to:
- `FINANCE_INTEGRATION_SUMMARY.md` - Integration details
- Source code comments - Implementation details
- Error logs - Runtime diagnostics
