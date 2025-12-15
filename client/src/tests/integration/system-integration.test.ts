// Comprehensive System Integration Tests
// Tests all cross-module integrations and data flows

import { systemIntegrationAPI } from "@/api/system-integration";
import { membersAPI } from "@/api/members";
import { TestDataFactory, Assert, TestRunner } from "./test-framework";
import { z } from "zod";

// Mock fetch for testing
global.fetch = jest.fn();

describe("System Integration Tests", () => {
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

  TestRunner.startSuite("System Integration Tests");

  // Test 1: Member-Claims Integration
  const test1 = await TestRunner.runTest("Member-Claims Integration Data Flow", async () => {
    const memberId = 1;

    // Mock comprehensive member-claims integration response
    const mockMemberClaimsResponse = {
      success: true,
      data: {
        member: TestDataFactory.createMockMember({
          id: memberId,
          membershipStatus: 'active'
        }),
        eligibility: {
          active: true,
          premiumsPaid: true,
          schemeActive: true,
          documentsVerified: true,
          recentClaimsImpact: 2
        },
        coverage: {
          scheme: {
            id: 1,
            name: 'Comprehensive Health Plan',
            basePremium: 5000
          },
          benefits: [
            {
              benefitId: 1,
              annualLimit: 100000,
              remainingLimit: 85000,
              coveragePercentage: 80
            }
          ],
          limits: [
            {
              benefitId: 1,
              annualLimit: 100000,
              remainingLimit: 85000,
              coveragePercentage: 80
            }
          ]
        },
        recentClaims: [
          {
            id: 1,
            claimNumber: 'CLM-2024-001',
            status: 'approved',
            amount: 15000,
            serviceDate: '2024-01-15',
            processingTime: 3
          }
        ],
        integrationStatus: {
          memberDataSync: true,
          eligibilityValidated: true,
          coverageValidated: true,
          providerNetworkActive: true,
          preAuthRequired: false
        }
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMemberClaimsResponse
    });

    // Test member eligibility check
    const eligibilityResult = await systemIntegrationAPI.getMemberClaimsIntegration({
      memberId,
      eligibilityCheck: true,
      coverageValidation: true,
      providerValidation: true
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/integration/member-claims',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"memberId":1')
      })
    );

    Assert.equals(eligibilityResult.data.member.id, memberId, "Member ID should match");
    Assert.isTrue(eligibilityResult.data.eligibility.active, "Member should be eligible");
    Assert.isTrue(eligibilityResult.data.coverage.benefits.length > 0, "Should have available benefits");
    Assert.isTrue(eligibilityResult.data.integrationStatus.memberDataSync, "Member data should be synced");
  });

  TestRunner.addTest(test1);

  // Test 2: Wellness-Risk Integration
  const test2 = await TestRunner.runTest("Wellness-Risk Integration Workflow", async () => {
    const memberId = 1;

    // Mock wellness-risk integration response
    const mockWellnessRiskResponse = {
      success: true,
      data: {
        member: TestDataFactory.createMockMember({ id: memberId }),
        wellnessMetrics: {
          currentScore: 75,
          activities: 12,
          lastActivity: '2024-01-20T10:30:00Z',
          scoreChange: 5
        },
        riskAssessment: {
          currentScore: 45,
          category: 'medium',
          previousScore: 50,
          scoreChange: -5
        },
        integrationActions: {
          wellnessScoreUpdated: true,
          riskAssessmentUpdated: true,
          communicationSent: true,
          premiumAdjustmentNeeded: false
        }
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockWellnessRiskResponse
    });

    // Test wellness-risk integration
    const wellnessRiskResult = await systemIntegrationAPI.getWellnessRiskIntegration({
      memberId,
      wellnessScoreUpdate: true,
      riskRecalculation: true,
      communicationTrigger: true
    });

    Assert.equals(wellnessRiskResult.data.wellnessMetrics.currentScore, 75, "Wellness score should be 75");
    Assert.equals(wellnessRiskResult.data.riskAssessment.category, 'medium', "Risk category should be medium");
    Assert.isTrue(wellnessRiskResult.data.integrationActions.riskAssessmentUpdated, "Risk assessment should be updated");
    Assert.isTrue(wellnessRiskResult.data.integrationActions.communicationSent, "Communication should be sent");
  });

  TestRunner.addTest(test2);

  // Test 3: Provider-Claims Integration
  const test3 = await TestRunner.runTest("Provider-Claims Integration Validation", async () => {
    const providerId = 1;

    // Mock provider-claims integration response
    const mockProviderClaimsResponse = {
      success: true,
      data: {
        provider: {
          id: providerId,
          name: 'Nairobi General Hospital',
          networkStatus: 'active'
        },
        networkStatus: {
          active: true,
          specialties: ['Cardiology', 'Orthopedics'],
          locations: ['Nairobi', 'Mombasa'],
          participationLevel: 'full',
          networkTier: 'tier1'
        },
        contractDetails: {
          contractStatus: 'active',
          contractType: 'standard',
          reimbursementRate: 85,
          capitationRate: null,
          effectiveDate: '2024-01-01',
          expiryDate: '2024-12-31',
          negotiatedRates: true
        },
        performanceMetrics: {
          totalClaims: 150,
          averageProcessingTime: 2.5,
          denialRate: 5,
          patientSatisfaction: 4.2,
          qualityScore: 4.5,
          complianceScore: 4.8
        },
        recentClaims: [
          {
            id: 1,
            claimNumber: 'CLM-2024-001',
            memberName: 'John Doe',
            serviceType: 'Consultation',
            amount: 5000,
            status: 'approved',
            serviceDate: '2024-01-15'
          }
        ],
        integrationStatus: {
          networkValidated: true,
          contractVerified: true,
          performanceUpdated: true,
          analyticsUpdated: true,
          claimsIntegration: true
        }
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProviderClaimsResponse
    });

    // Test provider validation
    const providerResult = await systemIntegrationAPI.getProviderClaimsIntegration({
      providerId,
      networkValidation: true,
      contractVerification: true,
      performanceUpdate: true
    });

    Assert.isTrue(providerResult.data.networkStatus.active, "Provider should be in active network");
    Assert.equals(providerResult.data.contractDetails.reimbursementRate, 85, "Reimbursement rate should be 85%");
    Assert.isTrue(providerResult.data.integrationStatus.claimsIntegration, "Claims integration should be active");
  });

  TestRunner.addTest(test3);

  // Test 4: Member-Premium Integration
  const test4 = await TestRunner.runTest("Member-Premium Integration Calculation", async () => {
    const memberId = 1;

    // Mock member-premium integration response
    const mockMemberPremiumResponse = {
      success: true,
      data: {
        member: TestDataFactory.createMockMember({ id: memberId }),
        currentPremium: {
          id: 1,
          amount: 5000,
          status: 'active'
        },
        premiumCalculation: {
          basePremium: 5000,
          riskAdjustment: {
            score: 55,
            multiplier: 1.1,
            adjustment: 500
          },
          wellnessAdjustment: {
            score: 75,
            discount: 0.10,
            amount: 500
          },
          schemeAdjustment: {
            multiplier: 1.2,
            adjustment: 1000
          },
          calculatedPremium: 6000,
          currentPremium: 5000,
          difference: 1000
        },
        integrationActions: {
          premiumRecalculated: true,
          riskAdjusted: true,
          wellnessAdjusted: true,
          schemeAdjusted: true,
          communicationTriggered: false
        }
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMemberPremiumResponse
    });

    // Test premium calculation
    const premiumResult = await systemIntegrationAPI.getMemberPremiumIntegration({
      memberId,
      premiumRecalculation: true,
      riskAdjustment: true,
      wellnessAdjustment: true,
      schemeAdjustment: true
    });

    Assert.equals(premiumResult.data.premiumCalculation.calculatedPremium, 6000, "Calculated premium should be 6000");
    Assert.equals(premiumResult.data.premiumCalculation.riskAdjustment.adjustment, 500, "Risk adjustment should be 500");
    Assert.equals(premiumResult.data.premiumCalculation.wellnessAdjustment.discount, 0.10, "Wellness discount should be 10%");
  });

  TestRunner.addTest(test4);

  // Test 5: Cross-Module Notifications
  const test5 = await TestRunner.runTest("Cross-Module Notification System", async () => {
    const notificationData = {
      modules: ["members", "claims", "providers"],
      memberId: 1,
      providerId: 1,
      eventType: "claim_processing_initiated",
      eventTitle: "Claim Processing Started",
      eventDescription: "Claim has been submitted for processing",
      eventSeverity: "medium" as const,
      requiresAction: false,
      recipients: [
        {
          module: "members",
          endpoint: "/api/members/claim-status",
          payload: { claimId: 1, memberId: 1, status: "processing" }
        },
        {
          module: "providers",
          endpoint: "/api/providers/claim-notification",
          payload: { claimId: 1, providerId: 1, action: "processing" }
        }
      ]
    };

    // Mock notification response
    const mockNotificationResponse = {
      success: true,
      data: {
        notificationId: 123,
        modulesNotified: ["members", "claims", "providers"],
        recipientsProcessed: 2,
        notificationResults: [
          {
            module: "members",
            endpoint: "/api/members/claim-status",
            success: true,
            status: 200
          },
          {
            module: "providers",
            endpoint: "/api/providers/claim-notification",
            success: true,
            status: 200
          }
        ]
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockNotificationResponse
    });

    // Test cross-module notification
    const notificationResult = await systemIntegrationAPI.sendCrossModuleNotification(notificationData);

    Assert.equals(notificationResult.notificationId, 123, "Notification ID should be 123");
    Assert.equals(notificationResult.modulesNotified.length, 3, "Should notify 3 modules");
    Assert.equals(notificationResult.recipientsProcessed, 2, "Should process 2 recipients");
    Assert.isTrue(notificationResult.results.every(r => r.success), "All notifications should succeed");
  });

  TestRunner.addTest(test5);

  // Test 6: Complete Member Enrollment Workflow
  const test6 = await TestRunner.runTest("Complete Member Enrollment Workflow", async () => {
    const memberId = 1;

    // Mock all integration responses for complete workflow
    const mockWorkflowResponses = [
      {
        success: true,
        data: {
          member: TestDataFactory.createMockMember({ id: memberId }),
          eligibility: { active: true, premiumsPaid: true, schemeActive: true },
          coverage: { benefits: [{ benefitId: 1, annualLimit: 100000 }] }
        }
      },
      {
        success: true,
        data: {
          premiumCalculation: {
            calculatedPremium: 5000,
            basePremium: 5000,
            riskAdjustment: { adjustment: 0 },
            wellnessAdjustment: { amount: 0 }
          }
        }
      },
      {
        success: true,
        data: {
          wellnessMetrics: { currentScore: 50, activities: 0 },
          riskAssessment: { currentScore: 50, category: 'medium' }
        }
      }
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockWorkflowResponses[0]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockWorkflowResponses[1]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockWorkflowResponses[2]
      });

    // Test complete enrollment workflow
    const workflowResult = await systemIntegrationAPI.completeMemberEnrollment(memberId);

    Assert.equals(workflowResult.memberData.id, memberId, "Member data should be returned");
    Assert.isTrue(workflowResult.eligibilityStatus.active, "Member should be eligible");
    Assert.equals(workflowResult.premiumCalculation.calculatedPremium, 5000, "Premium should be calculated");
    Assert.equals(workflowResult.wellnessBaseline.currentScore, 50, "Wellness baseline should be set");
    Assert.equals(workflowResult.riskAssessment.currentScore, 50, "Risk assessment should be complete");

    // Verify all API calls were made
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/integration/member-claims',
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/integration/member-premium',
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/integration/wellness-risk',
      expect.any(Object)
    );
  });

  TestRunner.addTest(test6);

  // Test 7: System Health Check
  const test7 = await TestRunner.runTest("System Health and Integration Status", async () => {
    // Mock system status response
    const mockSystemStatus = {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        overall: 'healthy',
        modules: {
          members: {
            status: 'active',
            endpoints: ['/api/members', '/api/companies'],
            lastActivity: new Date().toISOString()
          },
          claims: {
            status: 'active',
            endpoints: ['/api/claims'],
            lastActivity: new Date().toISOString()
          },
          schemes: {
            status: 'active',
            endpoints: ['/api/schemes'],
            lastActivity: new Date().toISOString()
          },
          providers: {
            status: 'active',
            endpoints: ['/api/providers'],
            lastActivity: new Date().toISOString()
          }
        },
        integrations: {
          member_claims: 'active',
          wellness_risk: 'active',
          provider_claims: 'active',
          member_premium: 'active'
        },
        metrics: {
          totalMembers: 1500,
          activeClaims: 45,
          activeProviders: 120,
          recentIntegrations: 25
        }
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSystemStatus
    });

    // Test system health check
    const healthResult = await systemIntegrationAPI.checkSystemHealth();

    Assert.isTrue(healthResult.healthy, "System should be healthy");
    Assert.equals(healthResult.overallStatus, 'healthy', "Overall status should be healthy");
    Assert.isTrue(healthResult.activeModules.length >= 4, "Should have at least 4 active modules");
    Assert.equals(healthResult.failedIntegrations.length, 0, "Should have no failed integrations");
    Assert.isTrue(healthResult.systemMetrics.members > 0, "Should have member metrics");
    Assert.isTrue(healthResult.systemMetrics.claims >= 0, "Should have claims metrics");
    Assert.isTrue(healthResult.systemMetrics.providers > 0, "Should have provider metrics");
  });

  TestRunner.addTest(test7);

  // Test 8: Claim Submission Workflow Integration
  const test8 = await TestRunner.runTest("Complete Claim Submission Workflow", async () => {
    const claimId = 1;
    const memberId = 1;
    const providerId = 1;

    // Mock claim workflow responses
    const mockClaimWorkflowResponses = [
      {
        eligible: true,
        activePremiums: true,
        schemeActive: true,
        documentsVerified: true,
        benefits: [{ benefitId: 1, annualLimit: 100000, remainingLimit: 85000, coveragePercentage: 80 }]
      },
      {
        networkActive: true,
        contractActive: true,
        specialties: ['Cardiology'],
        reimbursementRate: 85,
        qualityScore: 4.5
      },
      {
        success: true,
        data: {
          coverage: {
            benefits: [{ benefitId: 1, coveragePercentage: 80 }],
            limits: [{ benefitId: 1, remainingLimit: 85000 }]
          }
        }
      }
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockClaimWorkflowResponses[0] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockClaimWorkflowResponses[1] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClaimWorkflowResponses[2]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            notificationId: 456,
            modulesNotified: ['members', 'claims', 'providers'],
            recipientsProcessed: 2
          }
        })
      });

    // Test complete claim submission workflow
    const claimWorkflowResult = await systemIntegrationAPI.completeClaimSubmission(claimId, memberId, providerId);

    Assert.isTrue(claimWorkflowResult.memberEligibility.eligible, "Member should be eligible for claims");
    Assert.isTrue(claimWorkflowResult.providerValidation.networkActive, "Provider should be in active network");
    Assert.isTrue(claimWorkflowResult.notifications.claimProcessingStarted, "Claim processing notifications should be sent");

    // Verify API calls for notifications
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/integration/cross-module-notification',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('claim_processing_initiated')
      })
    );
  });

  TestRunner.addTest(test8);

  // Test 9: Data Consistency Across Modules
  const test9 = await TestRunner.runTest("Data Consistency Across Integrated Modules", async () => {
    const memberId = 1;

    // Test that member data is consistent across all integrations
    const mockConsistentMember = TestDataFactory.createMockMember({
      id: memberId,
      firstName: 'John',
      lastName: 'Doe',
      membershipStatus: 'active',
      dateOfBirth: '1990-01-15'
    });

    // Mock responses from different modules
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            member: mockConsistentMember,
            eligibility: { active: true }
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            member: mockConsistentMember,
            wellnessMetrics: { currentScore: 75 }
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            member: mockConsistentMember,
            premiumCalculation: { calculatedPremium: 5000 }
          }
        })
      });

    // Test data consistency
    const [memberClaims, wellnessRisk, memberPremium] = await Promise.all([
      systemIntegrationAPI.getMemberClaimsIntegration({ memberId }),
      systemIntegrationAPI.getWellnessRiskIntegration({ memberId }),
      systemIntegrationAPI.getMemberPremiumIntegration({ memberId })
    ]);

    // Verify member data is consistent across all modules
    Assert.equals(memberClaims.data.member.id, wellnessRisk.data.member.id, "Member ID should be consistent");
    Assert.equals(memberClaims.data.member.firstName, memberPremium.data.member.firstName, "Member name should be consistent");
    Assert.equals(memberClaims.data.member.membershipStatus, memberPremium.data.member.membershipStatus, "Member status should be consistent");

    // Verify each module has its specific data
    Assert.isNotUndefined(memberClaims.data.eligibility, "Member-Claims should have eligibility data");
    Assert.isNotUndefined(wellnessRisk.data.wellnessMetrics, "Wellness-Risk should have wellness data");
    Assert.isNotUndefined(memberPremium.data.premiumCalculation, "Member-Premium should have premium data");
  });

  TestRunner.addTest(test9);

  // Test 10: Error Handling and Recovery
  const test10 = await TestRunner.runTest("Integration Error Handling and Recovery", async () => {
    const memberId = 1;

    // Mock partial failure scenario
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            member: TestDataFactory.createMockMember({ id: memberId }),
            eligibility: { active: true }
          }
        })
      })
      .mockRejectedValueOnce(new Error("Wellness service unavailable"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            member: TestDataFactory.createMockMember({ id: memberId }),
            premiumCalculation: { calculatedPremium: 5000 }
          }
        })
      });

    // Test error handling in complete enrollment workflow
    const workflowResult = await systemIntegrationAPI.completeMemberEnrollment(memberId);

    // Should still get partial results despite one module failure
    Assert.isNotUndefined(workflowResult.memberData, "Member data should still be retrieved");
    Assert.isNotUndefined(workflowResult.eligibilityStatus, "Eligibility should still be checked");
    Assert.isNotUndefined(workflowResult.premiumCalculation, "Premium should still be calculated");
    Assert.equals(workflowResult.wellnessBaseline, null, "Wellness data should be null due to error");

    // Verify graceful degradation
    expect(global.fetch).toHaveBeenCalledTimes(3); // Should still attempt all calls
  });

  TestRunner.addTest(test10);

  const testSuite = TestRunner.endSuite();
  console.log("System Integration Test Suite Results:");
  console.log(`- Total Tests: ${testSuite.tests.length}`);
  console.log(`- Passed: ${testSuite.passed}`);
  console.log(`- Failed: ${testSuite.failed}`);
  console.log(`- Duration: ${testSuite.totalDuration}ms`);

  return testSuite;
});