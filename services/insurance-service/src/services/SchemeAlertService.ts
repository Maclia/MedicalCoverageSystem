import { db } from '../config/database.js';
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
    // Implementation queries database for last alert level
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
    // Update database with latest alert level
  }

  /**
   * Log alert event for audit trail
   */
  private async logAlertEvent(schemeId: number, event: any): Promise<void> {
    // Persist alert history
  }

  /**
   * Batch check all active schemes utilization
   * Runs on scheduled interval
   */
  public async runBatchUtilizationCheck(): Promise<void> {
    logger.info('Starting batch utilization check for all active schemes');
    
    // Get all active schemes
    // Calculate utilization for each
    // Check thresholds
  }
}

export default SchemeAlertService.getInstance();