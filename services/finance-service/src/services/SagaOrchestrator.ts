/**
 * Saga Orchestrator Service
 * Implements the Saga Pattern for distributed transaction management
 * across Claims → Payment → Notification workflow
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/Database';
import { saga, sagaStep } from '../models/schema';
import { eq } from 'drizzle-orm';

export type SagaStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'compensating' | 'compensated';
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'compensated';
export type StepAction = 'claim_created' | 'payment_processed' | 'notification_sent' | 'lead_converted' | 'company_created' | 'member_created' | 'policy_activated' | 'billing_account_created' | 'crm_updated';

export interface SagaStep {
  id: string;
  stepName: StepAction;
  status: StepStatus;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  compensationExecuted: boolean;
  compensationError?: string;
  retryCount: number;
  maxRetries: number;
  startedAt: Date;
  completedAt?: Date;
  compensatedAt?: Date;
}

export interface SagaTransaction {
  id: string;
  correlationId: string;
  sagaName: string;
  status: SagaStatus;
  steps: SagaStep[];
  startedAt: Date;
  completedAt?: Date;
  compensatedAt?: Date;
  metadata: Record<string, any>;
  auditTrail: Array<{
    timestamp: string;
    action: string;
    details: Record<string, any>;
    performedBy: string;
  }>;
}

export interface SagaCompensation {
  stepName: StepAction;
  compensate: (input: any, stepOutput: any) => Promise<void>;
  timeout?: number;
}

/**
 * Orchestrates distributed transactions using the Saga pattern
 * Implements orchestration-based saga for Claims → Payment → Notification
 */
export class SagaOrchestrator extends EventEmitter {
  private compensations: Map<StepAction, SagaCompensation> = new Map();
  private readonly STEP_TIMEOUT = 30000; // 30 seconds
  private readonly RETRY_BACKOFF = 1000; // 1 second

  constructor() {
    super();
    this.setupCompensations();
  }

  /**
   * Register compensating transactions for each step
   * These are called if the saga fails to rollback side effects
   */
  private setupCompensations(): void {
    this.registerCompensation('claim_created', {
      stepName: 'claim_created',
      compensate: async (input, stepOutput) => {
        // Revert claim creation
        console.log(`Compensating claim creation for claim ${stepOutput.claimId}`);
        await this.callService('claims-service', 'DELETE', `/api/claims/${stepOutput.claimId}`, {
          reason: 'saga_compensation',
          timestamp: new Date().toISOString(),
        });
      },
      timeout: 10000,
    });

    this.registerCompensation('payment_processed', {
      stepName: 'payment_processed',
      compensate: async (input, stepOutput) => {
        // Reverse payment
        console.log(`Compensating payment for transaction ${stepOutput.transactionId}`);
        await this.callService('finance-service', 'POST', '/api/payments/reverse', {
          transactionId: stepOutput.transactionId,
          reason: 'saga_compensation',
          timestamp: new Date().toISOString(),
        });
      },
      timeout: 15000,
    });

    this.registerCompensation('notification_sent', {
      stepName: 'notification_sent',
      compensate: async (input, stepOutput) => {
        // Mark notification as cancelled (no actual reversal needed, just logged)
        console.log(`Marking notification ${stepOutput.notificationId} as cancelled`);
        await this.callService('notification-service', 'PATCH', 
          `/api/notifications/${stepOutput.notificationId}/cancel`, {
          reason: 'saga_compensation',
          timestamp: new Date().toISOString(),
        });
      },
      timeout: 5000,
    });

    // LEAD CONVERSION SAGA COMPENSATIONS
    this.registerCompensation('company_created', {
      stepName: 'company_created',
      compensate: async (input, stepOutput) => {
        console.log(`Compensating company creation for company ${stepOutput.companyId}`);
        await this.callService('membership-service', 'DELETE', `/api/companies/${stepOutput.companyId}`, {
          reason: 'saga_compensation',
          timestamp: new Date().toISOString(),
        });
      },
      timeout: 10000,
    });

    this.registerCompensation('member_created', {
      stepName: 'member_created',
      compensate: async (input, stepOutput) => {
        console.log(`Compensating member creation for member ${stepOutput.memberId}`);
        await this.callService('membership-service', 'DELETE', `/api/members/${stepOutput.memberId}`, {
          reason: 'saga_compensation',
          timestamp: new Date().toISOString(),
        });
      },
      timeout: 10000,
    });

    this.registerCompensation('policy_activated', {
      stepName: 'policy_activated',
      compensate: async (input, stepOutput) => {
        console.log(`Compensating policy activation for policy ${stepOutput.policyId}`);
        await this.callService('insurance-service', 'POST', `/api/policies/${stepOutput.policyId}/cancel`, {
          reason: 'saga_compensation',
          timestamp: new Date().toISOString(),
        });
      },
      timeout: 15000,
    });

    this.registerCompensation('billing_account_created', {
      stepName: 'billing_account_created',
      compensate: async (input, stepOutput) => {
        console.log(`Compensating billing account creation for account ${stepOutput.accountId}`);
        await this.callService('billing-service', 'DELETE', `/api/accounts/${stepOutput.accountId}`, {
          reason: 'saga_compensation',
          timestamp: new Date().toISOString(),
        });
      },
      timeout: 10000,
    });
  }

