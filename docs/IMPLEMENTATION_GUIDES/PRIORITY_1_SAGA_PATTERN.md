# Priority 1: Saga Pattern for Cross-Service Transactions

**Status**: To Be Implemented  
**Estimated Effort**: 8-12 hours  
**Date Created**: April 20, 2026  
**Dependencies**: Claims Service, Finance Service, Notification Service

---

## Overview

This guide implements the Saga pattern to manage distributed transactions across claims → payment → notification workflow. The saga pattern ensures data consistency across multiple services and provides automatic rollback (compensating transactions) on failure.

## Architecture

```
Claims Service              Finance Service           Notification Service
      ↓                           ↓                           ↓
  Create Claim         Process Payment          Send Confirmation
      ↓                           ↓                           ↓
   SUCCESS                     FAIL                       FAIL
      ↓                           ↓                           ↓
  Continue              Reverse Payment            Rollback Notification
                                                   (Compensating Tx)
      
SAGA STATE MACHINE
─────────────────
PENDING_CLAIM_CREATION
    ↓ [success]
CLAIM_CREATED
    ↓ [initiate payment]
PENDING_PAYMENT_PROCESSING
    ↓ [success]
PAYMENT_COMPLETED
    ↓ [send notification]
PENDING_NOTIFICATION
    ↓ [success]
SAGA_COMPLETED
    ↓ [failure]
COMPENSATING_PAYMENT
    ↓ [success]
SAGA_FAILED_COMPENSATED
```

## Implementation Steps

### Step 1: Create Saga Orchestrator Service

