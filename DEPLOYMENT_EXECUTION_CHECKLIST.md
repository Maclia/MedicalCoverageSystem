# Phase 3 Deployment Execution - Live Checklist

**Date**: April 20, 2026  
**Status**: DEPLOYING NOW  
**Executor Guide**: Step-by-step commands to run

---

## 🚀 DEPLOYMENT EXECUTION STEPS

### STEP 1: Database Migration (5-10 mins)

**Location**: Run from workspace root  
**Path**: `c:\Users\ADMIN\Documents\GitHub\MedicalCoverageSystem`

**Command to run**:
```bash
bash scripts/run-migrations.sh
```

**Expected Output**:
```
[INFO] 2026-04-20 -- Database Migration Tool
[INFO] Checking prerequisites...
[SUCCESS] Node.js: v18+ ✓
[SUCCESS] npm: v9+ ✓
[SUCCESS] psql installed ✓
[SUCCESS] drizzle-kit installed ✓

[INFO] Validating environment...
[SUCCESS] DATABASE_URL is set ✓

[INFO] Creating database backup...
[SUCCESS] Backup created: .backups/migrations/backup_2026-04-20_HHMMSS.sql

[INFO] Running Drizzle migrations...
[SUCCESS] Migration completed successfully ✓

[INFO] Verifying tables...
[SUCCESS] saga table exists ✓
[SUCCESS] saga_step table exists ✓
[SUCCESS] payment_recovery table exists ✓

[SUCCESS] Migration completed successfully!
```

**If on Windows without bash installed**:
```cmd
scripts\run-migrations.bat
```

**Verification Command** (after migration):
```bash
psql -U postgres -d medical_coverage_finance -c "
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('saga', 'saga_step', 'payment_recovery')
  ORDER BY table_name;
"
```

**Expected Response**:
```
       table_name       
──────────────────────
 payment_recovery
 saga
 saga_step
(3 rows)
```

---

### STEP 2: Run Integration Tests (5 mins)

**Location**: From workspace root

**Command to run**:
```bash
npm test -- recovery-workflow.integration.test.ts --verbose
```

