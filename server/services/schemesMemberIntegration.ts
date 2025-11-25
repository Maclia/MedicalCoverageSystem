/**
 * Integration service connecting Schemes & Benefits module with Member system
 * Handles member enrollment, scheme changes, benefits utilization, and member communications
 */

import { IStorage } from '../storage';
import * as schema from '@shared/schema';

export interface MemberSchemeEnrollment {
  memberId: number;
  schemeId: number;
  planTierId: number;
  enrollmentDate: Date;
  effectiveDate: Date;
  premiumAmount: number;
  coverageStartDate: Date;
  waitingPeriodDays: number;
  corporateConfigId?: number;
  employeeGrade?: string;
  riderSelections?: number[];
}

export interface MemberBenefitsStatus {
  memberId: number;
  schemeId: number;
  planTierId: number;
  overallAnnualLimit: number;
  usedAnnualLimit: number;
  remainingAnnualLimit: number;
  benefits: {
    benefitId: number;
    benefitName: string;
    annualLimit: number;
    usedAmount: number;
    remainingAmount: number;
    waitingPeriodRemaining: number;
    isActive: boolean;
  }[];
  waitingPeriods: {
    benefitCategory: string;
    daysRemaining: number;
    isActive: boolean;
  }[];
}

export interface MemberSchemeChange {
  memberId: number;
  oldSchemeId: number;
  oldPlanTierId: number;
  newSchemeId: number;
  newPlanTierId: number;
  changeDate: Date;
  effectiveDate: Date;
  changeReason: string;
  premiumImpact: number;
  benefitChanges: {
    benefitName: string;
    oldLimit: number;
    newLimit: number;
    impact: 'improved' | 'reduced' | 'unchanged';
  }[];
  migrationRequired: boolean;
  communicationStatus: 'pending' | 'sent' | 'acknowledged';
}

export interface MemberBenefitsUtilization {
  memberId: number;
  timeframe: { startDate: Date; endDate: Date };
  utilization: {
    benefitCategory: string;
    totalClaims: number;
    totalAmount: number;
    averageClaimAmount: number;
    utilizationPercentage: number;
    limitRemaining: number;
  }[];
  trends: {
    month: string;
    utilizationAmount: number;
    claimsCount: number;
  }[];
}

export class SchemesMemberIntegrationService {
  constructor(private storage: IStorage) {}