  /**
   * Register a custom compensation handler
   */
  registerCompensation(stepName: StepAction, compensation: SagaCompensation): void {
    this.compensations.set(stepName, compensation);
  }

  /**
   * Start a new saga transaction
   */
  async startSaga(
    sagaName: string,
    correlationId: string,
    initialData: Record<string, any>
  ): Promise<SagaTransaction> {
    const sagaId = uuidv4();
    const now = new Date();

    const auditEntry = {
      timestamp: now.toISOString(),
      action: 'SAGA_STARTED',
      details: { sagaName, correlationId, initialDataKeys: Object.keys(initialData) },
      performedBy: 'saga_orchestrator',
    };

    // Persist saga record to database
    await db.insert(saga).values({
      id: sagaId,
      name: sagaName,
      correlationId,
      status: 'pending',
      metadata: JSON.stringify(initialData),
      auditTrail: JSON.stringify([auditEntry]),
      startedAt: now,
    }).execute();

    const transaction: SagaTransaction = {
      id: sagaId,
      correlationId,
      sagaName,
      status: 'pending',
      steps: [],
      startedAt: now,
      metadata: initialData,
      auditTrail: [auditEntry],
    };

    this.emit('saga:started', transaction);
    return transaction;
  }

  /**
   * Execute a saga transaction through all steps
   * Claims → Payment → Notification
   */
  async executeSaga(
    sagaTransaction: SagaTransaction,
    executionPlan: Array<{
      step: StepAction;
      service: string;
      endpoint: string;
      method: 'POST' | 'PUT' | 'PATCH';
      input: Record<string, any>;
    }>
  ): Promise<SagaTransaction> {
    try {
      // Update saga status
      await this.updateSagaStatus(sagaTransaction.id, 'in_progress');
      sagaTransaction.status = 'in_progress';

      for (let stepIndex = 0; stepIndex < executionPlan.length; stepIndex++) {
        const plan = executionPlan[stepIndex];
        const step = await this.executeStep(sagaTransaction, plan, stepIndex);

        sagaTransaction.steps.push(step);

        if (step.status === 'failed') {
          // Trigger compensation for all completed steps
          await this.compensate(sagaTransaction);
          await this.updateSagaStatus(sagaTransaction.id, 'failed');
          sagaTransaction.status = 'failed';

          this.emit('saga:failed', sagaTransaction);
          throw new Error(`Saga failed at step ${plan.step}: ${step.error}`);
        }

        // Persist successful step to database
        await db.insert(sagaStep).values({
          sagaId: sagaTransaction.id,
          stepName: step.stepName,
          status: step.status,
          input: JSON.stringify(step.input),
          output: step.output ? JSON.stringify(step.output) : null,
          error: step.error,
          compensationExecuted: step.compensationExecuted,
          compensationError: step.compensationError,
          retryCount: step.retryCount,
          maxRetries: step.maxRetries,
          startedAt: step.startedAt,
          completedAt: step.completedAt,
        }).execute();
      }

      // All steps completed successfully
      const now = new Date();
      await this.updateSagaStatus(sagaTransaction.id, 'completed');
      sagaTransaction.status = 'completed';
      sagaTransaction.completedAt = now;

      await this.addAuditEntry(sagaTransaction.id, 'SAGA_COMPLETED', {
        stepsCompleted: executionPlan.length,
        duration: now.getTime() - sagaTransaction.startedAt.getTime(),
      });

      this.emit('saga:completed', sagaTransaction);
      return sagaTransaction;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.addAuditEntry(sagaTransaction.id, 'SAGA_ERROR', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Execute a single saga step with retry logic
   */
  private async executeStep(
    sagaTransaction: SagaTransaction,
    plan: {
      step: StepAction;
      service: string;
      endpoint: string;
      method: 'POST' | 'PUT' | 'PATCH';
      input: Record<string, any>;
    },
    stepIndex: number
  ): Promise<SagaStep> {
    const step: SagaStep = {
      id: uuidv4(),
      stepName: plan.step,
      status: 'pending',
      input: plan.input,
      compensationExecuted: false,
      retryCount: 0,
      maxRetries: 3,
      startedAt: new Date(),
    };

    // Add previous step outputs to context
    const stepContext = this.buildStepContext(sagaTransaction, step.input);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < step.maxRetries; attempt++) {
      try {
        step.status = 'in_progress';
        step.retryCount = attempt;

        // Execute the step
        const response = await this.executeStepWithTimeout(
          plan.service,
          plan.method,
          plan.endpoint,
          stepContext,
          this.STEP_TIMEOUT
        );

        step.status = 'completed';
        step.output = response;
        step.completedAt = new Date();

        await this.addAuditEntry(sagaTransaction.id, `STEP_${plan.step.toUpperCase()}_COMPLETED`, {
          stepIndex,
          attemptNumber: attempt + 1,
          output: response,
        });

        this.emit('saga:step_completed', { sagaId: sagaTransaction.id, step });
        return step;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        await this.addAuditEntry(sagaTransaction.id, `STEP_${plan.step.toUpperCase()}_FAILED`, {
          stepIndex,
          attemptNumber: attempt + 1,
          error: lastError.message,
          willRetry: attempt < step.maxRetries - 1,
        });

        // Exponential backoff before retry
        if (attempt < step.maxRetries - 1) {
          const backoffTime = this.RETRY_BACKOFF * Math.pow(2, attempt);
          await this.sleep(backoffTime);
        }
      }
    }

    // All retries exhausted
    step.status = 'failed';
    step.error = lastError?.message || 'Unknown error after all retries';
    step.completedAt = new Date();

    await this.addAuditEntry(sagaTransaction.id, 'STEP_FAILED_PERMANENTLY', {
      stepName: plan.step,
      finalError: step.error,
      retryCount: step.retryCount,
    });

    this.emit('saga:step_failed', { sagaId: sagaTransaction.id, step });
    return step;
  }

  /**
   * Build context for a step by merging previous outputs
   */
  private buildStepContext(
    sagaTransaction: SagaTransaction,
    stepInput: Record<string, any>
  ): Record<string, any> {
    const context: Record<string, any> = {
      ...sagaTransaction.metadata,
      ...stepInput,
    };

    // Merge outputs from previous steps
    for (const prevStep of sagaTransaction.steps) {
      if (prevStep.output) {
        context[prevStep.stepName] = prevStep.output;
      }
    }

    return context;
  }

  /**
   * Execute a step with timeout protection
   */
  private executeStepWithTimeout(
    service: string,
    method: string,
    endpoint: string,
    input: Record<string, any>,
    timeout: number
  ): Promise<Record<string, any>> {
    return Promise.race([
      this.callService(service, method as any, endpoint, input),
      this.timeoutPromise(timeout),
    ]);
  }

  /**
   * Call an external service
   */
  private async callService(
    service: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: Record<string, any>
  ): Promise<Record<string, any>> {
    const serviceUrls: Record<string, string> = {
      'claims-service': process.env.CLAIMS_SERVICE_URL || 'http://claims-service:3010',
      'finance-service': process.env.FINANCE_SERVICE_URL || 'http://finance-service:3004',
      'notification-service': process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3009',
      'crm-service': process.env.CRM_SERVICE_URL || 'http://crm-service:3007',
      'membership-service': process.env.MEMBERSHIP_SERVICE_URL || 'http://membership-service:3002',
      'insurance-service': process.env.INSURANCE_SERVICE_URL || 'http://insurance-service:3003',
      'billing-service': process.env.BILLING_SERVICE_URL || 'http://billing-service:3005',
    };

    const baseUrl = serviceUrls[service];
    if (!baseUrl) {
      throw new Error(`Unknown service: ${service}`);
    }

    const url = `${baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Saga-Orchestrator': 'true',
        'X-Request-ID': uuidv4(),
      },
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Service error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * Compensate (rollback) a failed saga
   */
  private async compensate(sagaTransaction: SagaTransaction): Promise<void> {
    await this.updateSagaStatus(sagaTransaction.id, 'compensating');

    // Process compensations in reverse order
    for (let i = sagaTransaction.steps.length - 1; i >= 0; i--) {
      const step = sagaTransaction.steps[i];

      if (step.status !== 'completed') {
        continue; // Skip non-completed steps
      }

      const compensation = this.compensations.get(step.stepName);
      if (!compensation) {
        console.warn(`No compensation handler for step: ${step.stepName}`);
        continue;
      }

      try {
        await this.executeWithTimeout(
          () => compensation.compensate(step.input, step.output),
          compensation.timeout || this.STEP_TIMEOUT
        );

        step.compensationExecuted = true;
        step.status = 'compensated';
        step.compensatedAt = new Date();

        await this.addAuditEntry(sagaTransaction.id, 'COMPENSATION_EXECUTED', {
          stepName: step.stepName,
        });

        this.emit('saga:step_compensated', { sagaId: sagaTransaction.id, step });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        step.compensationError = errorMessage;

        await this.addAuditEntry(sagaTransaction.id, 'COMPENSATION_FAILED', {
          stepName: step.stepName,
          error: errorMessage,
        });

        this.emit('saga:compensation_failed', { sagaId: sagaTransaction.id, step });
      }
    }

    await this.updateSagaStatus(sagaTransaction.id, 'compensated');
  }

  /**
   * Retry a failed saga from a specific step
   */
  async retrySagaFromStep(
    sagaTransaction: SagaTransaction,
    stepIndex: number,
    executionPlan: Array<{
      step: StepAction;
      service: string;
      endpoint: string;
      method: 'POST' | 'PUT' | 'PATCH';
      input: Record<string, any>;
    }>
  ): Promise<SagaTransaction> {
    await this.addAuditEntry(sagaTransaction.id, 'SAGA_RETRY_INITIATED', {
      fromStep: stepIndex,
      totalSteps: executionPlan.length,
    });

    // Remove failed and subsequent steps
    sagaTransaction.steps = sagaTransaction.steps.slice(0, stepIndex);

    // Re-execute from the failed step
    return this.executeSaga(sagaTransaction, executionPlan.slice(stepIndex));
  }

  /**
   * Execute full Lead Conversion Saga workflow
   * CRM Lead → Company → Member → Policy → Billing Account → CRM Sync
   */
  async executeLeadConversionSaga(leadId: number, conversionData: Record<string, any>, userId: string): Promise<SagaTransaction> {
    const saga = await this.startSaga('lead_conversion', `lead_${leadId}`, {
      leadId,
      conversionData,
      userId,
      initiatedAt: new Date().toISOString()
    });

    const executionPlan = [
      {
        step: 'lead_converted' as StepAction,
        service: 'crm-service',
        endpoint: `/api/crm/leads/${leadId}/mark-converted`,
        method: 'POST' as const,
        input: { convertedBy: userId }
      },
      {
        step: 'company_created' as StepAction,
        service: 'membership-service',
        endpoint: '/api/companies',
        method: 'POST' as const,
        input: conversionData.company
      },
      {
        step: 'member_created' as StepAction,
        service: 'membership-service',
        endpoint: '/api/members',
        method: 'POST' as const,
        input: conversionData.principalMember
      },
      {
        step: 'policy_activated' as StepAction,
        service: 'insurance-service',
        endpoint: '/api/policies',
        method: 'POST' as const,
        input: conversionData.policy
      },
      {
        step: 'billing_account_created' as StepAction,
        service: 'billing-service',
        endpoint: '/api/accounts',
        method: 'POST' as const,
        input: conversionData.billingAccount
      },
      {
        step: 'crm_updated' as StepAction,
        service: 'crm-service',
        endpoint: `/api/crm/leads/${leadId}/sync-ids`,
        method: 'PATCH' as const,
        input: {}
      }
    ];

    return this.executeSaga(saga, executionPlan);
  }

  /**
   * Get saga status with all details
   */
  async getSagaStatus(sagaId: string): Promise<SagaTransaction | null> {
    const [sagaRecord] = await db
      .select()
      .from(saga)
      .where(eq(saga.id, sagaId))
      .limit(1);

    if (!sagaRecord) {
      return null;
    }

    const steps = await db
      .select()
      .from(sagaStep)
      .where(eq(sagaStep.sagaId, sagaId));

    return {
      id: sagaRecord.id,
      correlationId: sagaRecord.correlationId,
      sagaName: sagaRecord.name,
      status: sagaRecord.status as SagaStatus,
      steps: steps.map((s: typeof steps[number]) => ({
        id: String(s.id),
        stepName: s.stepName as StepAction,
        status: s.status as StepStatus,
        input: s.input ? JSON.parse(s.input) : {},
        output: s.output ? JSON.parse(s.output) : undefined,
        error: s.error || undefined,
        compensationExecuted: s.compensationExecuted,
        compensationError: s.compensationError || undefined,
        retryCount: s.retryCount,
        maxRetries: s.maxRetries,
        startedAt: new Date(s.startedAt!),
        completedAt: s.completedAt ? new Date(s.completedAt) : undefined,
        compensatedAt: s.compensatedAt ? new Date(s.compensatedAt) : undefined,
      })),
      startedAt: new Date(sagaRecord.startedAt!),
      completedAt: sagaRecord.completedAt ? new Date(sagaRecord.completedAt) : undefined,
      compensatedAt: sagaRecord.compensatedAt ? new Date(sagaRecord.compensatedAt) : undefined,
      metadata: sagaRecord.metadata ? JSON.parse(sagaRecord.metadata) : {},
      auditTrail: sagaRecord.auditTrail ? JSON.parse(sagaRecord.auditTrail) : [],
    };
  }

  /**
   * Helper methods
   */
  private async updateSagaStatus(sagaId: string, status: SagaStatus): Promise<void> {
    await db.update(saga)
      .set({
        status,
        ...(status === 'completed' ? { completedAt: new Date() } : {}),
        ...(status === 'compensated' ? { compensatedAt: new Date() } : {}),
      })
      .where(eq(saga.id, sagaId))
      .execute();
  }

  private async addAuditEntry(
    sagaId: string,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    const [sagaRecord] = await db
      .select()
      .from(saga)
      .where(eq(saga.id, sagaId))
      .limit(1);

    if (sagaRecord) {
      const trail = sagaRecord.auditTrail ? JSON.parse(sagaRecord.auditTrail) : [];
      trail.push({
        timestamp: new Date().toISOString(),
        action,
        details,
        performedBy: 'saga_orchestrator',
      });

      await db.update(saga)
        .set({ auditTrail: JSON.stringify(trail) })
        .where(eq(saga.id, sagaId))
        .execute();
    }
  }

  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      this.timeoutPromise(timeout),
    ]);
  }
}

export default SagaOrchestrator;