**Alternative** (if above doesn't work):
```bash
npm test -- --testPathPattern="recovery-workflow" --verbose
```

**Expected Output**:
```
PASS  services/finance-service/src/tests/integration/recovery-workflow.integration.test.ts

  Payment Failure Registration
    ✓ should register a failed payment for recovery (45ms)
    ✓ should store failure details in audit trail (38ms)
    ✓ should set correct next retry time (32ms)
    ✓ should handle multiple failures (41ms)

  Automatic Retry Mechanism
    ✓ should perform first retry when scheduled (52ms)
    ✓ should schedule second retry if first fails (48ms)
    ✓ should schedule third retry if second fails (44ms)
    ✓ should mark payment as recovered on successful retry (56ms)

  Escalation to Support
    ✓ should escalate to support after 48 hours (39ms)
    ✓ should notify member on escalation (35ms)
    ✓ should add escalation entry to audit trail (38ms)

  Recovery Scheduler
    ✓ should process scheduled retries (61ms)
    ✓ should process escalations when threshold reached (55ms)
    ✓ should run both retry and escalation processes (67ms)

  Audit Trail
    ✓ should maintain chronological audit trail (42ms)
    ✓ should record all recovery actions (38ms)
    ✓ should include performance metadata (41ms)

  Error Handling
    ✓ should handle missing payments gracefully (35ms)
    ✓ should handle notification service failures (44ms)
    ✓ should handle concurrent recovery attempts (52ms)

  Performance
    ✓ should complete recovery cycle within 500ms (328ms)
    ✓ should handle batch processing efficiently (1245ms)

Test Suites: 1 passed, 1 total
Tests:       23 passed, 23 total
Snapshots:   0 total
Time:        4.82 s
```

**Success Criteria**:
- [ ] All 23 tests pass (✓ symbols)
- [ ] 0 failures
- [ ] Execution time < 5 seconds
- [ ] No warnings or errors

**If tests fail**, check:
```bash
# Check if saga tables exist
psql -U postgres -d medical_coverage_finance -c "
  SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_name = 'saga';
"

# Check test logs
cat services/finance-service/src/tests/integration/test-output.log 2>/dev/null || echo "No logs yet"
```

---

### STEP 3: Deploy Finance Service (2 mins)

**Location**: New terminal window

**Navigate to service**:
```bash
cd services/finance-service
```

**Verify dependencies installed**:
```bash
npm list | head -20
```

**Start service**:
```bash
npm start
```

**Or development mode** (with auto-reload):
```bash
npm run dev
```

**Expected Output**:
```
[INFO] Finance Service starting...
[INFO] Database connected: medical_coverage_finance
[INFO] SagaOrchestrator initialized
[INFO] Compensation handlers registered:
  ✓ claim_created
  ✓ payment_processed
  ✓ notification_sent
[INFO] API Routes loaded:
  ✓ POST /api/saga/transactions
  ✓ POST /api/saga/transactions/:sagaId/execute
  ✓ POST /api/saga/transactions/:sagaId/claim-to-payment
  ✓ GET /api/saga/transactions/:sagaId
  ✓ POST /api/saga/transactions/:sagaId/retry
  ✓ GET /api/saga/transactions
  ✓ GET /api/saga/transactions/:sagaId/audit-trail
[INFO] Server listening on http://localhost:3007
[SUCCESS] Finance Service ready!
```

**Health Check** (new terminal):
```bash
curl -s http://localhost:3007/health | jq '.' || echo "Service not responding"
```

**Expected Response**:
```json
{
  "status": "healthy",
  "service": "finance-service",
  "timestamp": "2026-04-20T14:35:00Z"
}
```

---

### STEP 4: Test End-to-End Saga Workflow (10 mins)

**Location**: New terminal (keep finance service running)

#### 4.1 Start API Gateway

```bash
cd services/api-gateway
npm start
```

**Expected**: Server listening on http://localhost:5000

#### 4.2 Test Saga Creation

**Command**:
```bash
curl -X POST http://localhost:5000/api/saga/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "sagaName": "claim-to-payment",
    "memberId": "member-123",
    "amount": 5000,
    "currency": "USD",
    "metadata": {
      "source": "integration-test",
      "testRun": true
    }
  }'
```

**Expected Response** (HTTP 201):
```json
{
  "success": true,
  "data": {
    "sagaId": "550e8400-e29b-41d4-a716-446655440000",
    "correlationId": "660e8400-e29b-41d4-a716-446655440001",
    "status": "pending",
    "startedAt": "2026-04-20T14:36:00Z"
  }
}
```

**Save the sagaId for next steps**:
```bash
# On Linux/Mac, save it:
SAGA_ID="550e8400-e29b-41d4-a716-446655440000"

# On Windows PowerShell:
$SAGA_ID = "550e8400-e29b-41d4-a716-446655440000"
```

#### 4.3 Execute Saga Workflow

**Command** (replace SAGA_ID with actual ID):
```bash
curl -X POST http://localhost:5000/api/saga/transactions/550e8400-e29b-41d4-a716-446655440000/claim-to-payment \
  -H "Content-Type: application/json" \
  -d '{
    "claimDetails": {
      "diagnosis": "Appendicitis",
      "hospital": "City Hospital",
      "visitDate": "2026-04-15"
    },
    "paymentDetails": {
      "method": "bank_transfer",
      "accountNumber": "****1234",
      "amount": 5000
    },
    "notificationPreferences": {
      "channel": "email",
      "sendConfirmation": true
    }
  }'
```

**Expected Response** (HTTP 200):
```json
{
  "success": true,
  "data": {
    "sagaId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "stepsCompleted": 3,
    "completedAt": "2026-04-20T14:36:05Z",
    "results": [
      {
        "step": "claim_created",
        "status": "completed",
        "output": { "claimId": "claim-001" }
      },
      {
        "step": "payment_processed",
        "status": "completed",
        "output": { "transactionId": "txn-001", "amount": 5000 }
      },
      {
        "step": "notification_sent",
        "status": "completed",
        "output": { "notificationId": "notif-001" }
      }
    ]
  }
}
```

#### 4.4 Check Saga Status

**Command**:
```bash
curl -X GET http://localhost:5000/api/saga/transactions/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json"
```

**Expected**: Saga with status "completed" and all 3 steps completed

#### 4.5 View Audit Trail

**Command**:
```bash
curl -X GET http://localhost:5000/api/saga/transactions/550e8400-e29b-41d4-a716-446655440000/audit-trail \
  -H "Content-Type: application/json"
```

**Expected**: Complete audit trail with timestamps for all actions:
```json
{
  "success": true,
  "data": {
    "sagaId": "550e8400-e29b-41d4-a716-446655440000",
    "auditTrail": [
      {
        "timestamp": "2026-04-20T14:36:00.123Z",
        "action": "saga:started",
        "details": { ... }
      },
      {
        "timestamp": "2026-04-20T14:36:01.245Z",
        "action": "saga:step_completed",
        "step": "claim_created",
        "details": { ... }
      },
      {
        "timestamp": "2026-04-20T14:36:02.156Z",
        "action": "saga:step_completed",
        "step": "payment_processed",
        "details": { ... }
      },
      {
        "timestamp": "2026-04-20T14:36:03.089Z",
        "action": "saga:step_completed",
        "step": "notification_sent",
        "details": { ... }
      },
      {
        "timestamp": "2026-04-20T14:36:03.100Z",
        "action": "saga:completed",
        "details": { ... }
      }
    ]
  }
}
```

---

## ✅ VALIDATION CHECKLIST

### After Step 1 (Migration)
- [ ] No errors during migration
- [ ] Backup created successfully
- [ ] 3 tables verified (saga, saga_step, payment_recovery)
- [ ] Migration log shows all steps completed

### After Step 2 (Tests)
- [ ] All 23 tests pass
- [ ] 0 failures
- [ ] Execution < 5 seconds
- [ ] Coverage > 80%

### After Step 3 (Service)
- [ ] Finance service running on port 3007
- [ ] Health check returns HTTP 200
- [ ] All 7 saga routes registered
- [ ] Compensation handlers initialized

### After Step 4 (E2E)
- [ ] Saga created successfully
- [ ] All 3 steps executed
- [ ] Audit trail has 5+ entries
- [ ] Status shows "completed"
- [ ] Response times acceptable

---

## 🔧 TROUBLESHOOTING

### Issue: Migration fails - Database connection
```bash
# Test connection
psql -U postgres -d medical_coverage_finance -c "SELECT 1;"

# If fails, check DATABASE_URL
echo $DATABASE_URL

# Verify PostgreSQL running
pg_isready -h localhost -p 5432
```

### Issue: Tests fail - Tables not found
```bash
# Verify saga tables exist
psql -U postgres -d medical_coverage_finance -c "
  SELECT table_name FROM information_schema.tables 
  WHERE table_name LIKE 'saga%';
"

# If missing, re-run migration
bash scripts/run-migrations.sh
```

### Issue: Service won't start - Port in use
```bash
# Find process using port 3007
lsof -i :3007  # Linux/Mac
netstat -ano | findstr :3007  # Windows

# Kill it
kill -9 <PID>  # Linux/Mac

# Or use different port
PORT=3008 npm start
```

### Issue: Saga API returns 404
```bash
# Check service is running
curl http://localhost:3007/health

# Check gateway is running
curl http://localhost:5000/health

# Verify routing in gateway
curl http://localhost:5000/api/saga/transactions
```

---

## 📊 EXECUTION TIMELINE

```
Current → 5 min:   Database migration
5 → 10 min:        Integration tests
10 → 12 min:       Finance service startup
12 → 22 min:       E2E saga testing
22 → 25 min:       Validation & troubleshooting
────────────────────────────────────
Total:             ~25 minutes to full deployment
```

---

## 🎯 SUCCESS CRITERIA - PHASE 3 DEPLOYMENT

✅ **ALL COMPLETE** when:

- [x] Code implementation (2,000+ lines)
- [x] Database schema created
- [x] Migration scripts written
- [ ] Database migration executed
- [ ] Integration tests passing (23/23)
- [ ] Finance service deployed
- [ ] E2E saga workflow validated
- [ ] Audit trail verified
- [ ] All 3 steps in saga completed successfully
- [ ] No data loss
- [ ] Performance acceptable
- [ ] Compensation logic tested

---

## 📝 EXECUTION LOG

**Start Time**: ________  
**Executor**: ________

### Step 1: Database Migration
Time Started: ________
Command: `bash scripts/run-migrations.sh`
Result: ✓ ✗
Issues: ________
Time Completed: ________

### Step 2: Integration Tests
Time Started: ________
Command: `npm test -- recovery-workflow.integration.test.ts`
Result: ✓ ✗
Issues: ________
Time Completed: ________

### Step 3: Service Deployment
Time Started: ________
Command: `cd services/finance-service && npm start`
Result: ✓ ✗
Issues: ________
Time Completed: ________

### Step 4: E2E Testing
Time Started: ________
Result: ✓ ✗
Issues: ________
Time Completed: ________

**Final Status**: ✅ COMPLETE / ⚠️ ISSUES / ❌ FAILED

---

## 🚀 NEXT PHASE

Once all steps complete successfully:

**Phase 4 Planning**:
- [ ] Review monitoring requirements
- [ ] Plan Prometheus/Grafana setup
- [ ] Document on-call procedures
- [ ] Establish alerting strategy

See: `PHASE_4_PLUS_FUTURE_ROADMAP.md`

---

**Status**: Ready to execute - All commands above are copy-paste ready ✅
