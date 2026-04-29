import { db, schema } from '../config/database.js';
import { eq } from 'drizzle-orm';
import { createLogger } from '../utils/logger.js';
import { eventBus, EventFactory } from '../../../shared/message-queue/src/events/EventBus.js';

const logger = createLogger();

/**
 * FR-15: Utilization Alerts & Thresholds Service
 * Monitors scheme fund utilization and triggers alerts at configured thresholds
 */
export class SchemeAlertService {
  private static instance: SchemeAlertService;
  private readonly THRESHOLD_LEVELS = [
    { level: 70, severity: 'info', name: 'WARNING' },
    { level: 85, severity: 'warning', name: 'ALERT' },
    { level: 95, severity: 'critical', name: 'CRITICAL' },
    { level: 100, severity: 'blocker', name: 'EXHAUSTED' }
  ];

  public static getInstance(): SchemeAlertService {
    if (!SchemeAlertService.instance) {
      SchemeAlertService.instance = new SchemeAlertService();
    }
    return SchemeAlertService.instance;
  }

  /**
   * Check utilization thresholds for a scheme
   * Triggers appropriate alerts when thresholds are crossed
   */
  public async checkUtilizationThresholds(schemeId: number, currentUtilization: number): Promise<void> {
    try {
      logger.info(`Checking utilization thresholds for scheme: ${schemeId} at ${currentUtilization}%`);

      // Get previous alert state
      const scheme = await this.getSchemeAlertState(schemeId);
      
      for (const threshold of this.THRESHOLD_LEVELS) {
        const hasCrossedThreshold = currentUtilization >= threshold.level && 
                                 (scheme.lastAlertedLevel < threshold.level);

        if (hasCrossedThreshold) {
          await this.triggerUtilizationAlert(schemeId, threshold, currentUtilization);
          await this.updateAlertState(schemeId, threshold.level);
          logger.info(`✅ ${threshold.name} alert triggered for scheme: ${schemeId} at ${currentUtilization}%`);
        }
      }

    } catch (error) {
      logger.error(`Failed to check utilization thresholds for scheme: ${schemeId}`, error as Error);
      throw error;
    }
  }

  /**
   * Trigger utilization alert event
   */
  private async triggerUtilizationAlert(schemeId: number, threshold: any, utilization: number): Promise<void> {
    const alertEvent = {
      schemeId,
      threshold: threshold.level,
      severity: threshold.severity,
      utilizationPercentage: utilization,
      timestamp: new Date(),
      type: 'UTILIZATION_THRESHOLD_CROSSED',
      metadata: {
        alertName: threshold.name,
        autoEscalate: threshold.level >= 85
      }
    };

    // Publish to event bus for multi-service handling
    await eventBus.publish(EventFactory.createEvent({
      type: 'scheme.utilization.threshold',
      aggregateId: schemeId.toString(),
      aggregateType: 'scheme',
      data: alertEvent
    }));

    // Create internal audit log
    await this.logAlertEvent(schemeId, alertEvent);
  }

  /**
   * Get current alert state for scheme
   */
  private async getSchemeAlertState(schemeId: number): Promise<any> {
    // Temporary implementation - will be completed after schema migration
    return {
      schemeId,
      lastAlertedLevel: 0,
      lastAlertedAt: null
    };
  }

  /**
   * Update alert state after triggering
   */
  private async updateAlertState(schemeId: number, level: number): Promise<void> {
    // Temporary implementation - will be completed after schema migration
    logger.info(`Updated alert state for scheme ${schemeId} to level ${level}`);
  }

  /**
   * Log alert event for audit trail
   */
  private async logAlertEvent(schemeId: number, event: any): Promise<void> {
    // Temporary implementation - will be completed after schema migration
    logger.info(`Logged alert event for scheme ${schemeId}`, event);
  }

  /**
   * Batch check all active schemes utilization
   * Runs on scheduled interval
   */
  public async runBatchUtilizationCheck(): Promise<void> {
    logger.info('Starting batch utilization check for all active schemes');
    
    const schemes = await db.select({
      id: schema.insuranceSchemes.id,
      totalPremiumAllocated: schema.insuranceSchemes.totalPremiumAllocated,
      totalPremiumUtilized: schema.insuranceSchemes.totalPremiumUtilized
    })
    .from(schema.insuranceSchemes)
    .where(eq(schema.insuranceSchemes.isActive, true));

    for (const scheme of schemes) {
      if (scheme.totalPremiumAllocated && scheme.totalPremiumUtilized) {
        const utilizationPercentage = (Number(scheme.totalPremiumUtilized) / Number(scheme.totalPremiumAllocated)) * 100;
        await this.checkUtilizationThresholds(scheme.id, utilizationPercentage);
      }
    }

    logger.info(`Completed batch utilization check for ${schemes.length} schemes`);
  }
}

export default SchemeAlertService.getInstance();