**File**: `services/api-gateway/src/services/SagaOrchestrator.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export enum SagaStep {
  PENDING_CLAIM_CREATION = 'pending_claim_creation',
  CLAIM_CREATED = 'claim_created',
  PENDING_PAYMENT_PROCESSING = 'pending_payment_processing',
  PAYMENT_COMPLETED = 'payment_completed',
  PENDING_NOTIFICATION = 'pending_notification',
  SAGA_COMPLETED = 'saga_completed',
  FAILED = 'failed',
  COMPENSATING_PAYMENT = 'compensating_payment',
  SAGA_FAILED_COMPENSATED = 'saga_failed_compensated',
}

export interface ClaimPaymentSaga {
  sagaId: string;
  claimId: string;
  memberId: string;
  amount: number;
  currentStep: SagaStep;
  stepHistory: StepExecution[];
  compensationHistory: CompensationExecution[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
}

export interface StepExecution {
  step: SagaStep;
  status: 'pending' | 'executing' | 'success' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  result?: Record<string, any>;
  error?: string;
  retryCount: number;
}

export interface CompensationExecution {
  step: SagaStep;
  status: 'pending' | 'executing' | 'success' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
}

export class SagaOrchestrator {
  private sagaStore = new Map<string, ClaimPaymentSaga>();

  /**
   * Start a new claim → payment → notification saga
   */
  async startClaimPaymentSaga(
    memberId: string,
    claimData: any
  ): Promise<ClaimPaymentSaga> {
    const sagaId = uuidv4();
    const amount = claimData.totalAmount || 0;

    const saga: ClaimPaymentSaga = {
      sagaId,
      claimId: claimData.claimId || uuidv4(),
      memberId,
      amount,
      currentStep: SagaStep.PENDING_CLAIM_CREATION,
      stepHistory: [
        {
          step: SagaStep.PENDING_CLAIM_CREATION,
          status: 'pending',
          startedAt: new Date(),
          retryCount: 0,
        },
      ],
      compensationHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store saga
    this.sagaStore.set(sagaId, saga);

    console.log(`[SAGA] Started saga ${sagaId} for claim processing`, {
      claimId: saga.claimId,
      memberId,
      amount,
    });

    // Execute first step
    await this.executeClaimCreation(saga, claimData);

    return saga;
  }

  /**
   * Step 1: Create Claim in Claims Service
   */
  private async executeClaimCreation(saga: ClaimPaymentSaga, claimData: any): Promise<void> {
    const stepIndex = saga.stepHistory.length - 1;
    const step = saga.stepHistory[stepIndex];

    step.status = 'executing';
    step.startedAt = new Date();

    try {
      console.log(`[SAGA] Executing step: ${SagaStep.PENDING_CLAIM_CREATION}`);

      const claimResponse = await axios.post(
        `${process.env.CLAIMS_SERVICE_URL}/api/claims/create`,
        {
          ...claimData,
          memberId: saga.memberId,
          sagaId: saga.sagaId,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
          },
          timeout: 30000,
        }
      );

      step.status = 'success';
      step.completedAt = new Date();
      step.result = claimResponse.data;

      saga.claimId = claimResponse.data.claimId;
      saga.currentStep = SagaStep.CLAIM_CREATED;
      saga.updatedAt = new Date();

      // Move to next step
      await this.executePaymentProcessing(saga);
    } catch (error: any) {
      step.status = 'failed';
      step.completedAt = new Date();
      step.error = error.message;
      step.retryCount += 1;

      console.error(`[SAGA] Claim creation failed for saga ${saga.sagaId}`, error);

      // Fail the saga (no compensation needed as claim wasn't created)
      saga.currentStep = SagaStep.FAILED;
      saga.failedAt = new Date();
      saga.updatedAt = new Date();

      throw error;
    }
  }

  /**
   * Step 2: Process Payment in Finance Service
   */
  private async executePaymentProcessing(saga: ClaimPaymentSaga): Promise<void> {
    // Add pending payment step
    saga.stepHistory.push({
      step: SagaStep.PENDING_PAYMENT_PROCESSING,
      status: 'pending',
      startedAt: new Date(),
      retryCount: 0,
    });

    const stepIndex = saga.stepHistory.length - 1;
    const step = saga.stepHistory[stepIndex];

    step.status = 'executing';
    step.startedAt = new Date();

    try {
      console.log(`[SAGA] Executing step: ${SagaStep.PENDING_PAYMENT_PROCESSING}`);

      const paymentResponse = await axios.post(
        `${process.env.FINANCE_SERVICE_URL}/api/payments/process`,
        {
          claimId: saga.claimId,
          memberId: saga.memberId,
          amount: saga.amount,
          sagaId: saga.sagaId,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
          },
          timeout: 30000,
        }
      );

      step.status = 'success';
      step.completedAt = new Date();
      step.result = paymentResponse.data;

      saga.currentStep = SagaStep.PAYMENT_COMPLETED;
      saga.updatedAt = new Date();

      // Move to notification step
      await this.executeSendNotification(saga);
    } catch (error: any) {
      step.status = 'failed';
      step.completedAt = new Date();
      step.error = error.message;
      step.retryCount += 1;

      console.error(`[SAGA] Payment processing failed for saga ${saga.sagaId}`, error);

      // Initiate compensation
      saga.currentStep = SagaStep.COMPENSATING_PAYMENT;
      saga.updatedAt = new Date();

      await this.compensatePayment(saga);
    }
  }

  /**
   * Step 3: Send Notification to Member
   */
  private async executeSendNotification(saga: ClaimPaymentSaga): Promise<void> {
    // Add pending notification step
    saga.stepHistory.push({
      step: SagaStep.PENDING_NOTIFICATION,
      status: 'pending',
      startedAt: new Date(),
      retryCount: 0,
    });

    const stepIndex = saga.stepHistory.length - 1;
    const step = saga.stepHistory[stepIndex];

    step.status = 'executing';
    step.startedAt = new Date();

    try {
      console.log(`[SAGA] Executing step: ${SagaStep.PENDING_NOTIFICATION}`);

      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/send`,
        {
          memberId: saga.memberId,
          type: 'claim_processed',
          title: 'Claim Processed Successfully',
          message: `Your claim has been processed. Payment of $${saga.amount} has been initiated.`,
          data: {
            claimId: saga.claimId,
            amount: saga.amount,
            sagaId: saga.sagaId,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
          },
          timeout: 30000,
        }
      );

      step.status = 'success';
      step.completedAt = new Date();

      saga.currentStep = SagaStep.SAGA_COMPLETED;
      saga.completedAt = new Date();
      saga.updatedAt = new Date();

      console.log(`[SAGA] Saga ${saga.sagaId} completed successfully`);
    } catch (error: any) {
      step.status = 'failed';
      step.completedAt = new Date();
      step.error = error.message;
      step.retryCount += 1;

      console.error(`[SAGA] Notification send failed for saga ${saga.sagaId}`, error);

      // For notifications, we may want to retry but not compensate the payment
      // Log for manual review
      saga.currentStep = SagaStep.FAILED;
      saga.failedAt = new Date();
      saga.updatedAt = new Date();

      // Try to resend notification asynchronously
      setTimeout(() => this.retryNotification(saga), 60000);
    }
  }

  /**
   * Compensating Transaction: Reverse Payment
   */
  private async compensatePayment(saga: ClaimPaymentSaga): Promise<void> {
    const compensation: CompensationExecution = {
      step: SagaStep.COMPENSATING_PAYMENT,
      status: 'pending',
      startedAt: new Date(),
      retryCount: 0,
    };

    saga.compensationHistory.push(compensation);

    compensation.status = 'executing';

    try {
      console.log(`[SAGA] Starting compensation: reversing payment for saga ${saga.sagaId}`);

      // Get payment reference from step history
      const paymentStep = saga.stepHistory.find(
        s => s.step === SagaStep.PENDING_PAYMENT_PROCESSING && s.status === 'success'
      );

      if (!paymentStep || !paymentStep.result?.paymentId) {
        throw new Error('No successful payment to reverse');
      }

      // Call finance service to reverse payment
      await axios.post(
        `${process.env.FINANCE_SERVICE_URL}/api/payments/reverse`,
        {
          paymentId: paymentStep.result.paymentId,
          claimId: saga.claimId,
          reason: 'Notification delivery failed - saga compensation',
          sagaId: saga.sagaId,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
          },
          timeout: 30000,
        }
      );

      compensation.status = 'success';
      compensation.completedAt = new Date();

      saga.currentStep = SagaStep.SAGA_FAILED_COMPENSATED;
      saga.failedAt = new Date();
      saga.updatedAt = new Date();

      console.log(`[SAGA] Compensation completed for saga ${saga.sagaId}`);

      // Send notification about failure and reversal
      await this.notifyCompensation(saga);
    } catch (error: any) {
      compensation.status = 'failed';
      compensation.completedAt = new Date();
      compensation.error = error.message;
      compensation.retryCount += 1;

      console.error(`[SAGA] Compensation failed for saga ${saga.sagaId}`, error);

      // Escalate to support team
      await this.escalateCompensationFailure(saga);
    }
  }

  /**
   * Retry notification delivery
   */
  private async retryNotification(saga: ClaimPaymentSaga): Promise<void> {
    try {
      const notificationStep = saga.stepHistory.find(
        s => s.step === SagaStep.PENDING_NOTIFICATION
      );

      if (!notificationStep || notificationStep.retryCount >= 3) {
        return;
      }

      notificationStep.retryCount += 1;

      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/send`,
        {
          memberId: saga.memberId,
          type: 'claim_processed_retry',
          title: 'Claim Processed - Payment Complete',
          message: `Your claim has been processed. Payment of $${saga.amount} has been completed.`,
          data: {
            claimId: saga.claimId,
            amount: saga.amount,
            sagaId: saga.sagaId,
          },
        }
      );

      notificationStep.status = 'success';
      saga.currentStep = SagaStep.SAGA_COMPLETED;
      saga.completedAt = new Date();

      console.log(`[SAGA] Notification retry succeeded for saga ${saga.sagaId}`);
    } catch (error) {
      console.error(`[SAGA] Notification retry failed for saga ${saga.sagaId}`, error);
    }
  }

  /**
   * Notify member about compensation
   */
  private async notifyCompensation(saga: ClaimPaymentSaga): Promise<void> {
    try {
      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/send`,
        {
          memberId: saga.memberId,
          type: 'claim_processing_failed',
          title: 'Claim Processing Issue',
          message: `We encountered an issue processing your claim. The payment has been reversed. Our support team will contact you.`,
          data: {
            claimId: saga.claimId,
            amount: saga.amount,
            sagaId: saga.sagaId,
          },
          priority: 'high',
        }
      );
    } catch (error) {
      console.error(`[SAGA] Compensation notification failed for saga ${saga.sagaId}`, error);
    }
  }

  /**
   * Escalate compensation failure to support
   */
  private async escalateCompensationFailure(saga: ClaimPaymentSaga): Promise<void> {
    try {
      await axios.post(
        `${process.env.SUPPORT_SERVICE_URL}/api/support/tickets`,
        {
          type: 'saga_compensation_failure',
          priority: 'critical',
          title: `Saga Compensation Failed - Requires Manual Intervention`,
          description: `Saga ${saga.sagaId} failed to complete compensation.
          
Claim ID: ${saga.claimId}
Member ID: ${saga.memberId}
Amount: $${saga.amount}
Current Step: ${saga.currentStep}

Steps:
${saga.stepHistory.map(s => `  ${s.step}: ${s.status}`).join('\n')}

Compensations:
${saga.compensationHistory.map(c => `  ${c.step}: ${c.status} (${c.error || 'N/A'})`).join('\n')}`,
          relatedSagaId: saga.sagaId,
          relatedClaimId: saga.claimId,
        }
      );
    } catch (error) {
      console.error(`[SAGA] Escalation failed for saga ${saga.sagaId}`, error);
    }
  }

  /**
   * Get saga status
   */
  getSagaStatus(sagaId: string): ClaimPaymentSaga | undefined {
    return this.sagaStore.get(sagaId);
  }

  /**
   * Get all incomplete sagas (for monitoring and recovery)
   */
  getIncompleteSagas(): ClaimPaymentSaga[] {
    return Array.from(this.sagaStore.values()).filter(
      saga =>
        saga.currentStep !== SagaStep.SAGA_COMPLETED &&
        saga.currentStep !== SagaStep.SAGA_FAILED_COMPENSATED
    );
  }
}
```

### Step 2: Create Saga State Store

**File**: `shared/schema.ts` (add to schema)

```typescript
export const sagaStateTable = pgTable('saga_state', {
  sagaId: uuid('saga_id').primaryKey(),
  claimId: uuid('claim_id').notNull(),
  memberId: uuid('member_id').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currentStep: text('current_step').notNull(),
  stepHistory: jsonb('step_history').default(sql`'[]'::jsonb`).notNull(),
  compensationHistory: jsonb('compensation_history').default(sql`'[]'::jsonb`).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
});

