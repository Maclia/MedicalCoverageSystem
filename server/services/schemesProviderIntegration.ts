/**
 * Integration service connecting Schemes & Benefits module with Provider Network system
 * Handles provider tier assignments, network access validation, and provider-scheme relationships
 */

import { IStorage } from '../storage';
import * as schema from '../../shared/schema.js';

export interface ProviderSchemeIntegration {
  schemeId: number;
  providerId: number;
  networkTier: 'tier_1' | 'tier_2' | 'tier_3' | 'premium';
  networkAccessLevel: 'tier_1_only' | 'full_network' | 'premium_network';
  discountPercentage: number;
  specializations: string[];
  effectiveDate: Date;
  expiryDate?: Date;
  isActive: boolean;
}

export interface ProviderNetworkValidation {
  providerId: number;
  schemeId: number;
  planTierId: number;
  isInNetwork: boolean;
  networkTier?: string;
  accessLevel: string;
  restrictions: string[];
  discountApplied: number;
  validationDate: Date;
}

export interface ProviderClaimEligibility {
  providerId: number;
  memberId: number;
  claimAmount: number;
  serviceCategory: string;
  isInNetwork: boolean;
  networkDiscount: number;
  requiresReferral: boolean;
  preAuthRequired: boolean;
  coveragePercentage: number;
  memberResponsibility: number;
  insurerResponsibility: number;
}

export class SchemesProviderIntegrationService {
  constructor(private storage: IStorage) {}

  /**
   * Validate provider network access for a specific scheme and plan tier
   */
  async validateProviderNetworkAccess(
    providerId: number,
    schemeId: number,
    planTierId: number
  ): Promise<ProviderNetworkValidation> {
    try {
      // Get plan tier details
      const planTier = await this.storage.getPlanTierById(planTierId);
      if (!planTier) {
        throw new Error(`Plan tier ${planTierId} not found`);
      }

      // Check provider network assignments
      const providerAssignments = await this.getProviderAssignments(providerId, schemeId);

      // Determine network access level
      const networkAccessLevel = planTier.networkAccessLevel;
      let isInNetwork = false;
      let networkTier: string | undefined;
      let discountPercentage = 0;
      const restrictions: string[] = [];

      // Check if provider is in appropriate network tier
      for (const assignment of providerAssignments) {
        if (!assignment.isActive) continue;

        const now = new Date();
        if (assignment.effectiveDate > now) continue;
        if (assignment.expiryDate && assignment.expiryDate < now) continue;

        // Match network access requirements
        if (networkAccessLevel === 'tier_1_only' && assignment.assignmentType === 'tier_1') {
          isInNetwork = true;
          networkTier = 'tier_1';
          discountPercentage = assignment.networkDiscount || 0;
          break;
        } else if (networkAccessLevel === 'full_network') {
          isInNetwork = true;
          networkTier = assignment.assignmentType;
          discountPercentage = assignment.networkDiscount || 0;
          break;
        } else if (networkAccessLevel === 'premium_network' && assignment.assignmentType === 'premium') {
          isInNetwork = true;
          networkTier = 'premium';
          discountPercentage = assignment.networkDiscount || 0;
          break;
        }
      }

      // Add restrictions based on access level
      if (!isInNetwork) {
        restrictions.push('Provider not in network for this plan tier');
      } else if (networkAccessLevel === 'tier_1_only' && networkTier !== 'tier_1') {
        restrictions.push('Provider not in tier 1 network');
      }

      return {
        providerId,
        schemeId,
        planTierId,
        isInNetwork,
        networkTier,
        accessLevel: networkAccessLevel,
        restrictions,
        discountApplied: discountPercentage,
        validationDate: new Date()
      };
    } catch (error) {
      console.error('Error validating provider network access:', error);
      throw new Error(`Provider network validation failed: ${error.message}`);
    }
  }

