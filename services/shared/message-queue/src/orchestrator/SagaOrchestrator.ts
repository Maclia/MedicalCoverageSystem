import { eventBus, DomainEvent, EventFactory } from '../events/EventBus';
import { createLogger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger();

export interface SagaStep {
  name: string;
  action: () => Promise<any>;
  compensate?: () => Promise<any>;
  retryPolicy?: {
    maxAttempts: number;
    delay: number;
    backoffMultiplier?: number;
  };
  timeout?: number;
}

export interface Saga {
  id: string;
  name: string;
  correlationId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'compensating' | 'compensated';
  steps: SagaStep[];
  currentStep: number;
  data: any;
  error?: Error;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface SagaDefinition {
  name: string;
  steps: SagaStep[];
  timeout?: number;
  retryPolicy?: {
    maxAttempts: number;
    delay: number;
  };
}

class SagaOrchestrator {
  private sagas: Map<string, Saga> = new Map();
  private sagaDefinitions: Map<string, SagaDefinition> = new Map();
  private isCompensating: Set<string> = new Set();

  constructor() {
    this.setupEventHandlers();
  }

  // Saga definition registration
  registerDefinition(definition: SagaDefinition): void {
    this.sagaDefinitions.set(definition.name, definition);
    logger.info('Saga definition registered', { name: definition.name });
  }

  // Saga execution
  async startSaga(sagaName: string, initialData: any, correlationId?: string): Promise<string> {
    const definition = this.sagaDefinitions.get(sagaName);
    if (!definition) {
      throw new Error(`Saga definition not found: ${sagaName}`);
    }

    const saga: Saga = {
      id: uuidv4(),
      name: sagaName,
      correlationId: correlationId || uuidv4(),
      status: 'pending',
      steps: definition.steps.map(step => ({ ...step })),
      currentStep: 0,
      data: initialData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.sagas.set(saga.id, saga);

    logger.info('Saga started', {
      sagaId: saga.id,
      sagaName: saga.name,
      correlationId: saga.correlationId
    });

    // Start saga execution asynchronously
    this.executeSaga(saga).catch(error => {
      logger.error('Saga execution failed', error, { sagaId: saga.id });
      this.handleSagaFailure(saga, error);
    });

    return saga.id;
  }

  private async executeSaga(saga: Saga): Promise<void> {
    try {
      saga.status = 'running';
      saga.updatedAt = new Date();

      await this.publishSagaEvent(saga, 'started');

      for (let i = 0; i < saga.steps.length; i++) {
        saga.currentStep = i;
        saga.updatedAt = new Date();

        const step = saga.steps[i];

        logger.debug('Executing saga step', {
          sagaId: saga.id,
          stepName: step.name,
          stepIndex: i
        });

        await this.executeStep(saga, step);

        await this.publishSagaEvent(saga, 'step_completed', {
          stepName: step.name,
          stepIndex: i
        });
      }

      // Mark saga as completed
      saga.status = 'completed';
      saga.completedAt = new Date();
      saga.updatedAt = new Date();

      await this.publishSagaEvent(saga, 'completed');

      logger.info('Saga completed successfully', {
        sagaId: saga.id,
        sagaName: saga.name
      });

    } catch (error) {
      logger.error('Saga failed', error as Error, {
        sagaId: saga.id,
        stepIndex: saga.currentStep
      });

      saga.status = 'failed';
      saga.error = error as Error;
      saga.updatedAt = new Date();

      await this.publishSagaEvent(saga, 'failed', {
        error: (error as Error).message,
        stepIndex: saga.currentStep
      });

      // Start compensation
      await this.compensateSaga(saga);
    }
  }

  private async executeStep(saga: Saga, step: SagaStep): Promise<any> {
    const retryPolicy = step.retryPolicy || { maxAttempts: 3, delay: 1000 };
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      try {
        const result = await this.executeWithTimeout(
          step.action(),
          step.timeout || 30000
        );

        logger.debug('Saga step executed successfully', {
          sagaId: saga.id,
          stepName: step.name,
          attempt,
          result
        });

        return result;

      } catch (error) {
        lastError = error as Error;
        logger.warn('Saga step attempt failed', lastError, {
          sagaId: saga.id,
          stepName: step.name,
          attempt,
          maxAttempts: retryPolicy.maxAttempts
        });

        if (attempt < retryPolicy.maxAttempts) {
          const delay = retryPolicy.delay * (retryPolicy.backoffMultiplier || 2) ** (attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Step execution failed');
  }

  private async compensateSaga(saga: Saga): Promise<void> {
    if (this.isCompensating.has(saga.id)) {
      logger.warn('Saga already compensating', { sagaId: saga.id });
      return;
    }

    this.isCompensating.add(saga.id);
    saga.status = 'compensating';
    saga.updatedAt = new Date();

    logger.info('Starting saga compensation', {
      sagaId: saga.id,
      sagaName: saga.name,
      currentStep: saga.currentStep
    });

    await this.publishSagaEvent(saga, 'compensation_started');

    try {
      // Compensate in reverse order
      for (let i = saga.currentStep - 1; i >= 0; i--) {
        const step = saga.steps[i];

        if (step.compensate) {
          logger.debug('Compensating saga step', {
            sagaId: saga.id,
            stepName: step.name,
            stepIndex: i
          });

          await this.executeCompensation(saga, step);

          await this.publishSagaEvent(saga, 'step_compensated', {
            stepName: step.name,
            stepIndex: i
          });
        }
      }

      saga.status = 'compensated';
      saga.updatedAt = new Date();

      await this.publishSagaEvent(saga, 'compensated');

      logger.info('Saga compensation completed', {
        sagaId: saga.id,
        sagaName: saga.name
      });

    } catch (error) {
      logger.error('Saga compensation failed', error as Error, {
        sagaId: saga.id
      });

      saga.status = 'failed';
      saga.error = error as Error;
      saga.updatedAt = new Date();

      await this.publishSagaEvent(saga, 'compensation_failed', {
        error: (error as Error).message
      });

    } finally {
      this.isCompensating.delete(saga.id);
    }
  }

  private async executeCompensation(saga: Saga, step: SagaStep): Promise<void> {
    try {
      const result = await this.executeWithTimeout(
        step.compensate!(),
        step.timeout || 30000
      );

      logger.debug('Saga step compensated successfully', {
        sagaId: saga.id,
        stepName: step.name,
        result
      });

    } catch (error) {
      logger.error('Saga step compensation failed', error as Error, {
        sagaId: saga.id,
        stepName: step.name
      });

      throw error;
    }
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async publishSagaEvent(saga: Saga, eventType: string, data?: any): Promise<void> {
    const event = EventFactory.createEvent({
      type: `saga.${eventType}`,
      aggregateId: saga.id,
      aggregateType: 'Saga',
      data: {
        sagaId: saga.id,
        sagaName: saga.name,
        correlationId: saga.correlationId,
        status: saga.status,
        currentStep: saga.currentStep,
        stepCount: saga.steps.length,
        ...data
      },
      correlationId: saga.correlationId
    });

    await eventBus.publish(event);
  }

  private setupEventHandlers(): void {
    // Handle saga-related events
    eventBus.subscribe('saga.started', async (event) => {
      logger.info('Saga started event received', event.data);
    });

    eventBus.subscribe('saga.completed', async (event) => {
      logger.info('Saga completed event received', event.data);
    });

    eventBus.subscribe('saga.failed', async (event) => {
      logger.warn('Saga failed event received', event.data);
    });

    eventBus.subscribe('saga.compensated', async (event) => {
      logger.info('Saga compensated event received', event.data);
    });
  }

  // Saga management operations
  getSaga(sagaId: string): Saga | undefined {
    return this.sagas.get(sagaId);
  }

  getSagasByCorrelation(correlationId: string): Saga[] {
    return Array.from(this.sagas.values())
      .filter(saga => saga.correlationId === correlationId);
  }

  getSagasByStatus(status: Saga['status']): Saga[] {
    return Array.from(this.sagas.values())
      .filter(saga => saga.status === status);
  }

  async retrySaga(sagaId: string): Promise<boolean> {
    const saga = this.sagas.get(sagaId);
    if (!saga || saga.status !== 'failed') {
      return false;
    }

    // Reset saga state
    saga.status = 'pending';
    saga.currentStep = 0;
    saga.error = undefined;
    saga.updatedAt = new Date();

    // Restart execution
    this.executeSaga(saga).catch(error => {
      logger.error('Saga retry failed', error, { sagaId });
      this.handleSagaFailure(saga, error);
    });

    logger.info('Saga retry initiated', { sagaId });
    return true;
  }

  async cancelSaga(sagaId: string): Promise<boolean> {
    const saga = this.sagas.get(sagaId);
    if (!saga || ['completed', 'compensated'].includes(saga.status)) {
      return false;
    }

    // Mark as cancelled and start compensation
    saga.status = 'failed';
    saga.error = new Error('Saga cancelled');
    saga.updatedAt = new Date();

    await this.compensateSaga(saga);

    logger.info('Saga cancelled', { sagaId });
    return true;
  }

  // Cleanup old sagas
  cleanupOldSagas(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const oldSagaIds: string[] = [];

    for (const [sagaId, saga] of this.sagas) {
      if (now - saga.updatedAt.getTime() > maxAge) {
        oldSagaIds.push(sagaId);
      }
    }

    for (const sagaId of oldSagaIds) {
      this.sagas.delete(sagaId);
    }

    if (oldSagaIds.length > 0) {
      logger.info('Old sagas cleaned up', {
        count: oldSagaIds.length,
        maxAge: maxAge / 1000 / 60 / 60 // hours
      });
    }
  }

  // Statistics
  getStats(): {
    totalSagas: number;
    sagasByStatus: Record<string, number>;
    averageExecutionTime?: number;
    compensationRate: number;
  } {
    const sagas = Array.from(this.sagas.values());
    const sagasByStatus: Record<string, number> = {};

    for (const saga of sagas) {
      sagasByStatus[saga.status] = (sagasByStatus[saga.status] || 0) + 1;
    }

    const completedSagas = sagas.filter(s => s.completedAt);
    const compensatedSagas = sagas.filter(s => s.status === 'compensated');

    let averageExecutionTime: number | undefined;
    if (completedSagas.length > 0) {
      const totalTime = completedSagas.reduce((sum, saga) => {
        return sum + (saga.completedAt!.getTime() - saga.createdAt.getTime());
      }, 0);
      averageExecutionTime = totalTime / completedSagas.length;
    }

    const compensationRate = sagas.length > 0
      ? (compensatedSagas.length / sagas.length) * 100
      : 0;

    return {
      totalSagas: sagas.length,
      sagasByStatus,
      averageExecutionTime,
      compensationRate
    };
  }
}

// Saga builder for fluent API
export class SagaBuilder {
  private steps: SagaStep[] = [];

  constructor(private name: string) {}

  step(name: string, action: () => Promise<any>, options: {
    compensate?: () => Promise<any>;
    retryPolicy?: {
      maxAttempts: number;
      delay: number;
      backoffMultiplier?: number;
    };
    timeout?: number;
  } = {}): SagaBuilder {
    this.steps.push({
      name,
      action,
      compensate: options.compensate,
      retryPolicy: options.retryPolicy,
      timeout: options.timeout
    });
    return this;
  }

  build(): SagaDefinition {
    return {
      name: this.name,
      steps: [...this.steps]
    };
  }
}

export const sagaOrchestrator = new SagaOrchestrator();
export default sagaOrchestrator;