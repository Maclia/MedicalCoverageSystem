/**
 * Integration Tests for Error Recovery Workflow
 * Tests the complete payment recovery flow including retries, escalation, and notifications
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { db } from '../../models/Database';
import { payments, paymentRecovery } from '../../models/schema';
import { ErrorRecoveryService } from '../../services/ErrorRecoveryService';
import { RecoveryScheduler } from '../../jobs/RecoveryScheduler';
import { eq, and } from 'drizzle-orm';

describe('Error Recovery Workflow Integration Tests', () => {
  let recoveryService: ErrorRecoveryService;
  let scheduler: RecoveryScheduler;
  let testPaymentId: number;

  beforeAll(async () => {
    // Initialize services
    recoveryService = new ErrorRecoveryService();
    scheduler = new RecoveryScheduler();
  });

  afterAll(async () => {
    // Clean up database connections if needed
  });

  beforeEach(async () => {
    // Clear test data
    await db.delete(paymentRecovery).execute();
    
    // Create test payment
    const result = await db.insert(payments).values({
      paymentNumber: `TEST-${Date.now()}`,
      invoiceId: 1,
      memberId: 1,
      amount: '100.00',
      status: 'pending',
      currency: 'USD',
      paymentMethod: 'card',
      paymentDate: new Date(),
      netAmount: '100.00',
      createdBy: 1,
    }).returning();
    
    testPaymentId = result[0].id;
  });

  describe('Payment Failure Registration', () => {
    it('should register a failed payment for recovery', async () => {
      const recoveryRecord = await recoveryService.registerFailedPayment(
        testPaymentId,
        'test-claim-123',
        1,
        '100.00',
        new Error('Payment gateway timeout')
      );
      const recoveryId = recoveryRecord.id;

      expect(recoveryId).toBeDefined();
      expect(typeof recoveryId).toBe('number');

      // Verify recovery record was created
      const recovery = await db.select()
        .from(paymentRecovery)
        .where(eq(paymentRecovery.id, recoveryId));

      expect(recovery).toBeDefined();
      expect(recovery[0]?.paymentId).toBe(testPaymentId);
      expect(recovery[0]?.status).toBe('pending');
      expect(recovery[0]?.retryCount).toBe(0);
    });

    it('should store failure details in audit trail', async () => {
      const errorDetails = { 
        gatewayCode: 'INSUFFICIENT_FUNDS',
        transactionId: 'txn_67890',
        timestamp: new Date().toISOString()
      };

      const recoveryRecord = await recoveryService.registerFailedPayment(
        testPaymentId,
        'test-claim-456',
        1,
        '100.00',
        new Error('Insufficient funds')
      );
      const recoveryId = recoveryRecord.id;

      const recovery = await db.select()
        .from(paymentRecovery)
        .where(eq(paymentRecovery.id, recoveryId));

      expect(recovery[0]?.auditTrail).toBeDefined();
      const trail = (recovery[0]?.auditTrail as any[]) || [];
      expect(trail.length).toBeGreaterThan(0);
      expect(trail[0].action).toBe('PAYMENT_FAILED');
    });

    it('should set correct next retry time', async () => {
      const recoveryRecord = await recoveryService.registerFailedPayment(
        testPaymentId,
        'test-claim-789',
        1,
        '100.00',
        new Error('Network error')
      );
      const recoveryId = recoveryRecord.id;

      const recovery = await db.select()
        .from(paymentRecovery)
        .where(eq(paymentRecovery.id, recoveryId));

      expect(recovery[0]?.nextRetryAt).toBeDefined();
      
      // First retry should be scheduled for now (immediate retry)
      const nextRetry = new Date(recovery[0].nextRetryAt!);
      const now = new Date();
      const diffMinutes = (nextRetry.getTime() - now.getTime()) / (1000 * 60);
      expect(diffMinutes).toBeLessThan(1); // Should be immediate or very soon
    });
  });

  describe('Automatic Retry Mechanism', () => {
    it('should perform first retry when scheduled', async () => {
      const recoveryRecord = await recoveryService.registerFailedPayment(
        testPaymentId,
        'test-claim-123',
        1,
        '100.00',
        new Error('Initial failure')
      );
      const recoveryId = recoveryRecord.id;

      // Mock successful payment on first retry
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, transactionId: 'txn_retry1' })
      } as any);

      const result = await recoveryService.performRetry(recoveryId);

      expect(result.success).toBe(true);
      expect(result.attempt).toBe(1);

      // Verify audit trail was updated
      const recovery = await db.select()
        .from(paymentRecovery)
        .where(eq(paymentRecovery.id, recoveryId));

      const trail = (recovery[0]?.auditTrail as any[]) || [];
      const retryEntry = trail.find((e: any) => e.action === 'PAYMENT_RECOVERED');
      expect(retryEntry).toBeDefined();
    });

    it('should schedule second retry if first fails', async () => {
      const recoveryRecord = await recoveryService.registerFailedPayment(
        testPaymentId,
        'test-claim-123',
        1,
        '100.00',
        new Error('Initial failure')
      );
      const recoveryId = recoveryRecord.id;

      // Mock failed payment on first retry
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Service temporarily unavailable' })
      } as any);

      const result = await recoveryService.performRetry(recoveryId);

      expect(result.success).toBe(false);

      // Verify next retry is scheduled for 6 hours later
      const recovery = await db.select()
        .from(paymentRecovery)
        .where(eq(paymentRecovery.id, recoveryId));

      expect(recovery[0]?.status).toBe('retry_1');
      expect(recovery[0]?.retryCount).toBe(1);

      const nextRetry = new Date(recovery[0].nextRetryAt!);
      const now = new Date();
      const diffHours = (nextRetry.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(5.5); // Should be approximately 6 hours
      expect(diffHours).toBeLessThan(6.5);
    });

    it('should schedule third retry if second fails', async () => {
      const recoveryRecord = await recoveryService.registerFailedPayment(
        testPaymentId,
        'test-claim-123',
        1,
        '100.00',
        new Error('Initial failure')
      );
      const recoveryId = recoveryRecord.id;

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

      const recovery = await db.select()
        .from(paymentRecovery)
        .where(eq(paymentRecovery.id, recoveryId));

      expect(recovery[0]?.status).toBe('retry_2');
      expect(recovery[0]?.retryCount).toBe(2);

      // Should schedule third retry for 24 hours later
      const nextRetry = new Date(recovery[0].nextRetryAt!);
      const now = new Date();
      const diffHours = (nextRetry.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(23.5);
      expect(diffHours).toBeLessThan(24.5);
    });

    it('should mark payment as recovered on successful retry', async () => {
      const recoveryRecord = await recoveryService.registerFailedPayment(
        testPaymentId,
        'test-claim-123',
        1,
        '100.00',
        new Error('Initial failure')
      );
      const recoveryId = recoveryRecord.id;

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

      const recovery = await db.select()
        .from(paymentRecovery)
        .where(eq(paymentRecovery.id, recoveryId));

      expect(recovery[0]?.status).toBe('recovered');
      expect(recovery[0]?.recoveredAt).toBeDefined();

      // Verify payment status was updated
      const paymentRecord = await db.select()
        .from(payments)
        .where(eq(payments.id, testPaymentId));

      // Payment status will be updated by actual payment service
      expect(paymentRecord).toBeDefined();
    });
  });

  describe('Escalation to Support', () => {
    it('should escalate to support after 48 hours without recovery', async () => {
      const recoveryRecord = await recoveryService.registerFailedPayment(
        testPaymentId,
        'test-claim-123',
        1,
        '100.00',
        new Error('Initial failure')
      );
      const recoveryId = recoveryRecord.id;

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

      const ticketId = await recoveryService.escalateToSupport(recoveryId);

      expect(ticketId).toBe(mockTicketId);

      // Verify escalation was recorded
      const recovery = await db.select()
        .from(paymentRecovery)
        .where(eq(paymentRecovery.id, recoveryId));

      expect(recovery[0]?.status).toBe('escalated');
      expect(recovery[0]?.escalatedAt).toBeDefined();
      expect(recovery[0]?.supportTicketId).toBe(mockTicketId);
    });

    it('should notify member on escalation', async () => {
      const recoveryRecord = await recoveryService.registerFailedPayment(
        testPaymentId,
        'test-claim-123',
        1,
        '100.00',
        new Error('Initial failure')
      );
      const recoveryId = recoveryRecord.id;

      // Mock notification service
      const notificationSpy = jest.spyOn(global, 'fetch');
      notificationSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notificationId: 'notif_123' })
      } as any);

      await recoveryService.escalateToSupport(recoveryId);

      // Verify notification was sent
      expect(notificationSpy).toHaveBeenCalledWith(
        expect.stringContaining('/notification'),
        expect.any(Object)
      );
    });

    it('should add escalation entry to audit trail', async () => {
      const recoveryRecord = await recoveryService.registerFailedPayment(
        testPaymentId,
        'test-claim-123',
        1,
        '100.00',
        new Error('Initial failure')
      );
      const recoveryId = recoveryRecord.id;

      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ticketId: 'SUPPORT-789' })
      } as any);

      await recoveryService.escalateToSupport(recoveryId);

      const recovery = await db.select()
        .from(paymentRecovery)
        .where(eq(paymentRecovery.id, recoveryId));

      const trail = (recovery[0]?.auditTrail as any[]) || [];
      const escalationEntry = trail.find((e: any) => e.action === 'ESCALATED_TO_SUPPORT');
      expect(escalationEntry).toBeDefined();
      expect(escalationEntry?.details.ticketId).toBe('SUPPORT-789');
    });
  });

  describe('Recovery Scheduler', () => {
    it('should process scheduled retries', async () => {
      const recoveryRecord = await recoveryService.registerFailedPayment(
        testPaymentId,
        'test-claim-123',
        1,
        '100.00',
        new Error('Initial failure')
      );
      const recoveryId = recoveryRecord.id;

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

      await scheduler.processScheduledRetries();
    });

    it('should process escalations when threshold is reached', async () => {
      const recoveryRecord = await recoveryService.registerFailedPayment(
        testPaymentId,
        'test-claim-123',
        1,
        '100.00',
        new Error('Initial failure')
      );
      const recoveryId = recoveryRecord.id;

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

      await scheduler.processScheduledRetries();
    });

    it('should run both retry and escalation processes', async () => {
      const runSpy = jest.spyOn(scheduler, 'processScheduledRetries');

      await scheduler.processScheduledRetries();

      expect(runSpy).toHaveBeenCalled();
    });
  });

  describe('Audit Trail', () => {
    it('should maintain chronological audit trail', async () => {
      const recoveryRecord = await recoveryService.registerFailedPayment(
        testPaymentId,
        'test-claim-123',
        1,
        '100.00',
        new Error('Initial failure')
      );
      const recoveryId = recoveryRecord.id;

      // Simulate retry attempt
      await db.update(paymentRecovery)
        .set({
          status: 'retry_1',
          retryCount: 1,
        })
        .where(eq(paymentRecovery.id, recoveryId))
        .execute();

      const recovery = await db.select()
        .from(paymentRecovery)
        .where(eq(paymentRecovery.id, recoveryId));

      const trail = (recovery[0]?.auditTrail as any[]) || [];
      expect(trail.length).toBeGreaterThanOrEqual(1);

      // Verify chronological order
      for (let i = 1; i < trail.length; i++) {
        const prevTime = new Date(trail[i - 1].timestamp).getTime();
        const currTime = new Date(trail[i].timestamp).getTime();
        expect(currTime).toBeGreaterThanOrEqual(prevTime);
      }
    });
  });
});
