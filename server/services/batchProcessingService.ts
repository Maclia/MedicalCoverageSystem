import { storage } from '../storage';
import { claimsProcessingWorkflow } from './claimsProcessingWorkflow';
import { Claim } from '@shared/schema';

export interface BatchJob {
  batchId: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  createdBy: string;
  configuration: BatchConfiguration;
  claims: BatchClaimItem[];
  progress: BatchProgress;
  results: BatchResults;
  errors: BatchError[];
  metadata: Record<string, any>;
}

export interface BatchConfiguration {
  processingMode: 'sequential' | 'parallel' | 'smart_parallel';
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number; // milliseconds
  timeoutPerClaim: number; // milliseconds
  failureThreshold: number; // percentage of failures before stopping
  enableAutoRetry: boolean;
  enableProgressNotifications: boolean;
  skipFailedClaims: boolean;
  groupByPriority: boolean;
  optimizeForSpeed: boolean;
  validateBeforeProcessing: boolean;
}

export interface BatchClaimItem {
  claimId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped' | 'retrying';
  result?: any;
  error?: string;
  attempts: number;
  processingTime?: number;
  workflowId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedProcessingTime?: number;
  metadata?: Record<string, any>;
}

export interface BatchProgress {
  totalClaims: number;
  completedClaims: number;
  failedClaims: number;
  skippedClaims: number;
  processingClaims: number;
  pendingClaims: number;
  progressPercentage: number;
  estimatedTimeRemaining?: number;
  currentProcessingRate?: number; // claims per minute
  averageProcessingTime?: number; // milliseconds per claim
}

export interface BatchResults {
  totalProcessed: number;
  successfulProcessed: number;
  failedProcessed: number;
  skippedProcessed: number;
  totalAmount: number;
  approvedAmount: number;
  deniedAmount: number;
  memberResponsibility: number;
  insurerResponsibility: number;
  processingTime: number;
  averageProcessingTime: number;
  successRate: number;
  workflowResults: any[];
}

export interface BatchError {
  claimId: number;
  errorType: 'validation' | 'eligibility' | 'processing' | 'system' | 'timeout';
  errorMessage: string;
  errorDetails?: any;
  timestamp: Date;
  attempt: number;
  retryable: boolean;
}

export interface BatchJobTemplate {
  name: string;
  description: string;
  configuration: BatchConfiguration;
  filters: BatchFilters;
  schedule?: BatchSchedule;
}

export interface BatchFilters {
  claimStatuses?: string[];
  claimAmountRange?: { min: number; max: number };
  dateRange?: { startDate: Date; endDate: Date };
  memberIds?: number[];
  institutionIds?: number[];
  benefitCategories?: string[];
  priorityLevels?: string[];
  fraudRiskLevels?: string[];
}

export interface BatchSchedule {
  type: 'immediate' | 'scheduled' | 'recurring';
  runAt?: Date;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    timeOfDay: string; // HH:MM
  };
}

export class BatchProcessingService {
  private activeBatches: Map<string, BatchJob> = new Map();
  private batchQueue: BatchJob[] = [];
  private processingTimer: NodeJS.Timeout | null = null;
  private maxConcurrentBatches = 3;
  private defaultConfiguration: BatchConfiguration;

  constructor() {
    this.defaultConfiguration = this.getDefaultConfiguration();
    this.startBatchProcessor();
  }

  // Create a new batch job
  async createBatchJob(
    name: string,
    description: string,
    claimIds: number[],
    configuration: Partial<BatchConfiguration> = {},
    metadata: Record<string, any> = {},
    createdBy: string = 'system'
  ): Promise<BatchJob> {
    const batchId = this.generateBatchId();

    // Validate claim IDs
    const validClaims = await this.validateClaimIds(claimIds);
    const batchClaims: BatchClaimItem[] = validClaims.map(claimId => ({
      claimId,
      status: 'pending',
      attempts: 0,
      priority: 'medium' // Will be updated based on claim data
    }));

    // Set claim priorities based on claim data
    await this.setClaimPriorities(batchClaims);

    const batchJob: BatchJob = {
      batchId,
      name,
      description,
      status: 'pending',
      priority: this.calculateBatchPriority(batchClaims),
      createdAt: new Date(),
      createdBy,
      configuration: { ...this.defaultConfiguration, ...configuration },
      claims: batchClaims,
      progress: {
        totalClaims: batchClaims.length,
        completedClaims: 0,
        failedClaims: 0,
        skippedClaims: 0,
        processingClaims: 0,
        pendingClaims: batchClaims.length,
        progressPercentage: 0
      },
      results: {
        totalProcessed: 0,
        successfulProcessed: 0,
        failedProcessed: 0,
        skippedProcessed: 0,
        totalAmount: 0,
        approvedAmount: 0,
        deniedAmount: 0,
        memberResponsibility: 0,
        insurerResponsibility: 0,
        processingTime: 0,
        averageProcessingTime: 0,
        successRate: 0,
        workflowResults: []
      },
      errors: [],
      metadata
    };

    // Estimate duration
    batchJob.estimatedDuration = this.estimateBatchDuration(batchJob);

    // Store batch job
    this.activeBatches.set(batchId, batchJob);
    this.batchQueue.push(batchJob);

    return batchJob;
  }

