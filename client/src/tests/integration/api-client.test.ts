// Integration Tests for Enhanced Members API Client

import { membersAPI } from "@/api/members";
import { TestDataFactory, Assert, TestRunner, PerformanceTest } from "./test-framework";
import type {
  Member,
  Company,
  CreateMemberRequest,
  MemberSearchRequest,
  BulkMemberRequest
} from "@/types/members";

// Mock fetch for testing
global.fetch = jest.fn();

describe("Enhanced Members API Client Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  TestRunner.startSuite("Enhanced Members API Client Tests");

  describe("Member Management API", () => {
    const test = await TestRunner.runTest("Create member with enhanced fields", async () => {
      const mockMemberData = TestDataFactory.createValidMemberRequest();
      const mockResponse = TestDataFactory.createMockMember(mockMemberData);

      // Mock successful fetch response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockResponse
        })
      });

      const result = await membersAPI.createMember(mockMemberData);

      // Verify API was called correctly
      expect(global.fetch).toHaveBeenCalledWith("/api/members/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(mockMemberData)
      });

      // Verify response data structure
      Assert.isTrue(result.id !== undefined, "Response should include member ID");
      Assert.equals(result.firstName, mockMemberData.firstName, "First name should match");
      Assert.equals(result.gender, mockMemberData.gender, "Gender should match");
      Assert.equals(result.nationalId, mockMemberData.nationalId, "National ID should match");
    });

    TestRunner.addTest(test);

    const test2 = await TestRunner.runTest("Search members with enhanced filters", async () => {
      const searchParams: MemberSearchRequest = {
        searchTerm: "John",
        gender: "male",
        hasDisability: false,
        city: "Nairobi",
        page: 1,
        limit: 10
      };

      const mockResponse = {
        members: [
          TestDataFactory.createMockMember({ firstName: "John", gender: "male", city: "Nairobi" }),
          TestDataFactory.createMockMember({ firstName: "Johnny", gender: "male", city: "Nairobi", id: 2 })
        ],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await membersAPI.getMembers(searchParams);

      // Verify query parameters were built correctly
      expect(global.fetch).toHaveBeenCalledWith("/api/members/searchTerm=John&gender=male&hasDisability=false&city=Nairobi&page=1&limit=10", {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });

      // Verify response structure
      Assert.isArray(result.members, "Response should contain members array");
      Assert.equals(result.members.length, 2, "Should return 2 members");
      Assert.equals(result.total, 2, "Total count should be 2");
      Assert.equals(result.page, 1, "Page should be 1");

      // Verify filter results
      result.members.forEach(member => {
        Assert.isTrue(member.firstName.toLowerCase().includes("john"), "All members should match search term");
        Assert.equals(member.gender, "male", "All members should be male");
        Assert.equals(member.city, "Nairobi", "All members should be from Nairobi");
      });
    });

    TestRunner.addTest(test2);

    const test3 = await TestRunner.runTest("Update member with enhanced fields", async () => {
      const updateData = {
        id: 1,
        gender: "female",
        maritalStatus: "divorced",
        address: "456 New Address",
        city: "Mombasa",
        isActive: true
      };

      const mockResponse = TestDataFactory.createMockMember(updateData);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockResponse
        })
      });

      const result = await membersAPI.updateMember(updateData);

      // Verify API was called correctly
      expect(global.fetch).toHaveBeenCalledWith("/api/members/1", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          gender: "female",
          maritalStatus: "divorced",
          address: "456 New Address",
          city: "Mombasa",
          isActive: true
        })
      });

      // Verify updated fields
      Assert.equals(result.gender, "female", "Gender should be updated");
      Assert.equals(result.maritalStatus, "divorced", "Marital status should be updated");
      Assert.equals(result.city, "Mombasa", "City should be updated");
    });

    TestRunner.addTest(test3);

    const test4 = await TestRunner.runTest("Member lifecycle operations", async () => {
      const mockResponse = TestDataFactory.createMockMember({
        membershipStatus: "suspended"
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockResponse
        })
      });

      const result = await membersAPI.suspendMember(1, "Non-payment of premiums");

      // Verify API was called correctly
      expect(global.fetch).toHaveBeenCalledWith("/api/members/lifecycle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          memberId: 1,
          action: "suspend",
          reason: "Non-payment of premiums"
        })
      });

      Assert.equals(result.membershipStatus, "suspended", "Member should be suspended");
    });

    TestRunner.addTest(test4);
  });

  describe("Document Management API", () => {
    const test5 = await TestRunner.runTest("Upload member document", async () => {
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
      const documentData = {
        documentType: "kyc",
        documentName: "ID Card",
        description: "Front of ID card",
        isRequired: true,
        expiryDate: "2025-12-31"
      };

      const mockDocument = {
        id: 1,
        memberId: 1,
        documentType: "kyc",
        documentName: "ID Card",
        fileName: "test.jpg",
        filePath: "/documents/1/test.jpg",
        fileSize: 1024,
        mimeType: "image/jpeg",
        isRequired: true,
        isVerified: false,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 1,
        isDeleted: false
      };

      // Mock FormData and fetch
      const mockFormData = new FormData();
      mockFormData.append('file', file);
      mockFormData.append('documentType', documentData.documentType);
      mockFormData.append('documentName', documentData.documentName);

      // Mock localStorage for auth token
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(() => 'mock-token'),
          setItem: jest.fn(),
          removeItem: jest.fn()
        },
        writable: true
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockDocument)
      });

      const result = await membersAPI.uploadDocument(1, file, documentData);

      // Verify API was called with FormData
      expect(global.fetch).toHaveBeenCalledWith("/api/members/1/documents", {
        method: "POST",
        body: mockFormData,
        headers: {
          "Authorization": "Bearer mock-token"
        }
      });

      // Verify response
      Assert.equals(result.documentType, "kyc", "Document type should match");
      Assert.equals(result.fileName, "test.jpg", "File name should match");
      Assert.equals(result.memberId, 1, "Member ID should match");
    });

    TestRunner.addTest(test5);

    const test6 = await TestRunner.runTest("Verify document", async () => {
      const verificationData = {
        isVerified: true,
        notes: "Document verified and approved"
      };

      const mockDocument = TestDataFactory.createMockMember({
        isActive: true
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { ...mockDocument, isVerified: true, verificationDate: new Date().toISOString() }
        })
      });

      const result = await membersAPI.verifyDocument(1, verificationData);

      // Verify API was called correctly
      expect(global.fetch).toHaveBeenCalledWith("/api/documents/1/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(verificationData)
      });

      // Note: This would verify the document response in a real implementation
    });

    TestRunner.addTest(test6);
  });

  describe("Consent Management API", () => {
    const test7 = await TestRunner.runTest("Update member consent", async () => {
      const consentData = {
        memberId: 1,
        consentType: "data_processing",
        consentGiven: true,
        consentText: "I consent to data processing",
        expiryDate: "2025-12-31"
      };

      const mockConsent = {
        id: 1,
        memberId: 1,
        consentType: "data_processing",
        consentGiven: true,
        consentDate: new Date().toISOString(),
        expiryDate: "2025-12-31",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConsent)
      });

      const result = await membersAPI.updateConsent(1, consentData);

      // Verify API was called correctly
      expect(global.fetch).toHaveBeenCalledWith("/api/members/1/consents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(consentData)
      });

      // Verify response
      Assert.equals(result.memberId, 1, "Member ID should match");
      Assert.equals(result.consentType, "data_processing", "Consent type should match");
      Assert.isTrue(result.consentGiven, "Consent should be granted");
    });

    TestRunner.addTest(test7);

    const test8 = await TestRunner.runTest("Bulk consent operations", async () => {
      const bulkConsentRequest = {
        memberIds: [1, 2, 3],
        consentType: "marketing_communications",
        action: "grant",
        message: "Marketing consent granted for compliance update"
      };

      const mockResponse = {
        success: true,
        processed: 3,
        failed: 0,
        errors: []
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await membersAPI.bulkConsentOperation(bulkConsentRequest);

      // Verify API was called correctly
      expect(global.fetch).toHaveBeenCalledWith("/api/consents/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(bulkConsentRequest)
      });

      // Verify response
      Assert.equals(result.processed, 3, "Should process 3 members");
      Assert.equals(result.failed, 0, "Should have no failures");
      Assert.isArray(result.errors, "Errors should be an array");
      Assert.isTrue(result.errors.length === 0, "Should have no error messages");
    });

    TestRunner.addTest(test8);
  });

  describe("Bulk Operations API", () => {
    const test9 = await TestRunner.runTest("Bulk member creation", async () => {
      const bulkRequest: BulkMemberRequest = {
        companyId: 1,
        members: [
          TestDataFactory.createValidMemberRequest({ firstName: "John", lastName: "Doe" }),
          TestDataFactory.createValidMemberRequest({ firstName: "Jane", lastName: "Smith" })
        ],
        validateOnly: false
      };

      const mockResponse = {
        success: true,
        processed: 2,
        failed: 0,
        errors: [],
        results: [
          TestDataFactory.createMockMember({ firstName: "John", lastName: "Doe" }),
          TestDataFactory.createMockMember({ firstName: "Jane", lastName: "Smith", id: 2 })
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await membersAPI.bulkOperation(bulkRequest);

      // Verify API was called correctly
      expect(global.fetch).toHaveBeenCalledWith("/api/members/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(bulkRequest)
      });

      // Verify response
      Assert.equals(result.processed, 2, "Should process 2 members");
      Assert.equals(result.failed, 0, "Should have no failures");
      Assert.isArray(result.results, "Results should be an array");
      Assert.isTrue(result.results.length === 2, "Should have 2 results");
    });

    TestRunner.addTest(test9);
  });

  describe("Error Handling", () => {
    const test10 = await TestRunner.runTest("API error handling", async () => {
      const mockError = new Error("Validation failed: Invalid email format");
      (mockError as any).statusCode = 400;

      (global.fetch as jest.Mock).mockRejectedValue(mockError);

      try {
        await membersAPI.createMember(TestDataFactory.createValidMemberRequest());
        Assert.isTrue(false, "Should have thrown an error");
      } catch (error) {
        Assert.equals(error.message, "Validation failed: Invalid email format", "Should throw the correct error");
      }
    });

    TestRunner.addTest(test10);

    const test11 = await TestRunner.runTest("Network error handling", async () => {
      const mockNetworkError = new Error("Network error: Failed to fetch");
      (mockNetworkError as any).name = "TypeError";

      (global.fetch as jest.Mock).mockRejectedValue(mockNetworkError);

      try {
        await membersAPI.getMember(1);
        Assert.isTrue(false, "Should have thrown a network error");
      } catch (error) {
        Assert.equals(error.message, "Network error: Failed to fetch", "Should handle network error correctly");
      }
    });

    TestRunner.addTest(test11);
  });

  describe("Performance Tests", () => {
    const test12 = await PerformanceTest.createPerformanceTest("API response time should be under 1000ms", 1000)(async () => {
      const mockResponse = {
        members: Array.from({ length: 50 }, (_, i) =>
          TestDataFactory.createMockMember({ id: i + 1, firstName: `Member${i + 1}` })
        ),
        total: 50,
        page: 1,
        limit: 50,
        totalPages: 1
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await membersAPI.getMembers({
        page: 1,
        limit: 50
      });

      // Verify large dataset handling
      Assert.isArray(result.members, "Should return members array");
      Assert.equals(result.members.length, 50, "Should return 50 members");
    });

    TestRunner.addTest(test12);
  });

  describe("Dashboard Statistics API", () => {
    const test13 = await TestRunner.runTest("Get dashboard statistics with enhanced metrics", async () => {
      const mockStats = TestDataFactory.createMockDashboardStats();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStats)
      });

      const result = await membersAPI.getDashboardStats();

      // Verify API call
      expect(global.fetch).toHaveBeenCalledWith("/api/dashboard/stats", {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });

      // Verify enhanced metrics
      Assert.isTrue(result.consentCoverage !== undefined, "Should include consent coverage");
      Assert.isTrue(result.documentsProcessed !== undefined, "Should include documents processed");
      Assert.isTrue(result.activeMembers !== undefined, "Should include active members");
      Assert.isArray(result.recentRegistrations, "Should include recent registrations");
    });

    TestRunner.addTest(test13);
  });

  const testSuite = TestRunner.endSuite();
  console.log("Enhanced Members API Client Test Suite Results:");
  console.log(`- Total Tests: ${testSuite.tests.length}`);
  console.log(`- Passed: ${testSuite.passed}`);
  console.log(`- Failed: ${testSuite.failed}`);
  console.log(`- Duration: ${testSuite.totalDuration}ms`);

  if (testSuite.failed > 0) {
    console.log("\nFailed Tests:");
    testSuite.tests.filter(test => !test.passed).forEach(test => {
      console.log(`- ${test.testName}: ${test.error}`);
    });
  }

  return testSuite;
});