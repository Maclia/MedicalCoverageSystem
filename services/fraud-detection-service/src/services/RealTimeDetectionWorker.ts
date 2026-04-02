import Queue from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { fraudDetectionEngine, ClaimForDetection, DetectionResult } from './FraudDetectionEngine.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

export interface FraudDetectionJob {
  jobId: string;
  claimId: number;
  claim: ClaimForDetection;
  priority: 'low' | 'normal' | 'high' | 'critical';
  retries: number;
  createdAt: string;
}

export class RealTimeDetectionWorker {
  private detectionQueue: Queue.Queue<FraudDetectionJob>;
  private resultCallbacks: Map<string, (result: DetectionResult) => void> = new Map();

  constructor(redisUrl: string = config.redis.url) {
    this.detectionQueue = new Queue('fraud-detection', redisUrl, {
      defaultJobOptions: {
        attempts: config.fraudDetection.realtimeDetection.retryAttempts,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      },
    });

    this.setupQueueHandlers();
  }

  /**
   * Submit a claim for real-time fraud detection
   */
  async submitForDetection(
    claimId: number,
    claim: ClaimForDetection,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal',
    onResult?: (result: DetectionResult) => void
  ): Promise<string> {
    try {
      const jobId = uuidv4();

      const job: FraudDetectionJob = {
        jobId,
        claimId,
        claim,
        priority,
        retries: 0,
        createdAt: new Date().toISOString(),
      };

      // Determine queue options based on priority
      const jobOptions: Queue.JobOptions = {
        priority: this.getPriorityValue(priority),
        timeout: config.fraudDetection.realtimeDetection.asyncJobTimeout,
      };

      // Add to queue
      const queueJob = await this.detectionQueue.add(job, jobOptions);

      logger.info(`Submitted claim ${claimId} for real-time fraud detection`, {
        jobId,
        claimId,
        priority,
      });

      // Register callback if provided
      if (onResult) {
        this.resultCallbacks.set(jobId, onResult);
      }

      return jobId;
    } catch (error) {
      logger.error(`Error submitting claim for detection`, {
        claimId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Setup queue event handlers
   */
  private setupQueueHandlers(): void {
    // Processing
    this.detectionQueue.process(async (job: Queue.Job<FraudDetectionJob>) => {
      logger.info(`Processing fraud detection job ${job.data.jobId}`, {
        claimId: job.data.claimId,
      });

      try {
        // Run fraud detection
        const result = await fraudDetectionEngine.detectFraud(job.data.claim);

        // Call registered callback if exists
        const callback = this.resultCallbacks.get(job.data.jobId);
        if (callback) {
          callback(result);
          this.resultCallbacks.delete(job.data.jobId);
        }

        // Return result for queue tracking
        return result;
      } catch (error) {
        logger.error(`Error processing fraud detection job ${job.data.jobId}`, {
          claimId: job.data.claimId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Retrying is handled by queue, but log it
        job.data.retries++;

        throw error;
      }
    });

    // Job completed
    this.detectionQueue.on('completed', (job: Queue.Job<FraudDetectionJob>) => {
      logger.info(`Fraud detection job completed`, {
        jobId: job.data.jobId,
        claimId: job.data.claimId,
        processedTime: job.finishedOn ? job.finishedOn - job.timestamp : 0,
      });
    });

    // Job failed
    this.detectionQueue.on('failed', (job: Queue.Job<FraudDetectionJob>, err: Error) => {
      logger.error(`Fraud detection job failed`, {
        jobId: job.data.jobId,
        claimId: job.data.claimId,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        error: err.message,
      });

      // Send failure notification
      this.notifyDetectionFailure(job.data.claimId, err);
    });

    // Queue errors
    this.detectionQueue.on('error', (err: Error) => {
      logger.error(`Fraud detection queue error`, {
        error: err.message,
      });
    });
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    status: string;
    progress: number;
    result?: DetectionResult;
  }> {
    try {
      const job = await this.detectionQueue.getJob(jobId);

      if (!job) {
        return {
          status: 'not_found',
          progress: 0,
        };
      }

      if (await job.isCompleted()) {
        return {
          status: 'completed',
          progress: 100,
          result: job.returnvalue as DetectionResult,
        };
      }

      if (await job.isFailed()) {
        return {
          status: 'failed',
          progress: (job.attemptsMade / (job.opts.attempts || 1)) * 100,
        };
      }

      return {
        status: 'processing',
        progress: job.progress() || 0,
      };
    } catch (error) {
      logger.error(`Error getting job status for ${jobId}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Wait for detection result (blocking)
   */
  async waitForDetectionResult(jobId: string, timeoutMs: number = 30000): Promise<DetectionResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getJobStatus(jobId);

      if (status.status === 'completed' && status.result) {
        return status.result;
      }

      if (status.status === 'failed') {
        throw new Error(`Fraud detection job ${jobId} failed`);
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Fraud detection job ${jobId} timeout after ${timeoutMs}ms`);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    name: string;
    count: number;
    activeCount: number;
    delayedCount: number;
    failedCount: number;
    completedCount: number;
  }> {
    const counts = await this.detectionQueue.getJobCounts();

    return {
      name: 'fraud-detection',
      count: counts.wait + counts.active + counts.delayed,
      activeCount: counts.active,
      delayedCount: counts.delayed,
      failedCount: counts.failed,
      completedCount: counts.completed,
    };
  }

  /**
   * Convert priority to queue priority value
   */
  private getPriorityValue(priority: string): number {
    const priorityMap: Record<string, number> = {
      low: 5,
      normal: 3,
      high: 2,
      critical: 1,
    };
    return priorityMap[priority] || 3;
  }

  /**
   * Notify detection failure
   */
  private async notifyDetectionFailure(claimId: number, error: Error): Promise<void> {
    // TODO: Send notification to API Gateway/claims service
    logger.warn(`Detection failure notification for claim ${claimId}`, {
      error: error.message,
    });
  }

  /**
   * Clean up resources
   */
  async close(): Promise<void> {
    await this.detectionQueue.close();
    logger.info('Real-time detection worker closed');
  }
}

// Export singleton instance
export const realtimeDetectionWorker = new RealTimeDetectionWorker();