export const sagaEventLogTable = pgTable('saga_event_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  sagaId: uuid('saga_id').notNull().references(() => sagaStateTable.sagaId),
  eventType: text('event_type').notNull(),
  eventData: jsonb('event_data').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});
```

### Step 3: Create Saga API Routes

**File**: `services/api-gateway/src/routes/saga.ts`

```typescript
import express, { Request, Response } from 'express';
import { SagaOrchestrator } from '../services/SagaOrchestrator';
import { requireRole } from '../middleware/auth';

const router = express.Router();
const sagaOrchestrator = new SagaOrchestrator();

/**
 * POST /api/saga/claims/process
 * Start a claim → payment → notification saga
 */
router.post('/claims/process', requireRole('claims_adjuster'), async (req: Request, res: Response) => {
  try {
    const { memberId, claimData } = req.body;

    const saga = await sagaOrchestrator.startClaimPaymentSaga(memberId, claimData);

    res.json({
      sagaId: saga.sagaId,
      claimId: saga.claimId,
      status: saga.currentStep,
      message: 'Claim processing saga started',
    });
  } catch (error: any) {
    console.error('[SAGA API ERROR]', error);
    res.status(500).json({ error: 'Failed to start saga' });
  }
});

/**
 * GET /api/saga/:sagaId
 * Get saga status
 */
