import {
  members,
  memberLifeEvents,
  memberDocuments,
  memberConsents,
  communicationLogs,
  companies,
  benefits,
  companyBenefits,
  claims,
  dependentRules
} from "../../shared/schema.js";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import { db } from "../db";
import { z } from "zod";

export interface MemberEnrollmentData {
  companyId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  employeeId: string;
  memberType: 'principal' | 'dependent';
  principalId?: number;
  dependentType?: 'spouse' | 'child' | 'parent';
  gender?: 'male' | 'female' | 'other';
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  nationalId?: string;
  passportNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  hasDisability?: boolean;
  disabilityDetails?: string;
  gradeId?: number;
  department?: string;
  jobTitle?: string;
}

export interface LifecycleEvent {
  memberId: number;
  eventType: 'enrollment' | 'activation' | 'suspension' | 'upgrade' | 'downgrade' | 'renewal' | 'transfer' | 'termination' | 'reinstatement' | 'death';
  eventDate: string;
  previousStatus?: string;
  newStatus?: string;
  reason: string;
  notes?: string;
  processedBy?: number;
}

export interface EligibilityCheck {
  memberId: number;
  benefitId?: number;
  providerId?: number;
  serviceType?: string;
  checkDate: string;
}

export interface DocumentUpload {
  memberId: number;
  documentType: 'national_id' | 'passport' | 'birth_certificate' | 'marriage_certificate' | 'employment_letter' | 'medical_report' | 'student_letter' | 'other';
  documentName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  expiresAt?: string;
  uploadedBy?: number;
}

// ============================================================================
// MEMBER LIFECYCLE MANAGEMENT SERVICE
// ============================================================================

export class MemberLifecycleService {

  /**
   * Enhanced member enrollment validation and processing
   */
  async validateMemberEligibility(enrollmentData: MemberEnrollmentData): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    requirements: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requirements: string[] = [];

