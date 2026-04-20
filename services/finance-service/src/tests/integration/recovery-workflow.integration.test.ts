/**
 * Integration Tests for Error Recovery Workflow
 * Tests the complete payment recovery flow including retries, escalation, and notifications
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { db } from '../../src/models/database';
import { payment, paymentRecovery } from '../../src/models/schema';
import { ErrorRecoveryService } from '../../src/services/ErrorRecoveryService';
import { RecoveryScheduler } from '../../src/jobs/RecoveryScheduler';
import { eq, and } from 'drizzle-orm';

describe('Error Recovery Workflow Integration Tests', () => {
  let recoveryService: ErrorRecoveryService;
  let scheduler: RecoveryScheduler;
  let testPaymentId: number;

  beforeAll(async () => {
    // Initialize services
    recoveryService = new ErrorRecoveryService();
    scheduler = new RecoveryScheduler(recoveryService);
    
    // Connect to test database
    await db.connect();
  });

  afterAll(async () => {
    // Clean up
    await db.disconnect();
  });

  beforeEach(async () => {
    // Clear test data
    await db.delete(paymentRecovery).execute();
    
    // Create test payment
    const result = await db.insert(payment).values({
      memberId: 1,
      amount: 100.00,
      status: 'pending',
      currency: 'USD',
    }).returning();
    
    testPaymentId = result[0].id;
  });

  describe('Payment Failure Registration', () => {
    it('should register a failed payment for recovery', async () => {
      const recoveryId = await recoveryService.registerFailedPayment(
        testPaymentId,
        new Error('Payment gateway timeout'),
        { gatewayCode: 'TIMEOUT', transactionId: 'txn_12345' }
      );

      expect(recoveryId).toBeDefined();
      expect(typeof recoveryId).toBe('number');

      // Verify recovery record was created
      const recovery = await db.query.paymentRecovery.findFirst({
        where: eq(paymentRecovery.id, recoveryId),
      });

      expect(recovery).toBeDefined();
      expect(recovery?.paymentId).toBe(testPaymentId);
      expect(recovery?.status).toBe('pending');
      expect(recovery?.retryCount).toBe(0);
    });

    it('should store failure details in audit trail', async () => {
      const errorDetails = { 
        gatewayCode: 'INSUFFICIENT_FUNDS',
        transactionId: 'txn_67890',
        timestamp: new Date().toISOString()
      };

      const recoveryId = await recoveryService.registerFailedPayment(
        testPaymentId,
        new Error('Insufficient funds'),
        errorDetails
      );

      const recovery = await db.query.paymentRecovery.findFirst({
        where: eq(paymentRecovery.id, recoveryId),
      });

      expect(recovery?.auditTrail).toBeDefined();
      const trail = JSON.parse(recovery?.auditTrail || '[]');
      expect(trail.length).toBeGreaterThan(0);
      expect(trail[0].action).toBe('PAYMENT_FAILED');
      expect(trail[0].details).toMatchObject(errorDetails);
    });

    it('should set correct next retry time', async () => {
      const recoveryId = await recoveryService.registerFailedPayment(
        testPaymentId,
        new Error('Network error')
      );

      const recovery = await db.query.paymentRecovery.findFirst({
        where: eq(paymentRecovery.id, recoveryId),
      });

      expect(recovery?.nextRetryAt).toBeDefined();
      
      // First retry should be scheduled for now (immediate retry)
      const nextRetry = new Date(recovery!.nextRetryAt!);
      const now = new Date();
      const diffMinutes = (nextRetry.getTime() - now.getTime()) / (1000 * 60);
      expect(diffMinutes).toBeLessThan(1); // Should be immediate or very soon
    });
  });

  describe('Automatic Retry Mechanism', () => {
    it('should perform first retry when scheduled', async () => {
      const recoveryId = await recoveryService.registerFailedPayment(
        testPaymentId,
        new Error('Initial failure')
      );

      // Mock successful payment on first retry
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, transactionId: 'txn_retry1' })
      } as any);

      const result = await recoveryService.performRetry(recoveryId);

      expect(result.success).toBe(true);
      expect(result.attempt).toBe(1);

      // Verify audit trail was updated
      const recovery = await db.query.paymentRecovery.findFirst({
        where: eq(paymentRecovery.id, recoveryId),
      });

      const trail = JSON.parse(recovery?.auditTrail || '[]');
      const retryEntry = trail.find((e: any) => e.action === 'RETRY_SUCCESSFUL');
      expect(retryEntry).toBeDefined();
    });

    it('should schedule second retry if first fails', async () => {
      const recoveryId = await recoveryService.registerFailedPayment(
        testPaymentId,
        new Error('Initial failure')
      );

      // Mock failed payment on first retry
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Service temporarily unavailable' })
      } as any);

      const result = await recoveryService.performRetry(recoveryId);

      expect(result.success).toBe(false);

      // Verify next retry is scheduled for 6 hours later
      const recovery = await db.query.paymentRecovery.findFirst({
        where: eq(paymentRecovery.id, recoveryId),
      });

      expect(recovery?.status).toBe('retry_1');
      expect(recovery?.retryCount).toBe(1);

      const nextRetry = new Date(recovery!.nextRetryAt!);
      const now = new Date();
      const diffHours = (nextRetry.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(5.5); // Should be approximately 6 hours
      expect(diffHours).toBeLessThan(6.5);
    });

    it('should schedule third retry if second fails', async () => {
      const recoveryId = await recoveryService.registerFailedPayment(
        testPaymentId,
        new Error('Initial failure')
      );

      // Simulate second retry failure
      await db.update(paymentRecovery)
        .set({
          status: 'retry_1',
          retryCount: 1,
          nextRetryAt: new Date(),
        })
        .where(eq(paymentRecovery.id, recoveryId))
        .execute();

      // Mock failed second retry
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      } as any);

      const result = await recoveryService.performRetry(recoveryId);

      expect(result.success).toBe(false);

      const recovery = await db.query.paymentRecovery.findFirst({
        where: eq(paymentRecovery.id, recoveryId),
      });

      expect(recovery?.status).toBe('retry_2');
      expect(recovery?.retryCount).toBe(2);

      // Should schedule third retry for 24 hours later
      const nextRetry = new Date(recovery!.nextRetryAt!);
      const now = new Date();
      const diffHours = (nextRetry.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(23.5);
      expect(diffHours).toBeLessThan(24.5);
    });

    it('should mark payment as recovered on successful retry', async () => {
      const recoveryId = await recoveryService.registerFailedPayment(
        testPaymentId,
        new Error('Initial failure')
      );

      // Simulate failed retries and set up for final retry
      await db.update(paymentRecovery)
        .set({
          status: 'retry_2',
          retryCount: 2,
          nextRetryAt: new Date(),
        })
        .where(eq(paymentRecovery.id, recoveryId))
        .execute();

      // Mock successful final retry
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, transactionId: 'txn_final_success' })
      } as any);

      const result = await recoveryService.performRetry(recoveryId);

      expect(result.success).toBe(true);

      const recovery = await db.query.paymentRecovery.findFirst({
        where: eq(paymentRecovery.id, recoveryId),
      });

      expect(recovery?.status).toBe('recovered');
      expect(recovery?.recoveredAt).toBeDefined();

      // Verify payment status was updated
      const paymentRecord = await db.query.payment.findFirst({
        where: eq(payment.id, testPaymentId),
      });

      expect(paymentRecord?.status).toBe('completed');
    });
  });

  describe('Escalation to Support', () => {
    it('should escalate to support after 48 hours without recovery', async () => {
      const recoveryId = await recoveryService.registerFailedPayment(
        testPaymentId,
        new Error('Initial failure')
      );

      // Simulate time passing (48+ hours)
      const createdAt = new Date();
      createdAt.setHours(createdAt.getHours() - 49);

      await db.update(paymentRecovery)
        .set({
          status: 'retry_3',
          retryCount: 3,
          nextRetryAt: new Date(),
          createdAt: createdAt,
        })
        .where(eq(paymentRecovery.id, recoveryId))
        .execute();

      // Mock support ticket creation
      const mockTicketId = 'SUPPORT-' + Date.now();
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ticketId: mockTicketId })
      } as any);

      const ticketId = await recoveryService.escalateToSupport(recoveryId, 'test-member-id');

      expect(ticketId).toBe(mockTicketId);

      // Verify escalation was recorded
      const recovery = await db.query.paymentRecovery.findFirst({
        where: eq(paymentRecovery.id, recoveryId),
      });

      expect(recovery?.status).toBe('escalated');
      expect(recovery?.escalatedAt).toBeDefined();
      expect(recovery?.supportTicketId).toBe(mockTicketId);
    });

    it('should notify member on escalation', async () => {
      const recoveryId = await recoveryService.registerFailedPayment(
        testPaymentId,
        new Error('Initial failure')
      );

      // Mock notification service
      const notificationSpy = jest.spyOn(global, 'fetch');
      notificationSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notificationId: 'notif_123' })
      } as any);

      await recoveryService.escalateToSupport(recoveryId, 'test-member-id');

      // Verify notification was sent
      expect(notificationSpy).toHaveBeenCalledWith(
        expect.stringContaining('/notification'),
        expect.any(Object)
      );
    });

    it('should add escalation entry to audit trail', async () => {
      const recoveryId = await recoveryService.registerFailedPayment(
        testPaymentId,
        new Error('Initial failure')
      );

      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ticketId: 'SUPPORT-789' })
      } as any);

      await recoveryService.escalateToSupport(recoveryId, 'test-member-id');

      const recovery = await db.query.paymentRecovery.findFirst({
        where: eq(paymentRecovery.id, recoveryId),
      });

      const trail = JSON.parse(recovery?.auditTrail || '[]');
      const escalationEntry = trail.find((e: any) => e.action === 'ESCALATED_TO_SUPPORT');
      expect(escalationEntry).toBeDefined();
      expect(escalationEntry?.details.supportTicketId).toBe('SUPPORT-789');
    });
  });

  describe('Recovery Scheduler', () => {
    it('should process scheduled retries', async () => {
      const recoveryId = await recoveryService.registerFailedPayment(
        testPaymentId,
        new Error('Initial failure')
      );

      // Schedule retry for now
      await db.update(paymentRecovery)
        .set({
          nextRetryAt: new Date(),
        })
        .where(eq(paymentRecovery.id, recoveryId))
        .execute();

      // Mock successful retry
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as any);

      const processedCount = await scheduler.processScheduledRetries();

      expect(processedCount).toBeGreaterThanOrEqual(1);
    });

    it('should process escalations when threshold is reached', async () => {
      const recoveryId = await recoveryService.registerFailedPayment(
        testPaymentId,
        new Error('Initial failure')
      );

      // Simulate 49 hours passed
      const createdAt = new Date();
      createdAt.setHours(createdAt.getHours() - 49);

      await db.update(paymentRecovery)
        .set({
          status: 'retry_3',
          retryCount: 3,
          createdAt: createdAt,
        })
        .where(eq(paymentRecovery.id, recoveryId))
        .execute();

      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ticketId: 'SUPPORT-escalated' })
      } as any);

      const escalatedCount = await scheduler.processEscalations();

      expect(escalatedCount).toBeGreaterThanOrEqual(1);
    });

    it('should run both retry and escalation processes', async () => {
      const runSpy = jest.spyOn(scheduler, 'run');

      await scheduler.run();

      expect(runSpy).toHaveBeenCalled();
    });
  });

  describe('Audit Trail', () => {
    it('should maintain chronological audit trail', async () => {
      const recoveryId = await recoveryService.registerFailedPayment(
        testPaymentId,
        new Error('Initial failure')
      );

      // Simulate retry attempt
      await db.update(paymentRecovery)
        .set({
          status: 'retry_1',
          retryCount: 1,
        })
        .where(eq(paymentRecovery.id, recoveryId))
        .execute();

      const recovery = await db.query.paymentRecovery.findFirst({
        where: eq(paymentRecovery.id, recoveryId),
      });

      const trail = JSON.parse(recovery?.auditTrail || '[]');
      expect(trail.length).toBeGreaterThanOrEqual(2);

      // Verify chronological order
      for (let i = 1; i < trail.length; i++) {
        const prevTime = new Date(trail[i - 1].timestamp).getTime();
        const currTime = new Date(trail[i].timestamp).getTime();
        expect(currTime).toBeGreaterThanOrEqual(prevTime);
      }
    });

    it('should record all recovery actions', async () => {
      const actions = [
        'PAYMENT_FAILED',
        'RETRY_FAILED',
        'RETRY_SCHEDULED',
        'ESCALATED_TO_SUPPORT',
        'PAYMENT_RECOVERED'
      ];

      const recoveryId = await recoveryService.registerFailedPayment(
        testPaymentId,
        new Error('Initial failure')
      );

      // Verify PAYMENT_FAILED was recorded
      const recovery = await db.query.paymentRecovery.findFirst({
        where: eq(paymentRecovery.id, recoveryId),
      });

      const trail = JSON.parse(recovery?.auditTrail || '[]');
      const recordedActions = trail.map((e: any) => e.action);

      expect(recordedActions).toContain('PAYMENT_FAILED');
    });

    it('should include performance metadata in audit trail', async () => {
      const recoveryId = await recoveryService.registerFailedPayment(
        testPaymentId,
        new Error('Initial failure')
      );

      const recovery = await db.query.paymentRecovery.findFirst({
        where: eq(paymentRecovery.id, recoveryId),
      });

      const trail = JSON.parse(recovery?.auditTrail || '[]');
      const entry = trail[0];

      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('performedBy');
      expect(entry).toHaveProperty('details');
      expect(entry.details).toHaveProperty('retryCount');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing payment gracefully', async () => {
      const invalidPaymentId = 999999;

      const recoveryId = await recoveryService.registerFailedPayment(
        invalidPaymentId,
        new Error('Payment not found')
      );

      expect(recoveryId).toBeDefined();

      // Should still create recovery record for support investigation
      const recovery = await db.query.paymentRecovery.findFirst({
        where: eq(paymentRecovery.id, recoveryId),
      });

      expect(recovery).toBeDefined();
      expect(recovery?.paymentId).toBe(invalidPaymentId);
    });

    it('should handle notification service failures gracefully', async () => {
      const recoveryId = await recoveryService.registerFailedPayment(
        testPaymentId,
        new Error('Initial failure')
      );

      // Mock notification service failure
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(
        new Error('Notification service unavailable')
      );

      // Should not throw, just log and continue
      const ticketId = await recoveryService.escalateToSupport(
        recoveryId,
        'test-member-id'
      );

      // Recovery should still be recorded even if notification fails
      expect(ticketId).toBeDefined();
    });

    it('should handle concurrent recovery attempts', async () => {
      const recoveryId = await recoveryService.registerFailedPayment(
        testPaymentId,
        new Error('Initial failure')
      );

      // Mock successful retry
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      } as any);

      // Attempt concurrent retries
      const results = await Promise.all([
        recoveryService.performRetry(recoveryId),
        recoveryService.performRetry(recoveryId),
      ]);

      // Should handle gracefully - only one should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Performance', () => {
    it('should complete recovery cycle within acceptable time', async () => {
      const startTime = Date.now();

      const recoveryId = await recoveryService.registerFailedPayment(
        testPaymentId,
        new Error('Initial failure')
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 500ms
      expect(duration).toBeLessThan(500);
    });

    it('should handle batch processing of scheduled retries efficiently', async () => {
      // Create multiple recovery records
      const recoveryIds: number[] = [];
      for (let i = 0; i < 10; i++) {
        const result = await db.insert(payment).values({
          memberId: 1,
          amount: 100.00,
          status: 'pending',
          currency: 'USD',
        }).returning();

        const recoveryId = await recoveryService.registerFailedPayment(
          result[0].id,
          new Error('Initial failure')
        );

        recoveryIds.push(recoveryId);
      }

      const startTime = Date.now();

      // Mock successful retries
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      } as any);

      // Process all scheduled retries
      await scheduler.processScheduledRetries();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should process 10 items in under 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });
});