  /**
   * Calculate provider claim eligibility and cost sharing
   */
  async calculateProviderClaimEligibility(
    providerId: number,
    memberId: number,
    claimAmount: number,
    serviceCategory: string
  ): Promise<ProviderClaimEligibility> {
    try {
      // Get member details
      const member = await this.storage.getMember(memberId);
      if (!member) {
        throw new Error(`Member ${memberId} not found`);
      }

      // Get member's scheme and plan tier
      const memberScheme = await this.getMemberScheme(memberId);
      const memberPlanTier = memberScheme ?
        await this.getMemberPlanTier(memberId) : null;

      if (!memberScheme || !memberPlanTier) {
        throw new Error('Member not enrolled in a scheme');
      }

      // Validate provider network access
      const networkValidation = await this.validateProviderNetworkAccess(
        providerId,
        memberScheme.id,
        memberPlanTier.id
      );

      // Get benefit mapping for this service category
      const benefitMapping = await this.getBenefitMappingForCategory(
        memberScheme.id,
        memberPlanTier.id,
        serviceCategory
      );

      // Calculate cost sharing
      let coveragePercentage = 100;
      let memberResponsibility = 0;
      let insurerResponsibility = claimAmount;

      if (benefitMapping) {
        coveragePercentage = benefitMapping.coveragePercentage;
        insurerResponsibility = claimAmount * (coveragePercentage / 100);
        memberResponsibility = claimAmount - insurerResponsibility;

        // Apply network discount if in network
        if (networkValidation.isInNetwork) {
          const discountAmount = claimAmount * (networkValidation.discountApplied / 100);
          insurerResponsibility -= discountAmount;
          memberResponsibility -= discountAmount * (1 - coveragePercentage / 100);
        }
      }

      // Check for referral and pre-authorization requirements
      const requiresReferral = benefitMapping?.referralRequired || false;
      const preAuthRequired = benefitMapping?.preAuthRequired || false;

      return {
        providerId,
        memberId,
        claimAmount,
        serviceCategory,
        isInNetwork: networkValidation.isInNetwork,
        networkDiscount: networkValidation.discountApplied,
        requiresReferral,
        preAuthRequired,
        coveragePercentage,
        memberResponsibility: Math.max(0, memberResponsibility),
        insurerResponsibility: Math.max(0, insurerResponsibility)
      };
    } catch (error) {
      console.error('Error calculating provider claim eligibility:', error);
      throw new Error(`Claim eligibility calculation failed: ${error.message}`);
    }
  }

  /**
   * Get providers available for a specific scheme and plan tier
   */
  async getProvidersForScheme(
    schemeId: number,
    planTierId: number,
    filters?: {
      specialization?: string;
      location?: string;
      networkTier?: string;
    }
  ): Promise<any[]> {
    try {
      // Get plan tier details
      const planTier = await this.storage.getPlanTierById(planTierId);
      if (!planTier) {
        throw new Error(`Plan tier ${planTierId} not found`);
      }

      // Get all provider assignments for this scheme
      const assignments = await this.getProviderAssignmentsByScheme(schemeId);

      // Filter by network access level
      const filteredAssignments = assignments.filter(assignment => {
        if (!assignment.isActive) return false;

        const now = new Date();
        if (assignment.effectiveDate > now) return false;
        if (assignment.expiryDate && assignment.expiryDate < now) return false;

        // Match network access requirements
        if (planTier.networkAccessLevel === 'tier_1_only' && assignment.assignmentType !== 'tier_1') {
          return false;
        } else if (planTier.networkAccessLevel === 'premium_network' && assignment.assignmentType !== 'premium') {
          return false;
        }

        // Apply additional filters
        if (filters?.specialization &&
            !assignment.coveredSpecializations.includes(filters.specialization)) {
          return false;
        }

        if (filters?.networkTier && assignment.assignmentType !== filters.networkTier) {
          return false;
        }

        return true;
      });

      // Get provider details
      const providerIds = [...new Set(filteredAssignments.map(a => a.institutionId))];
      const providers = await Promise.all(
        providerIds.map(async (providerId) => {
          const provider = await this.storage.getMedicalInstitution(providerId);
          const providerAssignments = filteredAssignments.filter(a => a.institutionId === providerId);

          return {
            ...provider,
            assignments: providerAssignments,
            networkTier: providerAssignments[0]?.assignmentType,
            discount: providerAssignments[0]?.networkDiscount || 0,
            coveredSpecializations: providerAssignments[0]?.coveredSpecializations || []
          };
        })
      );

      // Apply location filter if specified
      if (filters?.location) {
        return providers.filter(provider =>
          provider.address?.toLowerCase().includes(filters.location!.toLowerCase())
        );
      }

      return providers;
    } catch (error) {
      console.error('Error getting providers for scheme:', error);
      throw new Error(`Failed to get providers for scheme: ${error.message}`);
    }
  }