    try {
      // Age validation
      const birthDate = new Date(enrollmentData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();

      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

      if (enrollmentData.memberType === 'principal' && actualAge < 18) {
        errors.push("Principal members must be at least 18 years old");
      }

      if (enrollmentData.memberType === 'dependent' && actualAge >= 18 && enrollmentData.dependentType === 'child') {
        warnings.push("Child dependent is 18 years or older. Age transition may be required.");
      }

      // Check company status
      const company = await db.select().from(companies).where(eq(companies.id, enrollmentData.companyId)).limit(1);
      if (!company.length) {
        errors.push("Company not found");
        return { isValid: false, errors, warnings, requirements };
      }

      if (!company[0].isActive) {
        errors.push("Company is not active");
      }

      // Check for duplicate enrollment
      const existingMember = await db.select()
        .from(members)
        .where(
          sql`${members.email} = ${enrollmentData.email} OR ${members.phone} = ${enrollmentData.phone}`
        )
        .limit(1);

      if (existingMember.length) {
        errors.push("Member with this email or phone already exists");
      }

      // Dependent validation
      if (enrollmentData.memberType === 'dependent') {
        if (!enrollmentData.principalId) {
          errors.push("Principal member ID is required for dependents");
        } else {
          const principal = await db.select().from(members).where(eq(members.id, enrollmentData.principalId!)).limit(1);
          if (!principal.length || principal[0].memberType !== 'principal') {
            errors.push("Invalid principal member");
          } else if (principal[0].companyId !== enrollmentData.companyId) {
            errors.push("Principal must belong to the same company");
          }
        }

        // Apply dependent rules
        if (enrollmentData.dependentType) {
          await this.validateDependentRules(enrollmentData.companyId, enrollmentData.dependentType, actualAge, errors, requirements);
        }
      }

      // Document requirements based on member profile
      await this.getDocumentRequirements(enrollmentData, requirements);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        requirements
      };

    } catch (error) {
      console.error("Eligibility validation error:", error);
      errors.push("Validation system error");
      return { isValid: false, errors, warnings, requirements };
    }
  }

  /**
   * Process member enrollment with full validation
   */
  async processMemberEnrollment(enrollmentData: MemberEnrollmentData, autoActivate: boolean = false): Promise<{
    success: boolean;
    member?: any;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate eligibility
      const eligibility = await this.validateMemberEligibility(enrollmentData);
      if (!eligibility.isValid) {
        return {
          success: false,
          errors: eligibility.errors,
          warnings: eligibility.warnings
        };
      }

      warnings.push(...eligibility.warnings);

      // Generate membership number
      const membershipNumber = await this.generateMembershipNumber(enrollmentData.companyId);

      // Create member record
      const [newMember] = await db.insert(members).values({
        companyId: enrollmentData.companyId,
        firstName: enrollmentData.firstName,
        lastName: enrollmentData.lastName,
        email: enrollmentData.email,
        phone: enrollmentData.phone,
        dateOfBirth: enrollmentData.dateOfBirth,
        employeeId: enrollmentData.employeeId,
        memberType: enrollmentData.memberType,
        principalId: enrollmentData.principalId,
        dependentType: enrollmentData.dependentType,
        gender: enrollmentData.gender,
        maritalStatus: enrollmentData.maritalStatus,
        nationalId: enrollmentData.nationalId,
        passportNumber: enrollmentData.passportNumber,
        address: enrollmentData.address,
        city: enrollmentData.city,
        postalCode: enrollmentData.postalCode,
        country: enrollmentData.country || 'Kenya',
        hasDisability: enrollmentData.hasDisability || false,
        disabilityDetails: enrollmentData.disabilityDetails,
        membershipStatus: autoActivate ? 'active' : 'pending',
        enrollmentDate: new Date().toISOString().split('T')[0],
      }).returning();

      // Create enrollment life event
      await this.createLifecycleEvent({
        memberId: newMember.id,
        eventType: 'enrollment',
        eventDate: new Date().toISOString().split('T')[0],
        previousStatus: null,
        newStatus: newMember.membershipStatus,
        reason: autoActivate ? 'Auto-activated enrollment' : 'New member enrollment pending activation',
      });

      // If auto-activated, create activation event
      if (autoActivate) {
        await this.createLifecycleEvent({
          memberId: newMember.id,
          eventType: 'activation',
          eventDate: new Date().toISOString().split('T')[0],
          previousStatus: 'pending',
          newStatus: 'active',
          reason: 'Automatic activation during enrollment',
        });
      }

      // Calculate waiting periods for benefits
      await this.calculateWaitingPeriods(newMember.id, enrollmentData.companyId);

      // Trigger welcome sequence
      await this.triggerWelcomeSequence(newMember.id, autoActivate);

      return {
        success: true,
        member: newMember,
        errors,
        warnings
      };

    } catch (error) {
      console.error("Member enrollment processing error:", error);
      errors.push("Failed to process member enrollment");
      return { success: false, errors, warnings };
    }
  }

  /**
   * Process member suspension with comprehensive business logic
   */
  async processSuspension(memberId: number, reason: string, notes?: string, processedBy?: number): Promise<{
    success: boolean;
    errors: string[];
    impacts?: any;
  }> {
    const errors: string[] = [];

    try {
      // Get current member data
      const [member] = await db.select().from(members).where(eq(members.id, memberId));
      if (!member) {
        errors.push("Member not found");
        return { success: false, errors };
      }

      if (member.membershipStatus !== 'active') {
        errors.push("Only active members can be suspended");
        return { success: false, errors };
      }

      // Check for pending claims
      const pendingClaims = await db.select()
        .from(claims)
        .where(
          and(
            eq(claims.memberId, memberId),
            sql`${claims.status} IN ('submitted', 'under_review')`
          )
        );

      if (pendingClaims.length > 0) {
        errors.push(`Cannot suspend member with ${pendingClaims.length} pending claims`);
      }

      // Update member status
      await db.update(members)
        .set({
          membershipStatus: 'suspended',
          lastSuspensionDate: new Date().toISOString().split('T')[0],
          suspensionReason: reason,
        })
        .where(eq(members.id, memberId));

      // Create suspension life event
      await this.createLifecycleEvent({
        memberId,
        eventType: 'suspension',
        eventDate: new Date().toISOString().split('T')[0],
        previousStatus: 'active',
        newStatus: 'suspended',
        reason,
        notes,
        processedBy,
      });

      // Calculate suspension impacts
      const impacts = await this.calculateSuspensionImpacts(memberId);

      // Suspend dependents if this is a principal member
      if (member.memberType === 'principal') {
        const [dependents] = await db.select()
          .from(members)
          .where(
            and(
              eq(members.principalId, memberId),
              eq(members.membershipStatus, 'active')
            )
          );

        for (const dependent of dependents) {
          await this.processSuspension(
            dependent.id,
            `Principal member suspension: ${reason}`,
            `Automatically suspended due to principal member suspension`,
            processedBy
          );
        }
      }

      // Send suspension notifications
      await this.sendSuspensionNotifications(memberId, reason);

      return {
        success: true,
        errors,
        impacts
      };

    } catch (error) {
      console.error("Member suspension error:", error);
      errors.push("Failed to process member suspension");
      return { success: false, errors };
    }
  }

  /**
   * Process member reinstatement
   */
  async processReinstatement(memberId: number, notes?: string, processedBy?: number): Promise<{
    success: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Get current member data
      const [member] = await db.select().from(members).where(eq(members.id, memberId));
      if (!member) {
        errors.push("Member not found");
        return { success: false, errors };
      }

      if (member.membershipStatus !== 'suspended') {
        errors.push("Only suspended members can be reinstated");
        return { success: false, errors };
      }

      // Check if suspension period is reasonable (not too long)
      if (member.lastSuspensionDate) {
        const suspensionDate = new Date(member.lastSuspensionDate);
        const daysSinceSuspension = Math.floor((Date.now() - suspensionDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceSuspension > 365) {
          errors.push("Suspension period exceeds 1 year. New enrollment may be required.");
        }
      }

      // Update member status
      await db.update(members)
        .set({
          membershipStatus: 'active',
          suspensionReason: null,
        })
        .where(eq(members.id, memberId));

      // Create reinstatement life event
      await this.createLifecycleEvent({
        memberId,
        eventType: 'reinstatement',
        eventDate: new Date().toISOString().split('T')[0],
        previousStatus: 'suspended',
        newStatus: 'active',
        reason: 'Member reinstatement',
        notes,
        processedBy,
      });

      // Reinstate dependents if this is a principal member
      if (member.memberType === 'principal') {
        const [dependents] = await db.select()
          .from(members)
          .where(
            and(
              eq(members.principalId, memberId),
              eq(members.membershipStatus, 'suspended')
            )
          );

        for (const dependent of dependents) {
          await this.processReinstatement(
            dependent.id,
            `Automatically reinstated due to principal member reinstatement`,
            processedBy
          );
        }
      }

      // Send reinstatement notifications
      await this.sendReinstatementNotifications(memberId);

      return {
        success: true,
        errors
      };

    } catch (error) {
      console.error("Member reinstatement error:", error);
      errors.push("Failed to process member reinstatement");
      return { success: false, errors };
    }
  }

  /**
   * Process member termination
   */
  async processTermination(memberId: number, reason: string, terminationDate?: string, beneficiaryInfo?: any, processedBy?: number): Promise<{
    success: boolean;
    errors: string[];
    finalCalculations?: any;
  }> {
    const errors: string[] = [];

    try {
      // Get current member data
      const [member] = await db.select().from(members).where(eq(members.id, memberId));
      if (!member) {
        errors.push("Member not found");
        return { success: false, errors };
      }

      if (member.membershipStatus === 'terminated') {
        errors.push("Member is already terminated");
        return { success: false, errors };
      }

      const actualTerminationDate = terminationDate || new Date().toISOString().split('T')[0];

      // Calculate final benefits and premium adjustments
      const finalCalculations = await this.calculateTerminationAdjustments(memberId, actualTerminationDate);

      // Update member status
      const updateData: any = {
        membershipStatus: 'terminated',
        terminationDate: actualTerminationDate,
      };

      if (beneficiaryInfo) {
        updateData.beneficiaryName = beneficiaryInfo.name;
        updateData.beneficiaryRelationship = beneficiaryInfo.relationship;
        updateData.beneficiaryContact = beneficiaryInfo.contact;
      }

      await db.update(members)
        .set(updateData)
        .where(eq(members.id, memberId));

      // Create termination life event
      await this.createLifecycleEvent({
        memberId,
        eventType: 'termination',
        eventDate: actualTerminationDate,
        previousStatus: member.membershipStatus,
        newStatus: 'terminated',
        reason,
        processedBy,
      });

      // Terminate dependents if this is a principal member
      if (member.memberType === 'principal') {
        const [dependents] = await db.select()
          .from(members)
          .where(
            and(
              eq(members.principalId, memberId),
              sql`${members.membershipStatus} IN ('active', 'suspended', 'pending')`
            )
          );

        for (const dependent of dependents) {
          await this.processTermination(
            dependent.id,
            `Principal member termination: ${reason}`,
            actualTerminationDate,
            undefined,
            processedBy
          );
        }
      }

      // Send termination notifications
      await this.sendTerminationNotifications(memberId, reason, actualTerminationDate);

      return {
        success: true,
        errors,
        finalCalculations
      };

    } catch (error) {
      console.error("Member termination error:", error);
      errors.push("Failed to process member termination");
      return { success: false, errors };
    }
  }

  /**
   * Real-time eligibility verification engine
   */
  async checkEligibilityStatus(eligibilityCheck: EligibilityCheck): Promise<{
    isEligible: boolean;
    membershipStatus: string;
    benefitEligibility: any;
    waitingPeriods: any[];
    limitsUtilization: any;
    networkAccess: boolean;
    restrictions: string[];
  }> {
    try {
      // Get member information
      const [member] = await db.select().from(members).where(eq(members.id, eligibilityCheck.memberId));
      if (!member) {
        return {
          isEligible: false,
          membershipStatus: 'not_found',
          benefitEligibility: null,
          waitingPeriods: [],
          limitsUtilization: null,
          networkAccess: false,
          restrictions: ['Member not found']
        };
      }

      const restrictions: string[] = [];

      // Check basic membership status
      if (member.membershipStatus !== 'active') {
        restrictions.push(`Member is ${member.membershipStatus}`);
      }

      // Check benefit-specific eligibility if benefitId provided
      let benefitEligibility = null;
      if (eligibilityCheck.benefitId) {
        benefitEligibility = await this.checkBenefitEligibility(
          eligibilityCheck.memberId,
          eligibilityCheck.benefitId
        );

        if (!benefitEligibility.isEligible) {
          restrictions.push(...benefitEligibility.restrictions);
        }
      }

      // Get waiting periods
      const waitingPeriods = await this.getActiveWaitingPeriods(eligibilityCheck.memberId);

      // Get limits utilization
      const limitsUtilization = await this.getLimitsUtilization(eligibilityCheck.memberId);

      // Check network access if providerId provided
      let networkAccess = true;
      if (eligibilityCheck.providerId) {
        networkAccess = await this.checkProviderNetworkAccess(
          eligibilityCheck.memberId,
          eligibilityCheck.providerId
        );

        if (!networkAccess) {
          restrictions.push('Provider not in member network');
        }
      }

      // Additional checks based on service type
      if (eligibilityCheck.serviceType) {
        const serviceRestrictions = await this.checkServiceTypeEligibility(
          eligibilityCheck.memberId,
          eligibilityCheck.serviceType
        );
        restrictions.push(...serviceRestrictions);
      }

      return {
        isEligible: member.membershipStatus === 'active' && restrictions.length === 0,
        membershipStatus: member.membershipStatus,
        benefitEligibility,
        waitingPeriods,
        limitsUtilization,
        networkAccess,
        restrictions
      };

    } catch (error) {
      console.error("Eligibility check error:", error);
      return {
        isEligible: false,
        membershipStatus: 'error',
        benefitEligibility: null,
        waitingPeriods: [],
        limitsUtilization: null,
        networkAccess: false,
        restrictions: ['Eligibility check system error']
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async generateMembershipNumber(companyId: number): Promise<string> {
    try {
      const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
      if (!company) {
        throw new Error("Company not found");
      }

      // Generate format: [COMPANY_PREFIX]-[YEAR]-[SEQUENCE]
      const companyPrefix = company.registrationNumber.substring(0, 4).toUpperCase();
      const year = new Date().getFullYear();

      // Get next sequence number
      const [sequenceResult] = await db.select({
        count: sql<number>`count(*)`.mapWith(Number)
      })
        .from(members)
        .where(eq(members.companyId, companyId));

      const sequence = (sequenceResult?.count || 0) + 1;
      const sequenceString = sequence.toString().padStart(6, '0');

      return `${companyPrefix}-${year}-${sequenceString}`;

    } catch (error) {
      console.error("Generate membership number error:", error);
      throw error;
    }
  }

  private async validateDependentRules(
    companyId: number,
    dependentType: string,
    age: number,
    errors: string[],
    requirements: string[]
  ): Promise<void> {
    try {
      const [rules] = await db.select()
        .from(dependentRules)
        .where(
          and(
            eq(dependentRules.companyId, companyId),
            eq(dependentRules.dependentType, dependentType as any),
            eq(dependentRules.isActive, true)
          )
        );

      if (rules.length === 0) {
        requirements.push("No specific dependent rules found for this company");
        return;
      }

      const rule = rules[0];

      // Check age limit
      if (rule.maxAge && age > rule.maxAge) {
        errors.push(`${dependentType} exceeds maximum age limit of ${rule.maxAge} years`);
      }

      // Add documentation requirements
      if (rule.documentationRequired) {
        const docs = JSON.parse(rule.documentationRequired);
        requirements.push(`Required documents: ${docs.join(', ')}`);
      }

    } catch (error) {
      console.error("Dependent rules validation error:", error);
      errors.push("Unable to validate dependent rules");
    }
  }

  private async getDocumentRequirements(enrollmentData: MemberEnrollmentData, requirements: string[]): Promise<void> {
    // Basic requirements for all members
    requirements.push("Valid identification document (National ID or Passport)");

    if (enrollmentData.memberType === 'dependent') {
      switch (enrollmentData.dependentType) {
        case 'spouse':
          requirements.push("Marriage certificate");
          break;
        case 'child':
          if (enrollmentData.dateOfBirth) {
            const age = new Date().getFullYear() - new Date(enrollmentData.dateOfBirth).getFullYear();
            if (age >= 18) {
              requirements.push("Student letter (for students 18-25 years)");
            }
          }
          requirements.push("Birth certificate");
          break;
        case 'parent':
          requirements.push("Proof of dependency (medical or financial)");
          break;
      }
    }

    if (enrollmentData.hasDisability) {
      requirements.push("Medical report detailing disability");
    }
  }

  private async createLifecycleEvent(event: LifecycleEvent): Promise<void> {
    try {
      await db.insert(memberLifeEvents).values({
        memberId: event.memberId,
        eventType: event.eventType,
        eventDate: event.eventDate,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
        reason: event.reason,
        notes: event.notes,
        processedBy: event.processedBy,
      });
    } catch (error) {
      console.error("Create lifecycle event error:", error);
      throw error;
    }
  }

  private async calculateWaitingPeriods(memberId: number, companyId: number): Promise<void> {
    // This would integrate with the benefits system to calculate waiting periods
    // Implementation would depend on the specific benefit structure
    console.log(`Calculating waiting periods for member ${memberId} in company ${companyId}`);
  }

  private async triggerWelcomeSequence(memberId: number, autoActivate: boolean): Promise<void> {
    // This would trigger welcome emails, SMS, and other communications
    console.log(`Triggering welcome sequence for member ${memberId}, auto-activated: ${autoActivate}`);
  }

  private async calculateSuspensionImpacts(memberId: number): Promise<any> {
    // Calculate how suspension affects benefits, claims, premiums, etc.
    return {
      benefitsSuspended: true,
      claimsProcessingSuspended: true,
      premiumCollectionSuspended: true,
      affectedDependents: 0 // Would be calculated based on actual data
    };
  }

  private async sendSuspensionNotifications(memberId: number, reason: string): Promise<void> {
    // Send suspension notifications via various channels
    console.log(`Sending suspension notifications for member ${memberId}, reason: ${reason}`);
  }

  private async sendReinstatementNotifications(memberId: number): Promise<void> {
    // Send reinstatement notifications via various channels
    console.log(`Sending reinstatement notifications for member ${memberId}`);
  }

  private async sendTerminationNotifications(memberId: number, reason: string, terminationDate: string): Promise<void> {
    // Send termination notifications via various channels
    console.log(`Sending termination notifications for member ${memberId}, reason: ${reason}, date: ${terminationDate}`);
  }

  private async calculateTerminationAdjustments(memberId: number, terminationDate: string): Promise<any> {
    // Calculate final premium adjustments, refund amounts, etc.
    return {
      premiumRefund: 0,
      finalBenefitsAdjustment: 0,
      terminationFee: 0
    };
  }

  private async checkBenefitEligibility(memberId: number, benefitId: number): Promise<any> {
    // Check if member is eligible for specific benefit
    return {
      isEligible: true,
      restrictions: []
    };
  }

  private async getActiveWaitingPeriods(memberId: number): Promise<any[]> {
    // Get active waiting periods for member
    return [];
  }

  private async getLimitsUtilization(memberId: number): Promise<any> {
    // Get current benefits utilization and remaining limits
    return {
      utilizationPercentage: 0,
      remainingLimits: {}
    };
  }

  private async checkProviderNetworkAccess(memberId: number, providerId: number): Promise<boolean> {
    // Check if provider is in member's network
    return true;
  }

  private async checkServiceTypeEligibility(memberId: number, serviceType: string): Promise<string[]> {
    // Check service-specific eligibility requirements
    return [];
  }
}

export const memberLifecycleService = new MemberLifecycleService();