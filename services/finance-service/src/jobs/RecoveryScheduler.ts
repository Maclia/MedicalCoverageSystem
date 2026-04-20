import { ErrorRecoveryService } from '../services/ErrorRecoveryService';

/**
 * Recovery Scheduler
 * Processes payment recovery retries on a scheduled interval
 */
export class RecoveryScheduler {
  private recoveryService = new ErrorRecoveryService();
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the recovery scheduler
   * Processes retries every 5 minutes
   */
  start(): void {
    if (this.isRunning) {
      console.log('[RECOVERY SCHEDULER] Already running');
      return;
    }

    console.log('[RECOVERY SCHEDULER] Starting error recovery scheduler');
    this.isRunning = true;

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
      this.isRunning = false;
      console.log('[RECOVERY SCHEDULER] Recovery scheduler stopped');
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; lastRun?: Date } {
    return {
      isRunning: this.isRunning,
    };
  }
}
