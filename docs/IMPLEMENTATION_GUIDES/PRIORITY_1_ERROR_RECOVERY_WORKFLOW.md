# Priority 1: Error Recovery Workflow Implementation

**Status**: To Be Implemented  
**Estimated Effort**: 4-6 hours  
**Date Created**: April 20, 2026  
**Dependencies**: Finance Service, Notification Service, Support Service

---

## Overview

This guide implements automatic retry mechanisms for failed payments with escalation to support after 48 hours. Every recovery attempt will be fully logged for audit compliance.

## Architecture

```
Payment Request
    ↓
Payment Processing
    ↓
├─ Success → Log & Complete
└─ Failure → Recovery Workflow
         ├─ Retry 1 (0 hours)
         ├─ Retry 2 (6 hours)
         ├─ Retry 3 (24 hours)
         └─ Escalate to Support (48 hours)
         
Support Escalation
    ├─ Create ticket
    ├─ Notify member
    ├─ Notify finance team
    └─ Maintain audit trail
```

## Implementation Steps

### Step 1: Create Error Recovery Service

**File**: `services/finance-service/src/services/ErrorRecoveryService.ts`

```typescript
import { Database } from '../models/Database';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export enum RecoveryStatus {
  PENDING = 'pending',
  RETRY_1 = 'retry_1',
  RETRY_2 = 'retry_2',
  RETRY_3 = 'retry_3',
  ESCALATED = 'escalated',
  RECOVERED = 'recovered',
  FAILED = 'failed',
}

export interface PaymentRecoveryRecord {
  id: string;
  paymentId: string;
  claimId: string;
  memberId: string;
  amount: number;
  originalError: string;
  status: RecoveryStatus;
  retryCount: number;
  nextRetryAt?: Date;
  escalatedAt?: Date;
  recoveredAt?: Date;
  failedAt?: Date;
  supportTicketId?: string;
  auditTrail: AuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditEntry {
  timestamp: Date;
  action: string;
  details: Record<string, any>;
  performedBy: string;
}

export class ErrorRecoveryService {
  private readonly maxRetries = 3;
  private readonly retryIntervals = [0, 6, 24]; // hours
  private readonly escalationThreshold = 48; // hours

  /**
   * Register a failed payment for recovery
   */
  async registerFailedPayment(
    paymentId: string,
    claimId: string,
    memberId: string,
    amount: number,
    error: Error
  ): Promise<PaymentRecoveryRecord> {
    const db = new Database();
    
    const recoveryRecord: PaymentRecoveryRecord = {
      id: uuidv4(),
      paymentId,
      claimId,
      memberId,
      amount,
      originalError: error.message,
      status: RecoveryStatus.PENDING,
      retryCount: 0,
      nextRetryAt: new Date(),
      auditTrail: [
        {
          timestamp: new Date(),
          action: 'PAYMENT_FAILED',
          details: {
            error: error.message,
            paymentId,
            amount,
          },
          performedBy: 'payment-processor',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store in database
    await db.storePaymentRecovery(recoveryRecord);

    // Log for audit
    console.log(`[RECOVERY] Payment ${paymentId} registered for recovery`, {
      amount,
      error: error.message,
    });

    return recoveryRecord;
  }

  /**
   * Process scheduled retries
   */
  async processScheduledRetries(): Promise<void> {
    const db = new Database();
    const now = new Date();

    // Get all pending recoveries
    const pendingRecoveries = await db.getPendingPaymentRecoveries();

    for (const recovery of pendingRecoveries) {
      // Check if retry is due
      if (recovery.nextRetryAt && recovery.nextRetryAt <= now) {
        await this.performRetry(recovery);
      }

      // Check if should escalate (48 hours elapsed)
      const hoursElapsed = (now.getTime() - recovery.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursElapsed >= this.escalationThreshold && recovery.status !== RecoveryStatus.ESCALATED) {
        await this.escalateToSupport(recovery);
      }
    }
  }

  /**
   * Perform retry attempt
   */
  private async performRetry(recovery: PaymentRecoveryRecord): Promise<void> {
    const db = new Database();

    try {
      console.log(`[RECOVERY] Attempting retry for payment ${recovery.paymentId}`, {
        retryCount: recovery.retryCount + 1,
        amount: recovery.amount,
      });

      // Attempt payment
      const result = await this.retryPayment(recovery);

      if (result.success) {
        // Payment succeeded
        recovery.status = RecoveryStatus.RECOVERED;
        recovery.recoveredAt = new Date();

        recovery.auditTrail.push({
          timestamp: new Date(),
          action: 'PAYMENT_RECOVERED',
          details: {
            retryCount: recovery.retryCount,
            retryAttempt: recovery.retryCount + 1,
          },
          performedBy: 'recovery-service',
        });

        await db.updatePaymentRecovery(recovery);
        await this.notifyMemberRecovered(recovery);

        console.log(`[RECOVERY] Payment ${recovery.paymentId} recovered successfully`);
      } else {
        // Payment still failing
        recovery.retryCount += 1;

        if (recovery.retryCount < this.maxRetries) {
          // Schedule next retry
          const nextRetryHours = this.retryIntervals[recovery.retryCount];
          recovery.nextRetryAt = new Date(Date.now() + nextRetryHours * 60 * 60 * 1000);
          recovery.status = RecoveryStatus[`RETRY_${recovery.retryCount}`] as RecoveryStatus;

          recovery.auditTrail.push({
            timestamp: new Date(),
            action: 'RETRY_FAILED',
            details: {
              retryAttempt: recovery.retryCount,
              nextRetryAt: recovery.nextRetryAt,
              error: result.error,
            },
            performedBy: 'recovery-service',
          });

          await db.updatePaymentRecovery(recovery);
          await this.notifyMemberRetryScheduled(recovery);
        } else {
          // Max retries exceeded
          recovery.status = RecoveryStatus.FAILED;
          recovery.failedAt = new Date();

          recovery.auditTrail.push({
            timestamp: new Date(),
            action: 'MAX_RETRIES_EXCEEDED',
            details: {
              retryCount: recovery.retryCount,
            },
            performedBy: 'recovery-service',
          });

          await db.updatePaymentRecovery(recovery);
          await this.escalateToSupport(recovery);
        }
      }
    } catch (error: any) {
      console.error(`[RECOVERY ERROR] Retry failed for payment ${recovery.paymentId}`, error);

      recovery.auditTrail.push({
        timestamp: new Date(),
        action: 'RETRY_ERROR',
        details: {
          error: error.message,
          retryCount: recovery.retryCount,
        },
        performedBy: 'recovery-service',
      });

      await db.updatePaymentRecovery(recovery);
    }
  }

  /**
   * Escalate to support team
   */
  private async escalateToSupport(recovery: PaymentRecoveryRecord): Promise<void> {
    const db = new Database();

    try {
      console.log(`[RECOVERY] Escalating payment ${recovery.paymentId} to support`);

      // Create support ticket
      const ticketResponse = await axios.post(
        `${process.env.SUPPORT_SERVICE_URL}/api/support/tickets`,
        {
          type: 'payment_recovery_escalation',
          priority: 'high',
          title: `Payment Recovery Failed - Escalation Required`,
          description: `Payment ${recovery.paymentId} has failed all automated recovery attempts.
          
