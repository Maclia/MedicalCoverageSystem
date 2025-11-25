import { db } from '../db';
import {
  providerNetworks,
  providerNetworkAssignments,
  medicalInstitutions,
  providerProcedureRates,
  medicalProcedures
} from '../../shared/schema.js';

export class ProviderNetworkService {
  // Network tier assignment and validation
  async assignProviderToNetwork(institutionId: number, networkId: number, options: {
    effectiveDate?: Date;
    expiryDate?: Date;
    assignmentType?: string;
    coveredSpecializations?: string[];
    networkDiscount?: number;
    specialTerms?: string;
  } = {}) {
    const {
      effectiveDate = new Date(),
      expiryDate,
      assignmentType = 'full',
      coveredSpecializations = [],
      networkDiscount = 0,
      specialTerms
    } = options;

    // Validate network exists and is active
    const [network] = await db.select()
      .from(providerNetworks)
      .where(providerNetworks.id.eq(networkId).and(providerNetworks.isActive.eq(true)));

    if (!network) {
      throw new Error('Network not found or inactive');
    }

    // Check provider quality score against network threshold
    const [provider] = await db.select()
      .from(medicalInstitutions)
      .where(medicalInstitutions.id.eq(institutionId));

    if (!provider) {
      throw new Error('Provider not found');
    }

    if (provider.qualityScore && provider.qualityScore < network.qualityThreshold) {
      throw new Error(`Provider quality score ${provider.qualityScore} below network threshold ${network.qualityThreshold}`);
    }

    // Check network capacity
    const currentProvidersCount = await db.select()
      .from(providerNetworkAssignments)
      .where(
        providerNetworkAssignments.networkId.eq(networkId).and(
          providerNetworkAssignments.isActive.eq(true)
        )
      );

    if (network.maximumProviders && currentProvidersCount.length >= network.maximumProviders) {
      throw new Error('Network has reached maximum provider capacity');
    }

    // Create assignment
    const [assignment] = await db.insert(providerNetworkAssignments)
      .values({
        institutionId,
        networkId,
        effectiveDate,
        expiryDate,
        assignmentType,
        coveredSpecializations: JSON.stringify(coveredSpecializations),
        networkDiscount,
        specialTerms
      })
      .returning();

    // Update provider's primary network if needed
    if (!provider.primaryNetworkId) {
      await db.update(medicalInstitutions)
        .set({ primaryNetworkId: networkId })
        .where(medicalInstitutions.id.eq(institutionId));
    }

    return assignment;
  }