  /**
   * Update provider scheme assignments when scheme changes
   */
  async updateProviderAssignmentsForSchemeChange(
    schemeId: number,
    oldPlanTierId: number,
    newPlanTierId: number
  ): Promise<void> {
    try {
      // Get old and new plan tier details
      const oldPlanTier = await this.storage.getPlanTierById(oldPlanTierId);
      const newPlanTier = await this.storage.getPlanTierById(newPlanTierId);

      if (!oldPlanTier || !newPlanTier) {
        throw new Error('Plan tiers not found');
      }

      // Check if network access level changed
      if (oldPlanTier.networkAccessLevel !== newPlanTier.networkAccessLevel) {
        // Get all members on this scheme
        const members = await this.getMembersByScheme(schemeId);

        // Update network access for all affected members
        for (const member of members) {
          // Create notification or log about network access change
          console.log(`Network access changed for member ${member.id} from ${oldPlanTier.networkAccessLevel} to ${newPlanTier.networkAccessLevel}`);

          // In a real implementation, this would:
          // 1. Send notifications to affected members
          // 2. Update member cards/plan documents
          // 3. Log the change for audit purposes
          // 4. Create migration plan for existing treatments
        }
      }

      // Update provider network assignments if needed
      const assignments = await this.getProviderAssignmentsByScheme(schemeId);
      for (const assignment of assignments) {
        // Check if assignment is still valid for new network access level
        const isValid = await this.validateAssignmentForPlanTier(assignment, newPlanTier);

        if (!isValid) {
          console.log(`Provider assignment ${assignment.id} may need review due to plan tier change`);
          // In a real implementation, this would create review tasks
        }
      }
    } catch (error) {
      console.error('Error updating provider assignments for scheme change:', error);
      throw new Error(`Failed to update provider assignments: ${error.message}`);
    }
  }

  /**
   * Get provider utilization metrics for a scheme
   */
  async getProviderUtilizationMetrics(
    schemeId: number,
    timeframe?: { startDate: Date; endDate: Date }
  ): Promise<any> {
    try {
      const startDate = timeframe?.startDate || new Date(new Date().setMonth(new Date().getMonth() - 12));
      const endDate = timeframe?.endDate || new Date();

      // Get claims for this scheme within timeframe
      const claims = await this.getClaimsBySchemeAndTimeframe(schemeId, startDate, endDate);

      // Aggregate by provider
      const providerMetrics = new Map();

      for (const claim of claims) {
        const providerId = claim.institutionId;
        if (!providerMetrics.has(providerId)) {
          providerMetrics.set(providerId, {
            providerId,
            totalClaims: 0,
            totalAmount: 0,
            averageClaimAmount: 0,
            claimCount: 0,
            specialties: new Set()
          });
        }

        const metrics = providerMetrics.get(providerId);
        metrics.totalClaims++;
        metrics.totalAmount += claim.amount || 0;
        metrics.claimCount++;
        metrics.averageClaimAmount = metrics.totalAmount / metrics.claimCount;

        // Add specialty if available
        if (claim.specialty) {
          metrics.specialties.add(claim.specialty);
        }
      }

      // Convert Map to array and add provider details
      const result = await Promise.all(
        Array.from(providerMetrics.values()).map(async (metrics) => {
          const provider = await this.storage.getMedicalInstitution(metrics.providerId);
          return {
            ...metrics,
            providerName: provider?.name,
            specialties: Array.from(metrics.specialties)
          };
        })
      );

      // Sort by total claims descending
      return result.sort((a, b) => b.totalClaims - a.totalClaims);
    } catch (error) {
      console.error('Error getting provider utilization metrics:', error);
      throw new Error(`Failed to get provider utilization metrics: ${error.message}`);
    }
  }

  // Private helper methods

  private async getProviderAssignments(providerId: number, schemeId: number): Promise<any[]> {
    // In a real implementation, this would query the database
    // For now, return empty array as placeholder
    return [];
  }

  private async getProviderAssignmentsByScheme(schemeId: number): Promise<any[]> {
    // In a real implementation, this would query the database
    return [];
  }

  private async getMemberScheme(memberId: number): Promise<any> {
    // In a real implementation, this would get the member's scheme
    return null;
  }

  private async getMemberPlanTier(memberId: number): Promise<any> {
    // In a real implementation, this would get the member's plan tier
    return null;
  }

  private async getBenefitMappingForCategory(
    schemeId: number,
    planTierId: number,
    serviceCategory: string
  ): Promise<any> {
    // In a real implementation, this would query the benefit mappings
    return null;
  }

  private async getMembersByScheme(schemeId: number): Promise<any[]> {
    // In a real implementation, this would get all members on the scheme
    return [];
  }

  private async validateAssignmentForPlanTier(assignment: any, planTier: any): Promise<boolean> {
    // Validate if assignment is still valid for the new plan tier
    return true;
  }

  private async getClaimsBySchemeAndTimeframe(schemeId: number, startDate: Date, endDate: Date): Promise<any[]> {
    // In a real implementation, this would query claims for the scheme and timeframe
    return [];
  }
}

export default SchemesProviderIntegrationService;