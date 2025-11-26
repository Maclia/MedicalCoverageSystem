/**
 * Module Test Runner
 * Comprehensive testing framework for modules
 */

import { moduleRegistry } from '../core/registry/ModuleRegistry.js';
import { createModuleHealthReport } from '../utils/ModuleUtils.js';

export interface TestOptions {
  includeInactive?: boolean;
  parallel?: boolean;
  timeout?: number;
  verbose?: boolean;
}

export interface TestResult {
  moduleName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  tests: Array<{
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    message?: string;
    duration: number;
  }>;
  error?: string;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
}

export class ModuleTestRunner {
  private options: TestOptions;

  constructor(options: TestOptions = {}) {
    this.options = {
      includeInactive: false,
      parallel: false,
      timeout: 30000, // 30 seconds
      verbose: false,
      ...options
    };
  }

  /**
   * Run tests for all modules
   */
  async runAllTests(): Promise<TestSuite> {
    console.log('🧪 Running Module Tests...\n');

    const modules = moduleRegistry.getAllModules();
    const enabledModules = modules.filter(module =>
      this.options.includeInactive || module.config.enabled
    );

    const startTime = Date.now();
    const results: TestResult[] = [];

    if (this.options.parallel) {
      // Run tests in parallel
      const promises = enabledModules.map(module =>
        this.runModuleTests(module.name)
      );
      const parallelResults = await Promise.all(promises);
      results.push(...parallelResults);
    } else {
      // Run tests sequentially
      for (const module of enabledModules) {
        const result = await this.runModuleTests(module.name);
        results.push(result);
      }
    }

    const duration = Date.now() - startTime;
    const summary = this.calculateSummary(results, duration);

    // Display results
    this.displayResults(results, summary);

    return {
      name: 'Module Tests',
      tests: results,
      summary
    };
  }