  // Provider network eligibility checking
  async checkProviderEligibility(institutionId: number, networkId?: number, memberId?: number) {
    // Get provider details
    const [provider] = await db.select()
      .from(medicalInstitutions)
      .where(medicalInstitutions.id.eq(institutionId));

    if (!provider) {
      throw new Error('Provider not found');
    }

    // Check provider approval status
    if (provider.approvalStatus !== 'approved') {
      return {
        eligible: false,
        reason: 'Provider not approved',
        providerStatus: provider.approvalStatus
      };
    }

    // Check if provider is in any active network
    const assignments = await db.select({
      networkId: providerNetworkAssignments.networkId,
      networkName: providerNetworks.name,
      networkTier: providerNetworks.tier,
      effectiveDate: providerNetworkAssignments.effectiveDate,
      expiryDate: providerNetworkAssignments.expiryDate,
      assignmentType: providerNetworkAssignments.assignmentType,
      networkDiscount: providerNetworkAssignments.networkDiscount
    })
      .from(providerNetworkAssignments)
      .leftJoin(providerNetworks, providerNetworkAssignments.networkId.eq(providerNetworks.id))
      .where(
        providerNetworkAssignments.institutionId.eq(institutionId).and(
          providerNetworkAssignments.isActive.eq(true)
        )
      );

    // If specific network is requested, check if provider is in that network
    if (networkId) {
      const networkAssignment = assignments.find(a => a.networkId === networkId);
      if (!networkAssignment) {
        return {
          eligible: false,
          reason: 'Provider not in specified network',
          availableNetworks: assignments.map(a => ({
            networkId: a.networkId,
            networkName: a.networkName,
            networkTier: a.networkTier
          }))
        };
      }

      // Check assignment validity dates
      const now = new Date();
      if (networkAssignment.effectiveDate > now) {
        return {
          eligible: false,
          reason: 'Network assignment not yet effective',
          effectiveDate: networkAssignment.effectiveDate
        };
      }

      if (networkAssignment.expiryDate && networkAssignment.expiryDate < now) {
        return {
          eligible: false,
          reason: 'Network assignment expired',
          expiryDate: networkAssignment.expiryDate
        };
      }

      return {
        eligible: true,
        networkAssignment,
        providerDetails: {
          name: provider.name,
          type: provider.type,
          qualityScore: provider.qualityScore
        }
      };
    }

    // Return all available networks for provider
    return {
      eligible: assignments.length > 0,
      providerDetails: {
        name: provider.name,
        type: provider.type,
        qualityScore: provider.qualityScore,
        approvalStatus: provider.approvalStatus
      },
      availableNetworks: assignments.map(a => ({
        networkId: a.networkId,
        networkName: a.networkName,
        networkTier: a.networkTier,
        assignmentType: a.assignmentType,
        networkDiscount: a.networkDiscount
      }))
    };
  }

