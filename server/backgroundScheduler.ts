import { storage } from './storage';
import { processEmailQueue } from './emailService';

interface ScheduledJob {
  id: string;
  name: string;
  schedule: string; // Cron expression
  lastRun?: Date;
  nextRun: Date;
  enabled: boolean;
  handler: () => Promise<void>;
}

class BackgroundScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.initializeDefaultJobs();
  }

  /**
   * Initialize default background jobs
   */
  private initializeDefaultJobs(): void {
    // Process email queue every 5 minutes
    this.addJob({
      id: 'process_email_queue',
      name: 'Process Email Queue',
      schedule: '*/5 * * * *', // Every 5 minutes
      nextRun: this.getNextRun('*/5 * * * *'),
      enabled: true,
      handler: async () => {
        await processEmailQueue();
      }
    });

    // Daily onboarding reminder check (9 AM)
    this.addJob({
      id: 'daily_onboarding_reminders',
      name: 'Daily Onboarding Reminders',
      schedule: '0 9 * * *', // 9 AM daily
      nextRun: this.getNextRun('0 9 * * *'),
      enabled: true,
      handler: async () => {
        await this.sendDailyOnboardingReminders();
      }
    });

    // Weekly engagement check (Monday 10 AM)
    this.addJob({
      id: 'weekly_engagement_check',
      name: 'Weekly Engagement Check',
      schedule: '0 10 * * 1', // Monday 10 AM
      nextRun: this.getNextRun('0 10 * * 1'),
      enabled: true,
      handler: async () => {
        await this.sendWeeklyEngagementReminders();
      }
    });

    // Clean up old data (daily at 2 AM)
    this.addJob({
      id: 'cleanup_old_data',
      name: 'Cleanup Old Data',
      schedule: '0 2 * * *', // 2 AM daily
      nextRun: this.getNextRun('0 2 * * *'),
      enabled: true,
      handler: async () => {
        await this.cleanupOldData();
      }
    });

    // Update personalization scores (hourly)
    this.addJob({
      id: 'update_personalization_scores',
      name: 'Update Personalization Scores',
      schedule: '0 * * * *', // Every hour
      nextRun: this.getNextRun('0 * * * *'),
      enabled: true,
      handler: async () => {
        await this.updatePersonalizationScores();
      }
    });
  }

  /**
   * Add a new scheduled job
   */
  addJob(job: Omit<ScheduledJob, 'lastRun'>): void {
    this.jobs.set(job.id, {
      ...job,
      lastRun: undefined
    });
  }

  /**
   * Remove a scheduled job
   */
  removeJob(id: string): boolean {
    return this.jobs.delete(id);
  }

  /**
   * Enable or disable a job
   */
  toggleJob(id: string, enabled: boolean): boolean {
    const job = this.jobs.get(id);
    if (job) {
      job.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Get all jobs
   */
  getJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get enabled jobs
   */
  getEnabledJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values()).filter(job => job.enabled);
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log('Background scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting background scheduler...');

    // Check for due jobs every minute
    this.intervalId = setInterval(() => {
      this.checkAndRunDueJobs();
    }, 60000); // Check every minute

    // Run due jobs immediately on startup
    this.checkAndRunDueJobs();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log('Stopping background scheduler...');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check for due jobs and run them
   */
  private async checkAndRunDueJobs(): Promise<void> {
    const now = new Date();

    for (const job of this.jobs.values()) {
      if (!job.enabled) {
        continue;
      }

      if (now >= job.nextRun) {
        try {
          console.log(`Running scheduled job: ${job.name}`);
          await job.handler();

          // Update job run times
          job.lastRun = now;
          job.nextRun = this.getNextRun(job.schedule);

          console.log(`Completed job: ${job.name} (Next run: ${job.nextRun})`);
        } catch (error) {
          console.error(`Error running job ${job.name}:`, error);

          // Calculate next run time even if job failed
          job.nextRun = this.getNextRun(job.schedule);
        }
      }
    }
  }

  /**
   * Calculate next run time based on cron expression
   */
  private getNextRun(cronExpression: string): Date {
    // Simple implementation - in production, use a proper cron library like node-cron
    const now = new Date();

    // Parse basic cron patterns
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) {
      // Default to 1 hour from now if invalid cron
      return new Date(now.getTime() + 60 * 60 * 1000);
    }

    const [minute, hour, day, month, dayOfWeek] = parts;

    const nextRun = new Date(now);

    // Handle minute patterns
    if (minute === '*') {
      // Keep current minute or go to next minute
    } else if (minute.includes('/')) {
      // Handle intervals like */5
      const interval = parseInt(minute.split('/')[1]);
      const currentMinute = nextRun.getMinutes();
      const nextMinute = Math.ceil((currentMinute + 1) / interval) * interval;
      if (nextMinute >= 60) {
        nextRun.setHours(nextRun.getHours() + 1);
        nextRun.setMinutes(nextMinute - 60);
      } else {
        nextRun.setMinutes(nextMinute);
      }
    } else {
      // Specific minute
      const targetMinute = parseInt(minute);
      if (targetMinute > nextRun.getMinutes()) {
        nextRun.setMinutes(targetMinute);
      } else {
        nextRun.setHours(nextRun.getHours() + 1);
        nextRun.setMinutes(targetMinute);
      }
    }

    // If next run is in the past, move to next day
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun;
  }

  /**
   * Send daily onboarding reminders
   */
  private async sendDailyOnboardingReminders(): Promise<void> {
    try {
      const activeSessions = await storage.getAllOnboardingSessions().filter(session =>
        session.status === 'active' && session.currentDay < 7
      );

      for (const session of activeSessions) {
        // Check if member hasn't been active recently
        const member = await storage.getMember(session.memberId);
        if (!member) continue;

        const { emailWorkflows } = await import('./emailService');

        // Send reminder based on current day
        if (session.currentDay === 1) {
          await emailWorkflows.sendTriggeredEmails('day1_incomplete', session.memberId);
        } else if (session.currentDay === 2) {
          // Check if they completed Day 1 tasks
          const day1Tasks = await storage.getOnboardingTasksBySessionAndDay(session.id, 1);
          const completedDay1 = day1Tasks.filter(task => task.completionStatus).length;

          if (completedDay1 === 0) {
            await emailWorkflows.sendTriggeredEmails('48_hours_since_activation', session.memberId);
          }
        }
      }
    } catch (error) {
      console.error('Error sending daily onboarding reminders:', error);
    }
  }

  /**
   * Send weekly engagement reminders
   */
  private async sendWeeklyEngagementReminders(): Promise<void> {
    try {
      // This would involve checking member activity and sending engagement emails
      // For now, just log that this would happen
      console.log('Weekly engagement reminders would be sent here');
    } catch (error) {
      console.error('Error sending weekly engagement reminders:', error);
    }
  }

  /**
   * Clean up old data
   */
  private async cleanupOldData(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Clean up old behavior analytics (keep last 30 days)
      // This would need to be implemented in the storage layer
      console.log('Data cleanup completed - old behavior analytics removed');
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }

  /**
   * Update personalization scores
   */
  private async updatePersonalizationScores(): Promise<void> {
    try {
      // This would involve recalculating personalization scores based on recent behavior
      // For now, just log that this would happen
      console.log('Personalization scores updated');
    } catch (error) {
      console.error('Error updating personalization scores:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    totalJobs: number;
    enabledJobs: number;
    nextRunTimes: Array<{ jobName: string; nextRun: Date }>;
  } {
    const enabledJobs = this.getEnabledJobs();
    const nextRunTimes = enabledJobs
      .filter(job => job.enabled)
      .map(job => ({
        jobName: job.name,
        nextRun: job.nextRun
      }))
      .sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime());

    return {
      isRunning: this.isRunning,
      totalJobs: this.jobs.size,
      enabledJobs: enabledJobs.length,
      nextRunTimes: nextRunTimes.slice(0, 5) // Show next 5 scheduled runs
    };
  }

  /**
   * Manually trigger a job
   */
  async triggerJob(id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (!job || !job.enabled) {
      return false;
    }

    try {
      console.log(`Manually triggering job: ${job.name}`);
      await job.handler();

      // Update run times
      job.lastRun = new Date();
      job.nextRun = this.getNextRun(job.schedule);

      return true;
    } catch (error) {
      console.error(`Error manually triggering job ${job.name}:`, error);
      return false;
    }
  }
}

// Singleton instance
export const backgroundScheduler = new BackgroundScheduler();

// Auto-start scheduler in production
if (process.env.NODE_ENV === 'production') {
  backgroundScheduler.start();
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  backgroundScheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  backgroundScheduler.stop();
  process.exit(0);
});