  /**
   * Run tests for a specific module
   */
  async runModuleTests(moduleName: string): Promise<TestResult> {
    const module = moduleRegistry.getModule(moduleName);
    if (!module) {
      return {
        moduleName,
        status: 'failed',
        duration: 0,
        tests: [],
        error: `Module ${moduleName} not found`
      };
    }

    if (!module.config.enabled && !this.options.includeInactive) {
      return {
        moduleName,
        status: 'skipped',
        duration: 0,
        tests: []
      };
    }

    const startTime = Date.now();
    const tests: TestResult['tests'] = [];

    try {
      if (this.options.verbose) {
        console.log(`🔍 Testing module: ${moduleName}`);
      }

      // Test 1: Module Initialization
      tests.push(await this.testModuleInitialization(module));

      // Test 2: Service Registration
      tests.push(await this.testServiceRegistration(module));

      // Test 3: Type Registration
      tests.push(await this.testTypeRegistration(module));

      // Test 4: Health Check
      tests.push(await this.testHealthCheck(module));

      // Test 5: Module Metrics
      tests.push(await this.testModuleMetrics(module));

      // Test 6: Dependency Checks
      tests.push(await this.testDependencies(module));

      // Test 7: Configuration Validation
      tests.push(await this.testConfigurationValidation(module));

      const status = tests.every(test => test.status === 'passed') ? 'passed' :
                      tests.some(test => test.status === 'failed') ? 'failed' : 'skipped';

      return {
        moduleName,
        status,
        duration: Date.now() - startTime,
        tests
      };

    } catch (error) {
      return {
        moduleName,
        status: 'failed',
        duration: Date.now() - startTime,
        tests,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test module initialization
   */
  private async testModuleInitialization(module: any): Promise<TestResult['tests'][0]> {
    const startTime = Date.now();

    try {
      if (!module.getStatus().initialized) {
        return {
          name: 'Module Initialization',
          status: 'failed',
          message: 'Module not initialized',
          duration: Date.now() - startTime
        };
      }

      return {
        name: 'Module Initialization',
        status: 'passed',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        name: 'Module Initialization',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Initialization test failed',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Test service registration
   */
  private async testServiceRegistration(module: any): Promise<TestResult['tests'][0]> {
    const startTime = Date.now();

    try {
      // Check if module has registerServices method and it doesn't throw
      if (typeof module.registerServices === 'function') {
        // This is a basic test - in real implementation,
        // we'd verify services are actually registered
        return {
          name: 'Service Registration',
          status: 'passed',
          duration: Date.now() - startTime
        };
      }

      return {
        name: 'Service Registration',
        status: 'failed',
        message: 'registerServices method not found',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        name: 'Service Registration',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Service registration test failed',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Test type registration
   */
  private async testTypeRegistration(module: any): Promise<TestResult['tests'][0]> {
    const startTime = Date.now();

    try {
      if (typeof module.registerTypes === 'function') {
        return {
          name: 'Type Registration',
          status: 'passed',
          duration: Date.now() - startTime
        };
      }

      return {
        name: 'Type Registration',
        status: 'failed',
        message: 'registerTypes method not found',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        name: 'Type Registration',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Type registration test failed',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Test health check
   */
  private async testHealthCheck(module: any): Promise<TestResult['tests'][0]> {
    const startTime = Date.now();

    try {
      if (typeof module.healthCheck === 'function') {
        const health = await module.healthCheck();

        if (health.status === 'healthy' || health.status === 'degraded') {
          return {
            name: 'Health Check',
            status: 'passed',
            message: `Health status: ${health.status}`,
            duration: Date.now() - startTime
          };
        } else {
          return {
            name: 'Health Check',
            status: 'failed',
            message: `Health status: ${health.status}`,
            duration: Date.now() - startTime
          };
        }
      }

      return {
        name: 'Health Check',
        status: 'failed',
        message: 'healthCheck method not found',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        name: 'Health Check',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Health check test failed',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Test module metrics
   */
  private async testModuleMetrics(module: any): Promise<TestResult['tests'][0]> {
    const startTime = Date.now();

    try {
      if (typeof module.getMetrics === 'function') {
        const metrics = await module.getMetrics();

        if (metrics && typeof metrics === 'object') {
          return {
            name: 'Module Metrics',
            status: 'passed',
            message: `Metrics available for ${metrics.name}`,
            duration: Date.now() - startTime
          };
        } else {
          return {
            name: 'Module Metrics',
            status: 'failed',
            message: 'Invalid metrics format',
            duration: Date.now() - startTime
          };
        }
      }

      return {
        name: 'Module Metrics',
        status: 'failed',
        message: 'getMetrics method not found',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        name: 'Module Metrics',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Metrics test failed',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Test module dependencies
   */
  private async testDependencies(module: any): Promise<TestResult['tests'][0]> {
    const startTime = Date.now();

    try {
      const dependencies = module.config.dependencies || [];
      const missingDeps: string[] = [];

      for (const dep of dependencies) {
        const depModule = moduleRegistry.getModule(dep);
        if (!depModule) {
          missingDeps.push(dep);
        }
      }

      if (missingDeps.length === 0) {
        return {
          name: 'Dependency Check',
          status: 'passed',
          message: `All ${dependencies.length} dependencies found`,
          duration: Date.now() - startTime
        };
      } else {
        return {
          name: 'Dependency Check',
          status: 'failed',
          message: `Missing dependencies: ${missingDeps.join(', ')}`,
          duration: Date.now() - startTime
        };
      }
    } catch (error) {
      return {
        name: 'Dependency Check',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Dependency test failed',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Test configuration validation
   */
  private async testConfigurationValidation(module: any): Promise<TestResult['tests'][0]> {
    const startTime = Date.now();

    try {
      const config = module.config;
      const requiredFields = ['name', 'version', 'description'];
      const missingFields = requiredFields.filter(field => !config[field]);

      if (missingFields.length === 0) {
        return {
          name: 'Configuration Validation',
          status: 'passed',
          message: 'Configuration valid',
          duration: Date.now() - startTime
        };
      } else {
        return {
          name: 'Configuration Validation',
          status: 'failed',
          message: `Missing fields: ${missingFields.join(', ')}`,
          duration: Date.now() - startTime
        };
      }
    } catch (error) {
      return {
        name: 'Configuration Validation',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Configuration test failed',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Calculate test summary
   */
  private calculateSummary(results: TestResult[], duration: number) {
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    return { total, passed, failed, skipped, duration };
  }

  /**
   * Display test results
   */
  private displayResults(results: TestResult[], summary: any) {
    console.log('\n📊 Test Results Summary:');
    console.log(`   Total: ${summary.total}`);
    console.log(`   Passed: ${summary.passed} ✅`);
    console.log(`   Failed: ${summary.failed} ❌`);
    console.log(`   Skipped: ${summary.skipped} ⏭️`);
    console.log(`   Duration: ${summary.duration}ms`);

    if (this.options.verbose || summary.failed > 0) {
      console.log('\n📋 Detailed Results:');
      results.forEach(result => {
        const icon = result.status === 'passed' ? '✅' :
                    result.status === 'failed' ? '❌' : '⏭️';
        console.log(`   ${icon} ${result.moduleName} (${result.duration}ms)`);

        if (result.error) {
          console.log(`      Error: ${result.error}`);
        }

        if (this.options.verbose) {
          result.tests.forEach(test => {
            const testIcon = test.status === 'passed' ? '  ✅' :
                           test.status === 'failed' ? '  ❌' : '  ⏭️';
            console.log(`${testIcon} ${test.name} (${test.duration}ms)`);
            if (test.message) {
              console.log(`      ${test.message}`);
            }
          });
        }
      });
    }

    console.log('\n' + '='.repeat(50));
    if (summary.failed === 0) {
      console.log('🎉 All tests passed!');
    } else {
      console.log(`❌ ${summary.failed} test(s) failed`);
    }
    console.log('='.repeat(50) + '\n');
  }
}

// Convenience function to run tests
export async function runModuleTests(options?: TestOptions): Promise<TestSuite> {
  const runner = new ModuleTestRunner(options);
  return await runner.runAllTests();
}

export default ModuleTestRunner;