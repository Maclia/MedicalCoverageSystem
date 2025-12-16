import { Database } from '../models/Database';
import { WinstonLogger } from '../utils/WinstonLogger';
import {
  members,
  memberLifeEvents,
  memberDocuments,
  memberConsents
} from '../models/schema';
import {
  CreateMemberRequest,
  UpdateMemberRequest,
  MemberSearchRequest,
  BulkMemberUpdateRequest,
  DocumentUploadRequest,
  MemberNotificationRequest,
  MemberStatsRequest,
  MemberEligibilityRequest
} from '../types/MembershipTypes';
import {
  ValidationError,
  NotFoundError,
  BusinessRuleError
} from '../utils/CustomErrors';
import {
  eq,
  sql,
  and,
  or,
  desc,
  asc,
  inArray,
  like,
  gte,
  lte
} from 'drizzle-orm';

export class MembershipServiceSimplified {
  private readonly db: Database;
  private readonly logger: WinstonLogger;

  constructor() {
    this.db = Database.getInstance();
    this.logger = new WinstonLogger('membership-service');
  }

  /**
   * Create a new member
   */
  async createMember(request: CreateMemberRequest, context: any): Promise<any> {
    const db = this.db.getDb();

    try {
      this.logger.info('Creating new member', {
        email: request.email,
        companyId: request.companyId
      });

      // Validate business rules
      await this.validateBusinessRules(request);

      // Check for duplicates
      await this.checkForExistingMember(request);

      // Generate member ID
      const memberId = await this.generateMemberId(request.companyId);

      // Create member record
      const memberData = {
        ...request,
        memberId,
        membershipStatus: 'pending',
        enrollmentDate: new Date(),
        dateOfBirth: new Date(request.dateOfBirth),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const member = await db.insert(members).values(memberData).returning();

      // Create enrollment life event
      await this.createLifeEvent(member[0].id, {
        eventType: 'enrollment',
        eventDate: new Date(),
        previousStatus: null,
        newStatus: 'pending',
        reason: 'New member enrollment',
        processedBy: context.userId,
        metadata: { enrollmentSource: request.source || 'manual' }
      });

      this.logger.info('Member created successfully', {
        memberId: member[0].id,
        enrollmentId: memberId
      });

      return member[0];

    } catch (error) {
      this.logger.error('Failed to create member', { error, request });
      throw error;
    }
  }

  /**
   * Update member information
   */
  async updateMember(memberId: number, request: UpdateMemberRequest, context: any): Promise<any> {
    const db = this.db.getDb();

    try {
      const member = await this.getMemberById(memberId);
      if (!member) {
        throw new NotFoundError('Member not found');
      }

      const updateData = {
        ...request,
        updatedAt: new Date()
      };

      const updatedMember = await db
        .update(members)
        .set(updateData)
        .where(eq(members.id, memberId))
        .returning();

      return updatedMember[0];

    } catch (error) {
      this.logger.error('Failed to update member', { error, memberId });
      throw error;
    }
  }

  /**
   * Get member by ID
   */
  async getMemberById(memberId: number): Promise<any> {
    const db = this.db.getDb();

    try {
      const member = await db
        .select()
        .from(members)
        .where(eq(members.id, memberId))
        .limit(1);

      return member.length > 0 ? member[0] : null;

    } catch (error) {
      this.logger.error('Failed to get member by ID', { error, memberId });
      throw error;
    }
  }

  /**
   * Activate a member
   */
  async activateMember(memberId: number, data: any, context: any): Promise<any> {
    const db = this.db.getDb();

    try {
      const member = await this.getMemberById(memberId);
      if (!member) {
        throw new NotFoundError('Member not found');
      }

      if (member.membershipStatus === 'active') {
        throw new BusinessRuleError('Member is already active');
      }

      // Update member status
      const updatedMember = await db
        .update(members)
        .set({
          membershipStatus: 'active',
          activationDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(members.id, memberId))
        .returning();

      // Create activation life event
      await this.createLifeEvent(memberId, {
        eventType: 'activation',
        eventDate: new Date(),
        previousStatus: member.membershipStatus,
        newStatus: 'active',
        reason: data.reason || 'Member activation',
        processedBy: context.userId,
        notes: data.notes
      });

      return updatedMember[0];

    } catch (error) {
      this.logger.error('Failed to activate member', { error, memberId });
      throw error;
    }
  }

  /**
   * Suspend a member
   */
  async suspendMember(memberId: number, data: any, context: any): Promise<any> {
    const db = this.db.getDb();

    try {
      const member = await this.getMemberById(memberId);
      if (!member) {
        throw new NotFoundError('Member not found');
      }

      if (member.membershipStatus !== 'active') {
        throw new BusinessRuleError('Only active members can be suspended');
      }

      // Update member status
      const updatedMember = await db
        .update(members)
        .set({
          membershipStatus: 'suspended',
          suspendedAt: new Date(),
          suspendedReason: data.reason,
          updatedAt: new Date()
        })
        .where(eq(members.id, memberId))
        .returning();

      // Create suspension life event
      await this.createLifeEvent(memberId, {
        eventType: 'suspension',
        eventDate: new Date(),
        previousStatus: 'active',
        newStatus: 'suspended',
        reason: data.reason,
        notes: data.notes,
        processedBy: context.userId
      });

      return updatedMember[0];

    } catch (error) {
      this.logger.error('Failed to suspend member', { error, memberId });
      throw error;
    }
  }

  /**
   * Terminate a member
   */
  async terminateMember(memberId: number, data: any, context: any): Promise<any> {
    const db = this.db.getDb();

    try {
      const member = await this.getMemberById(memberId);
      if (!member) {
        throw new NotFoundError('Member not found');
      }

      // Update member status
      const updatedMember = await db
        .update(members)
        .set({
          membershipStatus: 'terminated',
          terminatedAt: new Date(),
          terminationReason: data.reason,
          updatedAt: new Date()
        })
        .where(eq(members.id, memberId))
        .returning();

      // Create termination life event
      await this.createLifeEvent(memberId, {
        eventType: 'termination',
        eventDate: new Date(),
        previousStatus: member.membershipStatus,
        newStatus: 'terminated',
        reason: data.reason,
        notes: data.notes,
        processedBy: context.userId
      });

      return updatedMember[0];

    } catch (error) {
      this.logger.error('Failed to terminate member', { error, memberId });
      throw error;
    }
  }

  /**
   * Renew a member
   */
  async renewMember(memberId: number, data: any, context: any): Promise<any> {
    const db = this.db.getDb();

    try {
      const member = await this.getMemberById(memberId);
      if (!member) {
        throw new NotFoundError('Member not found');
      }

      const renewalDate = new Date(data.renewalDate);

      // Update member renewal
      const updatedMember = await db
        .update(members)
        .set({
          membershipStatus: 'active',
          renewalDate,
          expiresAt: renewalDate,
          updatedAt: new Date()
        })
        .where(eq(members.id, memberId))
        .returning();

      // Create renewal life event
      await this.createLifeEvent(memberId, {
        eventType: 'renewal',
        eventDate: new Date(),
        previousStatus: member.membershipStatus,
        newStatus: 'active',
        reason: 'Membership renewal',
        notes: data.notes,
        processedBy: context.userId
      });

      return updatedMember[0];

    } catch (error) {
      this.logger.error('Failed to renew member', { error, memberId });
      throw error;
    }
  }

  /**
   * Search members
   */
  async searchMembers(request: MemberSearchRequest): Promise<any> {
    const db = this.db.getDb();

    try {
      let query = db.select().from(members);

      // Apply filters
      if (request.filters) {
        const { filters } = request;

        if (filters.companyId) {
          query = query.where(eq(members.companyId, filters.companyId));
        }

        if (filters.membershipStatus) {
          query = query.where(eq(members.membershipStatus, filters.membershipStatus));
        }

        if (filters.memberType) {
          query = query.where(eq(members.memberType, filters.memberType));
        }

        if (filters.dateOfBirth) {
          query = query.where(eq(members.dateOfBirth, new Date(filters.dateOfBirth)));
        }

        if (filters.gender) {
          query = query.where(eq(members.gender, filters.gender));
        }
      }

      // Apply text search
      if (request.query) {
        query = query.where(
          or(
            like(members.firstName, `%${request.query}%`),
            like(members.lastName, `%${request.query}%`),
            like(members.email, `%${request.query}%`),
            like(members.phone, `%${request.query}%`),
            like(members.memberId, `%${request.query}%`)
          )
        );
      }

      // Apply pagination
      const { page = 1, limit = 20 } = request.pagination || {};
      const offset = (page - 1) * limit;

      const membersResult = await query
        .limit(limit)
        .offset(offset)
        .orderBy(desc(members.createdAt));

      return {
        members: membersResult,
        pagination: {
          page,
          limit,
          total: membersResult.length,
          totalPages: Math.ceil(membersResult.length / limit)
        }
      };

    } catch (error) {
      this.logger.error('Failed to search members', { error, request });
      throw error;
    }
  }

  /**
   * Get member lifecycle events
   */
  async getMemberLifecycleEvents(memberId: number): Promise<any[]> {
    const db = this.db.getDb();

    try {
      const events = await db
        .select()
        .from(memberLifeEvents)
        .where(eq(memberLifeEvents.memberId, memberId))
        .orderBy(desc(memberLifeEvents.eventDate));

      return events;

    } catch (error) {
      this.logger.error('Failed to get member lifecycle events', { error, memberId });
      throw error;
    }
  }

  /**
   * Get member documents
   */
  async getMemberDocuments(memberId: number): Promise<any[]> {
    const db = this.db.getDb();

    try {
      const documents = await db
        .select()
        .from(memberDocuments)
        .where(eq(memberDocuments.memberId, memberId))
        .orderBy(desc(memberDocuments.createdAt));

      return documents;

    } catch (error) {
      this.logger.error('Failed to get member documents', { error, memberId });
      throw error;
    }
  }

  /**
   * Upload member document
   */
  async uploadDocument(memberId: number, documentData: DocumentUploadRequest, context: any): Promise<any> {
    const db = this.db.getDb();

    try {
      const document = await db.insert(memberDocuments).values({
        memberId,
        documentType: documentData.documentType,
        documentName: documentData.documentName,
        fileName: documentData.fileName,
        filePath: documentData.filePath,
        fileSize: documentData.fileSize,
        mimeType: documentData.mimeType,
        expiresAt: documentData.expiresAt ? new Date(documentData.expiresAt) : null,
        uploadedBy: context.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      return document[0];

    } catch (error) {
      this.logger.error('Failed to upload document', { error, memberId });
      throw error;
    }
  }

  /**
   * Delete member document
   */
  async deleteDocument(memberId: number, documentId: number, context: any): Promise<void> {
    const db = this.db.getDb();

    try {
      const result = await db
        .delete(memberDocuments)
        .where(
          and(
            eq(memberDocuments.id, documentId),
            eq(memberDocuments.memberId, memberId)
          )
        );

      if (result.rowCount === 0) {
        throw new NotFoundError('Document not found or access denied');
      }

    } catch (error) {
      this.logger.error('Failed to delete document', { error, memberId, documentId });
      throw error;
    }
  }

  /**
   * Get membership statistics
   */
  async getMembershipStats(filters: MemberStatsRequest): Promise<any> {
    const db = this.db.getDb();

    try {
      let query = db.select().from(members);

      if (filters.companyId) {
        query = query.where(eq(members.companyId, filters.companyId));
      }

      if (filters.membershipStatus) {
        query = query.where(eq(members.membershipStatus, filters.membershipStatus));
      }

      if (filters.dateFrom && filters.dateTo) {
        query = query.where(
          and(
            gte(members.createdAt, new Date(filters.dateFrom)),
            lte(members.createdAt, new Date(filters.dateTo))
          )
        );
      }

      const allMembers = await query;

      const stats = {
        total: allMembers.length,
        active: allMembers.filter(m => m.membershipStatus === 'active').length,
        pending: allMembers.filter(m => m.membershipStatus === 'pending').length,
        suspended: allMembers.filter(m => m.membershipStatus === 'suspended').length,
        terminated: allMembers.filter(m => m.membershipStatus === 'terminated').length,
        expired: allMembers.filter(m => m.membershipStatus === 'expired').length,
        principal: allMembers.filter(m => m.memberType === 'principal').length,
        dependent: allMembers.filter(m => m.memberType === 'dependent').length
      };

      return stats;

    } catch (error) {
      this.logger.error('Failed to get membership stats', { error, filters });
      throw error;
    }
  }

  /**
   * Bulk update members
   */
  async bulkUpdateMembers(bulkData: BulkMemberUpdateRequest, context: any): Promise<any> {
    const db = this.db.getDb();

    try {
      const { memberIds, updateType, updateData } = bulkData;

      if (!memberIds || memberIds.length === 0) {
        throw new ValidationError('At least one member ID is required');
      }

      let updateResult: any;

      switch (updateType) {
        case 'suspend':
          updateResult = await db
            .update(members)
            .set({
              membershipStatus: 'suspended',
              suspendedAt: new Date(),
              suspendedReason: updateData.reason,
              updatedAt: new Date()
            })
            .where(inArray(members.id, memberIds));
          break;

        case 'activate':
          updateResult = await db
            .update(members)
            .set({
              membershipStatus: 'active',
              activatedAt: new Date(),
              suspendedAt: null,
              suspendedReason: null,
              updatedAt: new Date()
            })
            .where(inArray(members.id, memberIds));
          break;

        case 'terminate':
          updateResult = await db
            .update(members)
            .set({
              membershipStatus: 'terminated',
              terminatedAt: new Date(),
              terminationReason: updateData.reason,
              updatedAt: new Date()
            })
            .where(inArray(members.id, memberIds));
          break;

        case 'renew':
          updateResult = await db
            .update(members)
            .set({
              membershipStatus: 'active',
              renewalDate: new Date(updateData.renewalDate),
              expiresAt: new Date(updateData.renewalDate),
              updatedAt: new Date()
            })
            .where(inArray(members.id, memberIds));
          break;

        default:
          throw new ValidationError('Invalid update type');
      }

      return {
        updatedCount: updateResult.rowCount || 0,
        updateType,
        updateData
      };

    } catch (error) {
      this.logger.error('Failed to bulk update members', { error, bulkData });
      throw error;
    }
  }

  /**
   * Check member eligibility
   */
  async checkEligibility(memberId: number, eligibilityData: MemberEligibilityRequest): Promise<any> {
    const db = this.db.getDb();

    try {
      const member = await this.getMemberById(memberId);
      if (!member) {
        throw new NotFoundError('Member not found');
      }

      const isEligible = member.membershipStatus === 'active' &&
                        member.expiresAt &&
                        member.expiresAt > new Date();

      return {
        memberId,
        eligible: isEligible,
        membershipStatus: member.membershipStatus,
        expiresAt: member.expiresAt,
        benefitId: eligibilityData.benefitId,
        coverageType: eligibilityData.coverageType,
        serviceType: eligibilityData.serviceType,
        checkedAt: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to check eligibility', { error, memberId });
      throw error;
    }
  }

  /**
   * Send notification to member
   */
  async sendNotification(memberId: number, notificationData: MemberNotificationRequest, context: any): Promise<any> {
    try {
      const member = await this.getMemberById(memberId);
      if (!member) {
        throw new NotFoundError('Member not found');
      }

      // In a real implementation, this would integrate with email/SMS services
      const notification = {
        id: Math.random().toString(36).substr(2, 9),
        memberId,
        type: notificationData.communicationType,
        channel: notificationData.channel || 'email',
        subject: notificationData.subject,
        content: notificationData.content,
        recipient: notificationData.recipient || member.email,
        sentAt: new Date(),
        sentBy: context.userId
      };

      this.logger.info('Notification sent', { memberId, notification });

      return notification;

    } catch (error) {
      this.logger.error('Failed to send notification', { error, memberId });
      throw error;
    }
  }

  /**
   * Get member consents
   */
  async getMemberConsents(memberId: number): Promise<any[]> {
    const db = this.db.getDb();

    try {
      const consents = await db
        .select()
        .from(memberConsents)
        .where(eq(memberConsents.memberId, memberId))
        .orderBy(desc(memberConsents.createdAt));

      return consents;

    } catch (error) {
      this.logger.error('Failed to get member consents', { error, memberId });
      throw error;
    }
  }

  /**
   * Update member consent
   */
  async updateConsent(memberId: number, consentData: any, context: any): Promise<any> {
    const db = this.db.getDb();

    try {
      const consent = await db.insert(memberConsents).values({
        memberId,
        consentType: consentData.consentType,
        granted: consentData.granted,
        grantedAt: consentData.granted ? new Date() : null,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        version: consentData.version || '1.0',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      return consent[0];

    } catch (error) {
      this.logger.error('Failed to update consent', { error, memberId });
      throw error;
    }
  }

  // Private helper methods
  private async validateBusinessRules(request: CreateMemberRequest): Promise<void> {
    // Validate Kenyan phone number
    const phoneRegex = /^254[7]\d{8}$/;
    if (!phoneRegex.test(request.phone)) {
      throw new ValidationError('Invalid Kenyan phone number format');
    }

    // Validate age
    const age = this.calculateAge(new Date(request.dateOfBirth));
    if (request.memberType === 'principal' && age < 18) {
      throw new ValidationError('Principal members must be at least 18 years old');
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.email)) {
      throw new ValidationError('Invalid email format');
    }
  }

  private async checkForExistingMember(request: CreateMemberRequest): Promise<void> {
    const db = this.db.getDb();

    const existingMember = await db
      .select()
      .from(members)
      .where(
        or(
          eq(members.email, request.email),
          eq(members.phone, request.phone)
        )
      )
      .limit(1);

    if (existingMember.length > 0) {
      throw new BusinessRuleError('Member with this email or phone already exists');
    }
  }

  private async generateMemberId(companyId: number): Promise<string> {
    const db = this.db.getDb();
    const prefix = `MC${companyId.toString().padStart(3, '0')}`;

    const lastMember = await db
      .select({ memberId: members.memberId })
      .from(members)
      .where(sql`${members.memberId} LIKE ${prefix + '%'}`)
      .orderBy(desc(members.memberId))
      .limit(1);

    let nextNumber = 1;
    if (lastMember.length > 0) {
      const lastMemberId = lastMember[0].memberId;
      const lastNumber = parseInt(lastMemberId.replace(prefix, '')) || 0;
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
  }

  private async createLifeEvent(memberId: number, event: any): Promise<void> {
    const db = this.db.getDb();

    const eventData = {
      memberId,
      ...event,
      createdAt: new Date()
    };

    await db.insert(memberLifeEvents).values(eventData);
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }
}