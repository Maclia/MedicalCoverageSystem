import { apiRequest } from "@/lib/queryClient";

// System integration types for cross-module data flows

interface MemberClaimsIntegration {
  memberId: number;
  eligibilityCheck?: boolean;
  coverageValidation?: boolean;
  providerValidation?: boolean;
  preAuthCheck?: boolean;
}

interface WellnessRiskIntegration {
  memberId: number;
  wellnessScoreUpdate?: boolean;
  riskRecalculation?: boolean;
  premiumAdjustment?: boolean;
  communicationTrigger?: boolean;
}

interface ProviderClaimsIntegration {
  providerId: number;
  networkValidation?: boolean;
  contractVerification?: boolean;
  performanceUpdate?: boolean;
  analyticsUpdate?: boolean;
}

interface MemberPremiumIntegration {
  memberId: number;
  premiumRecalculation?: boolean;
  riskAdjustment?: boolean;
  wellnessAdjustment?: boolean;
  schemeAdjustment?: boolean;
  communicationTrigger?: boolean;
}

interface CrossModuleNotification {
  modules: Array<"members" | "claims" | "schemes" | "providers" | "wellness" | "risk" | "premiums" | "communication" | "analytics">;
  memberId?: number;
  providerId?: number;
  companyId?: number;
  eventType: string;
  eventTitle: string;
  eventDescription: string;
  eventSeverity: "low" | "medium" | "high" | "critical";
  requiresAction?: boolean;
  actionDeadline?: string;
  recipients: Array<{
    module: string;
    endpoint: string;
    payload: any;
  }>;
}

interface SystemIntegrationResponse {
  success: boolean;
  data: any;
  message: string;
}

class SystemIntegrationAPI {
  private readonly BASE_URL = '/api/integration';

  // Member-Claims Integration

