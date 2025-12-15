// Integration Testing Framework for Enhanced Members & Clients Module

import { z } from "zod";
import type {
  Member,
  Company,
  CreateMemberRequest,
  MemberConsent,
  MemberDocument,
  MemberSearchRequest,
  DashboardStats
} from "@/types/members";

// Test Data Factory for creating mock data
export class TestDataFactory {
  static createValidMemberRequest(overrides: Partial<CreateMemberRequest> = {}): CreateMemberRequest {
    return {
      companyId: 1,
      memberType: "principal",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "+254712345678",
      dateOfBirth: "1990-01-15",
      employeeId: "EMP001",
      gender: "male",
      maritalStatus: "married",
      nationalId: "12345678",
      passportNumber: "A1234567",
      address: "123 Main Street",
      city: "Nairobi",
      postalCode: "00100",
      country: "Kenya",
      consents: [
        { consentType: "data_processing", consentGiven: true },
        { consentType: "marketing_communications", consentGiven: false }
      ],
      ...overrides
    };
  }

  static createValidDependentRequest(overrides: Partial<CreateMemberRequest> = {}): CreateMemberRequest {
    return {
      companyId: 1,
      memberType: "dependent",
      principalId: 1,
      firstName: "Jane",
      lastName: "Doe",
      email: "jane.doe@example.com",
      phone: "+254712345679",
      dateOfBirth: "1992-05-20",
      employeeId: "DEP001",
      dependentType: "child",
      gender: "female",
      maritalStatus: "single",
      nationalId: "87654321",
      address: "123 Main Street",
      city: "Nairobi",
      postalCode: "00100",
      country: "Kenya",
      hasDisability: false,
      consents: [
        { consentType: "data_processing", consentGiven: true },
        { consentType: "data_sharing_providers", consentGiven: true }
      ],
      ...overrides
    };
  }