router.get('/:sagaId', requireRole('claims_adjuster', 'finance_manager'), (req: Request, res: Response) => {
  const { sagaId } = req.params;
  const saga = sagaOrchestrator.getSagaStatus(sagaId);

  if (!saga) {
    return res.status(404).json({ error: 'Saga not found' });
  }

  res.json({
    sagaId: saga.sagaId,
    claimId: saga.claimId,
    memberId: saga.memberId,
    amount: saga.amount,
    currentStep: saga.currentStep,
    stepHistory: saga.stepHistory,
    compensationHistory: saga.compensationHistory,
    createdAt: saga.createdAt,
    updatedAt: saga.updatedAt,
    completedAt: saga.completedAt,
    failedAt: saga.failedAt,
  });
});

/**
 * GET /api/saga/incomplete
 * Get all incomplete sagas (for monitoring)
 */
router.get('/status/incomplete', requireRole('admin', 'finance_manager'), (req: Request, res: Response) => {
  const incompleteSagas = sagaOrchestrator.getIncompleteSagas();

  res.json({
    count: incompleteSagas.length,
    sagas: incompleteSagas.map(saga => ({
      sagaId: saga.sagaId,
      claimId: saga.claimId,
      currentStep: saga.currentStep,
      createdAt: saga.createdAt,
    })),
  });
});

