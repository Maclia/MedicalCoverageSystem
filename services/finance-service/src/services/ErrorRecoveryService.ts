import { Database } from '../models/Database';
import { paymentRecovery } from '../models/schema';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, lte, ne } from 'drizzle-orm';

export enum RecoveryStatus {
  PENDING = 'pending',
  RETRY_1 = 'retry_1',
  RETRY_2 = 'retry_2',
  RETRY_3 = 'retry_3',
  ESCALATED = 'escalated',
  RECOVERED = 'recovered',
  FAILED = 'failed',
}

export interface AuditEntry {
  timestamp: Date;
  action: string;
  details: Record<string, any>;
  performedBy: string;
}

export interface PaymentRecoveryRecord {
  id: number;
  recoveryId: string;
  paymentId: number;
  claimId: string;
  memberId: number;
  amount: string;
  originalError: string;
  status: string;
  retryCount: number;
  nextRetryAt: Date | null;
  escalatedAt: Date | null;
  recoveredAt: Date | null;
  failedAt: Date | null;
  supportTicketId: string | null;
  auditTrail: AuditEntry[];
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ErrorRecoveryService {
  private readonly maxRetries = 3;
  private readonly retryIntervals = [0, 6, 24]; // hours
  private readonly escalationThreshold = 48; // hours
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * Register a failed payment for recovery
   */
  async registerFailedPayment(
    paymentId: number,
    claimId: string,
    memberId: number,
    amount: string,
    error: Error
  ): Promise<PaymentRecoveryRecord> {
    const recoveryId = uuidv4();
    const now = new Date();

    const auditTrail: AuditEntry[] = [
      {
        timestamp: now,
        action: 'PAYMENT_FAILED',
        details: {
          error: error.message,
          paymentId,
          amount,
        },
        performedBy: 'payment-processor',
      },
    ];

    // Insert recovery record
    const [newRecord] = await this.db.getDb()
      .insert(paymentRecovery)
      .values({
        recoveryId,
        paymentId,
        claimId,
        memberId,
        amount,
        originalError: error.message,
        status: RecoveryStatus.PENDING,
        retryCount: 0,
        nextRetryAt: now,
        auditTrail,
      })
      .returning();

    console.log(`[RECOVERY] Payment ${paymentId} registered for recovery`, {
      recoveryId,
      amount,
      error: error.message,
    });

    return newRecord as PaymentRecoveryRecord;
  }

  /**
   * Process scheduled retries
   */
  async processScheduledRetries(): Promise<void> {
    const now = new Date();

    // Get all pending recoveries that are due for retry
    const pendingRecoveries = await this.db.getDb()
      .select()
      .from(paymentRecovery)
      .where(
        and(
          ne(paymentRecovery.status, RecoveryStatus.RECOVERED),
          ne(paymentRecovery.status, RecoveryStatus.FAILED),
          ne(paymentRecovery.status, RecoveryStatus.ESCALATED),
          ne(paymentRecovery.status, 'escalated')
        )
      );

    for (const recovery of pendingRecoveries) {
      // Check if retry is due
      if (recovery.nextRetryAt && recovery.nextRetryAt <= now) {
        await this.performRetry(recovery as PaymentRecoveryRecord);
      }

      // Check if should escalate (48 hours elapsed)
      const hoursElapsed = (now.getTime() - recovery.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursElapsed >= this.escalationThreshold && recovery.status !== RecoveryStatus.ESCALATED) {
        await this.escalateToSupport(recovery as PaymentRecoveryRecord);
      }
    }
  }

  /**
   * Perform retry attempt
   */
  private async performRetry(recovery: PaymentRecoveryRecord): Promise<void> {
    try {
      console.log(`[RECOVERY] Attempting retry for payment ${recovery.paymentId}`, {
        retryCount: recovery.retryCount + 1,
        amount: recovery.amount,
      });

      // Attempt payment
      const result = await this.retryPayment(recovery);

      if (result.success) {
        // Payment succeeded
        const updatedTrail = [
          ...recovery.auditTrail,
          {
            timestamp: new Date(),
            action: 'PAYMENT_RECOVERED',
            details: {
              retryCount: recovery.retryCount,
              retryAttempt: recovery.retryCount + 1,
            },
            performedBy: 'recovery-service',
          },
        ];

        await this.db.getDb()
          .update(paymentRecovery)
          .set({
            status: RecoveryStatus.RECOVERED,
            recoveredAt: new Date(),
            auditTrail: updatedTrail,
            updatedAt: new Date(),
          })
          .where(eq(paymentRecovery.id, recovery.id));

        await this.notifyMemberRecovered(recovery);

        console.log(`[RECOVERY] Payment ${recovery.paymentId} recovered successfully`);
      } else {
        // Payment still failing
        const newRetryCount = recovery.retryCount + 1;

        if (newRetryCount < this.maxRetries) {
          // Schedule next retry
          const nextRetryHours = this.retryIntervals[newRetryCount];
          const nextRetryDate = new Date(Date.now() + nextRetryHours * 60 * 60 * 1000);
          const newStatus = `retry_${newRetryCount}`;

          const updatedTrail = [
            ...recovery.auditTrail,
            {
              timestamp: new Date(),
              action: 'RETRY_FAILED',
              details: {
                retryAttempt: newRetryCount,
                nextRetryAt: nextRetryDate,
                error: result.error,
              },
              performedBy: 'recovery-service',
            },
          ];

          await this.db.getDb()
            .update(paymentRecovery)
            .set({
              retryCount: newRetryCount,
              status: newStatus,
              nextRetryAt: nextRetryDate,
              auditTrail: updatedTrail,
              updatedAt: new Date(),
            })
            .where(eq(paymentRecovery.id, recovery.id));

          await this.notifyMemberRetryScheduled({
            ...recovery,
            retryCount: newRetryCount,
            nextRetryAt: nextRetryDate,
          });
        } else {
          // Max retries exceeded, escalate to support
          await this.escalateToSupport(recovery);
        }
      }
    } catch (error: any) {
      console.error(`[RECOVERY ERROR] Retry failed for payment ${recovery.paymentId}`, error);

      const updatedTrail = [
        ...recovery.auditTrail,
        {
          timestamp: new Date(),
          action: 'RETRY_ERROR',
          details: {
            error: error.message,
            retryCount: recovery.retryCount,
          },
          performedBy: 'recovery-service',
        },
      ];

      await this.db.getDb()
        .update(paymentRecovery)
        .set({
          auditTrail: updatedTrail,
          updatedAt: new Date(),
        })
        .where(eq(paymentRecovery.id, recovery.id));
    }
  }

  /**
   * Escalate to support team
   */
  private async escalateToSupport(recovery: PaymentRecoveryRecord): Promise<void> {
    try {
      console.log(`[RECOVERY] Escalating payment ${recovery.paymentId} to support`);

      // Create support ticket
      const ticketResponse = await axios.post(
        `${process.env.SUPPORT_SERVICE_URL}/api/support/tickets`,
        {
          type: 'payment_recovery_escalation',
          priority: 'high',
          title: `Payment Recovery Failed - Escalation Required`,
          description: `Payment ${recovery.paymentId} has failed automated recovery attempts.

Claim ID: ${recovery.claimId}
Member ID: ${recovery.memberId}
Amount: ${recovery.amount}
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
          timeout: 30000,
        }
      );

      const updatedTrail = [
        ...recovery.auditTrail,
        {
          timestamp: new Date(),
          action: 'ESCALATED_TO_SUPPORT',
          details: {
            ticketId: ticketResponse.data.ticketId,
            supportQueue: 'payment_recovery',
          },
          performedBy: 'recovery-service',
        },
      ];

      await this.db.getDb()
        .update(paymentRecovery)
        .set({
          status: RecoveryStatus.ESCALATED,
          escalatedAt: new Date(),
          supportTicketId: ticketResponse.data.ticketId,
          auditTrail: updatedTrail,
          updatedAt: new Date(),
        })
        .where(eq(paymentRecovery.id, recovery.id));

      // Notify member and finance team
      await this.notifyMemberEscalated(recovery);
      await this.notifyFinanceTeam(recovery);
    } catch (error: any) {
      console.error(`[RECOVERY ERROR] Support escalation failed`, error);

      const updatedTrail = [
        ...recovery.auditTrail,
        {
          timestamp: new Date(),
          action: 'ESCALATION_ERROR',
          details: {
            error: error.message,
          },
          performedBy: 'recovery-service',
        },
      ];

      await this.db.getDb()
        .update(paymentRecovery)
        .set({
          auditTrail: updatedTrail,
          updatedAt: new Date(),
        })
        .where(eq(paymentRecovery.id, recovery.id));
    }
  }

  /**
   * Retry the actual payment
   */
  private async retryPayment(
    recovery: PaymentRecoveryRecord
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Call finance service to retry payment (would be actual payment processing)
      const response = await axios.post(
        `${process.env.FINANCE_SERVICE_URL || 'http://finance-service:3007'}/api/payments/retry`,
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
          message: `Your payment of ${recovery.amount} has been processed successfully after recovery.`,
          data: {
            paymentId: recovery.paymentId,
            claimId: recovery.claimId,
            amount: recovery.amount,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
          },
        }
      );
    } catch (error) {
      console.error('[NOTIFICATION ERROR] Failed to notify member of recovery', error);
    }
  }

  private async notifyMemberRetryScheduled(recovery: Partial<PaymentRecoveryRecord>): Promise<void> {
    try {
      const nextRetryHours = recovery.nextRetryAt
        ? Math.round((recovery.nextRetryAt.getTime() - Date.now()) / (1000 * 60 * 60))
        : 0;

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
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
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
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
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
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
          },
        }
      );
    } catch (error) {
      console.error('[NOTIFICATION ERROR] Failed to notify finance team', error);
    }
  }

  /**
   * Get recovery record by recovery ID
   */
  async getRecoveryRecord(recoveryId: string): Promise<PaymentRecoveryRecord | null> {
    const [record] = await this.db.getDb()
      .select()
      .from(paymentRecovery)
      .where(eq(paymentRecovery.recoveryId, recoveryId));

    return (record as PaymentRecoveryRecord) || null;
  }

  /**
   * Get all incomplete recoveries
   */
  async getIncompleteRecoveries(): Promise<PaymentRecoveryRecord[]> {
    const records = await this.db.getDb()
      .select()
      .from(paymentRecovery)
      .where(
        and(
          ne(paymentRecovery.status, RecoveryStatus.RECOVERED),
          ne(paymentRecovery.status, RecoveryStatus.FAILED),
          ne(paymentRecovery.status, RecoveryStatus.ESCALATED),
          ne(paymentRecovery.status, 'escalated')
        )
      );

    return records as PaymentRecoveryRecord[];
  }
}
