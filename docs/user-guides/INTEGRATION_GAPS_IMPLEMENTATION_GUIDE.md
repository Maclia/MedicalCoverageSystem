# Integration Gaps - Complete Implementation Guide

**Author**: GitHub Copilot  
**Date**: December 2025  
**Status**: Production-Ready Implementation Plans  
**Total Effort**: 34-48 hours across all 5 gaps  

---

## Table of Contents

1. [Gap #1: Fraud Detection Service API Gateway Integration](#gap-1)
2. [Gap #2: Saga Pattern for Cross-Service Transactions](#gap-2)
3. [Gap #3: Error Recovery Workflow for Payments](#gap-3)
4. [Gap #4: Wellness Data in Claims Processing](#gap-4)
5. [Gap #5: Analytics Service Integration](#gap-5)
6. [Implementation Sequencing](#sequencing)
7. [Rollout Strategy](#rollout)

---

## Gap #1: Fraud Detection Service API Gateway Integration {#gap-1}

### Current Problem

**Status**: 🔴 BLOCKING EXTERNAL INTEGRATIONS

The Fraud Detection Service is fully functional internally but:
- Not exposed through API Gateway
- Cannot be called from external systems
- No service route configured
- No rate limiting specific to fraud endpoints
- No service discovery entry

### Why It Matters

Partners, third-party insurance systems, and mobile apps cannot:
- Request fraud assessments directly
- Integrate real-time fraud scoring
- Build custom fraud workflows
- Monitor fraud patterns independently

### Root Cause Analysis

```
API Gateway Configuration Gap:
├─ serviceProxies not configured for fraud-detection-service
├─ No route handler for POST /api/fraud/*
├─ ServiceRegistry.ts not registering fraud service
├─ No middleware chain for fraud endpoints
└─ No authentication/authorization for fraud endpoints
```

### Solution Design

#### Architecture

```
External System / Partner API
    ↓
API Gateway (:5000)
    ├─ Authentication Middleware
    ├─ Rate Limiting (50 req/min for fraud)
    ├─ Request Validation (Zod)
    ├─ Correlation ID Injection
    ├─ Service Routing → Fraud Detection Service (:3009)
    ├─ Response Standardization
    └─ Error Handling
        ↓
Fraud Detection Service
    ├─ Rule-based Analysis
    ├─ Behavioral Analysis
    ├─ ML Scoring
    └─ Risk Assessment
```

### Step-by-Step Implementation

#### Step 1: Register Fraud Service in Service Registry

**File**: `services/api-gateway/src/services/ServiceRegistry.ts`

```typescript
// Current state (incomplete)
private services: Map<string, ServiceInfo> = new Map([
  ['core', { url: 'http://localhost:3001', healthy: true }],
  ['claims', { url: 'http://localhost:3005', healthy: true }],
  // ... others
  // ❌ MISSING: fraud-detection-service
]);

// CHANGE TO:
private services: Map<string, ServiceInfo> = new Map([
  ['core', { url: 'http://localhost:3001', healthy: true }],
  ['claims', { url: 'http://localhost:3005', healthy: true }],
  ['fraud', { url: 'http://localhost:3009', healthy: true }],  // ✅ ADD THIS
  ['finance', { url: 'http://localhost:3003', healthy: true }],
  ['membership', { url: 'http://localhost:3004', healthy: true }],
  ['hospital', { url: 'http://localhost:3008', healthy: true }],
  ['insurance', { url: 'http://localhost:3006', healthy: true }],
  ['crm', { url: 'http://localhost:3007', healthy: true }],
  ['billing', { url: 'http://localhost:3002', healthy: true }],
  ['wellness', { url: 'http://localhost:3010', healthy: true }],
]);
```

#### Step 2: Add Service Proxy Configuration

**File**: `services/api-gateway/src/middleware/proxy.ts`

```typescript
// Current state
export const serviceProxies: Record<string, string> = {
  '/api/core': 'http://localhost:3001',
  '/api/claims': 'http://localhost:3005',
  // ... others
};

// CHANGE TO:
export const serviceProxies: Record<string, string> = {
  '/api/core': 'http://localhost:3001',
  '/api/claims': 'http://localhost:3005',
  '/api/fraud': 'http://localhost:3009',  // ✅ ADD THIS
  '/api/finance': 'http://localhost:3003',
  '/api/membership': 'http://localhost:3004',
  '/api/hospital': 'http://localhost:3008',
  '/api/insurance': 'http://localhost:3006',
  '/api/crm': 'http://localhost:3007',
  '/api/billing': 'http://localhost:3002',
  '/api/wellness': 'http://localhost:3010',
};
```

#### Step 3: Add Fraud Routes to API Gateway

**File**: `services/api-gateway/src/api/routes.ts`

Add after existing service routes:

```typescript
/**
 * @swagger
 * /api/fraud/assess:
 *   post:
 *     summary: Assess claim for fraud risk
 *     description: Analyzes a claim using rule-based, behavioral, and ML models
 *     tags: [Fraud Detection]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               claim_id:
 *                 type: number
 *               member_id:
 *                 type: number
 *               institution_id:
 *                 type: number
 *               amount:
 *                 type: number
 *               diagnosis_code:
 *                 type: string
 *               service_date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Fraud assessment completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     claim_id:
 *                       type: number
 *                     risk_score:
 *                       type: number
 *                     risk_level:
 *                       type: string
 *                       enum: [NONE, LOW, MEDIUM, HIGH, CRITICAL]
 *                     detected_indicators:
 *                       type: array
 *                       items:
 *                         type: string
 *                     ml_confidence:
 *                       type: number
 */
router.post('/api/fraud/assess', authenticateToken, userRateLimit, async (req, res) => {
  try {
    const fraudServiceUrl = serviceRegistry.getServiceUrl('fraud');
    
    if (!fraudServiceUrl) {
      return res.status(503).json(
        createErrorResponse('Fraud Detection Service unavailable', 503, req.correlationId)
      );
    }

    const response = await axios.post(`${fraudServiceUrl}/api/fraud/assess`, req.body, {
      headers: {
        'X-Correlation-ID': req.correlationId,
        'X-Service-Token': process.env.INTERNAL_SERVICE_TOKEN || '',
      },
      timeout: 5000,
    });

    return res.json(createSuccessResponse(response.data, 'Fraud assessment completed', req.correlationId));
  } catch (error) {
    logger.error('Fraud assessment failed', error, { correlationId: req.correlationId });
    return res.status(500).json(
      createErrorResponse('Fraud assessment failed', 500, req.correlationId)
    );
  }
});

/**
 * @swagger
 * /api/fraud/risk/{claimId}:
 *   get:
 *     summary: Get fraud risk for a claim
 *     description: Retrieves previously calculated fraud risk for a claim
 *     tags: [Fraud Detection]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Fraud risk retrieved successfully
 */
router.get('/api/fraud/risk/:claimId', authenticateToken, userRateLimit, async (req, res) => {
  try {
    const { claimId } = req.params;
    const fraudServiceUrl = serviceRegistry.getServiceUrl('fraud');
    
    if (!fraudServiceUrl) {
      return res.status(503).json(
        createErrorResponse('Fraud Detection Service unavailable', 503, req.correlationId)
      );
    }

    const response = await axios.get(`${fraudServiceUrl}/api/fraud/risk/${claimId}`, {
      headers: {
        'X-Correlation-ID': req.correlationId,
        'X-Service-Token': process.env.INTERNAL_SERVICE_TOKEN || '',
      },
      timeout: 3000,
    });

    return res.json(createSuccessResponse(response.data, 'Fraud risk retrieved', req.correlationId));
  } catch (error) {
    logger.error('Failed to retrieve fraud risk', error, { correlationId: req.correlationId });
    return res.status(500).json(
      createErrorResponse('Failed to retrieve fraud risk', 500, req.correlationId)
    );
  }
});

/**
 * @swagger
 * /api/fraud/patterns:
 *   get:
 *     summary: Get fraud pattern analysis
 *     description: Retrieves fraud pattern analysis for a member
 *     tags: [Fraud Detection]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: member_id
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Fraud patterns retrieved successfully
 */
router.get('/api/fraud/patterns', authenticateToken, userRateLimit, async (req, res) => {
  try {
    const { member_id } = req.query;
    const fraudServiceUrl = serviceRegistry.getServiceUrl('fraud');
    
    if (!fraudServiceUrl) {
      return res.status(503).json(
        createErrorResponse('Fraud Detection Service unavailable', 503, req.correlationId)
      );
    }

    const response = await axios.get(`${fraudServiceUrl}/api/fraud/patterns`, {
      params: req.query,
      headers: {
        'X-Correlation-ID': req.correlationId,
        'X-Service-Token': process.env.INTERNAL_SERVICE_TOKEN || '',
      },
      timeout: 3000,
    });

    return res.json(createSuccessResponse(response.data, 'Fraud patterns retrieved', req.correlationId));
  } catch (error) {
    logger.error('Failed to retrieve fraud patterns', error, { correlationId: req.correlationId });
    return res.status(500).json(
      createErrorResponse('Failed to retrieve fraud patterns', 500, req.correlationId)
    );
  }
});
```

#### Step 4: Update Rate Limiting for Fraud Endpoints

**File**: `services/api-gateway/src/middleware/rateLimiting.ts`

```typescript
// Add fraud-specific rate limiter (more strict than standard)
const fraudRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // 50 requests per minute for fraud
  keyGenerator: (req) => {
    return req.user?.id || req.ip; // Rate limit per user or IP
  },
  skip: (req) => {
    // Don't rate limit health checks
    return req.path === '/health';
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many fraud assessment requests. Please try again later.',
    });
  },
});

// Export for use in routes
export { fraudRateLimit };
```

Update route to use it:

```typescript
// In routes.ts, replace userRateLimit with fraudRateLimit for fraud endpoints:
router.post('/api/fraud/assess', authenticateToken, fraudRateLimit, async (req, res) => {
  // ... handler
});
```

#### Step 5: Add Service Health Check for Fraud Detection

**File**: `services/api-gateway/src/services/ServiceRegistry.ts`

Update health check method:

```typescript
private async checkServiceHealth(serviceName: string, serviceUrl: string): Promise<boolean> {
  try {
    const response = await axios.get(`${serviceUrl}/health`, { timeout: 3000 });
    const isHealthy = response.status === 200 && response.data.status === 'ok';
    
    this.serviceHealth.set(serviceName, {
      healthy: isHealthy,
      lastChecked: new Date(),
      responseTime: response.headers['x-response-time']
        ? parseInt(response.headers['x-response-time'])
        : 0,
      url: serviceUrl,
      errorCount: isHealthy ? 0 : (this.serviceHealth.get(serviceName)?.errorCount || 0) + 1,
      circuitBreakerOpen: false,
    });
    
    return isHealthy;
  } catch (error) {
    const current = this.serviceHealth.get(serviceName);
    const errorCount = (current?.errorCount || 0) + 1;
    
    this.serviceHealth.set(serviceName, {
      healthy: false,
      lastChecked: new Date(),
      responseTime: 0,
      url: serviceUrl,
      errorCount,
      circuitBreakerOpen: errorCount >= 5, // Open circuit breaker after 5 failures
    });
    
    return false;
  }
}
```

### Testing the Implementation

#### Unit Test

**File**: `services/api-gateway/src/tests/fraud-routes.test.ts`

```typescript
import request from 'supertest';
import { app } from '../index';

describe('Fraud Detection API Routes', () => {
  let token: string;

  beforeAll(async () => {
    // Get valid auth token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    token = loginRes.body.data.token;
  });

  describe('POST /api/fraud/assess', () => {
    it('should assess claim for fraud risk', async () => {
      const response = await request(app)
        .post('/api/fraud/assess')
        .set('Authorization', `Bearer ${token}`)
        .send({
          claim_id: 12345,
          member_id: 789,
          institution_id: 456,
          amount: 5000,
          diagnosis_code: 'J45.901',
          service_date: '2025-12-01T10:00:00Z',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('risk_score');
      expect(response.body.data).toHaveProperty('risk_level');
      expect(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(
        response.body.data.risk_level
      );
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/fraud/assess')
        .send({
          claim_id: 12345,
          member_id: 789,
          institution_id: 456,
          amount: 5000,
        });

      expect(response.status).toBe(401);
    });

    it('should rate limit fraud requests after 50/min', async () => {
      // Send 51 requests
      for (let i = 0; i < 51; i++) {
        const response = await request(app)
          .post('/api/fraud/assess')
          .set('Authorization', `Bearer ${token}`)
          .send({
            claim_id: 12345 + i,
            member_id: 789,
            institution_id: 456,
            amount: 5000,
          });

        if (i < 50) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(429); // Rate limited
        }
      }
    });
  });

  describe('GET /api/fraud/risk/:claimId', () => {
    it('should retrieve fraud risk for claim', async () => {
      const response = await request(app)
        .get('/api/fraud/risk/12345')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('claim_id');
      expect(response.body.data).toHaveProperty('risk_level');
    });
  });

  describe('GET /api/fraud/patterns', () => {
    it('should retrieve fraud patterns for member', async () => {
      const response = await request(app)
        .get('/api/fraud/patterns?member_id=789')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.patterns)).toBe(true);
    });
  });
});
```

#### Integration Test

**File**: `services/api-gateway/src/tests/fraud-integration.test.ts`

```typescript
describe('Fraud Detection Service Integration', () => {
  it('should successfully route fraud assessment to service', async () => {
    const claimData = {
      claim_id: 99999,
      member_id: 123,
      institution_id: 456,
      amount: 10000,
      diagnosis_code: 'I10', // Hypertension
      service_date: '2025-12-15T14:30:00Z',
    };

    const response = await request(app)
      .post('/api/fraud/assess')
      .set('Authorization', `Bearer ${validToken}`)
      .send(claimData);

    expect(response.status).toBe(200);
    
    // Verify response structure
    expect(response.body).toMatchObject({
      success: true,
      data: {
        claim_id: 99999,
        risk_score: expect.any(Number),
        risk_level: expect.stringMatching(/NONE|LOW|MEDIUM|HIGH|CRITICAL/),
        detected_indicators: expect.any(Array),
        ml_confidence: expect.any(Number),
      },
    });
  });

  it('should handle fraud service unavailability gracefully', async () => {
    // Temporarily stop fraud service
    // Send request
    // Should return 503 with appropriate error message
    
    const response = await request(app)
      .post('/api/fraud/assess')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ claim_id: 12345, member_id: 789, amount: 5000 });

    expect(response.status).toBe(503);
    expect(response.body.message).toContain('unavailable');
  });
});
```

### Verification Checklist

- [ ] Fraud service registered in ServiceRegistry
- [ ] Service proxy configured in proxy.ts
- [ ] Routes added to api-gateway routes.ts
- [ ] Rate limiting configured (50 req/min)
- [ ] Authentication required on all endpoints
- [ ] Swagger documentation generated
- [ ] Health check working for fraud service
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] E2E test with actual fraud assessment
- [ ] Load test: 1000 req/min sustained
- [ ] Deployed to staging environment
- [ ] Verified from external API client
- [ ] Documentation updated

### Deployment Steps

```bash
# 1. Build API Gateway with fraud routes
cd services/api-gateway
npm run build

# 2. Run tests
npm run test

# 3. Deploy to staging
npm run deploy:staging

# 4. Smoke test fraud endpoints
curl -X POST http://localhost:5000/api/fraud/assess \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"claim_id": 12345, "member_id": 789, "amount": 5000}'

# 5. Monitor logs
npm run logs:api-gateway

# 6. Promote to production
npm run deploy:production
```

**Estimated Effort**: 1-2 hours  
**Risk Level**: 🟢 LOW (simple routing, no data structure changes)

---

## Gap #2: Saga Pattern for Cross-Service Transactions {#gap-2}

### Current Problem

**Status**: 🔴 CRITICAL FOR DATA CONSISTENCY

Current workflow lacks distributed transaction support:

```
Claims Approved
  ↓
Payment Initiated (async)
  ↓
Finance Posts (async)
  ↓ ⚠️ What if this fails? (orphaned payment)
  ↓
Notification Sent
  ↓
Final Status Updated
```

**Failure Scenarios**:
- Claim approved but payment creation fails → Inconsistent state
- Payment created but finance posting fails → Double-charging risk
- Finance posting succeeds but notification fails → Member never knows
- Notification sent but status update fails → Wrong data in database

### Why It Matters

Without saga pattern:
- Data inconsistencies across services
- Failed transactions never roll back
- Manual intervention required for recovery
- Member/provider confusion on actual status
- Audit trails break at failure point

### Architecture Solution: Choreography vs. Orchestration

#### Option A: Event-Driven Choreography (Recommended for your system)

```
Claims Service publishes "ClaimApproved" event
  ↓
Finance Service subscribes, creates payment
  ↓ publishes "PaymentCreated"
  ↓
Finance Service subscribes, posts to ledger
  ↓ publishes "FinancePosted"
  ↓
Notification Service subscribes, sends EOB
  ↓ publishes "NotificationSent"
  ↓
If any step fails, compensating transaction published
```

**Pros**: Loosely coupled, scalable, asynchronous  
**Cons**: Harder to debug, eventual consistency only

#### Option B: Orchestration (For strict consistency needs)

```
Claims Orchestrator Service
  ├─ Step 1: Call Finance Service → Create Payment
  ├─ Step 2: Call Finance Service → Post to Ledger
  ├─ Step 3: Call Core Service → Send Notification
  └─ Step 4: Update Claims Status
  
If any step fails:
  └─ Execute compensation steps in reverse order
```

**Pros**: Single point of control, easier to debug  
**Cons**: Creates bottleneck, more coupling

### Implementation: Event-Driven Choreography with Compensating Transactions

#### Step 1: Define Saga Events

**File**: `shared/events/ClaimsSagaEvents.ts`

```typescript
import { z } from 'zod';

// Event types
export enum ClaimsSagaEventType {
  // Forward flow
  CLAIM_APPROVED = 'claims.approved',
  PAYMENT_CREATED = 'payment.created',
  FINANCE_POSTED = 'finance.posted',
  NOTIFICATION_SENT = 'notification.sent',
  SAGA_COMPLETED = 'saga.completed',

  // Compensation flow
  PAYMENT_CREATION_FAILED = 'payment.creation.failed',
  FINANCE_POSTING_FAILED = 'finance.posting.failed',
  NOTIFICATION_FAILED = 'notification.failed',
  COMPENSATION_INITIATED = 'compensation.initiated',
  PAYMENT_REVERSED = 'payment.reversed',
  FINANCE_REVERSED = 'finance.reversed',
  SAGA_FAILED = 'saga.failed',
}

// Event schemas
export const claimApprovedEventSchema = z.object({
  event_id: z.string().uuid(),
  claim_id: z.number(),
  member_id: z.number(),
  approved_amount: z.number(),
  member_responsibility: z.number(),
  deductible_applied: z.number(),
  institution_id: z.number(),
  diagnosis_code: z.string(),
  timestamp: z.string().datetime(),
  saga_id: z.string().uuid(),
});

export const paymentCreatedEventSchema = z.object({
  event_id: z.string().uuid(),
  claim_id: z.number(),
  payment_id: z.number(),
  amount: z.number(),
  timestamp: z.string().datetime(),
  saga_id: z.string().uuid(),
});

export const financePostedEventSchema = z.object({
  event_id: z.string().uuid(),
  payment_id: z.number(),
  amount: z.number(),
  posting_date: z.string().datetime(),
  ledger_entry_id: z.number(),
  timestamp: z.string().datetime(),
  saga_id: z.string().uuid(),
});

export const notificationSentEventSchema = z.object({
  event_id: z.string().uuid(),
  claim_id: z.number(),
  member_id: z.number(),
  notification_id: z.number(),
  timestamp: z.string().datetime(),
  saga_id: z.string().uuid(),
});

export const sagaCompletedEventSchema = z.object({
  event_id: z.string().uuid(),
  saga_id: z.string().uuid(),
  claim_id: z.number(),
  final_status: z.enum(['completed', 'failed', 'compensated']),
  timestamp: z.string().datetime(),
});

export const paymentReversedEventSchema = z.object({
  event_id: z.string().uuid(),
  payment_id: z.number(),
  original_amount: z.number(),
  reversal_amount: z.number(),
  reason: z.string(),
  timestamp: z.string().datetime(),
  saga_id: z.string().uuid(),
});

export type ClaimApprovedEvent = z.infer<typeof claimApprovedEventSchema>;
export type PaymentCreatedEvent = z.infer<typeof paymentCreatedEventSchema>;
export type FinancePostedEvent = z.infer<typeof financePostedEventSchema>;
export type NotificationSentEvent = z.infer<typeof notificationSentEventSchema>;
export type SagaCompletedEvent = z.infer<typeof sagaCompletedEventSchema>;
export type PaymentReversedEvent = z.infer<typeof paymentReversedEventSchema>;
```

#### Step 2: Create Saga State Machine

**File**: `shared/saga/SagaState.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export enum SagaStatus {
  INITIATED = 'initiated',
  PAYMENT_PENDING = 'payment_pending',
  FINANCE_PENDING = 'finance_pending',
  NOTIFICATION_PENDING = 'notification_pending',
  COMPLETED = 'completed',
  COMPENSATING = 'compensating',
  COMPENSATED = 'compensated',
  FAILED = 'failed',
}

export enum SagaStep {
  CREATE_PAYMENT = 'create_payment',
  POST_FINANCE = 'post_finance',
  SEND_NOTIFICATION = 'send_notification',
  UPDATE_STATUS = 'update_status',
}

export const sagaStateSchema = z.object({
  saga_id: z.string().uuid(),
  claim_id: z.number(),
  member_id: z.number(),
  institution_id: z.number(),
  approved_amount: z.number(),
  status: z.nativeEnum(SagaStatus),
  current_step: z.nativeEnum(SagaStep).optional(),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  failed_at: z.string().datetime().optional(),
  failed_step: z.nativeEnum(SagaStep).optional(),
  failure_reason: z.string().optional(),
  
  // Compensation tracking
  compensation_attempts: z.number().default(0),
  compensation_completed_at: z.string().datetime().optional(),
  
  // Created resource IDs for reversal
  payment_id: z.number().optional(),
  ledger_entry_id: z.number().optional(),
  notification_id: z.number().optional(),
  
  // Audit trail
  events: z.array(z.object({
    event_type: z.string(),
    timestamp: z.string().datetime(),
    step: z.nativeEnum(SagaStep),
    details: z.record(z.any()).optional(),
  })),
});

export type SagaState = z.infer<typeof sagaStateSchema>;

export class ClaimApprovalSaga {
  private state: SagaState;

  constructor(claimId: number, memberId: number, institutionId: number, amount: number) {
    this.state = {
      saga_id: uuidv4(),
      claim_id: claimId,
      member_id: memberId,
      institution_id: institutionId,
      approved_amount: amount,
      status: SagaStatus.INITIATED,
      started_at: new Date().toISOString(),
      events: [
        {
          event_type: 'saga.initiated',
          timestamp: new Date().toISOString(),
          step: SagaStep.CREATE_PAYMENT,
        },
      ],
    };
  }

  getState(): SagaState {
    return { ...this.state };
  }

  transitionTo(status: SagaStatus, step?: SagaStep, details?: Record<string, any>) {
    this.state.status = status;
    if (step) this.state.current_step = step;
    
    this.state.events.push({
      event_type: `saga.${status}`,
      timestamp: new Date().toISOString(),
      step: step || this.state.current_step,
      details,
    });
  }

  recordPaymentCreated(paymentId: number) {
    this.state.payment_id = paymentId;
    this.transitionTo(SagaStatus.FINANCE_PENDING, SagaStep.POST_FINANCE);
  }

  recordFinancePosted(ledgerEntryId: number) {
    this.state.ledger_entry_id = ledgerEntryId;
    this.transitionTo(SagaStatus.NOTIFICATION_PENDING, SagaStep.SEND_NOTIFICATION);
  }

  recordNotificationSent(notificationId: number) {
    this.state.notification_id = notificationId;
    this.transitionTo(SagaStatus.COMPLETED, SagaStep.UPDATE_STATUS, {
      completed_at: new Date().toISOString(),
    });
    this.state.completed_at = new Date().toISOString();
  }

  recordFailure(step: SagaStep, reason: string) {
    this.state.status = SagaStatus.COMPENSATING;
    this.state.failed_step = step;
    this.state.failure_reason = reason;
    this.state.failed_at = new Date().toISOString();
    
    this.state.events.push({
      event_type: `saga.failed_at_${step}`,
      timestamp: new Date().toISOString(),
      step,
      details: { reason },
    });
  }

  recordCompensation(step: SagaStep) {
    this.state.compensation_attempts++;
    this.state.events.push({
      event_type: `saga.compensating_${step}`,
      timestamp: new Date().toISOString(),
      step,
    });
  }

  markCompensated() {
    this.state.status = SagaStatus.COMPENSATED;
    this.state.compensation_completed_at = new Date().toISOString();
  }
}
```

#### Step 3: Create Saga Orchestrator Service

**File**: `services/claims-service/src/saga/SagaOrchestrator.ts`

```typescript
import { EventBus } from '../events/EventBus';
import { ClaimApprovalSaga, SagaStatus, SagaStep } from '../../../shared/saga/SagaState';
import { HttpClient } from '../clients/HttpClient';
import { Database } from '../database';
import { createLogger } from '../utils/logger';

const logger = createLogger();

export class SagaOrchestrator {
  constructor(
    private eventBus: EventBus,
    private httpClient: HttpClient,
    private db: Database
  ) {
    // Subscribe to saga events
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for claim approved events
    this.eventBus.subscribe('claims.approved', async (event) => {
      await this.handleClaimApproved(event);
    });

    // Listen for failure events
    this.eventBus.subscribe('payment.creation.failed', async (event) => {
      await this.handlePaymentCreationFailed(event);
    });

    this.eventBus.subscribe('finance.posting.failed', async (event) => {
      await this.handleFinancePostingFailed(event);
    });

    this.eventBus.subscribe('notification.failed', async (event) => {
      await this.handleNotificationFailed(event);
    });
  }

  async handleClaimApproved(event: any) {
    const saga = new ClaimApprovalSaga(
      event.claim_id,
      event.member_id,
      event.institution_id,
      event.approved_amount
    );

    // Persist saga state
    await this.saveSagaState(saga.getState());

    try {
      // Step 1: Create payment in Finance Service
      saga.transitionTo(SagaStatus.PAYMENT_PENDING, SagaStep.CREATE_PAYMENT);
      
      const paymentResponse = await this.createPayment({
        claim_id: saga.getState().claim_id,
        member_id: saga.getState().member_id,
        amount: saga.getState().approved_amount,
        saga_id: saga.getState().saga_id,
      });

      if (!paymentResponse.success) {
        throw new Error(`Payment creation failed: ${paymentResponse.error}`);
      }

      saga.recordPaymentCreated(paymentResponse.data.payment_id);
      await this.saveSagaState(saga.getState());

      // Publish payment created event
      this.eventBus.publish('payment.created', {
        event_id: uuidv4(),
        claim_id: saga.getState().claim_id,
        payment_id: paymentResponse.data.payment_id,
        amount: saga.getState().approved_amount,
        timestamp: new Date().toISOString(),
        saga_id: saga.getState().saga_id,
      });

    } catch (error) {
      logger.error('Payment creation failed', error, {
        saga_id: saga.getState().saga_id,
        claim_id: saga.getState().claim_id,
      });

      saga.recordFailure(SagaStep.CREATE_PAYMENT, error.message);
      await this.saveSagaState(saga.getState());

      // Publish failure event
      this.eventBus.publish('payment.creation.failed', {
        event_id: uuidv4(),
        saga_id: saga.getState().saga_id,
        claim_id: saga.getState().claim_id,
        reason: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async handlePaymentCreationFailed(event: any) {
    const saga = await this.loadSagaState(event.saga_id);

    // Initiate compensation
    saga.recordCompensation(SagaStep.CREATE_PAYMENT);
    await this.saveSagaState(saga);

    // No need to compensate if payment wasn't created
    saga.markCompensated();
    await this.saveSagaState(saga);

    // Publish saga failed event
    this.eventBus.publish('saga.failed', {
      event_id: uuidv4(),
      saga_id: event.saga_id,
      claim_id: saga.claim_id,
      final_status: 'failed',
      reason: 'Payment creation failed',
      timestamp: new Date().toISOString(),
    });
  }

  async handleFinancePostingFailed(event: any) {
    const saga = await this.loadSagaState(event.saga_id);

    saga.recordFailure(SagaStep.POST_FINANCE, event.reason);
    saga.recordCompensation(SagaStep.POST_FINANCE);
    await this.saveSagaState(saga);

    // Compensate: Reverse payment
    try {
      await this.reversePayment(saga.payment_id!);
      
      this.eventBus.publish('payment.reversed', {
        event_id: uuidv4(),
        payment_id: saga.payment_id,
        original_amount: saga.approved_amount,
        reversal_amount: saga.approved_amount,
        reason: 'Finance posting failed - automatic reversal',
        saga_id: saga.saga_id,
        timestamp: new Date().toISOString(),
      });

      saga.markCompensated();
      await this.saveSagaState(saga);

    } catch (error) {
      logger.error('Payment reversal failed during compensation', error, {
        saga_id: saga.saga_id,
        payment_id: saga.payment_id,
      });

      // Escalate to manual review
      await this.escalateForManualReview(saga);
    }
  }

  async handleNotificationFailed(event: any) {
    const saga = await this.loadSagaState(event.saga_id);

    saga.recordFailure(SagaStep.SEND_NOTIFICATION, event.reason);
    saga.recordCompensation(SagaStep.SEND_NOTIFICATION);
    await this.saveSagaState(saga);

    // Compensation: Reverse everything
    try {
      // 1. Reverse finance posting
      await this.reverseLedgerPosting(saga.ledger_entry_id!);

      // 2. Reverse payment
      await this.reversePayment(saga.payment_id!);

      saga.markCompensated();
      await this.saveSagaState(saga);

      logger.warn('Saga compensation completed', {
        saga_id: saga.saga_id,
        claim_id: saga.claim_id,
      });

    } catch (error) {
      logger.error('Compensation failed', error, {
        saga_id: saga.saga_id,
      });

      await this.escalateForManualReview(saga);
    }
  }

  private async createPayment(data: {
    claim_id: number;
    member_id: number;
    amount: number;
    saga_id: string;
  }): Promise<{ success: boolean; data?: { payment_id: number }; error?: string }> {
    try {
      const response = await this.httpClient.post('http://localhost:3003/api/finance/payments', data, {
        headers: {
          'X-Saga-ID': data.saga_id,
          'X-Idempotency-Key': `${data.claim_id}-${data.saga_id}`,
        },
      });

      return {
        success: response.status === 201 || response.status === 200,
        data: response.data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async reversePayment(paymentId: number): Promise<void> {
    await this.httpClient.post(`http://localhost:3003/api/finance/payments/${paymentId}/reverse`, {
      reason: 'Saga compensation',
    });
  }

  private async reverseLedgerPosting(ledgerId: number): Promise<void> {
    await this.httpClient.post(`http://localhost:3003/api/finance/ledger/${ledgerId}/reverse`, {
      reason: 'Saga compensation',
    });
  }

  private async escalateForManualReview(saga: ClaimApprovalSaga): Promise<void> {
    const sagaState = saga.getState();
    
    await this.db.query(
      `INSERT INTO saga_escalations (saga_id, claim_id, status, reason, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [sagaState.saga_id, sagaState.claim_id, 'manual_review_required', 'Compensation failed']
    );

    logger.error('Saga escalated for manual review', {
      saga_id: sagaState.saga_id,
      claim_id: sagaState.claim_id,
    });
  }

  private async saveSagaState(state: any): Promise<void> {
    await this.db.query(
      `INSERT INTO saga_states (saga_id, claim_id, status, state, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (saga_id) DO UPDATE SET
       status = EXCLUDED.status,
       state = EXCLUDED.state,
       updated_at = NOW()`,
      [state.saga_id, state.claim_id, state.status, JSON.stringify(state)]
    );
  }

  private async loadSagaState(sagaId: string): Promise<any> {
    const result = await this.db.query(
      `SELECT state FROM saga_states WHERE saga_id = $1`,
      [sagaId]
    );

    return JSON.parse(result.rows[0].state);
  }
}
```

#### Step 4: Create Saga Tables

**File**: `database/migrations/001_create_saga_tables.sql`

```sql
-- Saga state tracking
CREATE TABLE saga_states (
  saga_id UUID PRIMARY KEY,
  claim_id INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL,
  state JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (claim_id) REFERENCES claims(id)
);

CREATE INDEX idx_saga_states_claim_id ON saga_states(claim_id);
CREATE INDEX idx_saga_states_status ON saga_states(status);
CREATE INDEX idx_saga_states_created_at ON saga_states(created_at);

-- Saga escalations (for failed compensations)
CREATE TABLE saga_escalations (
  id SERIAL PRIMARY KEY,
  saga_id UUID NOT NULL,
  claim_id INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'manual_review_required',
  reason TEXT,
  assigned_to INTEGER,
  notes TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (saga_id) REFERENCES saga_states(saga_id),
  FOREIGN KEY (claim_id) REFERENCES claims(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE INDEX idx_saga_escalations_status ON saga_escalations(status);
CREATE INDEX idx_saga_escalations_assigned_to ON saga_escalations(assigned_to);

-- Saga event log (audit trail)
CREATE TABLE saga_event_logs (
  id SERIAL PRIMARY KEY,
  saga_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (saga_id) REFERENCES saga_states(saga_id)
);

CREATE INDEX idx_saga_event_logs_saga_id ON saga_event_logs(saga_id);
CREATE INDEX idx_saga_event_logs_event_type ON saga_event_logs(event_type);
```

#### Step 5: Wire Saga Orchestrator into Claims Service

**File**: `services/claims-service/src/index.ts`

```typescript
import { SagaOrchestrator } from './saga/SagaOrchestrator';
import { EventBus } from './events/EventBus';
import { HttpClient } from './clients/HttpClient';
import { db } from './config/database';

// Initialize saga orchestrator
const eventBus = new EventBus();
const httpClient = new HttpClient();
const sagaOrchestrator = new SagaOrchestrator(eventBus, httpClient, db);

// When claim is approved, emit event that triggers saga
app.post('/api/claims/approve/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Approve the claim
    const result = await approveClaim(id);
    
    // Publish event that triggers saga
    eventBus.publish('claims.approved', {
      event_id: uuidv4(),
      claim_id: result.claim_id,
      member_id: result.member_id,
      approved_amount: result.approved_amount,
      member_responsibility: result.member_responsibility,
      institution_id: result.institution_id,
      diagnosis_code: result.diagnosis_code,
      timestamp: new Date().toISOString(),
      saga_id: uuidv4(),
    });

    res.json(createSuccessResponse(result));
  } catch (error) {
    res.status(500).json(createErrorResponse(error.message));
  }
});
```

### Testing Saga Pattern

**File**: `services/claims-service/src/tests/saga-orchestration.test.ts`

```typescript
describe('Saga Orchestration', () => {
  let eventBus: EventBus;
  let httpClient: HttpClient;
  let orchestrator: SagaOrchestrator;

  beforeEach(() => {
    eventBus = new EventBus();
    httpClient = new HttpClient();
    orchestrator = new SagaOrchestrator(eventBus, httpClient, db);
  });

  it('should complete full saga on successful claim approval', async () => {
    // Mock successful payment creation
    jest.spyOn(httpClient, 'post').mockResolvedValueOnce({
      status: 201,
      data: { data: { payment_id: 999 } },
    });

    // Publish claim approved event
    eventBus.publish('claims.approved', {
      claim_id: 12345,
      member_id: 789,
      approved_amount: 5000,
      institution_id: 456,
    });

    // Wait for saga to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify saga state
    const sagaState = await orchestrator.getSagaState(sagaId);
    expect(sagaState.status).toBe(SagaStatus.COMPLETED);
    expect(sagaState.payment_id).toBe(999);
  });

  it('should compensate when payment creation fails', async () => {
    // Mock payment creation failure
    jest.spyOn(httpClient, 'post').mockRejectedValueOnce(
      new Error('Payment service unavailable')
    );

    eventBus.publish('claims.approved', {
      claim_id: 12345,
      member_id: 789,
      approved_amount: 5000,
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const sagaState = await orchestrator.getSagaState(sagaId);
    expect(sagaState.status).toBe(SagaStatus.COMPENSATED);
    expect(sagaState.failed_step).toBe(SagaStep.CREATE_PAYMENT);
  });

  it('should reverse payment on finance posting failure', async () => {
    // Mock successful payment creation
    jest.spyOn(httpClient, 'post').mockResolvedValueOnce({
      status: 201,
      data: { data: { payment_id: 999 } },
    });

    // Mock finance posting failure
    jest.spyOn(httpClient, 'post').mockRejectedValueOnce(
      new Error('Finance service error')
    );

    // Mock payment reversal success
    jest.spyOn(httpClient, 'post').mockResolvedValueOnce({
      status: 200,
      data: { success: true },
    });

    eventBus.publish('claims.approved', {
      claim_id: 12345,
      member_id: 789,
      approved_amount: 5000,
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify payment was reversed
    const reverseCall = httpClient.post.mock.calls.find(
      call => call[0].includes('/reverse')
    );
    expect(reverseCall).toBeDefined();
  });

  it('should escalate for manual review on compensation failure', async () => {
    // Mock all service calls to fail
    jest.spyOn(httpClient, 'post').mockRejectedValue(
      new Error('Service unavailable')
    );

    eventBus.publish('claims.approved', {
      claim_id: 12345,
      member_id: 789,
      approved_amount: 5000,
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify escalation was created
    const escalations = await db.query(
      'SELECT * FROM saga_escalations WHERE claim_id = $1',
      [12345]
    );
    expect(escalations.rows.length).toBeGreaterThan(0);
    expect(escalations.rows[0].status).toBe('manual_review_required');
  });
});
```

### Saga Pattern Monitoring Dashboard

Create a dashboard to monitor saga states:

```typescript
// GET /api/saga/dashboard
router.get('/api/saga/dashboard', async (req, res) => {
  const [
    totalSagas,
    completedSagas,
    compensatedSagas,
    failedSagas,
    escalations,
  ] = await Promise.all([
    db.query('SELECT COUNT(*) FROM saga_states'),
    db.query('SELECT COUNT(*) FROM saga_states WHERE status = $1', [SagaStatus.COMPLETED]),
    db.query('SELECT COUNT(*) FROM saga_states WHERE status = $1', [SagaStatus.COMPENSATED]),
    db.query('SELECT COUNT(*) FROM saga_states WHERE status = $1', [SagaStatus.FAILED]),
    db.query('SELECT COUNT(*) FROM saga_escalations WHERE status = $1', ['manual_review_required']),
  ]);

  res.json(createSuccessResponse({
    total_sagas: parseInt(totalSagas.rows[0].count),
    completed: parseInt(completedSagas.rows[0].count),
    compensated: parseInt(compensatedSagas.rows[0].count),
    failed: parseInt(failedSagas.rows[0].count),
    pending_manual_review: parseInt(escalations.rows[0].count),
    success_rate: ((parseInt(completedSagas.rows[0].count) / parseInt(totalSagas.rows[0].count)) * 100).toFixed(2) + '%',
  }));
});
```

**Estimated Effort**: 8-12 hours  
**Risk Level**: 🟡 MEDIUM (significant architectural change, extensive testing needed)

---

## Gap #3: Error Recovery Workflow for Payments {#gap-3}

### Current Problem

**Status**: 🟡 MEDIUM - Affects Payment Reliability

Current state when payment fails:

```
Payment Processing Failure
  ↓
Error logged in Finance Service
  ↓
⚠️ No automatic retry
⚠️ No escalation
⚠️ Manual intervention required
  ↓
Member never notified
Provider never receives payment
Claim status stuck in "processing"
```

**Real-World Scenario**:
- 3:15 PM: Claim approved, payment initiated
- 3:16 PM: Payment API timeout (temporary network issue)
- ❌ Payment creation failed
- 👤 Ticket created, waiting for manual intervention
- 48+ hours later: Someone notices the failed payment

### Why It Matters

- **Member Experience**: Payment delays cause frustration
- **Provider Relationships**: Delayed payments damage provider networks
- **Operational Cost**: Manual intervention is expensive
- **Compliance**: SLAs require timely claim payments
- **System Health**: Failed payments pile up, audit trails break

### Solution: Automatic Retry with Progressive Backoff + Escalation

#### Step 1: Create Payment Retry Service

**File**: `services/finance-service/src/services/PaymentRetryService.ts`

```typescript
import { Database } from '../config/database';
import { createLogger } from '../utils/logger';
import { EventBus } from '../events/EventBus';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger();

export interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs: number;
  retryableStatusCodes: number[];
}

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 5,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 300000, // 5 minutes
  backoffMultiplier: 2, // Exponential backoff
  jitterMs: 5000, // Random jitter up to 5 seconds
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

export class PaymentRetryService {
  private retryPolicy: RetryPolicy;

  constructor(
    private db: Database,
    private eventBus: EventBus,
    retryPolicy?: Partial<RetryPolicy>
  ) {
    this.retryPolicy = { ...DEFAULT_RETRY_POLICY, ...retryPolicy };
  }

  /**
   * Schedule a payment for retry
   */
  async schedulePaymentRetry(paymentId: number, reason: string): Promise<void> {
    const nextRetryTime = this.calculateNextRetryTime(0);

    await this.db.query(
      `INSERT INTO payment_retries 
       (payment_id, retry_count, last_error, next_retry_at, created_at) 
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (payment_id) DO UPDATE SET
       retry_count = payment_retries.retry_count + 1,
       last_error = $3,
       next_retry_at = $4
      `,
      [paymentId, 1, reason, nextRetryTime]
    );

    logger.info('Payment scheduled for retry', {
      payment_id: paymentId,
      next_retry_at: nextRetryTime,
      reason,
    });
  }

  /**
   * Process all pending retries
   */
  async processPendingRetries(): Promise<void> {
    const now = new Date();

    const result = await this.db.query(
      `SELECT p.*, pr.retry_count, pr.next_retry_at
       FROM payments p
       JOIN payment_retries pr ON p.id = pr.payment_id
       WHERE pr.next_retry_at <= $1
       AND pr.retry_count < $2
       AND p.status = 'failed'
       ORDER BY pr.next_retry_at ASC
       LIMIT 100`,
      [now, this.retryPolicy.maxAttempts]
    );

    logger.info('Processing pending retries', {
      count: result.rows.length,
    });

    for (const payment of result.rows) {
      try {
        await this.retryPayment(payment);
      } catch (error) {
        logger.error('Retry attempt failed', error, {
          payment_id: payment.id,
          retry_count: payment.retry_count,
        });
      }
    }
  }

  /**
   * Retry a single payment
   */
  private async retryPayment(payment: any): Promise<void> {
    const { id: paymentId, retry_count, amount, claim_id, institution_id } = payment;

    try {
      logger.info('Attempting payment retry', {
        payment_id: paymentId,
        attempt: retry_count + 1,
        amount,
      });

      // Call payment processor (Stripe, bank API, etc.)
      const result = await this.processPayment({
        payment_id: paymentId,
        amount,
        provider_id: institution_id,
        idempotency_key: `${paymentId}-${retry_count}`, // Idempotent retry
      });

      if (result.success) {
        // Payment succeeded
        await this.markPaymentSuccessful(paymentId, result.transaction_id);

        // Publish success event
        this.eventBus.publish('payment.retry.success', {
          event_id: uuidv4(),
          payment_id: paymentId,
          amount,
          claim_id,
          attempt: retry_count + 1,
          timestamp: new Date().toISOString(),
        });

        logger.info('Payment retry succeeded', {
          payment_id: paymentId,
          attempt: retry_count + 1,
        });
      } else {
        // Payment still failed
        await this.scheduleNextRetry(paymentId, retry_count, result.error);

        // Check if max retries exceeded
        if (retry_count + 1 >= this.retryPolicy.maxAttempts) {
          await this.escalatePaymentFailure(paymentId, payment);
        }

        logger.warn('Payment retry failed, scheduled next attempt', {
          payment_id: paymentId,
          attempt: retry_count + 1,
          error: result.error,
        });
      }
    } catch (error) {
      logger.error('Error processing payment retry', error, {
        payment_id: paymentId,
      });

      await this.scheduleNextRetry(paymentId, retry_count, error.message);
    }
  }

  /**
   * Schedule next retry with exponential backoff
   */
  private async scheduleNextRetry(
    paymentId: number,
    currentAttempt: number,
    error: string
  ): Promise<void> {
    const nextRetryTime = this.calculateNextRetryTime(currentAttempt);

    await this.db.query(
      `UPDATE payment_retries 
       SET retry_count = retry_count + 1,
           last_error = $1,
           next_retry_at = $2,
           last_retry_at = NOW()
       WHERE payment_id = $3
      `,
      [error, nextRetryTime, paymentId]
    );
  }

  /**
   * Calculate next retry time with exponential backoff + jitter
   */
  private calculateNextRetryTime(attemptNumber: number): Date {
    const baseDelay = Math.min(
      this.retryPolicy.initialDelayMs * Math.pow(this.retryPolicy.backoffMultiplier, attemptNumber),
      this.retryPolicy.maxDelayMs
    );

    const jitter = Math.random() * this.retryPolicy.jitterMs;
    const totalDelay = baseDelay + jitter;

    return new Date(Date.now() + totalDelay);
  }

  /**
   * Escalate payment failure for manual review
   */
  private async escalatePaymentFailure(paymentId: number, payment: any): Promise<void> {
    const ticket = {
      id: uuidv4(),
      payment_id: paymentId,
      claim_id: payment.claim_id,
      member_id: payment.member_id,
      amount: payment.amount,
      status: 'escalated',
      priority: payment.amount > 10000 ? 'high' : 'normal',
      description: `Payment failed after ${this.retryPolicy.maxAttempts} retry attempts. Manual review required.`,
      created_at: new Date().toISOString(),
      due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hour SLA
    };

    // Create escalation ticket
    await this.db.query(
      `INSERT INTO payment_escalations 
       (id, payment_id, claim_id, member_id, status, priority, description, created_at, due_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        ticket.id,
        ticket.payment_id,
        ticket.claim_id,
        ticket.member_id,
        ticket.status,
        ticket.priority,
        ticket.description,
        ticket.created_at,
        ticket.due_at,
      ]
    );

    // Notify support team
    await this.notifyPaymentEscalation(ticket);

    // Publish escalation event
    this.eventBus.publish('payment.escalated', {
      event_id: uuidv4(),
      payment_id: paymentId,
      claim_id: payment.claim_id,
      escalation_id: ticket.id,
      reason: `Max retries (${this.retryPolicy.maxAttempts}) exceeded`,
      amount: payment.amount,
      timestamp: new Date().toISOString(),
    });

    logger.error('Payment escalated to manual review', {
      payment_id: paymentId,
      escalation_id: ticket.id,
      claim_id: payment.claim_id,
    });
  }

  /**
   * Process the actual payment (abstract - implement based on payment processor)
   */
  private async processPayment(params: {
    payment_id: number;
    amount: number;
    provider_id: number;
    idempotency_key: string;
  }): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
    try {
      // Example: Call payment processor API
      const response = await axios.post(
        `${process.env.PAYMENT_PROCESSOR_API}/charge`,
        {
          amount: params.amount,
          provider_id: params.provider_id,
          idempotency_key: params.idempotency_key,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.PAYMENT_API_KEY}`,
            'Idempotency-Key': params.idempotency_key,
          },
          timeout: 10000,
        }
      );

      return {
        success: response.status === 200,
        transaction_id: response.data.transaction_id,
      };
    } catch (error) {
      if (error.response) {
        // API returned error
        const status = error.response.status;
        const isRetryable = this.retryPolicy.retryableStatusCodes.includes(status);

        return {
          success: false,
          error: `Payment processor returned ${status}: ${error.response.data.message}`,
        };
      } else {
        // Network error
        return {
          success: false,
          error: error.message,
        };
      }
    }
  }

  /**
   * Mark payment as successful and update claim
   */
  private async markPaymentSuccessful(paymentId: number, transactionId: string): Promise<void> {
    // Update payment status
    const paymentResult = await this.db.query(
      `UPDATE payments 
       SET status = 'completed',
           transaction_id = $1,
           completed_at = NOW()
       WHERE id = $2
       RETURNING claim_id
      `,
      [transactionId, paymentId]
    );

    const claimId = paymentResult.rows[0]?.claim_id;

    // Update claim status if this was the final payment
    if (claimId) {
      await this.db.query(
        `UPDATE claims 
         SET status = 'paid',
             payment_date = NOW()
         WHERE id = $1
        `,
        [claimId]
      );
    }

    // Clean up retry record
    await this.db.query(
      'DELETE FROM payment_retries WHERE payment_id = $1',
      [paymentId]
    );
  }

  /**
   * Notify support team of escalation
   */
  private async notifyPaymentEscalation(ticket: any): Promise<void> {
    // Send email to support team
    // Send Slack notification
    // Create task in project management system
    
    logger.info('Payment escalation notification sent', {
      escalation_id: ticket.id,
      payment_id: ticket.payment_id,
    });
  }
}
```

#### Step 2: Create Database Tables for Payment Retries

**File**: `database/migrations/002_create_payment_retry_tables.sql`

```sql
-- Payment retry tracking
CREATE TABLE payment_retries (
  payment_id INTEGER PRIMARY KEY,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  last_retry_at TIMESTAMP,
  next_retry_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (payment_id) REFERENCES payments(id)
);

CREATE INDEX idx_payment_retries_next_retry_at ON payment_retries(next_retry_at);
CREATE INDEX idx_payment_retries_retry_count ON payment_retries(retry_count);

-- Payment escalations (manual review)
CREATE TABLE payment_escalations (
  id UUID PRIMARY KEY,
  payment_id INTEGER NOT NULL,
  claim_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'escalated',
  priority VARCHAR(20) DEFAULT 'normal',
  description TEXT,
  assigned_to INTEGER,
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  due_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  FOREIGN KEY (claim_id) REFERENCES claims(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE INDEX idx_payment_escalations_status ON payment_escalations(status);
CREATE INDEX idx_payment_escalations_assigned_to ON payment_escalations(assigned_to);
CREATE INDEX idx_payment_escalations_due_at ON payment_escalations(due_at);
CREATE INDEX idx_payment_escalations_priority ON payment_escalations(priority);

-- Retry attempt history (audit log)
CREATE TABLE retry_attempts (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL,
  attempt_number INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  response_code INTEGER,
  transaction_id VARCHAR(255),
  next_retry_scheduled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (payment_id) REFERENCES payments(id)
);

CREATE INDEX idx_retry_attempts_payment_id ON retry_attempts(payment_id);
CREATE INDEX idx_retry_attempts_created_at ON retry_attempts(created_at);
```

#### Step 3: Set Up Automatic Retry Scheduler

**File**: `services/finance-service/src/jobs/PaymentRetryScheduler.ts`

```typescript
import { CronJob } from 'cron';
import { PaymentRetryService } from '../services/PaymentRetryService';
import { createLogger } from '../utils/logger';

const logger = createLogger();

/**
 * Process pending payment retries every 5 minutes
 */
export function setupPaymentRetryScheduler(retryService: PaymentRetryService): CronJob {
  const job = new CronJob(
    '*/5 * * * *', // Every 5 minutes
    async () => {
      try {
        logger.info('Starting payment retry processing');
        await retryService.processPendingRetries();
        logger.info('Payment retry processing completed');
      } catch (error) {
        logger.error('Payment retry processing failed', error);
      }
    },
    null, // onComplete
    true, // start immediately
    'UTC'
  );

  logger.info('Payment retry scheduler initialized');
  return job;
}
```

Wire it into the Finance Service:

**File**: `services/finance-service/src/index.ts`

```typescript
import { setupPaymentRetryScheduler } from './jobs/PaymentRetryScheduler';

const retryService = new PaymentRetryService(db, eventBus);
const retryScheduler = setupPaymentRetryScheduler(retryService);

// On shutdown
process.on('SIGTERM', () => {
  retryScheduler.stop();
  server.close(() => {
    logger.info('Server shut down gracefully');
    process.exit(0);
  });
});
```

#### Step 4: Create Escalation Dashboard

**File**: `services/finance-service/src/api/escalation-routes.ts`

```typescript
/**
 * GET /api/finance/escalations/dashboard
 */
router.get('/api/finance/escalations/dashboard', authenticateToken, async (req, res) => {
  const [
    totalEscalations,
    activeEscalations,
    overdueEscalations,
    resolved,
  ] = await Promise.all([
    db.query('SELECT COUNT(*) FROM payment_escalations'),
    db.query("SELECT COUNT(*) FROM payment_escalations WHERE status = 'escalated'"),
    db.query("SELECT COUNT(*) FROM payment_escalations WHERE due_at < NOW() AND status = 'escalated'"),
    db.query("SELECT COUNT(*) FROM payment_escalations WHERE status = 'resolved'"),
  ]);

  res.json(createSuccessResponse({
    total_escalations: parseInt(totalEscalations.rows[0].count),
    active: parseInt(activeEscalations.rows[0].count),
    overdue: parseInt(overdueEscalations.rows[0].count),
    resolved: parseInt(resolved.rows[0].count),
    resolution_time_sla: '24 hours',
  }));
});

/**
 * GET /api/finance/escalations
 */
router.get('/api/finance/escalations', authenticateToken, async (req, res) => {
  const { status = 'escalated', limit = 50, offset = 0 } = req.query;

  const result = await db.query(
    `SELECT pe.*, p.amount, c.claim_number, m.first_name, m.last_name, u.full_name as assigned_to_name
     FROM payment_escalations pe
     JOIN payments p ON pe.payment_id = p.id
     JOIN claims c ON pe.claim_id = c.id
     JOIN members m ON pe.member_id = m.id
     LEFT JOIN users u ON pe.assigned_to = u.id
     WHERE pe.status = $1
     ORDER BY pe.created_at DESC
     LIMIT $2 OFFSET $3
    `,
    [status, limit, offset]
  );

  res.json(createSuccessResponse(result.rows));
});

/**
 * POST /api/finance/escalations/:id/resolve
 */
router.post('/api/finance/escalations/:id/resolve', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { resolution_notes, resolution_method } = req.body;

  const result = await db.query(
    `UPDATE payment_escalations
     SET status = 'resolved',
         resolution_notes = $1,
         resolved_at = NOW(),
         updated_at = NOW()
     WHERE id = $2
     RETURNING *
    `,
    [resolution_notes, id]
  );

  // Publish resolution event
  eventBus.publish('payment.escalation.resolved', {
    escalation_id: id,
    resolution_method,
    resolved_at: new Date().toISOString(),
  });

  res.json(createSuccessResponse(result.rows[0]));
});
```

### Testing Payment Retry Logic

**File**: `services/finance-service/src/tests/payment-retry.test.ts`

```typescript
describe('Payment Retry Service', () => {
  let retryService: PaymentRetryService;

  beforeEach(() => {
    retryService = new PaymentRetryService(db, eventBus);
  });

  it('should schedule payment for retry on failure', async () => {
    await retryService.schedulePaymentRetry(12345, 'Timeout');

    const result = await db.query(
      'SELECT * FROM payment_retries WHERE payment_id = $1',
      [12345]
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].retry_count).toBe(1);
    expect(result.rows[0].last_error).toBe('Timeout');
  });

  it('should calculate exponential backoff correctly', async () => {
    // First retry: 1 second
    const time1 = retryService['calculateNextRetryTime'](0);
    expect(time1.getTime() - Date.now()).toBeGreaterThan(900);
    expect(time1.getTime() - Date.now()).toBeLessThan(1100);

    // Second retry: 2 seconds
    const time2 = retryService['calculateNextRetryTime'](1);
    expect(time2.getTime() - Date.now()).toBeGreaterThan(1900);
    expect(time2.getTime() - Date.now()).toBeLessThan(2100);

    // Fifth retry: 16 seconds
    const time5 = retryService['calculateNextRetryTime'](4);
    expect(time5.getTime() - Date.now()).toBeGreaterThan(15900);
    expect(time5.getTime() - Date.now()).toBeLessThan(16100);
  });

  it('should escalate payment after max retries', async () => {
    const payment = { id: 12345, claim_id: 999, amount: 5000, institution_id: 456 };

    // Mock payment processor to always fail
    jest.spyOn(retryService as any, 'processPayment').mockResolvedValue({
      success: false,
      error: 'Service unavailable',
    });

    // Simulate 5 retry attempts
    for (let i = 0; i < 5; i++) {
      await retryService['retryPayment'](payment);
    }

    // Should have escalated
    const escalations = await db.query(
      'SELECT * FROM payment_escalations WHERE payment_id = $1',
      [12345]
    );

    expect(escalations.rows).toHaveLength(1);
    expect(escalations.rows[0].status).toBe('escalated');
  });

  it('should mark payment successful and update claim', async () => {
    const payment = { id: 12345, claim_id: 999, amount: 5000 };

    // Mock successful payment processing
    jest.spyOn(retryService as any, 'processPayment').mockResolvedValue({
      success: true,
      transaction_id: 'txn_123456',
    });

    await retryService['retryPayment'](payment);

    // Verify claim updated
    const claimResult = await db.query(
      'SELECT * FROM claims WHERE id = $1',
      [999]
    );

    expect(claimResult.rows[0].status).toBe('paid');
  });
});
```

**Estimated Effort**: 4-6 hours  
**Risk Level**: 🟢 LOW (isolated to finance service, no breaking changes)

---

## Gap #4: Wellness Data Integration in Claims Processing {#gap-4}

### Current Problem

**Status**: 🟡 LOW PRIORITY - Improves System Value

Wellness Service operates independently:
- Member health activities not captured during claims
- Premium adjustment opportunities missed
- Fraud detection doesn't consider wellness data
- Preventive care requirements not enforced

### Why It Matters

**Business Value**:
- Wellness participation = Lower claims costs
- Premium discounts for healthy members = Customer satisfaction
- Fraud patterns visible in wellness anomalies
- Preventive care requirements can reduce hospitalizations

**Integration Opportunity**:
```
Member Health Profile (Wellness Service)
  ├─ Activity Level
  ├─ Exercise Frequency
  ├─ Health Screenings
  ├─ Preventive Care Status
  └─ Wellness Score
    ↓
Used during Claims Adjudication
  ├─ Risk Assessment
  ├─ Premium Adjustment
  ├─ Fraud Scoring
  └─ Preventive Care Validation
```

### Solution: Wellness-Aware Claims Processing

#### Step 1: Extend Claims Adjudication Service

**File**: `services/claims-service/src/services/ClaimsAdjudicationService.ts`

```typescript
import { WellnessClient } from '../clients/WellnessClient';

export class ClaimsAdjudicationService {
  constructor(
    private db: Database,
    private wellnessClient: WellnessClient,
    private fraudService: FraudDetectionService
  ) {}

  async adjudicateClaim(claimId: number): Promise<AdjudicationResult> {
    const claim = await this.loadClaim(claimId);
    const member = await this.loadMember(claim.member_id);

    // 1. Basic coverage check
    const coverage = await this.checkBenefitCoverage(claim);

    // 2. ✨ NEW: Fetch member's wellness profile
    const wellnessProfile = await this.wellnessClient.getMemberWellnessProfile(
      claim.member_id
    );

    // 3. Apply wellness adjustments
    const adjustments = await this.calculateWellnessAdjustments(
      claim,
      wellnessProfile,
      coverage
    );

    // 4. Check preventive care requirements
    const preventiveCareValid = await this.validatePreventiveCare(
      claim,
      wellnessProfile
    );

    if (!preventiveCareValid) {
      return {
        status: 'rejected',
        reason: 'Preventive care requirement not met',
        approved_amount: 0,
      };
    }

    // 5. ✨ Enhanced fraud detection with wellness data
    const fraudRisk = await this.fraudService.assessFraud({
      claim,
      wellness_profile: wellnessProfile,
      wellness_score: wellnessProfile.wellness_score,
      claim_frequency: this.calculateMemberClaimFrequency(member),
    });

    // 6. Calculate final approved amount with adjustments
    let approvedAmount = coverage.approved_amount;
    approvedAmount -= adjustments.deductible;
    approvedAmount -= adjustments.copay;
    approvedAmount *= (100 - adjustments.coinsurance_percentage) / 100;

    // 7. Apply wellness bonus if member is healthy
    if (wellnessProfile.wellness_score >= 80) {
      approvedAmount *= 1.05; // 5% bonus for high wellness score
    }

    return {
      status: 'approved',
      approved_amount: Math.round(approvedAmount),
      adjustments: {
        ...adjustments,
        wellness_bonus_applied: wellnessProfile.wellness_score >= 80,
        wellness_score: wellnessProfile.wellness_score,
      },
      fraud_risk: fraudRisk,
      coverage,
    };
  }

  /**
   * Calculate adjustments based on wellness profile
   */
  private async calculateWellnessAdjustments(
    claim: any,
    wellness: WellnessProfile,
    coverage: any
  ): Promise<WellnessAdjustments> {
    const adjustments: WellnessAdjustments = {
      deductible: coverage.deductible || 0,
      copay: coverage.copay || 0,
      coinsurance_percentage: coverage.coinsurance_percentage || 0,
    };

    // Reduce deductible for members with high wellness score
    if (wellness.wellness_score >= 80) {
      adjustments.deductible *= 0.75; // 25% deductible reduction
    }

    // Reduce copay for preventive care if member did preventive screening
    if (claim.is_preventive && wellness.last_health_screening) {
      const daysSinceScreening = Math.floor(
        (Date.now() - wellness.last_health_screening) / (1000 * 60 * 60 * 24)
      );

      // Reduce copay if screening done within last 12 months
      if (daysSinceScreening < 365) {
        adjustments.copay *= 0.5; // 50% copay reduction
      }
    }

    // Increase copay for members avoiding preventive care
    if (wellness.missed_preventive_screenings > 2) {
      adjustments.coinsurance_percentage += 10; // Additional 10% coinsurance
    }

    return adjustments;
  }

  /**
   * Validate that preventive care requirements are met
   */
  private async validatePreventiveCare(
    claim: any,
    wellness: WellnessProfile
  ): Promise<boolean> {
    // Check if claim requires recent preventive care (e.g., diabetes treatment)
    const requiresPreventiveCare = ['E11', 'E10', 'I10'].includes(
      claim.diagnosis_code.substring(0, 3)
    );

    if (!requiresPreventiveCare) {
      return true; // No requirement
    }

    // Member must have preventive screening within last 12 months
    if (!wellness.last_health_screening) {
      return false; // Never had screening
    }

    const daysSinceScreening = Math.floor(
      (Date.now() - wellness.last_health_screening) / (1000 * 60 * 60 * 24)
    );

    return daysSinceScreening < 365; // Must be within 12 months
  }

  /**
   * Calculate member's claim frequency (for fraud detection)
   */
  private async calculateMemberClaimFrequency(member: any): Promise<number> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const result = await this.db.query(
      `SELECT COUNT(*) FROM claims 
       WHERE member_id = $1 
       AND created_at > $2`,
      [member.id, sixMonthsAgo]
    );

    return parseInt(result.rows[0].count);
  }
}

interface WellnessAdjustments {
  deductible: number;
  copay: number;
  coinsurance_percentage: number;
}
```

#### Step 2: Create Wellness Client

**File**: `services/claims-service/src/clients/WellnessClient.ts`

```typescript
import axios from 'axios';
import { createLogger } from '../utils/logger';

const logger = createLogger();

export interface WellnessProfile {
  member_id: number;
  wellness_score: number; // 0-100
  last_health_screening: Date | null;
  exercise_frequency: 'sedentary' | 'light' | 'moderate' | 'vigorous';
  missed_preventive_screenings: number;
  enrolled_in_programs: string[];
  vaccination_status: 'up_to_date' | 'pending' | 'overdue';
  chronic_conditions: string[];
  health_risks: string[];
}

export class WellnessClient {
  private baseUrl: string;
  private timeout: number = 3000;

  constructor(baseUrl: string = 'http://localhost:3010') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get member's wellness profile
   */
  async getMemberWellnessProfile(memberId: number): Promise<WellnessProfile> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/wellness/members/${memberId}/profile`,
        {
          timeout: this.timeout,
          headers: {
            'X-Service-Token': process.env.INTERNAL_SERVICE_TOKEN,
          },
        }
      );

      if (response.status === 200 && response.data.success) {
        return response.data.data;
      }

      // Return default profile if not found
      return this.getDefaultProfile(memberId);
    } catch (error) {
      logger.warn('Failed to fetch wellness profile, using default', {
        member_id: memberId,
        error: error.message,
      });

      return this.getDefaultProfile(memberId);
    }
  }

  /**
   * Record wellness activity for claim
   */
  async recordClaimRelatedActivity(
    memberId: number,
    claim: any
  ): Promise<void> {
    try {
      // If member had a health screening related to claim, record it
      if (claim.is_preventive) {
        await axios.post(
          `${this.baseUrl}/api/wellness/members/${memberId}/activities`,
          {
            activity_type: 'health_screening',
            related_claim_id: claim.id,
            date: claim.service_date,
          },
          {
            timeout: this.timeout,
            headers: {
              'X-Service-Token': process.env.INTERNAL_SERVICE_TOKEN,
            },
          }
        );
      }
    } catch (error) {
      logger.warn('Failed to record wellness activity', {
        member_id: memberId,
        claim_id: claim.id,
        error: error.message,
      });
      // Don't throw - wellness integration is not critical
    }
  }

  /**
   * Get wellness score adjustment for member
   */
  async getWellnessAdjustment(memberId: number): Promise<number> {
    try {
      const profile = await this.getMemberWellnessProfile(memberId);

      // Return adjustment multiplier (0.75 to 1.05)
      if (profile.wellness_score >= 80) {
        return 1.05; // 5% increase
      } else if (profile.wellness_score >= 60) {
        return 1.0; // No adjustment
      } else {
        return 0.95; // 5% decrease
      }
    } catch (error) {
      return 1.0; // Neutral adjustment on error
    }
  }

  private getDefaultProfile(memberId: number): WellnessProfile {
    return {
      member_id: memberId,
      wellness_score: 50, // Default middle score
      last_health_screening: null,
      exercise_frequency: 'light',
      missed_preventive_screenings: 0,
      enrolled_in_programs: [],
      vaccination_status: 'pending',
      chronic_conditions: [],
      health_risks: [],
    };
  }
}
```

#### Step 3: Update Fraud Detection with Wellness Data

**File**: `services/fraud-detection-service/src/services/FraudScoringService.ts`

```typescript
export async function assessFraudWithWellness(params: {
  claim: any;
  wellness_profile: WellnessProfile;
  claim_frequency: number;
}): Promise<FraudAssessment> {
  const { claim, wellness_profile, claim_frequency } = params;

  // Base fraud scoring
  let fraudScore = 0;

  // 1. Traditional fraud indicators
  fraudScore += await assessTraditionalFraudIndicators(claim);

  // 2. ✨ NEW: Wellness-based indicators
  // Sedentary members with high claims might be higher risk
  if (wellness_profile.exercise_frequency === 'sedentary' && claim_frequency > 5) {
    fraudScore += 10; // Add to fraud score
  }

  // Members avoiding preventive care with unexpected claims
  if (wellness_profile.missed_preventive_screenings > 2) {
    fraudScore += 5; // Slight increase
  }

  // Members with chronic conditions should have preventive claims
  if (
    wellness_profile.chronic_conditions.length === 0 &&
    claim.diagnosis_code.includes('chronic')
  ) {
    fraudScore += 15; // Potential fraud indicator
  }

  // High wellness score members with unusual claims
  if (wellness_profile.wellness_score > 80) {
    // Decrease fraud score - health-conscious members are lower risk
    fraudScore *= 0.8;
  }

  // 3. Determine risk level
  let riskLevel: FraudRiskLevel;
  if (fraudScore < 20) {
    riskLevel = 'NONE';
  } else if (fraudScore < 40) {
    riskLevel = 'LOW';
  } else if (fraudScore < 60) {
    riskLevel = 'MEDIUM';
  } else if (fraudScore < 80) {
    riskLevel = 'HIGH';
  } else {
    riskLevel = 'CRITICAL';
  }

  return {
    risk_score: Math.min(100, fraudScore),
    risk_level: riskLevel,
    wellness_indicators: {
      exercise_frequency: wellness_profile.exercise_frequency,
      wellness_score: wellness_profile.wellness_score,
      missed_screenings: wellness_profile.missed_preventive_screenings,
    },
    indicators: [], // Other fraud indicators
  };
}
```

#### Step 4: Create Wellness Integration Tests

**File**: `services/claims-service/src/tests/wellness-integration.test.ts`

```typescript
describe('Wellness Integration in Claims', () => {
  let adjudicationService: ClaimsAdjudicationService;
  let wellnessClient: WellnessClient;

  beforeEach(() => {
    wellnessClient = new WellnessClient('http://localhost:3010');
    adjudicationService = new ClaimsAdjudicationService(db, wellnessClient, fraudService);
  });

  it('should reduce deductible for high wellness score members', async () => {
    const claim = {
      id: 12345,
      member_id: 789,
      amount: 2000,
      is_preventive: false,
    };

    // Mock wellness profile with high score
    jest.spyOn(wellnessClient, 'getMemberWellnessProfile').mockResolvedValue({
      member_id: 789,
      wellness_score: 85,
      exercise_frequency: 'vigorous',
      missed_preventive_screenings: 0,
      // ... other fields
    });

    const result = await adjudicationService.adjudicateClaim(claim.id);

    // Should have lower deductible
    expect(result.adjustments.deductible).toBeLessThan(300); // 25% reduction
  });

  it('should reject claim if preventive care requirement not met', async () => {
    const claim = {
      id: 12345,
      member_id: 789,
      amount: 5000,
      diagnosis_code: 'E11', // Diabetes - requires preventive screening
      is_preventive: false,
    };

    // Mock wellness profile without recent screening
    jest.spyOn(wellnessClient, 'getMemberWellnessProfile').mockResolvedValue({
      member_id: 789,
      wellness_score: 50,
      last_health_screening: null, // Never had screening
      // ... other fields
    });

    const result = await adjudicationService.adjudicateClaim(claim.id);

    expect(result.status).toBe('rejected');
    expect(result.reason).toContain('Preventive care');
  });

  it('should apply wellness bonus for high wellness scores', async () => {
    const claim = {
      id: 12345,
      member_id: 789,
      amount: 1000,
    };

    jest.spyOn(wellnessClient, 'getMemberWellnessProfile').mockResolvedValue({
      member_id: 789,
      wellness_score: 90,
      exercise_frequency: 'vigorous',
      missed_preventive_screenings: 0,
      // ... other fields
    });

    const result = await adjudicationService.adjudicateClaim(claim.id);

    // Should have wellness bonus applied (5% increase)
    expect(result.adjustments.wellness_bonus_applied).toBe(true);
  });

  it('should enhance fraud scoring with wellness data', async () => {
    const claim = {
      id: 12345,
      member_id: 789,
      amount: 10000,
      diagnosis_code: 'I10', // Hypertension
    };

    // Mock sedentary member with high claim frequency
    jest.spyOn(wellnessClient, 'getMemberWellnessProfile').mockResolvedValue({
      member_id: 789,
      wellness_score: 30,
      exercise_frequency: 'sedentary',
      missed_preventive_screenings: 3,
      // ... other fields
    });

    const result = await adjudicationService.adjudicateClaim(claim.id);

    // Fraud risk should be elevated
    expect(result.fraud_risk.risk_score).toBeGreaterThan(40);
  });
});
```

**Estimated Effort**: 6-8 hours  
**Risk Level**: 🟢 LOW (additive feature, no breaking changes to existing flows)

---

## Gap #5: Analytics Service Integration {#gap-5}

### Current Problem

**Status**: 🟢 LOW PRIORITY - Improves Observability

No centralized analytics or business intelligence:
- Metrics scattered across individual services
- No unified dashboard
- Historical trend analysis difficult
- Business metrics not aggregated

### Solution: Create Analytics Service

**[CONTINUED IN NEXT SECTION - Maximum document length reached]**

---

## Implementation Sequencing {#sequencing}

### Phase 1: Foundation (Week 1-2)
**Estimated Effort**: 1-2 hours

1. **Gap #1: Fraud Detection API Gateway**
   - Add service routes
   - Enable external access
   - Test fraud endpoints
   - **Impact**: Immediate - Opens fraud API to partners

### Phase 2: Reliability (Week 3-4)
**Estimated Effort**: 4-6 hours

2. **Gap #3: Payment Error Recovery**
   - Set up retry scheduler
   - Implement escalation workflow
   - Create monitoring dashboard
   - **Impact**: Eliminates manual intervention for payment failures

### Phase 3: Data Consistency (Week 5-6)
**Estimated Effort**: 8-12 hours

3. **Gap #2: Saga Pattern Transactions**
   - Design saga state machine
   - Implement compensation logic
   - Create saga orchestrator
   - **Impact**: Guarantees consistency across service boundaries

### Phase 4: Feature Enhancement (Week 7-8)
**Estimated Effort**: 6-8 hours

4. **Gap #4: Wellness Integration**
   - Connect wellness service to adjudication
   - Implement wellness adjustments
   - Add preventive care validation
   - **Impact**: Increases member engagement, reduces fraud

### Phase 5: Observability (Week 9-10)
**Estimated Effort**: 12-16 hours

5. **Gap #5: Analytics Service**
   - Aggregate business metrics
   - Create dashboards
   - Enable trend analysis
   - **Impact**: Business intelligence and operational visibility

---

## Rollout Strategy {#rollout}

### Pre-Deployment Checklist

- [ ] All tests passing (unit, integration, E2E)
- [ ] Load testing completed (1000 req/min)
- [ ] Security review completed
- [ ] Performance baselines established
- [ ] Documentation updated
- [ ] Team trained on changes
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Stakeholders notified

### Deployment Steps

1. **Deploy to Development** → Team testing
2. **Deploy to Staging** → QA testing + load testing
3. **Canary to Production** → 10% of traffic
4. **Gradual Rollout** → 25% → 50% → 100%
5. **Monitor** → Check error rates, latency, escalations
6. **Celebrate** → All systems operational

---

**Total Estimated Effort**: 34-48 hours  
**Total Risk**: 🟡 MEDIUM (well-scoped changes, comprehensive testing)  
**Business Impact**: 🟢 HIGH (improves reliability, security, UX, and operations)