export default router;
```

### Step 4: Event Sourcing for Audit Trail

**File**: `services/api-gateway/src/services/SagaEventStore.ts`

```typescript
import { Database } from '../models/Database';

export interface SagaEvent {
  sagaId: string;
  eventType: 'STEP_STARTED' | 'STEP_COMPLETED' | 'STEP_FAILED' | 'COMPENSATION_STARTED' | 'COMPENSATION_COMPLETED';
  eventData: Record<string, any>;
  timestamp: Date;
}

export class SagaEventStore {
  /**
   * Log saga event
   */
  async logEvent(event: SagaEvent): Promise<void> {
    const db = new Database();
    await db.insertSagaEvent({
      sagaId: event.sagaId,
      eventType: event.eventType,
      eventData: event.eventData,
      timestamp: event.timestamp,
    });
  }

  /**
   * Get event history for saga
   */
  async getEventHistory(sagaId: string): Promise<SagaEvent[]> {
    const db = new Database();
    return db.getSagaEvents(sagaId);
  }
}
```

### Step 5: Integration with Claims Service

**File**: `services/claims-service/src/routes/claims.ts` (modify)

```typescript
import { SagaEventStore } from '../../shared/SagaEventStore';

const eventStore = new SagaEventStore();

router.post('/api/claims/create', async (req: Request, res: Response) => {
  try {
    const { memberId, sagaId, ...claimData } = req.body;

    // Create claim
    const claim = await createClaim(memberId, claimData);

    // Log event
    if (sagaId) {
      await eventStore.logEvent({
        sagaId,
        eventType: 'STEP_COMPLETED',
        eventData: {
          step: 'claim_creation',
          claimId: claim.id,
          status: 'success',
        },
        timestamp: new Date(),
      });
    }

    res.json({
      claimId: claim.id,
      status: 'created',
      ...claim,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

## Testing

**File**: `services/api-gateway/tests/services/SagaOrchestrator.test.ts`

```typescript
import { SagaOrchestrator, SagaStep } from '../src/services/SagaOrchestrator';

describe('SagaOrchestrator', () => {
  let orchestrator: SagaOrchestrator;

  beforeEach(() => {
    orchestrator = new SagaOrchestrator();
  });

  describe('startClaimPaymentSaga', () => {
    it('should start saga and execute first step', async () => {
      const saga = await orchestrator.startClaimPaymentSaga('member-123', {
        claimId: 'claim-456',
        totalAmount: 5000,
      });

      expect(saga.sagaId).toBeDefined();
      expect(saga.claimId).toBeDefined();
      expect(saga.stepHistory.length).toBeGreaterThan(0);
    });
  });

  describe('getSagaStatus', () => {
    it('should retrieve saga status', async () => {
      const saga = await orchestrator.startClaimPaymentSaga('member-123', {
        totalAmount: 5000,
      });

      const status = orchestrator.getSagaStatus(saga.sagaId);
      expect(status?.sagaId).toBe(saga.sagaId);
    });
  });

  describe('compensation', () => {
    it('should reverse payment on notification failure', async () => {
      // Create saga that fails on notification
      // Verify compensation was triggered
      // Check payment reversal was called
    });
  });
});
```

## Environment Configuration

**File**: `services/api-gateway/.env`

Add:

```env
# Saga Configuration
SAGA_TIMEOUT_MINUTES=60
SAGA_MAX_RETRIES=3

# Service URLs for saga steps
CLAIMS_SERVICE_URL=http://claims-service:3009
FINANCE_SERVICE_URL=http://finance-service:3007
NOTIFICATION_SERVICE_URL=http://notification-service:3013
SUPPORT_SERVICE_URL=http://support-service:3012
SERVICE_AUTH_TOKEN=your_service_auth_token
```

## Saga Flow Diagram

```
                    ┌─────────────────────────────┐
                    │   Claim Received            │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   Create Claim (Step 1)     │
                    │   Pending→Success→Created   │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │ Process Payment (Step 2)    │
                    └──┬──────────────────────┬───┘
                       │                      │
                   Success              Failure
                       │                      │
        ┌──────────────▼──────────────┐      │
        │ Send Notification (Step 3)  │      │
        └──┬──────────────────────┬───┘      │
           │                      │          │
       Success              Failure          │
           │                      │          │
     ┌─────▼──────┐        ┌──────▼──────────┼──────┐
     │   COMPLETE  │        │  COMPENSATE    │      │
     │  SAGA ✓     │        │  Reverse Payment       │
     └─────────────┘        └──────┬────────────────┘
                                   │
                            ┌──────▼──────────┐
                            │  COMPENSATION   │
                            │  SUCCESS ✓      │
                            └─────────────────┘
```

## Monitoring & Observability

Configure monitoring for:

1. **Saga Success Rate**: Target > 95%
2. **Average Saga Duration**: Target < 5 minutes
3. **Compensation Rate**: Track how often compensation is triggered
4. **Step Failure Rate**: Monitor individual step failures
5. **Retry Frequency**: Track retry patterns

## Deployment Checklist

- [ ] SagaOrchestrator service implemented
- [ ] Saga state schema created in database
- [ ] Event sourcing configured
- [ ] Saga API routes registered
- [ ] All service endpoints configured
- [ ] Service auth token configured
- [ ] Database migrations applied
- [ ] Unit tests pass
- [ ] Integration tests with all services pass
- [ ] Monitoring and alerting configured
- [ ] Documentation updated
- [ ] Staff training completed

## Best Practices

1. **Idempotency**: Each service should be idempotent (safe to retry)
2. **Timeouts**: Set appropriate timeouts for each step
3. **Logging**: Log all saga state transitions for debugging
4. **Monitoring**: Track saga metrics in real-time
5. **Documentation**: Document compensation logic clearly
6. **Testing**: Test failure scenarios thoroughly
