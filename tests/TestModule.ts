/**
 * Medical Coverage System - Unified Test Module
 * 
 * Centralized testing framework for all services and components
 * Supports unit, integration, and E2E tests with shared utilities
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { Pool } from 'pg';

// ============================================
// Test Configuration
// ============================================

export const TEST_CONFIG = {
  /**
   * API Testing
   */
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
    timeout: 30000,
    retries: 3,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'MedicalCoverageSystem-Test'
    }
  },

  /**
   * Database Testing
   */
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.TEST_DB || 'test_medical_coverage'
  },

  /**
   * Service URLs
   */
  services: {
    core: process.env.CORE_SERVICE_URL || 'http://localhost:3003',
    insurance: process.env.INSURANCE_SERVICE_URL || 'http://localhost:3008',
    hospital: process.env.HOSPITAL_SERVICE_URL || 'http://localhost:3007',
    billing: process.env.BILLING_SERVICE_URL || 'http://localhost:3002',
    finance: process.env.FINANCE_SERVICE_URL || 'http://localhost:3004',
    crm: process.env.CRM_SERVICE_URL || 'http://localhost:3005',
    membership: process.env.MEMBERSHIP_SERVICE_URL || 'http://localhost:3006',
    wellness: process.env.WELLNESS_SERVICE_URL || 'http://localhost:3009'
  },

  /**
   * Test Timeouts
   */
  timeouts: {
    unit: 5000,
    integration: 30000,
    e2e: 60000,
    database: 10000
  }
};

// ============================================
// Test Utilities
// ============================================

/**
 * API Client for testing
 */
export class TestApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(baseUrl: string = TEST_CONFIG.api.baseUrl) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: TEST_CONFIG.api.timeout,
      headers: TEST_CONFIG.api.headers
    });

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  /**
   * Authenticate user for testing
   */
  async authenticate(email: string, password: string): Promise<void> {
    try {
      const response = await this.client.post('/api/core/auth/login', {
        email,
        password
      });
      this.token = response.data.data?.accessToken;
    } catch (error) {
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  /**
   * Make GET request
   */
  async get<T = any>(url: string, params?: any): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data.data;
  }

  /**
   * Make POST request
   */
  async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.client.post(url, data);
    return response.data.data;
  }

  /**
   * Make PUT request
   */
  async put<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.client.put(url, data);
    return response.data.data;
  }

  /**
   * Make DELETE request
   */
  async delete<T = any>(url: string): Promise<T> {
    const response = await this.client.delete(url);
    return response.data.data;
  }

  /**
   * Get raw response
   */
  async getRaw(url: string, method: string = 'GET', data?: any): Promise<any> {
    return this.client({ method, url, data });
  }
}

/**
 * Database Test Helper
 */
export class TestDatabase {
  private pool: Pool;

  constructor() {
    this.pool = new Pool(TEST_CONFIG.database);
  }

  /**
   * Execute query
   */
  async query(sql: string, params?: any[]): Promise<any> {
    return this.pool.query(sql, params);
  }

  /**
   * Seed test data
   */
  async seed(data: Record<string, any[]>): Promise<void> {
    for (const [table, records] of Object.entries(data)) {
      for (const record of records) {
        const columns = Object.keys(record).join(', ');
        const values = Object.values(record).map(() => '?').join(', ');
        await this.query(
          `INSERT INTO ${table} (${columns}) VALUES (${values})`,
          Object.values(record)
        );
      }
    }
  }

  /**
   * Clear table
   */
  async clearTable(table: string): Promise<void> {
    await this.query(`DELETE FROM ${table}`);
  }

