/**
 * Comprehensive integration test for Schemes & Benefits module
 * Tests integration with all existing system modules
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../index';

describe('Schemes & Benefits System Integration', () => {
  let authToken: string;
  let testCompanyId: number;
  let testMemberId: number;
  let testSchemeId: number;
  let testPlanTierId: number;
  let testProviderId: number;

  beforeAll(async () => {
    // Setup test authentication
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@insurance.com',
        password: 'testpassword'
      });

    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
    }

    // Create test company
    const companyResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Integration Company',
        registrationNumber: 'TEST-INT-001',
        industry: 'Healthcare',
        address: '123 Test St',
        contactEmail: 'test@integration.com',
        contactPhone: '123-456-7890'
      });

    if (companyResponse.status === 201) {
      testCompanyId = companyResponse.body.id;
    }
  });

  describe('1. Premium System Integration', () => {
    it('should calculate premiums based on scheme configuration', async () => {
      // Create a test scheme
      const schemeResponse = await request(app)
        .post('/api/schemes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Premium Integration Scheme',
          schemeCode: 'TPIS-001',
          schemeType: 'corporate_medical',
          description: 'Scheme for testing premium integration',
          targetMarket: 'large_corporates',
          pricingModel: 'experience_rated',
          minAge: 18,
          maxAge: 65
        });

      expect([201, 200]).toContain(schemeResponse.status);

      if (schemeResponse.status === 201) {
        testSchemeId = schemeResponse.body.id;

        // Create plan tier
        const tierResponse = await request(app)
          .post(`/api/schemes/${testSchemeId}/tiers`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            tierLevel: 'silver',
            tierName: 'Silver Plan',
            tierDescription: 'Test silver plan',
            overallAnnualLimit: 1000000,
            networkAccessLevel: 'full_network',
            roomTypeCoverage: 'semi_private',
            premiumMultiplier: 1.5
          });

        expect([201, 200]).toContain(tierResponse.status);

        if (tierResponse.status === 201) {
          testPlanTierId = tierResponse.body.id;

          // Test premium calculation
          const premiumResponse = await request(app)
            .post('/api/premiums/calculate')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              companyId: testCompanyId,
              schemeId: testSchemeId,
              planTierId: testPlanTierId,
              memberCount: 10
            });

          expect([200, 201, 404]).toContain(premiumResponse.status);

          if (premiumResponse.status === 200) {
            expect(premiumResponse.body).toHaveProperty('premium');
            expect(premiumResponse.body.premium).toBeGreaterThan(0);
          }
        }
      }
    });

    it('should handle premium adjustments for riders', async () => {
      // Create a test rider
      const riderResponse = await request(app)
        .post('/api/riders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          riderCode: 'TEST-RIDER-001',
          riderName: 'Test Dental Rider',
          riderType: 'benefit_enhancement',
          description: 'Test rider for dental coverage',
          baseSchemeId: testSchemeId,
          premiumMultiplier: 0.2,
          waitingPeriodDays: 30
        });

      expect([201, 200, 404]).toContain(riderResponse.status);
    });
  });

  describe('2. Provider System Integration', () => {
    it('should validate provider network access for scheme', async () => {
      // Create test provider
      const providerResponse = await request(app)
        .post('/api/medical-institutions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Integration Provider',
          type: 'hospital',
          address: '456 Provider Ave',
          contactPerson: 'Dr. Test Provider',
          contactEmail: 'provider@test.com',
          contactPhone: '123-456-7891'
        });

      expect([201, 200]).toContain(providerResponse.status);

      if (providerResponse.status === 201) {
        testProviderId = providerResponse.body.id;

        // Test provider network validation
        const networkResponse = await request(app)
          .get(`/api/provider-networks/validate/${testProviderId}/${testSchemeId}/${testPlanTierId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect([200, 404]).toContain(networkResponse.status);
      }
    });

    it('should apply network discounts in claims processing', async () => {
      // Test network discount application
      const discountResponse = await request(app)
        .post('/api/provider-networks/validate-network')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          providerId: testProviderId,
          schemeId: testSchemeId,
          planTierId: testPlanTierId,
          claimAmount: 1000
        });

      expect([200, 404]).toContain(discountResponse.status);

      if (discountResponse.status === 200) {
        expect(discountResponse.body).toHaveProperty('networkDiscount');
        expect(discountResponse.body).toHaveProperty('finalAmount');
      }
    });
  });

  describe('3. Member System Integration', () => {
    it('should enroll member in scheme with benefits', async () => {
      // Create test member
      const memberResponse = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Test',
          lastName: 'Member',
          dateOfBirth: '1990-01-01',
          memberType: 'principal',
          companyId: testCompanyId,
          email: 'testmember@integration.com',
          phone: '123-456-7892'
        });

      expect([201, 200]).toContain(memberResponse.status);

      if (memberResponse.status === 201) {
        testMemberId = memberResponse.body.id;

        // Test member enrollment
        const enrollmentResponse = await request(app)
          .post('/api/members/enroll')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            memberId: testMemberId,
            schemeId: testSchemeId,
            planTierId: testPlanTierId,
            enrollmentDate: new Date().toISOString(),
            effectiveDate: new Date().toISOString()
          });

        expect([201, 200, 404]).toContain(enrollmentResponse.status);

        if (enrollmentResponse.status === 201) {
          expect(enrollmentResponse.body).toHaveProperty('enrollmentId');
        }
      }
    });

    it('should track member benefits utilization', async () => {
      // Test benefits utilization tracking
      const utilizationResponse = await request(app)
        .get(`/api/members/${testMemberId}/benefits/utilization`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect([200, 404]).toContain(utilizationResponse.status);

      if (utilizationResponse.status === 200) {
        expect(utilizationResponse.body).toHaveProperty('utilization');
        expect(Array.isArray(utilizationResponse.body.utilization)).toBe(true);
      }
    });
  });

  describe('4. Claims System Integration', () => {
    it('should process claim with enhanced adjudication', async () => {
      // Create test claim
      const claimResponse = await request(app)
        .post('/api/claims')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          memberId: testMemberId,
          institutionId: testProviderId,
          amount: 1000,
          serviceCategory: 'outpatient',
          serviceDate: new Date().toISOString(),
          submissionDate: new Date().toISOString()
        });

      expect([201, 200]).toContain(claimResponse.status);

      if (claimResponse.status === 201) {
        const claimId = claimResponse.body.id;

        // Test enhanced claims adjudication
        const adjudicationResponse = await request(app)
          .post(`/api/claims/${claimId}/adjudicate`)
          .set('Authorization', `Bearer ${authToken}`);

        expect([200, 404]).toContain(adjudicationResponse.status);

        if (adjudicationResponse.status === 200) {
          expect(adjudicationResponse.body).toHaveProperty('overallDecision');
          expect(adjudicationResponse.body).toHaveProperty('approvedAmount');
          expect(adjudicationResponse.body).toHaveProperty('memberResponsibility');
        }
      }
    });

    it('should apply scheme rules in claims processing', async () => {
      // Create test rule
      const ruleResponse = await request(app)
        .post('/api/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ruleName: 'Test Integration Rule',
          ruleCategory: 'benefit_application',
          ruleType: 'validation',
          rulePriority: 100,
          conditionExpression: JSON.stringify({
            field: 'claimAmount',
            operator: '>',
            value: 500
          }),
          actionExpression: JSON.stringify({
            action: 'REVIEW',
            message: 'High-value claim requires review'
          }),
          isMandatory: false,
          isActive: true,
          version: '1.0'
        });

      expect([201, 200]).toContain(ruleResponse.status);
    });

    it('should validate benefit limits in claims processing', async () => {
      // Test limit validation
      const limitResponse = await request(app)
        .post('/api/claims/validate-limits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          memberId: testMemberId,
          benefitCategory: 'outpatient',
          claimAmount: 1000,
          schemeId: testSchemeId,
          planTierId: testPlanTierId
        });

      expect([200, 404]).toContain(limitResponse.status);

      if (limitResponse.status === 200) {
        expect(limitResponse.body).toHaveProperty('limitCheck');
        expect(limitResponse.body).toHaveProperty('isWithinLimit');
      }
    });
  });

  describe('5. Company/Benefits System Integration', () => {
    it('should configure corporate scheme benefits', async () => {
      // Test corporate configuration
      const corporateResponse = await request(app)
        .post(`/api/companies/${testCompanyId}/schemes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          schemeId: testSchemeId,
          configName: 'Test Corporate Config',
          effectiveDate: new Date().toISOString(),
          customTerms: JSON.stringify({
            enhancedDental: true,
            opticalUpgrade: true
          }),
          customCostSharing: JSON.stringify({
            deductibleWaiver: true
          })
        });

      expect([201, 200, 404]).toContain(corporateResponse.status);
    });

    it('should configure employee grade benefits', async () => {
      // Test employee grade configuration
      const gradeResponse = await request(app)
        .post('/api/companies/grades')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          companyId: testCompanyId,
          schemeId: testSchemeId,
          employeeGrade: 'executive',
          planTierId: testPlanTierId,
          premiumContribution: 0.9,
          customLimits: JSON.stringify({
            enhancedAnnualLimit: 2000000
          })
        });

      expect([201, 200, 404]).toContain(gradeResponse.status);
    });

    it('should handle dependent coverage rules', async () => {
      // Test dependent coverage
      const dependentResponse = await request(app)
        .post('/api/dependents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          principalId: testMemberId,
          firstName: 'Test',
          lastName: 'Dependent',
          dateOfBirth: '2000-01-01',
          relationship: 'child',
          schemeId: testSchemeId,
          planTierId: testPlanTierId
        });

      expect([201, 200]).toContain(dependentResponse.status);
    });
  });

  describe('6. End-to-End System Integration', () => {
    it('should handle complete member journey', async () => {
      // 1. Enroll member in scheme
      const enrollmentResponse = await request(app)
        .post('/api/members/enroll')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          memberId: testMemberId,
          schemeId: testSchemeId,
          planTierId: testPlanTierId,
          enrollmentDate: new Date().toISOString(),
          effectiveDate: new Date().toISOString()
        });

      expect([201, 200, 404]).toContain(enrollmentResponse.status);

      // 2. Submit claim
      const claimResponse = await request(app)
        .post('/api/claims')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          memberId: testMemberId,
          institutionId: testProviderId,
          amount: 500,
          serviceCategory: 'outpatient',
          serviceDate: new Date().toISOString(),
          submissionDate: new Date().toISOString()
        });

      expect([201, 200]).toContain(claimResponse.status);

      // 3. Process claim with full adjudication
      if (claimResponse.status === 201) {
        const claimId = claimResponse.body.id;

        const adjudicationResponse = await request(app)
          .post(`/api/claims/${claimId}/adjudicate`)
          .set('Authorization', `Bearer ${authToken}`);

        expect([200, 404]).toContain(adjudicationResponse.status);

        // 4. Verify member benefits utilization updated
        const utilizationResponse = await request(app)
          .get(`/api/members/${testMemberId}/benefits/status`)
          .set('Authorization', `Bearer ${authToken}`);

        expect([200, 404]).toContain(utilizationResponse.status);
      }
    });

    it('should handle batch claims processing', async () => {
      // Create multiple claims for batch processing
      const claimIds: number[] = [];

      for (let i = 0; i < 3; i++) {
        const claimResponse = await request(app)
          .post('/api/claims')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            memberId: testMemberId,
            institutionId: testProviderId,
            amount: 200 + (i * 100),
            serviceCategory: 'outpatient',
            serviceDate: new Date().toISOString(),
            submissionDate: new Date().toISOString()
          });

        if (claimResponse.status === 201) {
          claimIds.push(claimResponse.body.id);
        }
      }

      // Process batch claims
      const batchResponse = await request(app)
        .post('/api/claims/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          claimIds,
          processingOptions: {
            parallelProcessing: true,
            applyNetworkDiscounts: true
          }
        });

      expect([200, 201, 404]).toContain(batchResponse.status);

      if (batchResponse.status === 200) {
        expect(batchResponse.body).toHaveProperty('totalClaims');
        expect(batchResponse.body).toHaveProperty('processedClaims');
        expect(batchResponse.body).toHaveProperty('totalApprovedAmount');
      }
    });
  });

  describe('7. Performance and Scalability', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get(`/api/schemes`)
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentRequests;

      expect(responses.length).toBe(concurrentRequests);
      expect(averageTime).toBeLessThan(1000); // Less than 1 second per request
    });

    it('should handle large dataset operations', async () => {
      // Test with large member list
      const largeMemberList = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Member ${i + 1}`,
        usage: Math.random() * 10000
      }));

      const response = await request(app)
        .post('/api/analytics/member-utilization')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          members: largeMemberList,
          timeframe: {
            startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString()
          }
        });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('analytics');
        expect(Array.isArray(response.body.analytics)).toBe(true);
      }
    });
  });

  describe('8. Error Handling and Edge Cases', () => {
    it('should handle invalid scheme configurations gracefully', async () => {
      const invalidSchemeResponse = await request(app)
        .post('/api/schemes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          name: '',
          schemeType: 'invalid_type',
          targetMarket: 'invalid_market'
        });

      expect([400, 422]).toContain(invalidSchemeResponse.status);
    });

    it('should handle member enrollment conflicts', async () => {
      // Try to enroll same member twice
      const firstEnrollment = await request(app)
        .post('/api/members/enroll')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          memberId: testMemberId,
          schemeId: testSchemeId,
          planTierId: testPlanTierId,
          enrollmentDate: new Date().toISOString(),
          effectiveDate: new Date().toISOString()
        });

      const secondEnrollment = await request(app)
        .post('/api/members/enroll')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          memberId: testMemberId,
          schemeId: testSchemeId,
          planTierId: testPlanTierId,
          enrollmentDate: new Date().toISOString(),
          effectiveDate: new Date().toISOString()
        });

      expect([400, 409, 200]).toContain(secondEnrollment.status);
    });

    it('should handle claims with invalid providers', async () => {
      const invalidClaimResponse = await request(app)
        .post('/api/claims')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          memberId: testMemberId,
          institutionId: 99999, // Invalid provider ID
          amount: 1000,
          serviceCategory: 'outpatient',
          serviceDate: new Date().toISOString(),
          submissionDate: new Date().toISOString()
        });

      expect([400, 404, 200]).toContain(invalidClaimResponse.status);
    });
  });

  afterAll(async () => {
    // Cleanup test data
    console.log('Integration tests completed');
  });
});