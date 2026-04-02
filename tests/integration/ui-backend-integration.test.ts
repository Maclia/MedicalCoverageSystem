// UI-Backend Integration Test for Enhanced Members & Clients Module

import { membersAPI } from "@/api/members";
import { corporateMembersAPI } from "@/api/corporate-members";
import { TestDataFactory, Assert, TestRunner } from "./test-framework";

// Mock fetch for testing
global.fetch = jest.fn();

describe("UI-Backend Integration Tests", () => {
  let testRunner: TestRunner;

  beforeEach(() => {
    testRunner = new TestRunner();
    jest.clearAllMocks();

    // Mock localStorage for auth token
    const localStorageMock = {
      getItem: jest.fn(() => 'mock-auth-token'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  TestRunner.startSuite("UI-Backend Integration Tests");

  const test1 = await TestRunner.runTest("Member API client connectivity", async () => {
    // Mock successful API response for member creation
    const mockMember = TestDataFactory.createMockMember();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockMember,
        message: "Member enrolled successfully"
      })
    });

    // Test member enrollment
    const memberRequest = TestDataFactory.createValidMemberRequest();
    const createdMember = await membersAPI.createMember(memberRequest);

    // Verify the API was called correctly
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/members/enroll',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining(JSON.stringify(memberRequest))
      })
    );

    Assert.equals(createdMember.id, mockMember.id, "Created member ID should match");
    Assert.equals(createdMember.firstName, memberRequest.firstName, "First name should match");
    Assert.isTrue(createdMember.membershipStatus === 'pending', "New member should be pending");
  });

  TestRunner.addTest(test1);

  const test2 = await TestRunner.runTest("Member lifecycle management integration", async () => {
    const memberId = 1;

    // Mock activation response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { ...TestDataFactory.createMockMember(), membershipStatus: 'active' },
        message: "Member activated successfully"
      })
    });

    // Test member activation
    const activatedMember = await membersAPI.activateMember(memberId);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/members/1/activate',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    );

    Assert.isTrue(activatedMember.membershipStatus === 'active', "Member should be activated");

    // Mock suspension response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { ...TestDataFactory.createMockMember(), membershipStatus: 'suspended' },
        message: "Member suspended successfully"
      })
    });

    // Test member suspension
    const suspendedMember = await membersAPI.suspendMember(memberId, "Non-payment of premium", "Payment overdue for 30 days");

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/members/1/suspend',
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"reason":"Non-payment of premium"')
      })
    );

    Assert.isTrue(suspendedMember.membershipStatus === 'suspended', "Member should be suspended");
  });

  TestRunner.addTest(test2);

  const test3 = await TestRunner.runTest("Document upload integration", async () => {
    const memberId = 1;
    const mockDocument = {
      id: 1,
      memberId,
      documentType: 'national_id',
      documentName: 'National ID Card',
      fileName: 'national_id.jpg',
      filePath: '/uploads/documents/national_id.jpg',
      fileSize: 1024000,
      mimeType: 'image/jpeg',
      status: 'pending',
      uploadedAt: new Date().toISOString()
    };

    // Mock document upload response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockDocument,
        message: "Document uploaded successfully"
      })
    });

    // Test document upload
    const documentData = {
      documentType: 'national_id',
      documentName: 'National ID Card',
      fileName: 'national_id.jpg',
      filePath: '/uploads/documents/national_id.jpg',
      fileSize: 1024000,
      mimeType: 'image/jpeg'
    };

    const uploadedDocument = await membersAPI.uploadDocument(memberId, documentData);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/members/1/documents',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining(JSON.stringify(documentData))
      })
    );

    Assert.equals(uploadedDocument.documentType, 'national_id', "Document type should match");
    Assert.equals(uploadedDocument.status, 'pending', "Document should be pending verification");
  });

  TestRunner.addTest(test3);

  const test4 = await TestRunner.runTest("Advanced member search integration", async () => {
    // Mock search response
    const mockSearchResults = {
      members: [
        TestDataFactory.createMockMember({ firstName: 'John', lastName: 'Doe' }),
        TestDataFactory.createMockMember({ firstName: 'Jane', lastName: 'Smith', id: 2 })
      ],
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockSearchResults
      })
    });

    // Test advanced search
    const searchParams = {
      query: 'John',
      companyId: 1,
      membershipStatus: 'active',
      gender: 'male',
      page: 1,
      limit: 20
    };

    const searchResults = await membersAPI.searchMembers(searchParams);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/members/search?query=John&companyId=1&membershipStatus=active&gender=male&page=1&limit=20',
      expect.objectContaining({
        method: 'GET'
      })
    );

    Assert.equals(searchResults.total, 2, "Should return 2 members");
    Assert.isTrue(searchResults.members.length > 0, "Should return member results");
  });

  TestRunner.addTest(test4);

  const test5 = await TestRunner.runTest("Corporate members bulk operations integration", async () => {
    const companyId = 1;
    const bulkRequest = {
      companyId,
      members: [
        TestDataFactory.createValidMemberRequest({ firstName: 'John', lastName: 'Doe' }),
        TestDataFactory.createValidMemberRequest({ firstName: 'Jane', lastName: 'Smith' })
      ],
      autoActivate: false,
      sendWelcomeNotifications: true
    };

    // Mock bulk enrollment response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          successful: [
            TestDataFactory.createMockMember({ firstName: 'John', lastName: 'Doe' }),
            TestDataFactory.createMockMember({ firstName: 'Jane', lastName: 'Smith', id: 2 })
          ],
          failed: [],
          totalProcessed: 2
        },
        message: "Bulk enrollment completed: 2 successful, 0 failed"
      })
    });

    // Test bulk enrollment
    const bulkResult = await corporateMembersAPI.bulkEnroll(bulkRequest);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/companies/1/members/bulk-enroll',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining(JSON.stringify(bulkRequest))
      })
    );

    Assert.equals(bulkResult.successful.length, 2, "Should have 2 successful enrollments");
    Assert.equals(bulkResult.failed.length, 0, "Should have 0 failed enrollments");
  });

  TestRunner.addTest(test5);

  const test6 = await TestRunner.runTest("Member eligibility check integration", async () => {
    const memberId = 1;
    const benefitId = 1;

    // Mock eligibility response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          eligible: true,
          coverageAmount: 500000,
          limitations: ['Pre-existing conditions excluded for 6 months'],
          exclusions: ['Cosmetic procedures'],
          requirements: ['Referral from primary care physician']
        }
      })
    });

    // Test eligibility check
    const eligibility = await membersAPI.checkEligibility(memberId, benefitId);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/members/1/eligibility?benefitId=1',
      expect.objectContaining({
        method: 'GET'
      })
    );

    Assert.isTrue(eligibility.eligible, "Member should be eligible");
    Assert.equals(eligibility.coverageAmount, 500000, "Coverage amount should match");
    Assert.isTrue(eligibility.limitations!.length > 0, "Should have limitations");
  });

  TestRunner.addTest(test6);

  const test7 = await TestRunner.runTest("Error handling integration", async () => {
    // Mock API error response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({
        success: false,
        error: "Validation failed",
        details: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'phone', message: 'Phone number is required' }
        ]
      })
    });

    // Test error handling
    try {
      await membersAPI.createMember({
        companyId: 1,
        memberType: 'principal',
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email',
        phone: '',
        dateOfBirth: '1990-01-01',
        employeeId: 'EMP001'
      });
      Assert.isTrue(false, "Should have thrown an error");
    } catch (error: any) {
      Assert.isTrue(error.message.includes('Validation failed'), "Should include validation error message");
    }
  });

  TestRunner.addTest(test7);

  const test8 = await TestRunner.runTest("Communication integration", async () => {
    const memberId = 1;
    const mockCommunication = {
      id: 1,
      memberId,
      communicationType: 'enrollment_confirmation',
      channel: 'email',
      subject: 'Welcome to Your Health Insurance',
      content: 'Your enrollment has been confirmed.',
      status: 'sent',
      sentAt: new Date().toISOString()
    };

    // Mock notification response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockCommunication,
        message: "Notification sent successfully"
      })
    });

    // Test sending notification
    const notification = await membersAPI.sendMemberNotification(memberId, 'enrollment_confirmation', {
      channel: 'email',
      subject: 'Welcome to Your Health Insurance',
      content: 'Your enrollment has been confirmed.'
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/members/1/notify',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining('"communicationType":"enrollment_confirmation"')
      })
    );

    Assert.equals(notification.status, 'sent', "Communication should be sent");
    Assert.equals(notification.channel, 'email', "Channel should match");
  });

  TestRunner.addTest(test8);

  const testSuite = TestRunner.endSuite();
  console.log("UI-Backend Integration Test Suite Results:");
  console.log(`- Total Tests: ${testSuite.tests.length}`);
  console.log(`- Passed: ${testSuite.passed}`);
  console.log(`- Failed: ${testSuite.failed}`);
  console.log(`- Duration: ${testSuite.totalDuration}ms`);

  return testSuite;
});