  // Create batch job from filters
  async createBatchJobFromFilters(
    name: string,
    description: string,
    filters: BatchFilters,
    configuration: Partial<BatchConfiguration> = {},
    metadata: Record<string, any> = {},
    createdBy: string = 'system'
  ): Promise<BatchJob> {
    // Get claims matching filters
    const matchingClaims = await this.getClaimsByFilters(filters);
    const claimIds = matchingClaims.map(claim => claim.id);

    return this.createBatchJob(name, description, claimIds, configuration, { ...metadata, filters }, createdBy);
  }

  // Start processing a batch job
  async startBatchJob(batchId: string): Promise<boolean> {
    const batchJob = this.activeBatches.get(batchId);
    if (!batchJob) {
      throw new Error(`Batch job ${batchId} not found`);
    }

    if (batchJob.status !== 'pending' && batchJob.status !== 'paused') {
      throw new Error(`Batch job ${batchId} is not in a startable state`);
    }

    batchJob.status = 'running';
    batchJob.startedAt = new Date();

    // Start processing in background
    this.processBatchJob(batchJob);

    return true;
  }

  // Process a batch job
  private async processBatchJob(batchJob: BatchJob): Promise<void> {
    try {
      const { configuration, claims } = batchJob;

      // Sort claims by priority if enabled
      if (configuration.groupByPriority) {
        claims.sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));
      }

      // Process based on configuration
      if (configuration.processingMode === 'sequential') {
        await this.processSequential(batchJob);
      } else if (configuration.processingMode === 'parallel') {
        await this.processParallel(batchJob);
      } else {
        await this.processSmartParallel(batchJob);
      }

      // Complete batch job
      batchJob.status = 'completed';
      batchJob.completedAt = new Date();
      batchJob.actualDuration = batchJob.completedAt.getTime() - (batchJob.startedAt?.getTime() || batchJob.createdAt.getTime());

