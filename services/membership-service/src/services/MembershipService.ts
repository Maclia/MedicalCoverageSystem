import { Database } from '../models/Database';
import { WinstonLogger } from '../utils/WinstonLogger';
import { members, lifeEvents, documents, consents, communications, companies } from '../models/schema';
import {
  CreateMemberRequest,
  UpdateMemberRequest,
  MemberSearchRequest,
  BulkMemberUpdateRequest,
  DocumentUploadRequest,
  MemberNotificationRequest,
  MemberStatsRequest,
  MemberEligibilityRequest,
} from '../types/MembershipTypes';
import { ValidationError, NotFoundError, BusinessRuleError } from '../utils/CustomErrors';
import { eq, and, or, desc, inArray, like, gte, lte } from 'drizzle-orm';

export class MembershipServiceSimplified {
  private readonly db: Database;
  private readonly logger: WinstonLogger;

  constructor() {
    this.db = Database.getInstance();
    this.logger = new WinstonLogger('membership-service');
  }

  async createMember(request: CreateMemberRequest, context: any): Promise<any> {
    const db: any = this.db.getDb();
    const memberTable: any = members;

    await this.validateBusinessRules(request);
    await this.checkForExistingMember(request);

    const memberNumber = await this.generateMemberNumber(request.companyId);
    const now = new Date();

    const created = await db
      .insert(memberTable)
      .values({
        memberNumber,
        companyId: request.companyId,
        principalId: request.principalId ?? null,
        firstName: request.firstName,
        lastName: request.lastName,
        middleName: request.secondName ?? null,
        dateOfBirth: new Date(request.dateOfBirth).toISOString().slice(0, 10),
        gender: request.gender ?? 'other',
        maritalStatus: request.maritalStatus ?? 'single',
        nationalId: request.nationalId ?? null,
        passportNumber: request.passportNumber ?? null,
        phoneNumber: request.phone,
        email: request.email,
        physicalAddress: request.address ?? null,
        city: request.city ?? null,
        postalCode: request.postalCode ?? null,
        country: request.country ?? 'Kenya',
        membershipStatus: 'pending',
        membershipType: request.memberType,
        dependentType: request.dependentType ?? null,
        enrollmentDate: now.toISOString().slice(0, 10),
        effectiveDate: now.toISOString().slice(0, 10),
        isPrimary: request.memberType === 'principal',
        isDependent: request.memberType === 'dependent',
        isPrincipal: request.memberType === 'principal',
        isDisabled: request.hasDisability ?? false,
        notes: request.disabilityDetails ?? null,
        metadata: {
          employeeId: request.employeeId,
          communicationPreferences: request.communicationPreferences,
          source: request.source ?? 'manual',
          createdBy: context?.userId ?? null,
        },
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const member = created[0];
    await this.createLifeEvent(member.id, member.companyId, {
      eventType: 'enrollment',
      eventDate: now,
      effectiveDate: now,
      reason: 'New member enrollment',
      description: 'Member created',
      metadata: {
        previousStatus: null,
        newStatus: 'pending',
        processedBy: context?.userId ?? null,
      },
    });

    return member;
  }

  async updateMember(memberId: number, request: UpdateMemberRequest, _context?: any): Promise<any> {
    const db: any = this.db.getDb();
    const memberTable: any = members;
    const member = await this.getMemberById(memberId);

    if (!member) {
      throw new NotFoundError('Member not found');
    }

    const updated = await db
      .update(memberTable)
      .set({
        firstName: request.firstName ?? member.firstName,
        lastName: request.lastName ?? member.lastName,
        middleName: request.secondName ?? member.middleName ?? null,
        phoneNumber: request.phone ?? member.phoneNumber,
        physicalAddress: request.address ?? member.physicalAddress ?? null,
        city: request.city ?? member.city ?? null,
        postalCode: request.postalCode ?? member.postalCode ?? null,
        country: request.country ?? member.country ?? 'Kenya',
        isDisabled: request.hasDisability ?? member.isDisabled ?? false,
        notes: request.disabilityDetails ?? member.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(memberTable.id, memberId))
      .returning();

    return updated[0];
  }

  async getMemberById(memberId: number): Promise<any> {
    const db: any = this.db.getDb();
    const memberTable: any = members;
    const result = await db.select().from(memberTable).where(eq(memberTable.id, memberId)).limit(1);
    return result[0] ?? null;
  }

  async activateMember(memberId: number, data: any, context: any): Promise<any> {
    return this.updateMemberStatus(memberId, 'active', data?.reason ?? 'Member activation', context, {
      effectiveDate: new Date().toISOString().slice(0, 10),
      suspensionDate: null,
      suspensionReason: null,
      terminationDate: null,
    });
  }

  async suspendMember(memberId: number, data: any, context: any): Promise<any> {
    return this.updateMemberStatus(memberId, 'suspended', data?.reason, context, {
      suspensionDate: new Date().toISOString().slice(0, 10),
      suspensionReason: data?.reason ?? null,
    });
  }

  async terminateMember(memberId: number, data: any, context: any): Promise<any> {
    return this.updateMemberStatus(memberId, 'terminated', data?.reason, context, {
      terminationDate: new Date().toISOString().slice(0, 10),
      terminationReason: data?.reason ?? null,
    });
  }

  async renewMember(memberId: number, data: any, context: any): Promise<any> {
    const renewalDate = new Date(data.renewalDate);
    return this.updateMemberStatus(memberId, 'active', 'Membership renewal', context, {
      effectiveDate: renewalDate.toISOString().slice(0, 10),
      terminationDate: null,
      terminationReason: null,
      suspensionDate: null,
      suspensionReason: null,
      metadata: {
        renewalDate: renewalDate.toISOString(),
        notes: data?.notes ?? null,
      },
    });
  }

  async searchMembers(request: MemberSearchRequest): Promise<any> {
    const db: any = this.db.getDb();
    const memberTable: any = members;
    let query: any = db.select().from(memberTable);

    if (request.filters?.companyId) {
      query = query.where(eq(memberTable.companyId, request.filters.companyId));
    }

    if (request.filters?.membershipStatus) {
      query = query.where(eq(memberTable.membershipStatus, request.filters.membershipStatus));
    }

    if (request.filters?.memberType) {
      query = query.where(eq(memberTable.membershipType, request.filters.memberType));
    }

    if (request.filters?.dateOfBirth) {
      query = query.where(eq(memberTable.dateOfBirth, request.filters.dateOfBirth));
    }

    if (request.filters?.gender) {
      query = query.where(eq(memberTable.gender, request.filters.gender));
    }

    if (request.query) {
      query = query.where(
        or(
          like(memberTable.firstName, `%${request.query}%`),
          like(memberTable.lastName, `%${request.query}%`),
          like(memberTable.email, `%${request.query}%`),
          like(memberTable.phoneNumber, `%${request.query}%`),
          like(memberTable.memberNumber, `%${request.query}%`)
        )
      );
    }

    const page = request.pagination?.page ?? 1;
    const limit = request.pagination?.limit ?? 20;
    const offset = (page - 1) * limit;

    const result = await query.limit(limit).offset(offset).orderBy(desc(memberTable.createdAt));

    return {
      members: result,
      pagination: {
        page,
        limit,
        total: result.length,
        totalPages: Math.ceil(result.length / limit) || 1,
      },
    };
  }

  async getMemberLifecycleEvents(memberId: number): Promise<any[]> {
    const db: any = this.db.getDb();
    const table: any = lifeEvents;
    return db.select().from(table).where(eq(table.memberId, memberId)).orderBy(desc(table.eventDate));
  }

  async getMemberDocuments(memberId: number): Promise<any[]> {
    const db: any = this.db.getDb();
    const table: any = documents;
    return db.select().from(table).where(eq(table.memberId, memberId)).orderBy(desc(table.createdAt));
  }

  async uploadDocument(memberId: number, documentData: DocumentUploadRequest, context: any): Promise<any> {
    const db: any = this.db.getDb();
    const table: any = documents;
    const member = await this.getMemberById(memberId);

    if (!member) {
      throw new NotFoundError('Member not found');
    }

    const created = await db
      .insert(table)
      .values({
        memberId,
        companyId: member.companyId,
        documentType: documentData.documentType,
        documentNumber: documentData.fileName,
        documentUrl: documentData.filePath,
        documentData: {
          originalName: documentData.documentName,
          fileName: documentData.fileName,
          fileSize: documentData.fileSize,
          mimeType: documentData.mimeType,
          uploadedBy: context?.userId ?? null,
          expiresAt: documentData.expiresAt ?? null,
        },
        notes: documentData.documentName,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return created[0];
  }

  async deleteDocument(memberId: number, documentId: number, _context?: any): Promise<void> {
    const db: any = this.db.getDb();
    const table: any = documents;
    const existing = await db
      .select()
      .from(table)
      .where(and(eq(table.id, documentId), eq(table.memberId, memberId)))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundError('Document not found or access denied');
    }

    await db.delete(table).where(and(eq(table.id, documentId), eq(table.memberId, memberId)));
  }

  async getMembershipStats(filters: MemberStatsRequest): Promise<any> {
    const db: any = this.db.getDb();
    const memberTable: any = members;
    let query: any = db.select().from(memberTable);

    if (filters.companyId) {
      query = query.where(eq(memberTable.companyId, filters.companyId));
    }

    if (filters.membershipStatus) {
      query = query.where(eq(memberTable.membershipStatus, filters.membershipStatus));
    }

    if (filters.dateFrom && filters.dateTo) {
      query = query.where(
        and(
          gte(memberTable.createdAt, new Date(filters.dateFrom)),
          lte(memberTable.createdAt, new Date(filters.dateTo))
        )
      );
    }

    const allMembers = await query;
    return {
      total: allMembers.length,
      active: allMembers.filter((member: any) => member.membershipStatus === 'active').length,
      pending: allMembers.filter((member: any) => member.membershipStatus === 'pending').length,
      suspended: allMembers.filter((member: any) => member.membershipStatus === 'suspended').length,
      terminated: allMembers.filter((member: any) => member.membershipStatus === 'terminated').length,
      expired: allMembers.filter((member: any) => member.membershipStatus === 'expired').length,
      principal: allMembers.filter((member: any) => member.membershipType === 'principal').length,
      dependent: allMembers.filter((member: any) => member.membershipType === 'dependent').length,
    };
  }

  async bulkUpdateMembers(bulkData: BulkMemberUpdateRequest, _context?: any): Promise<any> {
    const db: any = this.db.getDb();
    const memberTable: any = members;

    if (!bulkData.memberIds?.length) {
      throw new ValidationError('At least one member ID is required');
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (bulkData.updateType === 'suspend') {
      updates.membershipStatus = 'suspended';
      updates.suspensionDate = new Date().toISOString().slice(0, 10);
      updates.suspensionReason = bulkData.updateData.reason ?? null;
    } else if (bulkData.updateType === 'activate') {
      updates.membershipStatus = 'active';
      updates.suspensionDate = null;
      updates.suspensionReason = null;
      updates.terminationDate = null;
      updates.terminationReason = null;
    } else if (bulkData.updateType === 'terminate') {
      updates.membershipStatus = 'terminated';
      updates.terminationDate = new Date().toISOString().slice(0, 10);
      updates.terminationReason = bulkData.updateData.reason ?? null;
    } else if (bulkData.updateType === 'renew') {
      if (!bulkData.updateData.renewalDate) {
        throw new ValidationError('renewalDate is required for renew operations');
      }
      updates.membershipStatus = 'active';
      updates.effectiveDate = new Date(bulkData.updateData.renewalDate).toISOString().slice(0, 10);
      updates.terminationDate = null;
      updates.terminationReason = null;
    } else {
      throw new ValidationError('Invalid update type');
    }

    await db.update(memberTable).set(updates).where(inArray(memberTable.id, bulkData.memberIds));

    return {
      updatedCount: bulkData.memberIds.length,
      updateType: bulkData.updateType,
      updateData: bulkData.updateData,
    };
  }

  async checkEligibility(memberId: number, eligibilityData: MemberEligibilityRequest): Promise<any> {
    const member = await this.getMemberById(memberId);
    if (!member) {
      throw new NotFoundError('Member not found');
    }

    const eligible = member.membershipStatus === 'active' && !member.terminationDate;

    return {
      memberId,
      eligible,
      membershipStatus: member.membershipStatus,
      effectiveDate: member.effectiveDate,
      terminationDate: member.terminationDate,
      benefitId: eligibilityData.benefitId,
      coverageType: eligibilityData.coverageType,
      serviceType: eligibilityData.serviceType,
      checkedAt: new Date(),
    };
  }

  async sendNotification(memberId: number, notificationData: MemberNotificationRequest, context: any): Promise<any> {
    const member = await this.getMemberById(memberId);
    if (!member) {
      throw new NotFoundError('Member not found');
    }

    const notification = {
      id: Math.random().toString(36).slice(2, 11),
      memberId,
      type: notificationData.communicationType,
      channel: notificationData.channel || 'email',
      subject: notificationData.subject,
      content: notificationData.content,
      recipient: notificationData.recipient || member.email,
      sentAt: new Date(),
      sentBy: context?.userId ?? null,
    };

    this.logger.info('Notification sent', { memberId, notification });
    return notification;
  }

  async getMemberConsents(memberId: number): Promise<any[]> {
    const db: any = this.db.getDb();
    const table: any = consents;
    return db.select().from(table).where(eq(table.memberId, memberId)).orderBy(desc(table.createdAt));
  }

  async updateConsent(memberId: number, consentData: any, context: any): Promise<any> {
    const db: any = this.db.getDb();
    const table: any = consents;
    const member = await this.getMemberById(memberId);

    if (!member) {
      throw new NotFoundError('Member not found');
    }

    const created = await db
      .insert(table)
      .values({
        memberId,
        companyId: member.companyId,
        consentType: consentData.consentType,
        consentGiven: Boolean(consentData.granted),
        consentDate: new Date().toISOString().slice(0, 10),
        consentIpAddress: context?.ipAddress ?? null,
        consentUserAgent: context?.userAgent ?? null,
        consentVersion: consentData.version || '1.0',
        metadata: {
          granted: Boolean(consentData.granted),
          source: 'api',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return created[0];
  }

  async getAdminDashboardSummary(): Promise<any> {
    const db: any = this.db.getDb();
    const memberTable: any = members;
    const documentTable: any = documents;
    const communicationTable: any = communications;
    const companyTable: any = companies;

    const [allMembers, allDocuments, allCommunications, recentMembers, recentDocuments, recentCommunications] =
      await Promise.all([
        db.select().from(memberTable),
        db.select().from(documentTable),
        db.select().from(communicationTable),
        db
          .select({
            member: memberTable,
            company: companyTable,
          })
          .from(memberTable)
          .leftJoin(companyTable, eq(memberTable.companyId, companyTable.id))
          .orderBy(desc(memberTable.createdAt))
          .limit(3),
        db
          .select({
            document: documentTable,
            member: memberTable,
            company: companyTable,
          })
          .from(documentTable)
          .innerJoin(memberTable, eq(documentTable.memberId, memberTable.id))
          .leftJoin(companyTable, eq(documentTable.companyId, companyTable.id))
          .orderBy(desc(documentTable.updatedAt))
          .limit(3),
        db
          .select({
            communication: communicationTable,
            member: memberTable,
            company: companyTable,
          })
          .from(communicationTable)
          .leftJoin(memberTable, eq(communicationTable.memberId, memberTable.id))
          .leftJoin(companyTable, eq(communicationTable.companyId, companyTable.id))
          .orderBy(desc(communicationTable.createdAt))
          .limit(3),
      ]);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const activeMembers = allMembers.filter((member: any) => member.membershipStatus === 'active').length;
    const verifiedMembers = allMembers.filter((member: any) => Boolean(member.isVerified)).length;
    const pendingDocuments = allDocuments.filter((document: any) => document.status === 'pending').length;
    const needsMoreInfoDocuments = allDocuments.filter((document: any) => Boolean(document.metadata?.reviewRequested)).length;
    const emailsSentToday = allCommunications.filter((communication: any) => {
      if (!communication.sentAt) return false;
      return new Date(communication.sentAt) >= startOfToday;
    }).length;

    const completionRate = allMembers.length > 0
      ? ((verifiedMembers || activeMembers) / allMembers.length) * 100
      : 0;

    const completionDurations = allMembers
      .filter((member: any) => member.enrollmentDate && member.effectiveDate)
      .map((member: any) => {
        const start = new Date(member.enrollmentDate);
        const end = new Date(member.effectiveDate);
        return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      });

    const averageCompletionDays = completionDurations.length > 0
      ? completionDurations.reduce((sum: number, value: number) => sum + value, 0) / completionDurations.length
      : 0;

    const memberEngagementBase = allMembers.length || 1;
    const portalAdoptionRate = (allMembers.filter((member: any) => Boolean(member.email)).length / memberEngagementBase) * 100;

    const recentActivity = [
      ...recentMembers.map(({ member, company }: any) => ({
        id: `member-${member.id}`,
        type: 'member_registered',
        title: 'New member registered',
        description: `${member.firstName} ${member.lastName} joined ${company?.name || 'the platform'}`,
        timestamp: member.createdAt,
        tone: 'blue',
      })),
      ...recentDocuments.map(({ document, member }: any) => ({
        id: `document-${document.id}`,
        type: document.status === 'approved'
          ? 'document_approved'
          : document.status === 'rejected'
            ? 'document_rejected'
            : Boolean(document.metadata?.reviewRequested)
              ? 'document_needs_info'
              : 'document_uploaded',
        title: document.status === 'approved'
          ? 'Document approved'
          : document.status === 'rejected'
            ? 'Document rejected'
            : Boolean(document.metadata?.reviewRequested)
              ? 'Additional document info requested'
              : 'Document uploaded',
        description: `${member.firstName} ${member.lastName} - ${document.documentType.replace(/_/g, ' ')}`,
        timestamp: document.updatedAt || document.createdAt,
        tone: document.status === 'approved' ? 'green' : document.status === 'rejected' ? 'red' : 'purple',
      })),
      ...recentCommunications.map(({ communication, member }: any) => ({
        id: `communication-${communication.id}`,
        type: 'email_sent',
        title: 'Email campaign sent',
        description: `${communication.communicationType.replace(/_/g, ' ')} sent${member ? ` to ${member.firstName} ${member.lastName}` : ''}`,
        timestamp: communication.sentAt || communication.createdAt,
        tone: 'yellow',
      })),
    ]
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 6);

    return {
      quickStats: {
        activeMembers,
        onboardingCompletionRate: Number(completionRate.toFixed(1)),
        pendingDocuments,
        emailsSentToday,
      },
      performance: {
        sevenDayCompletionRate: Number(completionRate.toFixed(1)),
        averageDaysToComplete: Number(averageCompletionDays.toFixed(1)),
        dailyActiveUsers: activeMembers,
        portalAdoptionRate: Number(portalAdoptionRate.toFixed(1)),
      },
      documentSummary: {
        pending: pendingDocuments,
        needsMoreInfo: needsMoreInfoDocuments,
        processed: allDocuments.filter((document: any) => document.status !== 'pending').length,
      },
      recentActivity,
    };
  }

  async getAdminDocumentReviewQueue(filters: {
    status?: string;
    search?: string;
    documentType?: string;
    priority?: string;
  }): Promise<any> {
    const db: any = this.db.getDb();
    const documentTable: any = documents;
    const memberTable: any = members;
    const companyTable: any = companies;

    const rows = await db
      .select({
        document: documentTable,
        member: memberTable,
        company: companyTable,
      })
      .from(documentTable)
      .innerJoin(memberTable, eq(documentTable.memberId, memberTable.id))
      .leftJoin(companyTable, eq(documentTable.companyId, companyTable.id))
      .orderBy(desc(documentTable.createdAt));

    const normalized = rows.map(({ document, member, company }: any) => {
      const metadata = document.metadata || {};
      const documentData = document.documentData || {};
      const uploadDate = document.createdAt || document.updatedAt;
      const reviewStatus = document.status === 'pending' && metadata.reviewRequested
        ? 'needs_more_info'
        : document.status;

      const ageInHours = uploadDate
        ? (Date.now() - new Date(uploadDate).getTime()) / (1000 * 60 * 60)
        : 0;
      const expiresSoon = document.expiryDate
        ? (new Date(document.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 7
        : false;

      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'low';
      if (reviewStatus === 'pending' || reviewStatus === 'needs_more_info') {
        if (expiresSoon || ageInHours >= 72) {
          priority = 'urgent';
        } else if (ageInHours >= 24) {
          priority = 'high';
        } else {
          priority = 'medium';
        }
      }

      return {
        id: String(document.id),
        memberId: String(member.id),
        memberName: `${member.firstName} ${member.lastName}`.trim(),
        companyName: company?.name || 'Unknown company',
        documentType: document.documentType.replace(/_/g, ' '),
        fileName: documentData.originalName || document.documentNumber,
        fileSize: Number(documentData.fileSize || 0),
        mimeType: documentData.mimeType || 'application/octet-stream',
        uploadDate,
        reviewStatus,
        reviewedBy: document.approvedBy || document.rejectedBy || metadata.reviewRequestedBy || null,
        reviewedDate: document.approvedAt || document.rejectedAt || metadata.reviewRequestedAt || null,
        reviewNotes: document.rejectionReason || document.notes || metadata.reviewRequestNotes || null,
        priority,
        tags: [document.documentType.replace(/_/g, ' '), company?.name].filter(Boolean),
        extractedText: documentData.extractedText || null,
        confidenceScore: documentData.confidenceScore || null,
        expirationDate: document.expiryDate || null,
        isRequired: document.documentType === 'national_id' || document.documentType === 'insurance_card',
        downloadUrl: document.documentUrl || null,
      };
    });

    const search = filters.search?.trim().toLowerCase();
    const filtered = normalized.filter((document: any) => {
      const matchesStatus = !filters.status || filters.status === 'all'
        ? true
        : document.reviewStatus === filters.status;
      const matchesType = !filters.documentType || filters.documentType === 'all'
        ? true
        : document.documentType === filters.documentType;
      const matchesPriority = !filters.priority || filters.priority === 'all'
        ? true
        : document.priority === filters.priority;
      const matchesSearch = !search
        ? true
        : [
            document.memberName,
            document.companyName,
            document.documentType,
            document.fileName,
            ...(document.tags || []),
          ]
            .filter(Boolean)
            .some((value: string) => value.toLowerCase().includes(search));

      return matchesStatus && matchesType && matchesPriority && matchesSearch;
    });

    const reviewedDocuments = normalized.filter((document: any) => document.reviewedDate);
    const avgReviewTime = reviewedDocuments.length > 0
      ? reviewedDocuments.reduce((sum: number, document: any) => {
          const uploaded = new Date(document.uploadDate).getTime();
          const reviewed = new Date(document.reviewedDate).getTime();
          return sum + ((reviewed - uploaded) / (1000 * 60 * 60));
        }, 0) / reviewedDocuments.length
      : 0;

    const today = new Date().toDateString();

    return {
      documents: filtered,
      stats: {
        pending: normalized.filter((document: any) => document.reviewStatus === 'pending').length,
        approved: normalized.filter((document: any) => document.reviewStatus === 'approved').length,
        rejected: normalized.filter((document: any) => document.reviewStatus === 'rejected').length,
        needsMoreInfo: normalized.filter((document: any) => document.reviewStatus === 'needs_more_info').length,
        avgReviewTime: Number(avgReviewTime.toFixed(1)),
        todayProcessed: normalized.filter((document: any) => document.reviewedDate && new Date(document.reviewedDate).toDateString() === today).length,
      },
    };
  }

  async reviewAdminDocument(
    documentId: number,
    reviewData: {
      action: 'approve' | 'reject' | 'request_info';
      notes?: string;
    },
    context: any
  ): Promise<any> {
    const db: any = this.db.getDb();
    const documentTable: any = documents;

    const existing = await db.select().from(documentTable).where(eq(documentTable.id, documentId)).limit(1);
    if (existing.length === 0) {
      throw new NotFoundError('Document not found');
    }

    const document = existing[0];
    const metadata = document.metadata || {};
    const now = new Date();
    const userId = context?.userId ? Number(context.userId) : null;

    const updatePayload: Record<string, unknown> = {
      updatedAt: now,
      notes: reviewData.notes ?? document.notes ?? null,
    };

    if (reviewData.action === 'approve') {
      updatePayload.status = 'approved';
      updatePayload.approvedBy = userId;
      updatePayload.approvedAt = now;
      updatePayload.rejectedBy = null;
      updatePayload.rejectedAt = null;
      updatePayload.rejectionReason = null;
      updatePayload.metadata = {
        ...metadata,
        reviewRequested: false,
        lastReviewAction: 'approved',
      };
    } else if (reviewData.action === 'reject') {
      updatePayload.status = 'rejected';
      updatePayload.rejectedBy = userId;
      updatePayload.rejectedAt = now;
      updatePayload.rejectionReason = reviewData.notes ?? null;
      updatePayload.approvedBy = null;
      updatePayload.approvedAt = null;
      updatePayload.metadata = {
        ...metadata,
        reviewRequested: false,
        lastReviewAction: 'rejected',
      };
    } else {
      updatePayload.status = 'pending';
      updatePayload.approvedBy = null;
      updatePayload.approvedAt = null;
      updatePayload.rejectedBy = null;
      updatePayload.rejectedAt = null;
      updatePayload.rejectionReason = null;
      updatePayload.metadata = {
        ...metadata,
        reviewRequested: true,
        reviewRequestedAt: now.toISOString(),
        reviewRequestedBy: userId,
        reviewRequestNotes: reviewData.notes ?? null,
        lastReviewAction: 'request_info',
      };
    }

    const updated = await db
      .update(documentTable)
      .set(updatePayload)
      .where(eq(documentTable.id, documentId))
      .returning();

    return updated[0];
  }

  private async updateMemberStatus(
    memberId: number,
    status: 'active' | 'suspended' | 'terminated',
    reason: string,
    context: any,
    extraFields: Record<string, unknown>
  ): Promise<any> {
    const db: any = this.db.getDb();
    const memberTable: any = members;
    const member = await this.getMemberById(memberId);

    if (!member) {
      throw new NotFoundError('Member not found');
    }

    if (status === 'suspended' && member.membershipStatus !== 'active') {
      throw new BusinessRuleError('Only active members can be suspended');
    }

    const updated = await db
      .update(memberTable)
      .set({
        membershipStatus: status,
        updatedAt: new Date(),
        ...extraFields,
      })
      .where(eq(memberTable.id, memberId))
      .returning();

    await this.createLifeEvent(memberId, member.companyId, {
      eventType:
        status === 'active' ? 'activation' : status === 'suspended' ? 'suspension' : 'termination',
      eventDate: new Date(),
      effectiveDate: new Date(),
      reason,
      description: reason,
      metadata: {
        previousStatus: member.membershipStatus,
        newStatus: status,
        notes: extraFields,
        processedBy: context?.userId ?? null,
      },
    });

    return updated[0];
  }

  private async validateBusinessRules(request: CreateMemberRequest): Promise<void> {
    const phoneRegex = /^254[7]\d{8}$/;
    if (!phoneRegex.test(request.phone)) {
      throw new ValidationError('Invalid Kenyan phone number format');
    }

    const age = this.calculateAge(new Date(request.dateOfBirth));
    if (request.memberType === 'principal' && age < 18) {
      throw new ValidationError('Principal members must be at least 18 years old');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.email)) {
      throw new ValidationError('Invalid email format');
    }
  }

  private async checkForExistingMember(request: CreateMemberRequest): Promise<void> {
    const db: any = this.db.getDb();
    const memberTable: any = members;

    const existing = await db
      .select()
      .from(memberTable)
      .where(or(eq(memberTable.email, request.email), eq(memberTable.phoneNumber, request.phone)))
      .limit(1);

    if (existing.length > 0) {
      throw new BusinessRuleError('Member with this email or phone already exists');
    }
  }

  private async generateMemberNumber(companyId: number): Promise<string> {
    const db: any = this.db.getDb();
    const memberTable: any = members;
    const prefix = `MC${companyId.toString().padStart(3, '0')}`;
    const existing = await db
      .select()
      .from(memberTable)
      .where(like(memberTable.memberNumber, `${prefix}%`))
      .orderBy(desc(memberTable.memberNumber))
      .limit(1);

    const lastNumber =
      existing.length > 0 ? parseInt(String(existing[0].memberNumber).replace(prefix, ''), 10) || 0 : 0;

    return `${prefix}${String(lastNumber + 1).padStart(6, '0')}`;
  }

  private async createLifeEvent(memberId: number, companyId: number, event: any): Promise<void> {
    const db: any = this.db.getDb();
    const table: any = lifeEvents;

    await db.insert(table).values({
      memberId,
      companyId,
      eventType: event.eventType,
      eventDate: event.eventDate instanceof Date ? event.eventDate.toISOString().slice(0, 10) : event.eventDate,
      effectiveDate:
        event.effectiveDate instanceof Date ? event.effectiveDate.toISOString().slice(0, 10) : event.effectiveDate,
      description: event.description ?? null,
      reason: event.reason ?? null,
      metadata: event.metadata ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    return age;
  }
}
