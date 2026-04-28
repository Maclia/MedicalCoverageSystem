import cron from 'node-cron';
import { db } from '../config/database.js';
import { insuranceSchemes } from '../models/schema.js';
import { and, gte, lt, eq } from 'drizzle-orm';
import { createLogger } from '../utils/logger.js';
import { eventBus, EventFactory } from '../../../shared/message-queue/src/events/EventBus.js';

const logger = createLogger();

/**
 * BR-03: Renewal Trigger Job
 * Automated workflow initiates 60 days before expiry; routed to Relationship Manager
 * BR-04: Renewal Notifications sent to Scheme Admin & Provider Admin simultaneously
 * 
 * Runs daily at 01:00 AM
 */
export class RenewalTriggerJob {
  private static instance: RenewalTriggerJob;
  private isRunning = false;

  public static getInstance(): RenewalTriggerJob {
    if (!RenewalTriggerJob.instance) {
      RenewalTriggerJob.instance = new RenewalTriggerJob();
    }
    return RenewalTriggerJob.instance;
  }

  public start(): void {
    // Run daily at 01:00 AM
    cron.schedule('0 1 * * *', async () => {
      await this.execute();
    });

    logger.info('✅ RenewalTriggerJob scheduled daily at 01:00 AM');
  }

  private async execute(): Promise<void> {
    if (this.isRunning) {
      logger.info('RenewalTriggerJob already running, skipping execution');
      return;
    }

    try {
      this.isRunning = true;
      logger.info('🔄 Starting Renewal Trigger Job execution');

      // Calculate date 60 days from now
      const today = new Date();
      const triggerDate = new Date();
      triggerDate.setDate(today.getDate() + 60);
      
      // Reset time to start of day for inclusive match
      triggerDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(triggerDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Find active schemes expiring exactly 60 days from now
      const expiringSchemes = await db
        .select()
        .from(insuranceSchemes)
        .where(
          and(
            eq(insuranceSchemes.status, 'active'),
            gte(insuranceSchemes.endDate, triggerDate),
            lt(insuranceSchemes.endDate, nextDay)
          )
        );

      logger.info(`Found ${expiringSchemes.length} schemes expiring in 60 days`);

      for (const scheme of expiringSchemes) {
        await this.processSchemeRenewal(scheme);
      }

      logger.info(`✅ Renewal Trigger Job completed successfully`);

    } catch (error) {
      logger.error('❌ Renewal Trigger Job failed', error as Error);
    } finally {
      this.isRunning = false;
    }
  }

  private async processSchemeRenewal(scheme: any): Promise<void> {
    try {
      logger.info(`Processing renewal for scheme: ${scheme.id} - ${scheme.name}`);

      // Mark scheme as renewal triggered
      await db
        .update(insuranceSchemes)
        .set({
          renewalTriggered: true,
          renewalInitiatedAt: new Date(),
          renewalStatus: 'pending'
        })
        .where(eq(insuranceSchemes.id, scheme.id));

      // BR-03: Route to Relationship Manager
      await this.routeRenewalToRelationshipManager(scheme);

      // BR-04: Send notifications to Scheme Admin & Provider Admin
      await this.sendRenewalNotifications(scheme);

      logger.info(`✅ Renewal initiated for scheme: ${scheme.id}`);

    } catch (error) {
      logger.error(`Failed to process renewal for scheme: ${scheme.id}`, error as Error);
    }
  }

  private async routeRenewalToRelationshipManager(scheme: any): Promise<void> {
    logger.info(`Routing renewal task to Relationship Manager for scheme: ${scheme.id}`);
    
    try {
      // Create renewal task in CRM service
      const taskData = {
        type: 'SCHEME_RENEWAL',
        referenceId: scheme.id,
        referenceType: 'scheme',
        title: `Renew Scheme: ${scheme.name}`,
        description: `Scheme ${scheme.name} is expiring on ${scheme.endDate}. Initiate renewal process.`,
        assigneeId: scheme.schemeAdministratorId,
        priority: 'high',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days due
        escalationDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days escalation
        status: 'pending',
        metadata: {
          schemeId: scheme.id,
          schemeName: scheme.name,
          expiryDate: scheme.endDate,
          companyId: scheme.companyId
        }
      };

      // Publish event to event bus for CRM service consumption
      await eventBus.publish(EventFactory.createEvent({
        type: 'scheme.renewal.initiated',
        aggregateId: scheme.id.toString(),
        aggregateType: 'scheme',
        data: taskData
      }));
      
      logger.info(`✅ Renewal task created for scheme: ${scheme.id}`);
      
    } catch (error) {
      logger.error(`Failed to route renewal for scheme: ${scheme.id}`, error as Error);
      throw error;
    }
  }

  private async sendRenewalNotifications(scheme: any): Promise<void> {
    logger.info(`Sending renewal notifications for scheme: ${scheme.id}`);
    
    try {
      // BR-04: Send notifications simultaneously to both administrators
      const notifications = [
        // Scheme Administrator notification
        {
          recipientId: scheme.schemeAdministratorId,
          type: 'SCHEME_RENEWAL_ALERT',
          template: 'scheme-renewal-admin',
          subject: `Scheme Renewal Required: ${scheme.name}`,
          metadata: { scheme, userType: 'administrator' }
        },
        // Provider Administrator notification
        {
          recipientId: scheme.providerAdministratorId,
          type: 'SCHEME_RENEWAL_ALERT',
          template: 'scheme-renewal-provider',
          subject: `Scheme Expiring Soon: ${scheme.name}`,
          metadata: { scheme, userType: 'provider' }
        }
      ];

      // Publish all notifications as batch event
      await eventBus.publishBatch(
        notifications.map(n => EventFactory.createEvent({
          type: 'notification.send',
          aggregateId: n.recipientId.toString(),
          aggregateType: 'notification',
          data: n
        }))
      );

      logger.info(`✅ Renewal notifications sent for scheme: ${scheme.id}`);
      
    } catch (error) {
      logger.error(`Failed to send renewal notifications for scheme: ${scheme.id}`, error as Error);
      throw error;
    }
  }
}

export default RenewalTriggerJob.getInstance();