Claim ID: ${recovery.claimId}
Member ID: ${recovery.memberId}
Amount: $${recovery.amount}
Original Error: ${recovery.originalError}
Retry Attempts: ${recovery.retryCount}
Status: ${recovery.status}

Audit Trail:
${recovery.auditTrail.map(entry => `  [${entry.timestamp.toISOString()}] ${entry.action}`).join('\n')}`,
          relatedPaymentId: recovery.paymentId,
          relatedClaimId: recovery.claimId,
          relatedMemberId: recovery.memberId,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
          },
        }
      );

      recovery.supportTicketId = ticketResponse.data.ticketId;
      recovery.status = RecoveryStatus.ESCALATED;
      recovery.escalatedAt = new Date();

      recovery.auditTrail.push({
        timestamp: new Date(),
        action: 'ESCALATED_TO_SUPPORT',
        details: {
          ticketId: ticketResponse.data.ticketId,
          supportQueue: 'payment_recovery',
        },
        performedBy: 'recovery-service',
      });

      await db.updatePaymentRecovery(recovery);

      // Notify member and finance team
      await this.notifyMemberEscalated(recovery);
      await this.notifyFinanceTeam(recovery);
    } catch (error: any) {
      console.error(`[RECOVERY ERROR] Support escalation failed`, error);

      recovery.auditTrail.push({
        timestamp: new Date(),
        action: 'ESCALATION_ERROR',
        details: {
          error: error.message,
        },
        performedBy: 'recovery-service',
      });

      await db.updatePaymentRecovery(recovery);
    }
  }

  /**
   * Retry the actual payment
   */
  private async retryPayment(
    recovery: PaymentRecoveryRecord
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Call finance service to retry payment
      const response = await axios.post(
        `${process.env.FINANCE_SERVICE_URL}/api/payments/retry`,
        {
          paymentId: recovery.paymentId,
          claimId: recovery.claimId,
          memberId: recovery.memberId,
          amount: recovery.amount,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
          },
          timeout: 30000,
        }
      );

      return { success: response.data.success };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Notification methods
   */
  private async notifyMemberRecovered(recovery: PaymentRecoveryRecord): Promise<void> {
    try {
      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/send`,
        {
          memberId: recovery.memberId,
          type: 'payment_recovered',
          title: 'Payment Processed Successfully',
          message: `Your payment of $${recovery.amount} has been processed successfully after recovery.`,
          data: {
            paymentId: recovery.paymentId,
            claimId: recovery.claimId,
            amount: recovery.amount,
          },
        }
      );
    } catch (error) {
      console.error('[NOTIFICATION ERROR] Failed to notify member of recovery', error);
    }
  }

  private async notifyMemberRetryScheduled(recovery: PaymentRecoveryRecord): Promise<void> {
    try {
      const nextRetryHours = Math.round(
        (recovery.nextRetryAt!.getTime() - Date.now()) / (1000 * 60 * 60)
      );

      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/send`,
        {
          memberId: recovery.memberId,
          type: 'payment_retry_scheduled',
          title: 'Payment Retry Scheduled',
          message: `We'll retry processing your payment in ${nextRetryHours} hours.`,
          data: {
            paymentId: recovery.paymentId,
            nextRetryAt: recovery.nextRetryAt,
          },
        }
      );
    } catch (error) {
      console.error('[NOTIFICATION ERROR] Failed to notify member of retry', error);
    }
  }

  private async notifyMemberEscalated(recovery: PaymentRecoveryRecord): Promise<void> {
    try {
      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/send`,
        {
          memberId: recovery.memberId,
          type: 'payment_escalated',
          title: 'Payment Issue - Support Review',
          message: `We're unable to process your payment automatically. Our support team will contact you shortly.`,
          data: {
            paymentId: recovery.paymentId,
            supportTicketId: recovery.supportTicketId,
          },
        }
      );
    } catch (error) {
      console.error('[NOTIFICATION ERROR] Failed to notify member of escalation', error);
    }
  }

  private async notifyFinanceTeam(recovery: PaymentRecoveryRecord): Promise<void> {
    try {
      await axios.post(
        `${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/send-to-role`,
        {
          role: 'finance_manager',
          type: 'payment_escalation',
          title: 'Payment Recovery Escalated',
          message: `Payment ${recovery.paymentId} requires manual intervention after failed recovery attempts.`,
          data: recovery,
          priority: 'high',
        }
      );
    } catch (error) {
      console.error('[NOTIFICATION ERROR] Failed to notify finance team', error);
    }
  }
}
```

### Step 2: Create Recovery Database Schema

**File**: `shared/schema.ts` (add to schema)

```typescript
export const paymentRecoveryTable = pgTable('payment_recovery', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull().references(() => paymentsTable.id),
  claimId: uuid('claim_id').notNull(),
  memberId: uuid('member_id').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  originalError: text('original_error').notNull(),
  status: text('status').notNull(),
  retryCount: integer('retry_count').default(0).notNull(),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
  escalatedAt: timestamp('escalated_at', { withTimezone: true }),
  recoveredAt: timestamp('recovered_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  supportTicketId: text('support_ticket_id'),
  auditTrail: jsonb('audit_trail').default(sql`'[]'::jsonb`).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### Step 3: Create Scheduled Recovery Job

**File**: `services/finance-service/src/jobs/RecoveryScheduler.ts`

```typescript
import { ErrorRecoveryService } from '../services/ErrorRecoveryService';

export class RecoveryScheduler {
  private recoveryService = new ErrorRecoveryService();
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the recovery scheduler
   * Processes retries every 5 minutes
   */
  start(): void {
    console.log('[RECOVERY SCHEDULER] Starting error recovery scheduler');

    // Process retries immediately on start
    this.processRetries();

    // Then process every 5 minutes
    this.intervalId = setInterval(() => this.processRetries(), 5 * 60 * 1000);
  }

  private async processRetries(): Promise<void> {
    try {
      await this.recoveryService.processScheduledRetries();
    } catch (error) {
      console.error('[RECOVERY SCHEDULER ERROR]', error);
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[RECOVERY SCHEDULER] Recovery scheduler stopped');
    }
  }
}
```

### Step 4: Integration with Payment Processing

**File**: `services/finance-service/src/routes/payments.ts` (modify)

```typescript
import { ErrorRecoveryService } from '../services/ErrorRecoveryService';

const recoveryService = new ErrorRecoveryService();

router.post('/api/payments/process', async (req: Request, res: Response) => {
  try {
    const { claimId, memberId, amount } = req.body;

    // Attempt payment
    const paymentResult = await processPayment(claimId, memberId, amount);

    if (!paymentResult.success) {
      // Register for recovery on failure
      const recovery = await recoveryService.registerFailedPayment(
        paymentResult.paymentId,
        claimId,
        memberId,
        amount,
        new Error(paymentResult.error)
      );

      return res.status(202).json({
        status: 'pending',
        message: 'Payment failed, automatic recovery initiated',
        recoveryId: recovery.id,
        nextRetryAt: recovery.nextRetryAt,
      });
    }

    res.json({ status: 'success', paymentId: paymentResult.paymentId });
  } catch (error: any) {
    console.error('[PAYMENT ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Step 5: Environment Configuration

**File**: `services/finance-service/.env`

Add:

```env
# Error Recovery
RECOVERY_MAX_RETRIES=3
RECOVERY_ESCALATION_THRESHOLD_HOURS=48
RECOVERY_CHECK_INTERVAL_MINUTES=5

# Service URLs
SUPPORT_SERVICE_URL=http://support-service:3012
NOTIFICATION_SERVICE_URL=http://notification-service:3013
SERVICE_AUTH_TOKEN=your_service_auth_token
```

## Audit Trail Schema

Each recovery record maintains a complete audit trail:

```json
{
  "auditTrail": [
    {
      "timestamp": "2026-04-20T10:30:00Z",
      "action": "PAYMENT_FAILED",
      "details": {
        "error": "Connection timeout",
        "paymentId": "550e8400-e29b-41d4-a716-446655440000"
      },
      "performedBy": "payment-processor"
    },
    {
      "timestamp": "2026-04-20T10:35:00Z",
      "action": "RETRY_FAILED",
      "details": {
        "retryAttempt": 1,
        "error": "Service unavailable"
      },
      "performedBy": "recovery-service"
    },
    {
      "timestamp": "2026-04-20T16:35:00Z",
      "action": "PAYMENT_RECOVERED",
      "details": {
        "retryCount": 2
      },
      "performedBy": "recovery-service"
    }
  ]
}
```

## Testing

**File**: `services/finance-service/tests/ErrorRecoveryService.test.ts`

```typescript
import { ErrorRecoveryService, RecoveryStatus } from '../src/services/ErrorRecoveryService';

describe('ErrorRecoveryService', () => {
  let service: ErrorRecoveryService;

  beforeEach(() => {
    service = new ErrorRecoveryService();
  });

  describe('registerFailedPayment', () => {
    it('should register failed payment for recovery', async () => {
      const recovery = await service.registerFailedPayment(
        'payment-123',
        'claim-456',
        'member-789',
        5000,
        new Error('Connection failed')
      );

      expect(recovery.status).toBe(RecoveryStatus.PENDING);
      expect(recovery.retryCount).toBe(0);
      expect(recovery.auditTrail.length).toBe(1);
      expect(recovery.auditTrail[0].action).toBe('PAYMENT_FAILED');
    });
  });

  describe('processScheduledRetries', () => {
    it('should process overdue retries', async () => {
      // Create expired recovery record
      // Call processScheduledRetries
      // Verify retry was attempted
    });
  });
});
```

## Deployment Checklist

- [ ] Database schema migration applied
- [ ] ErrorRecoveryService implemented
- [ ] RecoveryScheduler integrated into service startup
- [ ] Payment processing routes updated
- [ ] Support service URL configured
- [ ] Notification service URL configured
- [ ] Service auth token configured
- [ ] Unit tests pass
- [ ] Integration tests with dependent services pass
- [ ] Monitoring configured for recovery process
- [ ] Documentation updated

## Monitoring & Alerts

Configure alerts for:

1. **High Failure Rate**: Alert if > 10% of payments fail
2. **Recovery Success Rate**: Monitor recovery success (target > 70%)
3. **Escalation Rate**: Track escalations (should be < 5%)
4. **Retry Queue Size**: Alert if pending > 1000 items
5. **Recovery Time**: Monitor average time to recovery

## Metrics to Track

- Total payments failed: `payment_recovery_initiated_total`
- Successful recoveries: `payment_recovery_success_total`
- Failed recoveries: `payment_recovery_failed_total`
- Average recovery time: `payment_recovery_duration_seconds`
- Escalations: `payment_recovery_escalated_total`