  /**
   * Truncate all tables
   */
  async truncateAll(tables: string[]): Promise<void> {
    for (const table of tables) {
      await this.clearTable(table);
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Mock data generator
 */
export class MockDataGenerator {
  static user(overrides?: Partial<any>): any {
    return {
      email: `user-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      ...overrides
    };
  }

  static member(companyId: string, overrides?: Partial<any>): any {
    return {
      companyId,
      email: `member-${Date.now()}@example.com`,
      firstName: 'Member',
      lastName: 'Test',
      membershipType: 'employee',
      ...overrides
    };
  }

  static invoice(memberId: string, overrides?: Partial<any>): any {
    return {
      memberId,
      amount: 10000,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'pending',
      ...overrides
    };
  }

  static claim(memberId: string, overrides?: Partial<any>): any {
    return {
      memberId,
      amount: 5000,
      serviceDate: new Date(),
      status: 'pending',
      type: 'hospitalization',
      ...overrides
    };
  }

  static insuredPlan(overrides?: Partial<any>): any {
    return {
      name: `Plan-${Date.now()}`,
      coverage: 100000,
      premium: 5000,
      ...overrides
    };
  }
}

/**
 * Test assertion helpers
 */
export class TestAssertions {
  /**
   * Assert valid response structure
   */
  static assertValidResponse(response: any): void {
    expect(response).toBeDefined();
    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.timestamp).toBeDefined();
  }

  /**
   * Assert error response
   */
  static assertErrorResponse(response: any, expectedCode?: string): void {
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    if (expectedCode) {
      expect(response.error.code).toBe(expectedCode);
    }
  }

  /**
   * Assert paginated response
   */
  static assertPaginatedResponse(response: any): void {
    this.assertValidResponse(response);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.pagination).toBeDefined();
    expect(response.pagination.page).toBeDefined();
    expect(response.pagination.total).toBeDefined();
  }

  /**
   * Assert JWT token structure
   */
  static assertValidToken(token: string): void {
    const parts = token.split('.');
    expect(parts.length).toBe(3);
    expect(token.length).toBeGreaterThan(100);
  }
}

/**
 * Service helper for cross-service testing
 */
export class ServiceTestHelper {
  /**
   * Check if service is healthy
   */
  static async isServiceHealthy(baseUrl: string): Promise<boolean> {
    try {
      const response = await axios.get(`${baseUrl}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Wait for service to be ready
   */
  static async waitForService(
    baseUrl: string,
    maxWaitTime: number = 30000,
    interval: number = 1000
  ): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTime) {
      if (await this.isServiceHealthy(baseUrl)) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Service ${baseUrl} did not become healthy within ${maxWaitTime}ms`);
  }
}

// ============================================
// Test Lifecycle Helpers
// ============================================

/**
 * Setup common test environment
 */
export async function setupTestEnvironment(): Promise<{ api: TestApiClient; db: TestDatabase }> {
  const api = new TestApiClient();
  const db = new TestDatabase();

  // Wait for services to be ready
  await ServiceTestHelper.waitForService(TEST_CONFIG.api.baseUrl);

  return { api, db };
}

/**
 * Cleanup test environment
 */
export async function cleanupTestEnvironment(
  api: TestApiClient,
  db?: TestDatabase
): Promise<void> {
  if (db) {
    await db.close();
  }
}

// ============================================
// Example Test Suite Structure
// ============================================

/**
 * Example: Unit Tests
 * 
 * describe('UserService', () => {
 *   it('should create user', async () => {
 *     const userData = MockDataGenerator.user();
 *     const result = await userService.create(userData);
 *     expect(result.id).toBeDefined();
 *   });
 * });
 */

/**
 * Example: Integration Tests
 * 
 * describe('User API Integration', () => {
 *   let api: TestApiClient;
 *
 *   beforeAll(async () => {
 *     const env = await setupTestEnvironment();
 *     api = env.api;
 *   });
 *
 *   afterAll(async () => {
 *     await cleanupTestEnvironment(api);
 *   });
 *
 *   it('should create and retrieve user', async () => {
 *     const userData = MockDataGenerator.user();
 *     const created = await api.post('/api/core/users', userData);
 *     TestAssertions.assertValidResponse(created);
 *
 *     const retrieved = await api.get(`/api/core/users/${created.id}`);
 *     expect(retrieved.email).toBe(userData.email);
 *   });
 * });
 */

/**
 * Example: Cross-Service Test
 * 
 * describe('Payment Flow', () => {
 *   let api: TestApiClient;
 *   let billingClient: TestApiClient;
 *
 *   beforeAll(async () => {
 *     api = new TestApiClient();
 *     billingClient = new TestApiClient(TEST_CONFIG.services.billing);
 *   });
 *
 *   it('should process payment across services', async () => {
 *     // Create invoice in Billing Service
 *     const invoice = await billingClient.post('/api/billing/invoices', {
 *       memberId: 'test-member',
 *       amount: 10000
 *     });
 *
 *     // Process payment through Finance Service
 *     const payment = await api.post('/api/finance/payments', {
 *       invoiceId: invoice.id,
 *       amount: 10000
 *     });
 *
 *     TestAssertions.assertValidResponse(payment);
 *   });
 * });
 */

export default {
  TEST_CONFIG,
  TestApiClient,
  TestDatabase,
  MockDataGenerator,
  TestAssertions,
  ServiceTestHelper,
  setupTestEnvironment,
  cleanupTestEnvironment
};
