import { db } from '../db';
import {
  providerOnboardingApplications,
  providerVerificationChecklist,
  medicalInstitutions,
  medicalPersonnel,
  users,
  auditLogs,
  providerOnboardingStatusEnum,
  providerVerificationStatusEnum
} from '../shared/schema';
import { eq, and, count, gte, lte, desc, sql } from 'drizzle-orm';

export class ProviderOnboardingService {
  /**
   * Generate a unique application number
   */
  async generateApplicationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await db.select({ count: count() })
      .from(providerOnboardingApplications)
      .where(sql`extract(year from submission_date) = ${year}`);

    const sequence = (count[0].count || 0) + 1;
    return `PROV-${year}-${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Create default verification checklist for a new application
   */
  async createVerificationChecklist(applicationId: number): Promise<void> {
    const defaultChecklistItems = [
      // Licensing
      { category: 'licensing', item: 'Medical Institution License Verification', required: true },
      { category: 'licensing', item: 'Professional License Verification', required: true },
      { category: 'licensing', item: 'Specialist Registration', required: false },

      // Accreditation
      { category: 'accreditation', item: 'National Accreditation Status', required: true },
      { category: 'accreditation', item: 'International Accreditation (JCI/ISO)', required: false },
      { category: 'accreditation', item: 'Board Certification Verification', required: false },

      // Compliance
      { category: 'compliance', item: 'Healthcare Compliance Certificate', required: true },
      { category: 'compliance', item: 'Tax Clearance Certificate', required: true },
      { category: 'compliance', item: 'Insurance Liability Coverage', required: true },
      { category: 'compliance', item: 'Data Protection Compliance', required: true },

      // Quality
      { category: 'quality', item: 'Quality Management System', required: true },
      { category: 'quality', item: 'Infection Control Protocols', required: true },
      { category: 'quality', item: 'Patient Safety Standards', required: true },

      // Financial
      { category: 'financial', item: 'Financial Statements', required: true },
      { category: 'financial', item: 'Bank Reference Letter', required: true },
      { category: 'financial', item: 'Credit Check', required: false }
    ];

    for (const item of defaultChecklistItems) {
      await db.insert(providerVerificationChecklist).values({
        applicationId,
        verificationCategory: item.category,
        checklistItem: item.item,
        isRequired: item.required,
        verificationMethod: this.getVerificationMethod(item.category, item.item)
      });
    }
  }

  /**
   * Get appropriate verification method for checklist items
   */
  private getVerificationMethod(category: string, item: string): string {
    if (category === 'licensing') return 'api_call';
    if (category === 'accreditation') return 'third_party';
    if (category === 'compliance') return 'document';
    if (category === 'quality') return 'site_visit';
    if (category === 'financial') return 'document';
    return 'document';
  }

  /**
   * Approve an onboarding application
   */
  async approveApplication(
    applicationId: number,
    approvedBy: number,
    notes?: string,
    effectiveDate?: Date
  ): Promise<any> {
    return await db.transaction(async (tx) => {
      // Update application status
      const [updatedApplication] = await tx.update(providerOnboardingApplications)
        .set({
          onboardingStatus: 'approved',
          reviewDate: new Date(),
          reviewerId: approvedBy,
          applicationNotes: notes,
          completionDate: new Date(),
          actualCompletionDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(providerOnboardingApplications.id, applicationId))
        .returning();

      // Update medical institution status
      const application = await tx.select()
        .from(providerOnboardingApplications)
        .where(eq(providerOnboardingApplications.id, applicationId))
        .limit(1);

      if (application[0]) {
        await tx.update(medicalInstitutions)
          .set({
            approvalStatus: 'approved',
            approvalDate: effectiveDate || new Date(),
            validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 2)) // 2 years validity
          })
          .where(eq(medicalInstitutions.id, application[0].institutionId));
      }

      // Create audit log
      await tx.insert(auditLogs).values({
        userId: approvedBy,
        action: 'approved',
        resource: 'provider_onboarding_application',
        resourceId: applicationId.toString(),
        timestamp: new Date()
      });

      return updatedApplication;
    });
  }

  /**
   * Reject an onboarding application
   */
  async rejectApplication(
    applicationId: number,
    rejectedBy: number,
    rejectionReason: string,
    notes?: string
  ): Promise<any> {
    return await db.transaction(async (tx) => {
      const [updatedApplication] = await tx.update(providerOnboardingApplications)
        .set({
          onboardingStatus: 'rejected',
          reviewDate: new Date(),
          reviewerId: rejectedBy,
          rejectionReason,
          applicationNotes: notes,
          updatedAt: new Date()
        })
        .where(eq(providerOnboardingApplications.id, applicationId))
        .returning();

      // Create audit log
      await tx.insert(auditLogs).values({
        userId: rejectedBy,
        action: 'rejected',
        resource: 'provider_onboarding_application',
        resourceId: applicationId.toString(),
        timestamp: new Date()
      });

      return updatedApplication;
    });
  }

  /**
   * Check if all required checklist items are completed
   */
  async checkApplicationCompletion(applicationId: number): Promise<void> {
    const checklist = await db.select()
      .from(providerVerificationChecklist)
      .where(
        and(
          eq(providerVerificationChecklist.applicationId, applicationId),
          eq(providerVerificationChecklist.isRequired, true)
        )
      );

    const allCompleted = checklist.every(item => item.isCompleted);

    if (allCompleted) {
      // Update application status to verification_in_progress
      await db.update(providerOnboardingApplications)
        .set({
          onboardingStatus: 'verification_in_progress',
          automatedChecksCompleted: true,
          updatedAt: new Date()
        })
        .where(eq(providerOnboardingApplications.id, applicationId));
    }
  }

  /**
   * Get onboarding analytics for specified period
   */
  async getOnboardingAnalytics(days: number): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const applications = await db.select()
      .from(providerOnboardingApplications)
      .where(gte(providerOnboardingApplications.submissionDate, startDate));

    // Calculate metrics
    const totalApplications = applications.length;
    const approvedApplications = applications.filter(app => app.onboardingStatus === 'approved').length;
    const rejectedApplications = applications.filter(app => app.onboardingStatus === 'rejected').length;
    const pendingApplications = applications.filter(app => app.onboardingStatus === 'registered' || app.onboardingStatus === 'document_pending').length;
    const inProgressApplications = applications.filter(app => app.onboardingStatus === 'verification_in_progress').length;

    // Average processing time
    const completedApplications = applications.filter(app => app.completionDate);
    const avgProcessingTime = completedApplications.length > 0
      ? completedApplications.reduce((sum, app) => {
          const processingTime = app.completionDate!.getTime() - app.submissionDate.getTime();
          return sum + processingTime;
        }, 0) / completedApplications.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    // Priority distribution
    const priorityDistribution = {
      high: applications.filter(app => app.priorityLevel <= 2).length,
      medium: applications.filter(app => app.priorityLevel === 3).length,
      low: applications.filter(app => app.priorityLevel >= 4).length
    };

    // Application types
    const applicationTypes = applications.reduce((acc, app) => {
      acc[app.applicationType] = (acc[app.applicationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      summary: {
        totalApplications,
        approvedApplications,
        rejectedApplications,
        pendingApplications,
        inProgressApplications,
        approvalRate: totalApplications > 0 ? (approvedApplications / totalApplications) * 100 : 0,
        avgProcessingTime: Math.round(avgProcessingTime * 10) / 10
      },
      priorityDistribution,
      applicationTypes,
      period: `${days} days`
    };
  }

  /**
   * Submit appeal for rejected application
   */
  async submitAppeal(
    applicationId: number,
    appealReason: string,
    supportingDocuments?: any[]
  ): Promise<any> {
    return await db.transaction(async (tx) => {
      const [updatedApplication] = await tx.update(providerOnboardingApplications)
        .set({
          appealStatus: 'pending',
          appealDate: new Date(),
          applicationNotes: appealReason,
          updatedAt: new Date()
        })
        .where(eq(providerOnboardingApplications.id, applicationId))
        .returning();

      // Create audit log
      await tx.insert(auditLogs).values({
        action: 'appeal_submitted',
        resource: 'provider_onboarding_application',
        resourceId: applicationId.toString(),
        timestamp: new Date()
      });

      return updatedApplication;
    });
  }

  /**
   * Run automated verification checks
   */
  async runAutomatedVerification(applicationId: number): Promise<any> {
    const checklist = await db.select()
      .from(providerVerificationChecklist)
      .where(eq(providerVerificationChecklist.applicationId, applicationId));

    const verificationResults = [];

    for (const item of checklist) {
      if (item.automaticVerification) {
        const result = await this.runAutomaticCheck(item);
        verificationResults.push(result);

        if (result.verified) {
          await db.update(providerVerificationChecklist)
            .set({
              isCompleted: true,
              completionDate: new Date(),
              verificationNotes: result.notes,
              updatedAt: new Date()
            })
            .where(eq(providerVerificationChecklist.id, item.id));
        }
      }
    }

    // Check if verification is complete
    await this.checkApplicationCompletion(applicationId);

    return {
      applicationId,
      verificationResults,
      completedAt: new Date()
    };
  }

  /**
   * Run automatic verification check for a checklist item
   */
  private async runAutomaticCheck(item: any): Promise<any> {
    // Simulate automatic verification
    // In a real implementation, this would integrate with external APIs

    const mockResults = {
      'Medical Institution License Verification': {
        verified: true,
        notes: 'License verified with Medical Practitioners Board',
        confidence: 0.95
      },
      'Professional License Verification': {
        verified: true,
        notes: 'Professional license verified with licensing authority',
        confidence: 0.92
      },
      'Tax Clearance Certificate': {
        verified: true,
        notes: 'Tax clearance verified with revenue authority',
        confidence: 0.88
      }
    };

    const result = mockResults[item.checklistItem] || {
      verified: false,
      notes: 'Manual verification required',
      confidence: 0
    };

    return {
      checklistItemId: item.id,
      item: item.checklistItem,
      ...result,
      verifiedAt: new Date()
    };
  }

  /**
   * Get applications pending case worker assignment
   */
  async getUnassignedApplications(): Promise<any[]> {
    return await db.select()
      .from(providerOnboardingApplications)
      .where(eq(providerOnboardingApplications.assignedCaseWorker, null))
      .orderBy(providerOnboardingApplications.priorityLevel, providerOnboardingApplications.submissionDate);
  }

  /**
   * Get applications requiring follow-up
   */
  async getApplicationsNeedingFollowUp(): Promise<any[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db.select()
      .from(providerOnboardingApplications)
      .where(
        and(
          lte(providerOnboardingApplications.nextFollowUpDate, tomorrow),
          sql`${providerOnboardingApplications.onboardingStatus} IN ('registered', 'document_pending', 'verification_in_progress')`
        )
      )
      .orderBy(providerOnboardingApplications.nextFollowUpDate);
  }

  /**
   * Update application follow-up date
   */
  async updateFollowUpDate(applicationId: number, followUpDate: Date, updatedBy: number): Promise<any> {
    const [updatedApplication] = await db.update(providerOnboardingApplications)
      .set({
        nextFollowUpDate: followUpDate,
        updatedAt: new Date()
      })
      .where(eq(providerOnboardingApplications.id, applicationId))
      .returning();

    // Create audit log
    await db.insert(auditLogs).values({
      userId: updatedBy,
      action: 'follow_up_scheduled',
      resource: 'provider_onboarding_application',
      resourceId: applicationId.toString(),
      timestamp: new Date()
    });

    return updatedApplication;
  }
}

export const providerOnboardingService = new ProviderOnboardingService();