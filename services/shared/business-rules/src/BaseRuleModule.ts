import { ExecutionMode, RuleResult, IBusinessRuleModule } from './types/index.js';

/**
 * Abstract Base Rule Module with dual execution capability
 * Provides standard implementation for all business rule modules
 */
export abstract class BaseRuleModule implements IBusinessRuleModule {
  protected executionMode: ExecutionMode = ExecutionMode.PROXY;
  protected serviceName: string;
  protected coreServiceUrl: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.coreServiceUrl = process.env.CORE_SERVICE_URL || 'http://core-service:3000';
  }

  getExecutionMode(): ExecutionMode {
    return this.executionMode;
  }

  setExecutionMode(mode: ExecutionMode): void {
    this.executionMode = mode;
  }

  /**
   * Execute rule with configured execution mode
   */
  protected async executeRule<T>(
    ruleName: string,
    localImpl: () => Promise<T>,
    proxyImpl: () => Promise<T>
  ): Promise<RuleResult<T>> {
    const startTime = Date.now();

    switch (this.executionMode) {
      case ExecutionMode.LOCAL:
        return this.executeLocal(ruleName, localImpl, startTime);

      case ExecutionMode.PROXY:
        return this.executeProxy(ruleName, proxyImpl, startTime);

      case ExecutionMode.DUAL:
        return this.executeDual(ruleName, localImpl, proxyImpl, startTime);

      default:
        return this.executeProxy(ruleName, proxyImpl, startTime);
    }
  }

  private async executeLocal<T>(
    ruleName: string,
    localImpl: () => Promise<T>,
    startTime: number
  ): Promise<RuleResult<T>> {
    try {
      const data = await localImpl();
      return {
        success: true,
        data,
        metadata: {
          executionMode: ExecutionMode.LOCAL,
          executionTimeMs: Date.now() - startTime,
          executedAt: new Date(),
          serviceName: this.serviceName,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionMode: ExecutionMode.LOCAL,
          executionTimeMs: Date.now() - startTime,
          executedAt: new Date(),
          serviceName: this.serviceName,
        }
      };
    }
  }

  private async executeProxy<T>(
    ruleName: string,
    proxyImpl: () => Promise<T>,
    startTime: number
  ): Promise<RuleResult<T>> {
    try {
      const data = await proxyImpl();
      return {
        success: true,
        data,
        metadata: {
          executionMode: ExecutionMode.PROXY,
          executionTimeMs: Date.now() - startTime,
          executedAt: new Date(),
          serviceName: 'core-service',
          fallback: false,
        }
      };
    } catch (error) {
      // Fail open gracefully
      return {
        success: true,
        metadata: {
          executionMode: ExecutionMode.PROXY,
          executionTimeMs: Date.now() - startTime,
          executedAt: new Date(),
          serviceName: 'core-service',
          fallback: true,
        }
      };
    }
  }

  private async executeDual<T>(
    ruleName: string,
    localImpl: () => Promise<T>,
    proxyImpl: () => Promise<T>,
    startTime: number
  ): Promise<RuleResult<T>> {
    const [localResult, proxyResult] = await Promise.allSettled([
      localImpl(),
      proxyImpl()
    ]);

    const matched = this.deepEqual(
      localResult.status === 'fulfilled' ? localResult.value : null,
      proxyResult.status === 'fulfilled' ? proxyResult.value : null
    );

    // Always return proxy result during validation phase
    if (proxyResult.status === 'fulfilled') {
      return {
        success: true,
        data: proxyResult.value,
        metadata: {
          executionMode: ExecutionMode.DUAL,
          executionTimeMs: Date.now() - startTime,
          executedAt: new Date(),
          serviceName: this.serviceName,
        },
        validation: {
          matched,
          diff: matched ? [] : ['Results do not match between implementations']
        }
      };
    }

    // Fallback to local if proxy fails
    if (localResult.status === 'fulfilled') {
      return {
        success: true,
        data: localResult.value,
        metadata: {
          executionMode: ExecutionMode.DUAL,
          executionTimeMs: Date.now() - startTime,
          executedAt: new Date(),
          serviceName: this.serviceName,
        },
        validation: {
          matched: false,
          diff: ['Proxy failed, using local result']
        }
      };
    }

    return {
      success: false,
      error: 'Both local and proxy implementations failed',
      metadata: {
        executionMode: ExecutionMode.DUAL,
        executionTimeMs: Date.now() - startTime,
        executedAt: new Date(),
        serviceName: this.serviceName,
      }
    };
  }

  private deepEqual(a: any, b: any): boolean {
    // Handle primitives and null/undefined
    if (a === b) return true;
    
    // Handle different types
    if (typeof a !== typeof b) return false;
    
    // Handle null case
    if (a === null || b === null) return false;
    
    // Handle Dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    
    // Handle Arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => this.deepEqual(item, b[index]));
    }
    
    // Handle Objects
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      return keysA.every(key => {
        if (!keysB.includes(key)) return false;
        return this.deepEqual(a[key], b[key]);
      });
    }
    
    // All other cases
    return false;
  }

  /**
   * Call Core Service proxy endpoint
   */
  protected async callCoreEndpoint<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.coreServiceUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': this.serviceName
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`Core service returned ${response.status}`);
    }

    return await response.json() as T;
  }
}