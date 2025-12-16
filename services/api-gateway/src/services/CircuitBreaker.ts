import { createLogger } from '../utils/logger';

const logger = createLogger();

export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 60000, // 1 minute
    private readonly monitoringPeriod: number = 10000 // 10 seconds
  ) {
    logger.debug('Circuit breaker initialized', {
      failureThreshold,
      recoveryTimeout,
      monitoringPeriod
    });
  }

  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failureCount = 0;
      logger.debug('Circuit breaker closed after successful request');
    } else if (this.state === 'CLOSED') {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  public recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn('Circuit breaker opened', {
        failureCount: this.failureCount,
        failureThreshold: this.failureThreshold
      });
    } else if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      logger.warn('Circuit breaker re-opened after failed request in HALF_OPEN state');
    }

    logger.debug('Circuit breaker failure recorded', {
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold
    });
  }

  public isOpen(): boolean {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        logger.debug('Circuit breaker transitioned to HALF_OPEN');
        return false;
      }
      return true;
    }
    return false;
  }

  public getState(): string {
    return this.state;
  }

  public getFailureCount(): number {
    return this.failureCount;
  }

  public reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
    logger.info('Circuit breaker manually reset');
  }

  public getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      recoveryTimeout: this.recoveryTimeout,
      lastFailureTime: this.lastFailureTime,
      isOpen: this.isOpen()
    };
  }
}