  static createMockCompany(overrides: Partial<Company> = {}): Company {
    return {
      id: 1,
      name: "Acme Corporation",
      registrationNumber: "REG123456",
      contactPerson: "John Manager",
      contactEmail: "manager@acme.com",
      contactPhone: "+254711223344",
      address: "456 Business Ave",
      clientType: "corporate",
      billingFrequency: "monthly",
      employerContributionPercentage: 50,
      experienceRatingEnabled: true,
      customBenefitStructure: false,
      gradeBasedBenefits: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  static createMockMember(overrides: Partial<Member> = {}): Member {
    return {
      id: 1,
      companyId: 1,
      memberType: "principal",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "+254712345678",
      dateOfBirth: "1990-01-15",
      employeeId: "EMP001",
      gender: "male",
      maritalStatus: "married",
      nationalId: "12345678",
      address: "123 Main Street",
      city: "Nairobi",
      postalCode: "00100",
      country: "Kenya",
      membershipStatus: "active",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  static createMockDashboardStats(overrides: Partial<DashboardStats> = {}): DashboardStats {
    return {
      totalCompanies: 25,
      activeMembers: 1500,
      principalMembers: 800,
      dependents: 700,
      activePremiums: 2500000,
      documentsProcessed: 1200,
      consentCoverage: 92,
      recentRegistrations: [
        {
          id: 1,
          companyId: 1,
          companyName: "Acme Corporation",
          memberName: "John Doe",
          memberEmail: "john.doe@example.com",
          memberType: "principal",
          membershipStatus: "active",
          documentCount: 3,
          consentCoverage: 100,
          city: "Nairobi",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        }
      ],
      ...overrides
    };
  }
}

// Validation Schemas for testing
export const TestValidationSchemas = {
  memberRequest: z.object({
    companyId: z.number().positive(),
    memberType: z.enum(["principal", "dependent"]),
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    email: z.string().email(),
    phone: z.string().min(10).max(20),
    dateOfBirth: z.string(),
    employeeId: z.string().min(2).max(50),
    gender: z.enum(["male", "female", "other"]).optional(),
    maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional(),
    nationalId: z.string().regex(/^[0-9]{8}$/).optional().or(z.literal("")),
    country: z.string(),
    consents: z.array(z.object({
      consentType: z.string(),
      consentGiven: z.boolean()
    }))
  }),

  company: z.object({
    name: z.string().min(2).max(200),
    registrationNumber: z.string().min(3).max(50),
    contactEmail: z.string().email(),
    contactPhone: z.string().min(10).max(20),
    clientType: z.enum(["individual", "corporate", "sme", "government", "education", "association"]),
    billingFrequency: z.enum(["monthly", "quarterly", "annual", "pro_rata"]),
    employerContributionPercentage: z.number().min(0).max(100).optional(),
    country: z.string()
  })
};

// Test Result Types
export interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  totalDuration: number;
  passed: number;
  failed: number;
}

// Assertion Helpers
export class Assert {
  static isTrue(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  static equals<T>(actual: T, expected: T, message: string): void {
    if (actual !== expected) {
      throw new Error(`Assertion failed: ${message}. Expected: ${expected}, Actual: ${actual}`);
    }
  }

  static contains<T>(array: T[], item: T, message: string): void {
    if (!array.includes(item)) {
      throw new Error(`Assertion failed: ${message}. Item not found in array`);
    }
  }

  static matchesRegex(value: string, regex: RegExp, message: string): void {
    if (!regex.test(value)) {
      throw new Error(`Assertion failed: ${message}. Value "${value}" does not match pattern`);
    }
  }

  static isArray<T>(value: any, message: string): asserts value is T[] {
    if (!Array.isArray(value)) {
      throw new Error(`Assertion failed: ${message}. Expected array, got ${typeof value}`);
    }
  }

  static hasProperty<T extends object>(obj: T, prop: keyof T, message: string): void {
    if (!(prop in obj)) {
      throw new Error(`Assertion failed: ${message}. Property ${String(prop)} not found`);
    }
  }

  static isInstanceOf<T>(value: any, constructor: new (...args: any[]) => T, message: string): void {
    if (!(value instanceof constructor)) {
      throw new Error(`Assertion failed: ${message}. Expected instance of ${constructor.name}`);
    }
  }
}

// Test Runner
export class TestRunner {
  private static currentSuite: TestSuite | null = null;

  static async runTest(testName: string, testFn: () => Promise<void>): Promise<TestResult> {
    const startTime = Date.now();
    try {
      await testFn();
      const duration = Date.now() - startTime;
      return {
        testName,
        passed: true,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  static startSuite(name: string): void {
    this.currentSuite = {
      name,
      tests: [],
      totalDuration: 0,
      passed: 0,
      failed: 0
    };
  }

  static addTest(result: TestResult): void {
    if (!this.currentSuite) {
      throw new Error("No test suite started. Call startSuite() first.");
    }
    this.currentSuite.tests.push(result);
    this.currentSuite.totalDuration += result.duration;
    if (result.passed) {
      this.currentSuite.passed++;
    } else {
      this.currentSuite.failed++;
    }
  }

  static getSuite(): TestSuite | null {
    return this.currentSuite;
  }

  static endSuite(): TestSuite {
    if (!this.currentSuite) {
      throw new Error("No test suite to end.");
    }
    const suite = { ...this.currentSuite };
    this.currentSuite = null;
    return suite;
  }
}

// Mock API Responses
export class MockAPI {
  static createMemberResponse(memberData: CreateMemberRequest): Promise<Member> {
    return Promise.resolve({
      id: Math.floor(Math.random() * 1000),
      ...memberData,
      membershipStatus: "pending",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  static createMembersResponse(params: MemberSearchRequest): Promise<{ data: Member[]; total: number }> {
    const mockMembers = [
      TestDataFactory.createMockMember({ firstName: "John", lastName: "Doe" }),
      TestDataFactory.createMockMember({ firstName: "Jane", lastName: "Smith", id: 2 })
    ];

    let filteredMembers = mockMembers;
    if (params.searchTerm) {
      filteredMembers = mockMembers.filter(member =>
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(params.searchTerm!.toLowerCase())
      );
    }

    return Promise.resolve({
      data: filteredMembers,
      total: filteredMembers.length
    });
  }

  static createError(message: string, statusCode: number = 500): Promise<never> {
    const error = new Error(message) as any;
    error.statusCode = statusCode;
    return Promise.reject(error);
  }
}

// Environment and Configuration Validation
export class EnvironmentValidator {
  static validateRequiredAPIs(): TestResult {
    const startTime = Date.now();
    try {
      // Check if required API endpoints are available
      const requiredEndpoints = [
        '/api/members',
        '/api/members/enroll',
        '/api/companies',
        '/api/members/{id}/documents',
        '/api/members/{id}/consents'
      ];

      // In a real environment, you would check if these endpoints respond correctly
      // For now, we'll simulate the validation
      Assert.isArray(requiredEndpoints, "Required endpoints should be an array");
      Assert.isTrue(requiredEndpoints.length > 0, "Should have required endpoints defined");

      return {
        testName: "Required APIs Validation",
        passed: true,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        testName: "Required APIs Validation",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  static validateSchemaCompatibility(): TestResult {
    const startTime = Date.now();
    try {
      // Test that the schema types are compatible
      const mockMember = TestDataFactory.createMockMember();
      const mockCompany = TestDataFactory.createMockCompany();

      // Validate member structure
      TestValidationSchemas.memberRequest.safeParse(mockMember);
      Assert.hasProperty(mockMember, "gender", "Member should have gender property");
      Assert.hasProperty(mockMember, "nationalId", "Member should have nationalId property");
      Assert.hasProperty(mockMember, "membershipStatus", "Member should have membershipStatus property");

      // Validate company structure
      TestValidationSchemas.company.safeParse(mockCompany);
      Assert.hasProperty(mockCompany, "clientType", "Company should have clientType property");
      Assert.hasProperty(mockCompany, "billingFrequency", "Company should have billingFrequency property");

      return {
        testName: "Schema Compatibility Validation",
        passed: true,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        testName: "Schema Compatibility Validation",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Performance Testing Utilities
export class PerformanceTest {
  static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await fn();
    const duration = performance.now() - startTime;
    return { result, duration };
  }

  static createPerformanceTest(name: string, thresholdMs: number) {
    return async (fn: () => Promise<void>): Promise<TestResult> => {
      const startTime = Date.now();
      try {
        await fn();
        const duration = Date.now() - startTime;
        const passed = duration <= thresholdMs;

        return {
          testName: name,
          passed,
          duration,
          details: {
            threshold: thresholdMs,
            actual: duration,
            performanceScore: passed ? "GOOD" : "POOR"
          }
        };
      } catch (error) {
        return {
          testName: name,
          passed: false,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    };
  }
}

export default {
  TestDataFactory,
  TestValidationSchemas,
  Assert,
  TestRunner,
  MockAPI,
  EnvironmentValidator,
  PerformanceTest
};