  /**
   * Get comprehensive member-claims integration data
   */
  async getMemberClaimsIntegration(request: MemberClaimsIntegration): Promise<SystemIntegrationResponse> {
    const response = await apiRequest("POST", `${this.BASE_URL}/member-claims`, {
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /**
   * Check member eligibility for claims processing
   */
  async checkMemberEligibility(memberId: number): Promise<{
    eligible: boolean;
    activePremiums: boolean;
    schemeActive: boolean;
    documentsVerified: boolean;
    benefits: Array<{
      benefitId: number;
      name: string;
      annualLimit: number;
      remainingLimit: number;
      coveragePercentage: number;
    }>;
  }> {
    const response = await this.getMemberClaimsIntegration({
      memberId,
      eligibilityCheck: true,
      coverageValidation: true,
      providerValidation: true
    });

    return {
      eligible: response.data.eligibility.active,
      activePremiums: response.data.eligibility.premiumsPaid,
      schemeActive: response.data.eligibility.schemeActive,
      documentsVerified: response.data.eligibility.documentsVerified,
      benefits: response.data.coverage?.limits || []
    };
  }

  // Wellness-Risk Integration

  /**
   * Get wellness-risk integration data
   */
  async getWellnessRiskIntegration(request: WellnessRiskIntegration): Promise<SystemIntegrationResponse> {
    const response = await apiRequest("POST", `${this.BASE_URL}/wellness-risk`, {
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /**
   * Update member wellness score and risk assessment
   */
  async updateMemberWellnessRisk(memberId: number): Promise<{
    wellnessScore: number;
    riskScore: number;
    riskCategory: 'low' | 'medium' | 'high';
    scoreChange: number;
    recommendations: string[];
  }> {
    const response = await this.getWellnessRiskIntegration({
      memberId,
      wellnessScoreUpdate: true,
      riskRecalculation: true,
      communicationTrigger: true
    });

    return {
      wellnessScore: response.data.wellnessMetrics.currentScore,
      riskScore: response.data.riskAssessment.currentScore,
      riskCategory: response.data.riskAssessment.category,
      scoreChange: response.data.riskAssessment.scoreChange,
      recommendations: []
    };
  }

  // Provider-Claims Integration

  /**
   * Get provider-claims integration data
   */
  async getProviderClaimsIntegration(request: ProviderClaimsIntegration): Promise<SystemIntegrationResponse> {
    const response = await apiRequest("POST", `${this.BASE_URL}/provider-claims`, {
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /**
   * Validate provider for claims processing
   */
  async validateProviderForClaims(providerId: number): Promise<{
    networkActive: boolean;
    contractActive: boolean;
    specialties: string[];
    reimbursementRate: number;
    qualityScore: number;
  }> {
    const response = await this.getProviderClaimsIntegration({
      providerId,
      networkValidation: true,
      contractVerification: true,
      performanceUpdate: true
    });

    return {
      networkActive: response.data.networkStatus?.active || false,
      contractActive: response.data.contractDetails?.contractStatus === 'active',
      specialties: response.data.networkStatus?.specialties || [],
      reimbursementRate: response.data.contractDetails?.reimbursementRate || 0,
      qualityScore: response.data.performanceMetrics?.qualityScore || 0
    };
  }

  // Member-Premium Integration

  /**
   * Get member-premium integration data
   */
  async getMemberPremiumIntegration(request: MemberPremiumIntegration): Promise<SystemIntegrationResponse> {
    const response = await apiRequest("POST", `${this.BASE_URL}/member-premium`, {
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /**
   * Calculate member premium with all adjustments
   */
  async calculateMemberPremium(memberId: number): Promise<{
    currentPremium: number;
    calculatedPremium: number;
    riskAdjustment: number;
    wellnessDiscount: number;
    schemeAdjustment: number;
    finalPremium: number;
  }> {
    const response = await this.getMemberPremiumIntegration({
      memberId,
      premiumRecalculation: true,
      riskAdjustment: true,
      wellnessAdjustment: true,
      schemeAdjustment: true
    });

    const calc = response.data.premiumCalculation;

    return {
      currentPremium: response.data.currentPremium?.amount || 0,
      calculatedPremium: calc.calculatedPremium,
      riskAdjustment: calc.riskAdjustment?.adjustment || 0,
      wellnessDiscount: calc.wellnessAdjustment?.amount || 0,
      schemeAdjustment: calc.schemeAdjustment?.adjustment || 0,
      finalPremium: calc.calculatedPremium
    };
  }

  // Cross-Module Notification System

  /**
   * Send cross-module notifications
   */
  async sendCrossModuleNotification(notification: CrossModuleNotification): Promise<{
    notificationId: number;
    modulesNotified: string[];
    recipientsProcessed: number;
    results: Array<{
      module: string;
      success: boolean;
      status?: number;
      error?: string;
    }>;
  }> {
    const response = await apiRequest("POST", `${this.BASE_URL}/cross-module-notification`, {
      body: JSON.stringify(notification),
    });

    const result = await response.json();
    return result.data;
  }

  /**
   * Trigger claim processing notification across modules
   */
  async triggerClaimProcessingNotification(claimId: number, memberId: number, providerId: number): Promise<void> {
    await this.sendCrossModuleNotification({
      modules: ['members', 'claims', 'providers', 'analytics'],
      memberId,
      providerId,
      eventType: 'claim_processing_initiated',
      eventTitle: 'Claim Processing Started',
      eventDescription: `Claim #${claimId} has been submitted for processing`,
      eventSeverity: 'medium',
      requiresAction: false,
      recipients: [
        {
          module: 'members',
          endpoint: '/api/members/claim-status',
          payload: { claimId, memberId, status: 'processing' }
        },
        {
          module: 'providers',
          endpoint: '/api/providers/claim-notification',
          payload: { claimId, providerId, action: 'processing' }
        }
      ]
    });
  }

  /**
   * Trigger premium payment notification
   */
  async triggerPremiumPaymentNotification(memberId: number, premiumId: number, amount: number): Promise<void> {
    await this.sendCrossModuleNotification({
      modules: ['members', 'premiums', 'communication', 'analytics'],
      memberId,
      eventType: 'premium_payment_processed',
      eventTitle: 'Premium Payment Processed',
      eventDescription: `Premium payment of ${amount} processed for member`,
      eventSeverity: 'low',
      requiresAction: false,
      recipients: [
        {
          module: 'members',
          endpoint: '/api/members/premium-update',
          payload: { memberId, premiumId, amount, status: 'paid' }
        },
        {
          module: 'communication',
          endpoint: '/api/communication/send-receipt',
          payload: { memberId, amount, type: 'premium_receipt' }
        }
      ]
    });
  }

  /**
   * Trigger wellness milestone notification
   */
  async triggerWellnessMilestoneNotification(memberId: number, wellnessScore: number, milestone: string): Promise<void> {
    await this.sendCrossModuleNotification({
      modules: ['members', 'wellness', 'risk', 'premiums'],
      memberId,
      eventType: 'wellness_milestone_achieved',
      eventTitle: 'Wellness Milestone Achieved',
      eventDescription: `Member achieved ${milestone} with wellness score ${wellnessScore}`,
      eventSeverity: 'low',
      requiresAction: false,
      recipients: [
        {
          module: 'wellness',
          endpoint: '/api/wellness/milestone-reward',
          payload: { memberId, milestone, wellnessScore }
        },
        {
          module: 'risk',
          endpoint: '/api/risk/risk-adjustment',
          payload: { memberId, wellnessScore, action: 'positive' }
        }
      ]
    });
  }

  // System Health and Status

  /**
   * Get system integration status
   */
  async getSystemStatus(): Promise<{
    timestamp: string;
    overall: string;
    modules: Record<string, {
      status: string;
      endpoints: string[];
      lastActivity: string;
    }>;
    integrations: Record<string, string>;
    metrics: {
      totalMembers: number;
      activeClaims: number;
      activeProviders: number;
      recentIntegrations: number;
    };
  }> {
    const response = await apiRequest("GET", `${this.BASE_URL}/status`);
    const result = await response.json();
    return result.data;
  }

  /**
   * Check if all system integrations are healthy
   */
  async checkSystemHealth(): Promise<{
    healthy: boolean;
    overallStatus: string;
    activeModules: string[];
    failedIntegrations: string[];
    systemMetrics: {
      members: number;
      claims: number;
      providers: number;
      integrations: number;
    };
  }> {
    const status = await this.getSystemStatus();

    const failedIntegrations = Object.entries(status.integrations)
      .filter(([_, integration]) => integration !== 'active')
      .map(([name]) => name);

    const activeModules = Object.entries(status.modules)
      .filter(([_, module]) => module.status === 'active')
      .map(([name]) => name);

    return {
      healthy: status.overall === 'healthy' && failedIntegrations.length === 0,
      overallStatus: status.overall,
      activeModules,
      failedIntegrations,
      systemMetrics: {
        members: status.metrics.totalMembers,
        claims: status.metrics.activeClaims,
        providers: status.metrics.activeProviders,
        integrations: status.metrics.recentIntegrations
      }
    };
  }

  // Utility Methods for Common Workflows

  /**
   * Complete member enrollment workflow with all integrations
   */
  async completeMemberEnrollment(memberId: number): Promise<{
    memberData: any;
    eligibilityStatus: any;
    premiumCalculation: any;
    wellnessBaseline: any;
    riskAssessment: any;
    communications: any;
  }> {
    const results = await Promise.allSettled([
      this.getMemberClaimsIntegration({ memberId, eligibilityCheck: true, coverageValidation: true }),
      this.getMemberPremiumIntegration({ memberId, premiumRecalculation: true, riskAdjustment: true }),
      this.getWellnessRiskIntegration({ memberId, wellnessScoreUpdate: true, riskRecalculation: true })
    ]);

    return {
      memberData: results[0].status === 'fulfilled' ? results[0].value.data.member : null,
      eligibilityStatus: results[0].status === 'fulfilled' ? results[0].value.data.eligibility : null,
      premiumCalculation: results[1].status === 'fulfilled' ? results[1].value.data.premiumCalculation : null,
      wellnessBaseline: results[2].status === 'fulfilled' ? results[2].value.data.wellnessMetrics : null,
      riskAssessment: results[2].status === 'fulfilled' ? results[2].value.data.riskAssessment : null,
      communications: null // Will be populated based on integration results
    };
  }

  /**
   * Complete claim submission workflow
   */
  async completeClaimSubmission(claimId: number, memberId: number, providerId: number): Promise<{
    memberEligibility: any;
    providerValidation: any;
    coverageCheck: any;
    notifications: any;
  }> {
    const results = await Promise.allSettled([
      this.checkMemberEligibility(memberId),
      this.validateProviderForClaims(providerId),
      this.getMemberClaimsIntegration({ memberId, coverageValidation: true })
    ]);

    // Send notifications for claim processing
    await this.triggerClaimProcessingNotification(claimId, memberId, providerId);

    return {
      memberEligibility: results[0].status === 'fulfilled' ? results[0].value : null,
      providerValidation: results[1].status === 'fulfilled' ? results[1].value : null,
      coverageCheck: results[2].status === 'fulfilled' ? results[2].value.data.coverage : null,
      notifications: { claimProcessingStarted: true, memberId, providerId }
    };
  }
}

export const systemIntegrationAPI = new SystemIntegrationAPI();
export default systemIntegrationAPI;