      // Calculate final results
      await this.calculateBatchResults(batchJob);

    } catch (error) {
      batchJob.status = 'failed';
      batchJob.completedAt = new Date();
      batchJob.actualDuration = batchJob.completedAt.getTime() - (batchJob.startedAt?.getTime() || batchJob.createdAt.getTime());
      batchJob.errors.push({
        claimId: 0,
        errorType: 'system',
        errorMessage: error instanceof Error ? error.message : 'Unknown batch processing error',
        timestamp: new Date(),
        attempt: 1,
        retryable: false
      });
    }
  }

  // Sequential processing
  private async processSequential(batchJob: BatchJob): Promise<void> {
    const { configuration, claims } = batchJob;

    for (const claimItem of claims) {
      if (batchJob.status === 'cancelled' || batchJob.status === 'paused') {
        break;
      }

      await this.processClaimItem(batchJob, claimItem);

      // Check failure threshold
      const failureRate = (batchJob.progress.failedClaims / batchJob.progress.totalClaims) * 100;
      if (failureRate > configuration.failureThreshold) {
        throw new Error(`Failure threshold exceeded: ${failureRate.toFixed(2)}%`);
      }
    }
  }

  // Parallel processing
  private async processParallel(batchJob: BatchJob): Promise<void> {
    const { configuration, claims } = batchJob;
    const maxConcurrency = Math.min(configuration.maxConcurrency, claims.length);
    const chunks = this.chunkArray(claims, maxConcurrency);

    for (const chunk of chunks) {
      if (batchJob.status === 'cancelled' || batchJob.status === 'paused') {
        break;
      }

      await Promise.all(chunk.map(claimItem => this.processClaimItem(batchJob, claimItem)));

      // Check failure threshold
      const failureRate = (batchJob.progress.failedClaims / batchJob.progress.totalClaims) * 100;
      if (failureRate > configuration.failureThreshold) {
        throw new Error(`Failure threshold exceeded: ${failureRate.toFixed(2)}%`);
      }
    }
  }

  // Smart parallel processing (adaptive based on claim complexity)
  private async processSmartParallel(batchJob: BatchJob): Promise<void> {
    const { configuration, claims } = batchJob;

    // Group claims by complexity and priority
    const highPriorityClaims = claims.filter(c => c.priority === 'urgent' || c.priority === 'high');
    const mediumPriorityClaims = claims.filter(c => c.priority === 'medium');
    const lowPriorityClaims = claims.filter(c => c.priority === 'low');

    // Process high priority claims first with limited concurrency
    if (highPriorityClaims.length > 0) {
      const concurrency = Math.min(2, configuration.maxConcurrency);
      const chunks = this.chunkArray(highPriorityClaims, concurrency);
      for (const chunk of chunks) {
        if (batchJob.status === 'cancelled' || batchJob.status === 'paused') break;
        await Promise.all(chunk.map(claimItem => this.processClaimItem(batchJob, claimItem)));
      }
    }

    // Process medium priority claims
    if (mediumPriorityClaims.length > 0) {
      const concurrency = Math.min(4, configuration.maxConcurrency);
      const chunks = this.chunkArray(mediumPriorityClaims, concurrency);
      for (const chunk of chunks) {
        if (batchJob.status === 'cancelled' || batchJob.status === 'paused') break;
        await Promise.all(chunk.map(claimItem => this.processClaimItem(batchJob, claimItem)));
      }
    }

    // Process low priority claims with maximum concurrency
    if (lowPriorityClaims.length > 0) {
      const chunks = this.chunkArray(lowPriorityClaims, configuration.maxConcurrency);
      for (const chunk of chunks) {
        if (batchJob.status === 'cancelled' || batchJob.status === 'paused') break;
        await Promise.all(chunk.map(claimItem => this.processClaimItem(batchJob, claimItem)));
      }
    }
  }

  // Process a single claim item
  private async processClaimItem(batchJob: BatchJob, claimItem: BatchClaimItem): Promise<void> {
    const startTime = Date.now();
    claimItem.status = 'processing';
    claimItem.attempts++;

    try {
      // Process claim through workflow
      const workflowResult = await claimsProcessingWorkflow.processClaim(claimItem.claimId, {
        workflowType: 'standard',
        priority: claimItem.priority,
        processingMode: 'automatic'
      });

      // Update claim item with result
      claimItem.result = workflowResult;
      claimItem.status = 'completed';
      claimItem.processingTime = Date.now() - startTime;

      // Update batch progress
      this.updateBatchProgress(batchJob);

    } catch (error) {
      claimItem.error = error instanceof Error ? error.message : 'Unknown error';
      claimItem.processingTime = Date.now() - startTime;

      // Handle retry logic
      if (batchJob.configuration.enableAutoRetry && claimItem.attempts < batchJob.configuration.retryAttempts) {
        claimItem.status = 'retrying';
        setTimeout(() => {
          this.processClaimItem(batchJob, claimItem);
        }, batchJob.configuration.retryDelay);
      } else {
        claimItem.status = 'failed';
        this.updateBatchProgress(batchJob);

        // Add to batch errors
        batchJob.errors.push({
          claimId: claimItem.claimId,
          errorType: 'processing',
          errorMessage: claimItem.error,
          timestamp: new Date(),
          attempt: claimItem.attempts,
          retryable: claimItem.attempts < batchJob.configuration.retryAttempts
        });
      }
    }
  }

  // Update batch progress
  private updateBatchProgress(batchJob: BatchJob): void {
    const { claims } = batchJob;
    const completed = claims.filter(c => c.status === 'completed').length;
    const failed = claims.filter(c => c.status === 'failed').length;
    const skipped = claims.filter(c => c.status === 'skipped').length;
    const processing = claims.filter(c => c.status === 'processing').length;
    const pending = claims.filter(c => c.status === 'pending').length;

    batchJob.progress = {
      totalClaims: claims.length,
      completedClaims: completed,
      failedClaims: failed,
      skippedClaims: skipped,
      processingClaims: processing,
      pendingClaims: pending,
      progressPercentage: (completed / claims.length) * 100
    };

    // Calculate processing rate and estimated time remaining
    const finishedClaims = completed + failed;
    if (finishedClaims > 0) {
      const avgTime = claims
        .filter(c => c.processingTime && c.status !== 'pending')
        .reduce((sum, c) => sum + (c.processingTime || 0), 0) / finishedClaims;

      batchJob.progress.averageProcessingTime = avgTime;

      const remainingClaims = batchJob.progress.totalClaims - finishedClaims;
      batchJob.progress.estimatedTimeRemaining = remainingClaims * avgTime;
      batchJob.progress.currentProcessingRate = 60000 / avgTime; // claims per minute
    }
  }

  // Calculate final batch results
  private async calculateBatchResults(batchJob: BatchJob): Promise<void> {
    const completedClaims = batchJob.claims.filter(c => c.status === 'completed' && c.result);
    const totalAmount = completedClaims.reduce((sum, c) => sum + (c.result?.approvedAmount || 0), 0);
    const approvedAmount = totalAmount;
    const memberResponsibility = completedClaims.reduce((sum, c) => sum + (c.result?.memberResponsibility || 0), 0);
    const insurerResponsibility = completedClaims.reduce((sum, c) => sum + (c.result?.insurerResponsibility || 0), 0);

    batchJob.results = {
      totalProcessed: completedClaims.length,
      successfulProcessed: batchJob.progress.completedClaims,
      failedProcessed: batchJob.progress.failedClaims,
      skippedProcessed: batchJob.progress.skippedClaims,
      totalAmount,
      approvedAmount,
      deniedAmount: 0, // Would be calculated from denied claims
      memberResponsibility,
      insurerResponsibility,
      processingTime: batchJob.actualDuration || 0,
      averageProcessingTime: batchJob.progress.averageProcessingTime || 0,
      successRate: (batchJob.progress.completedClaims / batchJob.progress.totalClaims) * 100,
      workflowResults: completedClaims.map(c => c.result)
    };
  }

  // Utility methods
  private async validateClaimIds(claimIds: number[]): Promise<number[]> {
    const validClaimIds: number[] = [];

    for (const claimId of claimIds) {
      try {
        const claim = await storage.getClaim(claimId);
        if (claim) {
          validClaimIds.push(claimId);
        }
      } catch (error) {
        console.warn(`Invalid claim ID: ${claimId}`, error);
      }
    }

    return validClaimIds;
  }

  private async setClaimPriorities(claims: BatchClaimItem[]): Promise<void> {
    for (const claimItem of claims) {
      try {
        const claim = await storage.getClaim(claimItem.claimId);
        if (claim) {
          // Determine priority based on claim characteristics
          if (claim.amount > 50000) {
            claimItem.priority = 'urgent';
          } else if (claim.amount > 25000) {
            claimItem.priority = 'high';
          } else if (claim.amount > 10000) {
            claimItem.priority = 'medium';
          } else {
            claimItem.priority = 'low';
          }

          // Override if claim has high fraud risk
          if (claim.fraudRiskLevel === 'high' || claim.fraudRiskLevel === 'confirmed') {
            claimItem.priority = 'urgent';
          }
        }
      } catch (error) {
        claimItem.priority = 'medium'; // Default priority
      }
    }
  }

  private calculateBatchPriority(claims: BatchClaimItem[]): BatchJob['priority'] {
    const urgentCount = claims.filter(c => c.priority === 'urgent').length;
    const highCount = claims.filter(c => c.priority === 'high').length;

    if (urgentCount > 0) return 'urgent';
    if (highCount > claims.length * 0.3) return 'high';
    if (highCount > 0) return 'medium';
    return 'low';
  }

  private estimateBatchDuration(batchJob: BatchJob): number {
    const { claims, configuration } = batchJob;
    const avgProcessingTime = 30000; // 30 seconds per claim (estimated)

    if (configuration.processingMode === 'sequential') {
      return claims.length * avgProcessingTime;
    } else {
      const concurrency = Math.min(configuration.maxConcurrency, claims.length);
      return (claims.length / concurrency) * avgProcessingTime;
    }
  }

  private getPriorityWeight(priority: BatchClaimItem['priority']): number {
    switch (priority) {
      case 'urgent': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async getClaimsByFilters(filters: BatchFilters): Promise<Claim[]> {
    // This is a simplified implementation
    // In a real system, you'd query the database with complex filters
    const allClaims = await storage.getClaims();

    return allClaims.filter(claim => {
      if (filters.claimStatuses && !filters.claimStatuses.includes(claim.status)) return false;
      if (filters.claimAmountRange) {
        if (claim.amount < filters.claimAmountRange.min || claim.amount > filters.claimAmountRange.max) return false;
      }
      if (filters.memberIds && !filters.memberIds.includes(claim.memberId)) return false;
      if (filters.institutionIds && !filters.institutionIds.includes(claim.institutionId)) return false;

      return true;
    });
  }

  private getDefaultConfiguration(): BatchConfiguration {
    return {
      processingMode: 'smart_parallel',
      maxConcurrency: 5,
      retryAttempts: 3,
      retryDelay: 5000,
      timeoutPerClaim: 300000, // 5 minutes
      failureThreshold: 25, // 25%
      enableAutoRetry: true,
      enableProgressNotifications: true,
      skipFailedClaims: false,
      groupByPriority: true,
      optimizeForSpeed: false,
      validateBeforeProcessing: true
    };
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startBatchProcessor(): void {
    // Process batch queue every 10 seconds
    this.processingTimer = setInterval(() => {
      this.processBatchQueue();
    }, 10000);
  }

  private async processBatchQueue(): Promise<void> {
    const runningBatches = Array.from(this.activeBatches.values()).filter(b => b.status === 'running');

    if (runningBatches.length < this.maxConcurrentBatches && this.batchQueue.length > 0) {
      const nextBatch = this.batchQueue.find(b => b.status === 'pending');
      if (nextBatch) {
        try {
          await this.startBatchJob(nextBatch.batchId);
        } catch (error) {
          console.error('Error starting batch job:', error);
        }
      }
    }
  }

  // Public API methods
  async getBatchJob(batchId: string): Promise<BatchJob | null> {
    return this.activeBatches.get(batchId) || null;
  }

  async getAllBatchJobs(): Promise<BatchJob[]> {
    return Array.from(this.activeBatches.values());
  }

  async cancelBatchJob(batchId: string): Promise<boolean> {
    const batchJob = this.activeBatches.get(batchId);
    if (!batchJob) {
      return false;
    }

    if (batchJob.status === 'running') {
      batchJob.status = 'cancelled';
      batchJob.completedAt = new Date();
      return true;
    }

    return false;
  }

  async pauseBatchJob(batchId: string): Promise<boolean> {
    const batchJob = this.activeBatches.get(batchId);
    if (!batchJob || batchJob.status !== 'running') {
      return false;
    }

    batchJob.status = 'paused';
    return true;
  }

  async resumeBatchJob(batchId: string): Promise<boolean> {
    const batchJob = this.activeBatches.get(batchId);
    if (!batchJob || batchJob.status !== 'paused') {
      return false;
    }

    batchJob.status = 'running';
    this.processBatchJob(batchJob);
    return true;
  }

  async getBatchAnalytics(days: number = 30): Promise<any> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentBatches = Array.from(this.activeBatches.values())
      .filter(b => b.createdAt >= cutoffDate);

    const totalBatches = recentBatches.length;
    const completedBatches = recentBatches.filter(b => b.status === 'completed').length;
    const failedBatches = recentBatches.filter(b => b.status === 'failed').length;
    const totalClaims = recentBatches.reduce((sum, b) => sum + b.progress.totalClaims, 0);
    const totalProcessed = recentBatches.reduce((sum, b) => sum + b.results.totalProcessed, 0);
    const averageSuccessRate = recentBatches.length > 0 ?
      recentBatches.reduce((sum, b) => sum + b.results.successRate, 0) / recentBatches.length : 0;

    return {
      period: { days, cutoffDate },
      summary: {
        totalBatches,
        completedBatches,
        failedBatches,
        successRate: totalBatches > 0 ? (completedBatches / totalBatches) * 100 : 0
      },
      claims: {
        totalClaims,
        totalProcessed,
        processingRate: totalClaims > 0 ? (totalProcessed / totalClaims) * 100 : 0
      },
      performance: {
        averageSuccessRate,
        averageProcessingTime: recentBatches.length > 0 ?
          recentBatches.reduce((sum, b) => sum + (b.results.averageProcessingTime || 0), 0) / recentBatches.length : 0
      }
    };
  }
}

export const batchProcessingService = new BatchProcessingService();