  // Network compliance monitoring
  async monitorNetworkCompliance(networkId: number) {
    const [network] = await db.select()
      .from(providerNetworks)
      .where(providerNetworks.id.eq(networkId));

    if (!network) {
      throw new Error('Network not found');
    }

    // Get all providers in network
    const assignments = await db.select({
      institutionId: providerNetworkAssignments.institutionId,
      providerName: medicalInstitutions.name,
      providerType: medicalInstitutions.type,
      qualityScore: medicalInstitutions.qualityScore,
      approvalStatus: medicalInstitutions.approvalStatus,
      networkComplianceStatus: medicalInstitutions.networkComplianceStatus
    })
      .from(providerNetworkAssignments)
      .leftJoin(medicalInstitutions, providerNetworkAssignments.institutionId.eq(medicalInstitutions.id))
      .where(
        providerNetworkAssignments.networkId.eq(networkId).and(
          providerNetworkAssignments.isActive.eq(true)
        )
      );

    // Analyze compliance
    const complianceReport = {
      networkId,
      networkName: network.name,
      totalProviders: assignments.length,
      compliantProviders: assignments.filter(p =>
        p.qualityScore && p.qualityScore >= network.qualityThreshold
      ).length,
      nonCompliantProviders: assignments.filter(p =>
        !p.qualityScore || p.qualityScore < network.qualityThreshold
      ),
      approvalStatusBreakdown: assignments.reduce((acc, provider) => {
        acc[provider.approvalStatus] = (acc[provider.approvalStatus] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageQualityScore: assignments.reduce((sum, p) => sum + (p.qualityScore || 0), 0) / assignments.length,
      complianceScore: 0 // Will be calculated
    };

    // Calculate overall compliance score (0-100)
    const compliantCount = complianceReport.compliantProviders;
    const totalCount = complianceReport.totalProviders;
    complianceReport.complianceScore = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;

    return complianceReport;
  }

  // Network performance analytics
  async getNetworkPerformanceAnalytics(networkId: number, period: 'monthly' | 'quarterly' | 'yearly' = 'monthly') {
    const [network] = await db.select()
      .from(providerNetworks)
      .where(providerNetworks.id.eq(networkId));

    if (!network) {
      throw new Error('Network not found');
    }

    // Get providers in network
    const providers = await db.select({
      institutionId: medicalInstitutions.id,
      providerName: medicalInstitutions.name,
      providerType: medicalInstitutions.type
    })
      .from(providerNetworkAssignments)
      .leftJoin(medicalInstitutions, providerNetworkAssignments.institutionId.eq(medicalInstitutions.id))
      .where(
        providerNetworkAssignments.networkId.eq(networkId).and(
          providerNetworkAssignments.isActive.eq(true)
        )
      );

    const providerIds = providers.map(p => p.institutionId);

    // This would typically query claims data, provider payments, etc.
    // For now, returning a template structure
    return {
      networkId,
      networkName: network.name,
      period,
      totalProviders: providers.length,
      providerTypeBreakdown: providers.reduce((acc, provider) => {
        acc[provider.providerType] = (acc[provider.providerType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      // Placeholder metrics - would be calculated from actual claims/payment data
      metrics: {
        totalClaimsProcessed: 0,
        averageClaimValue: 0,
        claimApprovalRate: 0,
        averageProcessingTime: 0,
        memberSatisfactionScore: 0,
        utilizationRate: 0
      },
      // Provider-level breakdown
      providerMetrics: providers.map(provider => ({
        institutionId: provider.institutionId,
        providerName: provider.providerName,
        metrics: {
          claimsProcessed: 0,
          claimApprovalRate: 0,
          averageProcessingTime: 0,
          memberSatisfactionScore: 0
        }
      }))
    };
  }

  // Automatic network assignment rules
  async suggestNetworkAssignment(institutionId: number) {
    // Get provider details
    const [provider] = await db.select()
      .from(medicalInstitutions)
      .where(medicalInstitutions.id.eq(institutionId));

    if (!provider) {
      throw new Error('Provider not found');
    }

    // Get all active networks
    const networks = await db.select()
      .from(providerNetworks)
      .where(providerNetworks.isActive.eq(true))
      .orderBy(providerNetworks.costControlLevel);

    const suggestions = [];

    for (const network of networks) {
      // Check quality score compatibility
      if (provider.qualityScore && provider.qualityScore < network.qualityThreshold) {
        continue; // Skip networks where provider doesn't meet quality threshold
      }

      // Check network capacity
      const currentProvidersCount = await db.select()
        .from(providerNetworkAssignments)
        .where(
          providerNetworkAssignments.networkId.eq(network.id).and(
            providerNetworkAssignments.isActive.eq(true)
          )
        );

      if (network.maximumProviders && currentProvidersCount.length >= network.maximumProviders) {
        continue; // Skip full networks
      }

      // Calculate compatibility score
      let compatibilityScore = 50; // Base score

      // Quality score bonus
      if (provider.qualityScore && provider.qualityScore >= network.qualityThreshold) {
        compatibilityScore += Math.min(30, (provider.qualityScore - network.qualityThreshold) * 2);
      }

      // Network tier preference (higher tiers get bonus)
      const tierScores = { tier_1: 20, tier_2: 15, tier_3: 10, premium: 25, basic: 5, standard: 15 };
      compatibilityScore += tierScores[network.tier as keyof typeof tierScores] || 0;

      suggestions.push({
        networkId: network.id,
        networkName: network.name,
        networkTier: network.tier,
        compatibilityScore: Math.min(100, compatibilityScore),
        networkDiscount: 0, // Would be calculated from existing assignments
        assignmentReason: this._getAssignmentReason(provider, network, compatibilityScore)
      });
    }

    return {
      providerId: institutionId,
      providerName: provider.name,
      providerType: provider.type,
      qualityScore: provider.qualityScore,
      suggestions: suggestions.sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    };
  }

  private _getAssignmentReason(provider: any, network: any, score: number): string {
    if (score >= 85) {
      return 'Excellent match - High quality score, ideal network fit';
    } else if (score >= 70) {
      return 'Good match - Meets quality requirements, suitable network';
    } else if (score >= 55) {
      return 'Acceptable match - Basic requirements met';
    } else {
      return 'Consider with conditions - May require additional quality improvements';
    }
  }
}

export const providerNetworkService = new ProviderNetworkService();