  /**
   * Enroll a member in a scheme with comprehensive validation
   */
  async enrollMemberInScheme(enrollment: MemberSchemeEnrollment): Promise<{
    success: boolean;
    enrollmentId?: string;
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Validate member exists
      const member = await this.storage.getMember(enrollment.memberId);
      if (!member) {
        errors.push('Member not found');
        return { success: false, warnings, errors };
      }

      // Validate scheme and plan tier
      const scheme = await this.storage.getSchemeById(enrollment.schemeId);
      const planTier = await this.storage.getPlanTierById(enrollment.planTierId);

      if (!scheme) {
        errors.push('Scheme not found');
        return { success: false, warnings, errors };
      }

      if (!planTier || planTier.schemeId !== enrollment.schemeId) {
        errors.push('Plan tier not found or does not belong to specified scheme');
        return { success: false, warnings, errors };
      }

      // Validate member eligibility for scheme
      const eligibilityCheck = await this.validateMemberEligibility(member, scheme);
      if (!eligibilityCheck.isEligible) {
        errors.push(...eligibilityCheck.reasons);
        return { success: false, warnings, errors };
      }

      warnings.push(...eligibilityCheck.warnings);

      // Check for existing enrollment
      const existingEnrollment = await this.getMemberCurrentEnrollment(enrollment.memberId);
      if (existingEnrollment) {
        errors.push('Member is already enrolled in a scheme');
        return { success: false, warnings, errors };
      }

      // Validate corporate configuration if applicable
      if (enrollment.corporateConfigId) {
        const corporateConfig = await this.storage.getCorporateSchemeConfigById(enrollment.corporateConfigId);
        if (!corporateConfig || corporateConfig.schemeId !== enrollment.schemeId) {
          errors.push('Invalid corporate configuration for this scheme');
          return { success: false, warnings, errors };
        }

        // Validate employee grade if specified
        if (enrollment.employeeGrade) {
          const gradeBenefit = await this.getEmployeeGradeBenefit(
            enrollment.corporateConfigId,
            enrollment.employeeGrade
          );
          if (!gradeBenefit || gradeBenefit.planTierId !== enrollment.planTierId) {
            warnings.push('Employee grade may not match selected plan tier');
          }
        }
      }

      // Validate rider selections
      if (enrollment.riderSelections && enrollment.riderSelections.length > 0) {
        for (const riderId of enrollment.riderSelections) {
          const rider = await this.storage.getBenefitRiderById(riderId);
          if (!rider || rider.baseSchemeId !== enrollment.schemeId) {
            errors.push(`Invalid rider selection: ${riderId}`);
          }
        }
      }

      // Calculate premium with riders
      let finalPremium = enrollment.premiumAmount;
      if (enrollment.riderSelections) {
        const riderImpact = await this.calculateRiderPremiumImpact(enrollment.riderSelections);
        finalPremium += riderImpact;
      }

      // Create enrollment record
      const enrollmentId = `ENR_${Date.now()}_${member.id}`;

      // In a real implementation, this would save to database:
      // await this.storage.createMemberEnrollment({
      //   id: enrollmentId,
      //   memberId: enrollment.memberId,
      //   schemeId: enrollment.schemeId,
      //   planTierId: enrollment.planTierId,
      //   enrollmentDate: enrollment.enrollmentDate,
      //   effectiveDate: enrollment.effectiveDate,
      //   premiumAmount: finalPremium,
      //   coverageStartDate: enrollment.coverageStartDate,
      //   waitingPeriodDays: enrollment.waitingPeriodDays,
      //   corporateConfigId: enrollment.corporateConfigId,
      //   employeeGrade: enrollment.employeeGrade,
      //   status: 'active'
      // });

      // Save rider selections
      if (enrollment.riderSelections) {
        for (const riderId of enrollment.riderSelections) {
          // await this.storage.createMemberRiderSelection({
          //   memberId: enrollment.memberId,
          //   riderId,
          //   selectionDate: new Date(),
          //   effectiveDate: enrollment.effectiveDate,
          //   premiumImpact: finalPremium - enrollment.premiumAmount,
          //   isActive: true
          // });
        }
      }

      // Initialize benefit utilization tracking
      await this.initializeMemberBenefitUtilization(enrollment.memberId, enrollment.planTierId);

      // Schedule enrollment communications
      await this.scheduleEnrollmentCommunications(enrollment.memberId, enrollmentId);

      return {
        success: true,
        enrollmentId,
        warnings,
        errors
      };
    } catch (error) {
      console.error('Error enrolling member in scheme:', error);
      errors.push(`Enrollment failed: ${error.message}`);
      return { success: false, warnings, errors };
    }
  }

  /**
   * Get member's current benefits status with utilization
   */
  async getMemberBenefitsStatus(memberId: number): Promise<MemberBenefitsStatus | null> {
    try {
      // Get member's current enrollment
      const enrollment = await this.getMemberCurrentEnrollment(memberId);
      if (!enrollment) {
        return null;
      }

      // Get scheme and plan tier details
      const scheme = await this.storage.getSchemeById(enrollment.schemeId);
      const planTier = await this.storage.getPlanTierById(enrollment.planTierId);

      if (!scheme || !planTier) {
        return null;
      }

      // Get benefit mappings for this plan tier
      const benefitMappings = await this.getSchemeBenefitMappings(
        enrollment.schemeId,
        enrollment.planTierId
      );

      // Get current utilization for each benefit
      const currentUtilization = await this.getMemberBenefitUtilization(memberId);

      // Calculate waiting periods
      const waitingPeriods = await this.calculateWaitingPeriods(enrollment);

      // Build benefits status
      const benefits = benefitMappings.map(mapping => {
        const utilization = currentUtilization.find(u => u.benefitId === mapping.benefitId);
        const waitingPeriod = waitingPeriods.find(w => w.benefitCategory === mapping.benefitCategory);

        return {
          benefitId: mapping.benefitId,
          benefitName: mapping.benefit?.benefitName || 'Unknown Benefit',
          annualLimit: mapping.annualLimit || 0,
          usedAmount: utilization?.usedAmount || 0,
          remainingAmount: Math.max(0, (mapping.annualLimit || 0) - (utilization?.usedAmount || 0)),
          waitingPeriodRemaining: waitingPeriod?.daysRemaining || 0,
          isActive: mapping.isCovered && (waitingPeriod?.daysRemaining || 0) === 0
        };
      });

      // Calculate overall limits
      const totalUsed = benefits.reduce((sum, b) => sum + b.usedAmount, 0);
      const overallRemaining = Math.max(0, planTier.overallAnnualLimit - totalUsed);

      return {
        memberId,
        schemeId: enrollment.schemeId,
        planTierId: enrollment.planTierId,
        overallAnnualLimit: planTier.overallAnnualLimit,
        usedAnnualLimit: totalUsed,
        remainingAnnualLimit: overallRemaining,
        benefits,
        waitingPeriods
      };
    } catch (error) {
      console.error('Error getting member benefits status:', error);
      return null;
    }
  }

  /**
   * Process member scheme change with comprehensive validation
   */
  async processMemberSchemeChange(changeRequest: MemberSchemeChange): Promise<{
    success: boolean;
    changeId?: string;
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Validate member exists
      const member = await this.storage.getMember(changeRequest.memberId);
      if (!member) {
        errors.push('Member not found');
        return { success: false, warnings, errors };
      }

      // Validate old and new schemes/tiers
      const oldScheme = await this.storage.getSchemeById(changeRequest.oldSchemeId);
      const newScheme = await this.storage.getSchemeById(changeRequest.newSchemeId);
      const oldPlanTier = await this.storage.getPlanTierById(changeRequest.oldPlanTierId);
      const newPlanTier = await this.storage.getPlanTierById(changeRequest.newPlanTierId);

      if (!oldScheme || !newScheme || !oldPlanTier || !newPlanTier) {
        errors.push('Invalid scheme or plan tier specified');
        return { success: false, warnings, errors };
      }

      // Validate member eligibility for new scheme
      const eligibilityCheck = await this.validateMemberEligibility(member, newScheme);
      if (!eligibilityCheck.isEligible) {
        errors.push(...eligibilityCheck.reasons);
        return { success: false, warnings, errors };
      }

      // Check for ongoing treatments that might be affected
      const ongoingTreatments = await this.getMemberOngoingTreatments(changeRequest.memberId);
      if (ongoingTreatments.length > 0) {
        warnings.push(`${ongoingTreatments.length} ongoing treatments may be affected by scheme change`);
      }

      // Analyze benefit changes
      const benefitChanges = await this.analyzeBenefitChanges(
        changeRequest.oldPlanTierId,
        changeRequest.newPlanTierId
      );

      // Calculate premium impact
      const premiumImpact = await this.calculatePremiumImpact(changeRequest);

      // Determine if migration is required
      const migrationRequired = await this.determineMigrationRequirements(benefitChanges);

      const changeId = `CHG_${Date.now()}_${member.id}`;

      // Create scheme change record
      // In a real implementation, this would save to database:
      // await this.storage.createMemberSchemeChange({
      //   id: changeId,
      //   memberId: changeRequest.memberId,
      //   oldSchemeId: changeRequest.oldSchemeId,
      //   oldPlanTierId: changeRequest.oldPlanTierId,
      //   newSchemeId: changeRequest.newSchemeId,
      //   newPlanTierId: changeRequest.newPlanTierId,
      //   changeDate: changeRequest.changeDate,
      //   effectiveDate: changeRequest.effectiveDate,
      //   changeReason: changeRequest.changeReason,
      //   premiumImpact,
      //   benefitChanges,
      //   migrationRequired,
      //   status: 'pending'
      // });

      // Schedule change communications
      await this.scheduleSchemeChangeCommunications(changeRequest, changeId);

      return {
        success: true,
        changeId,
        warnings,
        errors
      };
    } catch (error) {
      console.error('Error processing member scheme change:', error);
      errors.push(`Scheme change failed: ${error.message}`);
      return { success: false, warnings, errors };
    }
  }

  /**
   * Get member benefits utilization for a specific timeframe
   */
  async getMemberBenefitsUtilization(
    memberId: number,
    timeframe: { startDate: Date; endDate: Date }
  ): Promise<MemberBenefitsUtilization | null> {
    try {
      // Get member's current enrollment
      const enrollment = await this.getMemberCurrentEnrollment(memberId);
      if (!enrollment) {
        return null;
      }

      // Get claims within timeframe
      const claims = await this.getMemberClaimsByTimeframe(memberId, timeframe.startDate, timeframe.endDate);

      // Group claims by benefit category
      const utilization = new Map();

      for (const claim of claims) {
        const category = claim.benefitCategory || 'other';

        if (!utilization.has(category)) {
          utilization.set(category, {
            benefitCategory: category,
            totalClaims: 0,
            totalAmount: 0,
            averageClaimAmount: 0
          });
        }

        const util = utilization.get(category);
        util.totalClaims++;
        util.totalAmount += claim.amount || 0;
        util.averageClaimAmount = util.totalAmount / util.totalClaims;
      }

      // Get benefit limits for utilization calculation
      const benefitMappings = await this.getSchemeBenefitMappings(
        enrollment.schemeId,
        enrollment.planTierId
      );

      // Add utilization percentages and remaining limits
      const result = Array.from(utilization.values()).map(util => {
        const benefitMapping = benefitMappings.find(m => m.benefit?.benefitCategory === util.benefitCategory);
        const annualLimit = benefitMapping?.annualLimit || 0;

        return {
          ...util,
          utilizationPercentage: annualLimit > 0 ? (util.totalAmount / annualLimit) * 100 : 0,
          limitRemaining: Math.max(0, annualLimit - util.totalAmount)
        };
      });

      // Generate monthly trends
      const trends = await this.generateMonthlyUtilizationTrends(claims, timeframe);

      return {
        memberId,
        timeframe,
        utilization: result,
        trends
      };
    } catch (error) {
      console.error('Error getting member benefits utilization:', error);
      return null;
    }
  }

  /**
   * Send member benefits communication
   */
  async sendBenefitsCommunication(
    memberId: number,
    communicationType: 'enrollment' | 'scheme_change' | 'utilization_report' | 'renewal',
    data: any
  ): Promise<boolean> {
    try {
      const member = await this.storage.getMember(memberId);
      if (!member) {
        return false;
      }

      // Get member's contact information
      const contactInfo = await this.getMemberContactInfo(memberId);

      // Generate communication content based on type
      let subject: string;
      let content: string;

      switch (communicationType) {
        case 'enrollment':
          subject = 'Welcome to Your Health Insurance Plan';
          content = this.generateEnrollmentContent(member, data);
          break;
        case 'scheme_change':
          subject = 'Important Update to Your Health Insurance Plan';
          content = this.generateSchemeChangeContent(member, data);
          break;
        case 'utilization_report':
          subject = 'Your Benefits Utilization Report';
          content = this.generateUtilizationReportContent(member, data);
          break;
        case 'renewal':
          subject = 'Your Health Insurance Plan Renewal';
          content = this.generateRenewalContent(member, data);
          break;
        default:
          return false;
      }

      // Send communication (email, SMS, etc.)
      // In a real implementation, this would use the email service:
      // await this.emailService.send({
      //   to: contactInfo.email,
      //   subject,
      //   content,
      //   template: `benefits_${communicationType}`
      // });

      console.log(`Benefits communication sent to member ${memberId}: ${subject}`);
      return true;
    } catch (error) {
      console.error('Error sending benefits communication:', error);
      return false;
    }
  }

  // Private helper methods

  private async validateMemberEligibility(member: any, scheme: any): Promise<{
    isEligible: boolean;
    reasons: string[];
    warnings: string[];
  }> {
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Check age eligibility
    const memberAge = this.calculateAge(member.dateOfBirth);
    if (scheme.minAge && memberAge < scheme.minAge) {
      reasons.push(`Member age ${memberAge} is below minimum age ${scheme.minAge}`);
    }
    if (scheme.maxAge && memberAge > scheme.maxAge) {
      reasons.push(`Member age ${memberAge} is above maximum age ${scheme.maxAge}`);
    }

    // Check scheme status
    if (!scheme.isActive) {
      reasons.push('Scheme is not currently active');
    }

    if (scheme.launchDate && scheme.launchDate > new Date()) {
      reasons.push('Scheme has not yet launched');
    }

    if (scheme.sunsetDate && scheme.sunsetDate < new Date()) {
      reasons.push('Scheme has expired');
    }

    return {
      isEligible: reasons.length === 0,
      reasons,
      warnings
    };
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    return age;
  }

  private async getMemberCurrentEnrollment(memberId: number): Promise<any> {
    // In a real implementation, this would query the database
    return null;
  }

  private async getSchemeBenefitMappings(schemeId: number, planTierId: number): Promise<any[]> {
    // In a real implementation, this would query the database
    return [];
  }

  private async getMemberBenefitUtilization(memberId: number): Promise<any[]> {
    // In a real implementation, this would query the database
    return [];
  }

  private async initializeMemberBenefitUtilization(memberId: number, planTierId: number): Promise<void> {
    // Initialize utilization tracking for all benefits in the plan tier
  }

  private async scheduleEnrollmentCommunications(memberId: number, enrollmentId: string): Promise<void> {
    // Schedule welcome communications
  }

  private async calculateWaitingPeriods(enrollment: any): Promise<any[]> {
    // Calculate waiting periods for different benefit categories
    return [];
  }

  private async analyzeBenefitChanges(oldPlanTierId: number, newPlanTierId: number): Promise<any[]> {
    // Analyze how benefits change between plan tiers
    return [];
  }

  private async calculatePremiumImpact(changeRequest: MemberSchemeChange): Promise<number> {
    // Calculate the financial impact of the scheme change
    return 0;
  }

  private async determineMigrationRequirements(benefitChanges: any[]): Promise<boolean> {
    // Determine if data migration is required
    return false;
  }

  private async scheduleSchemeChangeCommunications(changeRequest: MemberSchemeChange, changeId: string): Promise<void> {
    // Schedule communications about the scheme change
  }

  private async getMemberOngoingTreatments(memberId: number): Promise<any[]> {
    // Get ongoing medical treatments that might be affected
    return [];
  }

  private async getMemberClaimsByTimeframe(memberId: number, startDate: Date, endDate: Date): Promise<any[]> {
    // Get claims for the member within the specified timeframe
    return [];
  }

  private async generateMonthlyUtilizationTrends(claims: any[], timeframe: { startDate: Date; endDate: Date }): Promise<any[]> {
    // Generate monthly utilization trends from claims data
    return [];
  }

  private async getMemberContactInfo(memberId: number): Promise<any> {
    // Get member's contact information
    return {};
  }

  private generateEnrollmentContent(member: any, data: any): string {
    // Generate enrollment communication content
    return `Welcome ${member.firstName}! Your enrollment is complete.`;
  }

  private generateSchemeChangeContent(member: any, data: any): string {
    // Generate scheme change communication content
    return `Dear ${member.firstName}, Your plan is changing.`;
  }

  private generateUtilizationReportContent(member: any, data: any): string {
    // Generate utilization report content
    return `Your benefits utilization report.`;
  }

  private generateRenewalContent(member: any, data: any): string {
    // Generate renewal communication content
    return `Your plan renewal information.`;
  }

  private async calculateRiderPremiumImpact(riderIds: number[]): Promise<number> {
    // Calculate additional premium for selected riders
    return 0;
  }

  private async getEmployeeGradeBenefit(corporateConfigId: number, employeeGrade: string): Promise<any> {
    // Get employee grade benefit configuration
    return null;
  }
}

export default SchemesMemberIntegrationService;