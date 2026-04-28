import { createLogger } from '../utils/logger.js';
import cron from 'node-cron';
import { insuranceServiceClient } from '../clients/InsuranceServiceClient.js';
import { eventBus, EventFactory } from '../../../shared/message-queue/src/events/EventBus.js';

const logger = createLogger();

/**
 * FR-10: Pre-Authorization Escalation Engine
 * 
 * Implements configurable escalation timers, role-based approval limits,
 * and automatic escalation for unactioned pre-authorization requests
 */
export class PreAuthEscalationService {
  private static instance: PreAuthEscalationService;
  private isRunning = false;
  private escalationJob: cron.ScheduledTask | null = null;

  // Configuration - can be overridden via scheme settings
  private config = {
    defaultEscalationMinutes: 20,
    escalationCheckInterval: '*/5 * * * *', // Every 5 minutes
    escalationLevels: [
      { role: 'UNDERWRITER', minAmount: 0, maxAmount: 50000 },
      { role: 'SENIOR_UNDERWRITER', minAmount: 50000, maxAmount: 500000 },
      { role: 'CLAIMS_MANAGER', minAmount: 500000, maxAmount: 5000000 },
      { role: 'MEDICAL_DIRECTOR', minAmount: 5000000, maxAmount: Infinity }
    ]
  };

  private constructor() {
    logger.info('PreAuthEscalationService initialized');
  }

  public static getInstance(): PreAuthEscalationService {
    if (!PreAuthEscalationService.instance) {
      PreAuthEscalationService.instance = new PreAuthEscalationService();
    }
    return PreAuthEscalationService.instance;
  }

  /**
   * Start background escalation monitor
   */
  public start(): void {
    if (this.isRunning) {
      logger.warn('PreAuthEscalationService already running');
      return;
    }

    this.escalationJob = cron.schedule(this.config.escalationCheckInterval, async () => {
      await this.processEscalations();
    });

    this.isRunning = true;
    logger.info('✅ Pre-Authorization Escalation service started');
  }

  /**
   * Stop escalation monitor
   */
  public stop(): void {
    if (this.escalationJob) {
      this.escalationJob.stop();
      this.escalationJob = null;
    }
    this.isRunning = false;
    logger.info('PreAuthEscalationService stopped');
  }

  /**
   * Process all pending pre-authorizations requiring escalation
   */
  private async processEscalations(): Promise<void> {
    const runId = Date.now();
    
    try {
      logger.debug('Running pre-authorization escalation check', { runId });

      const pendingRequests = await insuranceServiceClient.getPendingPreAuthorizations();
      
      let escalatedCount = 0;
      for (const request of pendingRequests) {
        if (await this.shouldEscalate(request)) {
          await this.escalateRequest(request);
          escalatedCount++;
        }
      }

      if (escalatedCount > 0) {
        logger.info('Escalation processing completed', { 
          runId, 
          checked: pendingRequests.length, 
          escalated: escalatedCount 
        });
      }

    } catch (error) {
      logger.error('Escalation processing failed', error as Error, { runId });
    }
  }

  /**
   * Determine if request should be escalated
   */
  private async shouldEscalate(request: any): Promise<boolean> {
    const now = new Date();
    const submittedAt = new Date(request.submittedAt);
    const elapsedMinutes = (now.getTime() - submittedAt.getTime()) / (1000 * 60);

    // Check if escalation timer expired
    const escalationTime = request.escalationMinutes || this.config.defaultEscalationMinutes;
    
    if (elapsedMinutes < escalationTime) {
      return false;
    }

    // Check if already at maximum escalation level
    if (request.currentEscalationLevel >= this.config.escalationLevels.length - 1) {
      return false;
    }

    return true;
  }

  /**
   * Escalate request to next approval level
   */
  private async escalateRequest(request: any): Promise<void> {
    const nextLevel = request.currentEscalationLevel + 1;
    const approverRole = this.config.escalationLevels[nextLevel].role;

    logger.info('Escalating pre-authorization request', {
      preAuthId: request.id,
      currentLevel: request.currentEscalationLevel,
      nextLevel,
      approverRole,
      amount: request.requestedAmount
    });

    // Update request status
    await insuranceServiceClient.updatePreAuthEscalationLevel(request.id, nextLevel);

    // Publish escalation event for notification routing
    await eventBus.publish(EventFactory.createEvent({
      type: 'preauth.escalated',
      aggregateId: request.id.toString(),
      aggregateType: 'PreAuthorization',
      data: {
        preAuthId: request.id,
        schemeId: request.schemeId,
        memberId: request.memberId,
        requestedAmount: request.requestedAmount,
        escalationLevel: nextLevel,
        approverRole,
        escalatedAt: new Date().toISOString()
      }
    }));

    // Create task for appropriate role
    await this.createEscalationTask(request, approverRole);
  }

  /**
   * Get appropriate approval role for request amount
   */
  public getApprovalRoleForAmount(amount: number): string {
    for (const level of this.config.escalationLevels) {
      if (amount >= level.minAmount && amount < level.maxAmount) {
        return level.role;
      }
    }
    return 'MEDICAL_DIRECTOR';
  }

  /**
   * Calculate remaining time before automatic escalation
   */
  public getEscalationTimeRemaining(request: any): number {
    const now = new Date();
    const submittedAt = new Date(request.submittedAt);
    const elapsedMinutes = (now.getTime() - submittedAt.getTime()) / (1000 * 60);
    const escalationTime = request.escalationMinutes || this.config.defaultEscalationMinutes;
    
    return Math.max(0, escalationTime - elapsedMinutes);
  }

  /**
   * Create task for role-based routing
   */
  private async createEscalationTask(request: any, approverRole: string): Promise<void> {
    await eventBus.publish(EventFactory.createEvent({
      type: 'task.created',
      aggregateId: `task_preauth_${request.id}`,
      aggregateType: 'Task',
      data: {
        type: 'PREAUTH_ESCALATION',
        assigneeRole: approverRole,
        referenceId: request.id,
        referenceType: 'PRE_AUTHORIZATION',
        priority: request.requestedAmount > 100000 ? 'HIGH' : 'MEDIUM',
        dueDate: new Date(Date.now() + (this.config.defaultEscalationMinutes * 60 * 1000)).toISOString(),
        metadata: {
          memberId: request.memberId,
          schemeId: request.schemeId,
          requestedAmount: request.requestedAmount,
          procedureCode: request.procedureCode
        }
      }
    }));
  }

  /**
   * Validate approval authority
   */
  public validateApprovalAuthority(userId: number, userRoles: string[], requestAmount: number): boolean {
    const requiredRole = this.getApprovalRoleForAmount(requestAmount);
    
    // Check if user has required role or higher
    const requiredIndex = this.config.escalationLevels.findIndex(l => l.role === requiredRole);
    
    for (const userRole of userRoles) {
      const userIndex = this.config.escalationLevels.findIndex(l => l.role === userRole);
      if (userIndex >= requiredIndex) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get escalation configuration
   */
  public getEscalationConfig() {
    return { ...this.config };
  }
}

export default PreAuthEscalationService.getInstance();