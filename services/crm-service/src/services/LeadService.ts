import { Database } from '../models/Database';
import { WinstonLogger } from '../utils/WinstonLogger';
import { eventClient } from '../integrations/EventClient';
import { CRMEvents } from '../integrations/CrmDomainEvents';
import {
  leads,
  contacts,
  companies,
  activities
} from '../models/schema';
import {
  Lead,
  NewLead,
  NewContact,
  NewCompany,
  NewActivity
} from '../models/schema';
import {
  ValidationError,
  NotFoundError,
  BusinessRuleError,
  DuplicateResourceError
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
  lte,
  ilike,
  count
} from 'drizzle-orm';

/**
 * Lead Management Service
 * Handles all lead related operations including creation, conversion, activities
 */
export class LeadService {
  private readonly db: Database;
  private readonly logger: WinstonLogger;

  constructor() {
    this.db = Database.getInstance();
    this.logger = new WinstonLogger('lead-service');
  }

  /**
   * Create a new lead
   */
  async createLead(leadData: NewLead, context: any): Promise<Lead> {
    const db = this.db.getDb();

    try {
      this.logger.info('Creating new lead', {
        email: leadData.email,
        source: leadData.source,
        company: leadData.companyName
      });

      // Validate business rules
      await this.validateLeadRules(leadData);

      // Check for duplicates
      await this.checkForDuplicateLead(leadData);

      // Create lead record
      const lead = await db.insert(leads).values({
        ...leadData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      this.logger.logLeadCreated(lead[0].id, lead[0].companyId || 0, lead[0].assignedTo || 0);

      return lead[0];

    } catch (error) {
      this.logger.error('Failed to create lead', { error, leadData });
      throw error;
    }
  }

  /**
   * Validate lead business rules
   */
  private async validateLeadRules(leadData: NewLead): Promise<void> {
    if (!leadData.email && !leadData.phone) {
      throw new ValidationError('Either email or phone is required for a lead');
    }
  }

  /**
   * Check for duplicate leads
   */
  private async checkForDuplicateLead(leadData: NewLead): Promise<void> {
    const db = this.db.getDb();
    
    const existingLeads = await db.select()
      .from(leads)
      .where(
        or(
          leadData.email ? eq(leads.email, leadData.email) : undefined,
          leadData.phone ? eq(leads.phone, leadData.phone) : undefined
        )
      )
      .limit(1);

    if (existingLeads.length > 0) {
      throw new DuplicateResourceError('Lead', 'email or phone');
    }
  }

  /**
   * Get lead by ID
   */
  async getLeadById(leadId: number): Promise<Lead> {
    const db = this.db.getDb();

    try {
      const lead = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);

      if (lead.length === 0) {
        throw new NotFoundError('Lead');
      }

      return lead[0];

    } catch (error) {
      this.logger.error('Failed to get lead', { error, leadId });
      throw error;
    }
  }

  /**
   * Update lead information
   */
  async updateLead(leadId: number, updateData: Partial<NewLead>, context: any): Promise<Lead> {
    const db = this.db.getDb();

    try {
      const existingLead = await this.getLeadById(leadId);

      const updatedLead = await db
        .update(leads)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(leads.id, leadId))
        .returning();

      this.logger.info('Lead updated', {
        leadId,
        updatedFields: Object.keys(updateData),
        updatedBy: context.userId
      });

      return updatedLead[0];

    } catch (error) {
      this.logger.error('Failed to update lead', { error, leadId });
      throw error;
    }
  }

  /**
   * Convert lead to prospect
   */
  async convertToProspect(leadId: number, context: any): Promise<{ lead: Lead, prospectId: number }> {
    const db = this.db.getDb();
    try {
      return await db.transaction(async (transaction) => {
        const lead = await this.getLeadById(leadId);
        
        if (lead.status === 'converted') {
          throw new BusinessRuleError('Lead has already been converted');
        }

        // Create prospect company record
        const [prospect] = await transaction.insert(companies).values({
          name: lead.companyName || `${lead.firstName} ${lead.lastName}`,
          source: lead.source,
          status: 'prospect',
          assignedTo: lead.assignedTo,
          createdBy: context.userId,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();

        // Create primary contact
        await transaction.insert(contacts).values({
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          companyId: prospect.id,
          leadId: lead.id,
          isPrimary: true,
          isDecisionMaker: true,
          createdBy: context.userId,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Update lead status
        const [updatedLead] = await transaction.update(leads)
          .set({
            status: 'converted',
            conversionDate: new Date(),
            updatedAt: new Date()
          })
          .where(eq(leads.id, leadId))
          .returning();

        // Create conversion activity
        await transaction.insert(activities).values({
          type: 'System',
          subject: 'Lead Converted to Prospect',
          description: `Lead ${lead.firstName} ${lead.lastName} was converted to prospect`,
          leadId: leadId,
          companyId: prospect.id,
          assignedTo: context.userId,
          status: 'completed',
          completedAt: new Date(),
          createdBy: context.userId,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Publish lead converted event
        try {
          await eventClient.publishEvent(CRMEvents.LEAD_CONVERTED, leadId, {
            lead: updatedLead,
            prospectId: prospect.id,
            convertedBy: context.userId
          });
        } catch (eventError) {
          this.logger.warn('Failed to publish lead converted event', { error: eventError, leadId });
        }

        this.logger.info('Lead converted to prospect', { leadId, prospectId: prospect.id, convertedBy: context.userId });

        return { lead: updatedLead, prospectId: prospect.id };
      });
    } catch (error) {
      this.logger.error('Failed to convert lead to prospect', { error, leadId });
      throw error;
    }
  }

  /**
   * Add activity/note to lead
   */
  async addActivity(leadId: number, activityData: any, context: any): Promise<any> {
    const db = this.db.getDb();
    
    await this.getLeadById(leadId);

    const [activity] = await db.insert(activities).values({
      ...activityData,
      leadId,
      createdBy: context.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    await db.update(leads)
      .set({ lastContactDate: new Date(), updatedAt: new Date() })
      .where(eq(leads.id, leadId));

    this.logger.info('Activity added to lead', { leadId, activityId: activity.id, createdBy: context.userId });
    return activity;
  }

  /**
   * Get all activities for a lead
   */
  async getLeadActivities(leadId: number): Promise<any[]> {
    const db = this.db.getDb();
    
    await this.getLeadById(leadId);

    return db.select()
      .from(activities)
      .where(eq(activities.leadId, leadId))
      .orderBy(desc(activities.createdAt));
  }

  /**
   * Upload document to lead
   */
  async attachDocument(leadId: number, documentData: { name: string, url: string, type: string, size: number }, context: any): Promise<any> {
    const db = this.db.getDb();
    
    await this.getLeadById(leadId);

    // Create document attachment as activity
    const [activity] = await db.insert(activities).values({
      type: 'Document',
      subject: `Document Attached: ${documentData.name}`,
      description: `File type: ${documentData.type}, Size: ${documentData.size} bytes`,
      leadId,
      documents: [documentData],
      assignedTo: context.userId,
      status: 'completed',
      completedAt: new Date(),
      createdBy: context.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    this.logger.info('Document attached to lead', { leadId, documentName: documentData.name, uploadedBy: context.userId });
    return activity;
  }

  /**
   * Search leads with filters
   */
  async searchLeads(searchParams: any): Promise<any> {
    const db = this.db.getDb();

    try {
      const conditions: any[] = [];
      let orderByClause: any = desc(leads.createdAt);

      // Apply filters
      if (searchParams.filters) {
        const { filters } = searchParams;

        if (filters.status) {
          conditions.push(eq(leads.status, filters.status));
        }

        if (filters.source) {
          conditions.push(eq(leads.source, filters.source));
        }

        if (filters.priority) {
          conditions.push(eq(leads.priority, filters.priority));
        }

        if (filters.assignedTo) {
          conditions.push(eq(leads.assignedTo, filters.assignedTo));
        }

        if (filters.scoreMin) {
          conditions.push(sql`${leads.score} >= ${filters.scoreMin}`);
        }

        if (filters.scoreMax) {
          conditions.push(sql`${leads.score} <= ${filters.scoreMax}`);
        }

        if (filters.expectedCloseDateFrom) {
          conditions.push(gte(leads.expectedCloseDate, new Date(filters.expectedCloseDateFrom)));
        }

        if (filters.expectedCloseDateTo) {
          conditions.push(lte(leads.expectedCloseDate, new Date(filters.expectedCloseDateTo)));
        }
      }

      // Apply text search
      if (searchParams.query) {
        conditions.push(
          or(
            ilike(leads.firstName, `%${searchParams.query}%`),
            ilike(leads.lastName, `%${searchParams.query}%`),
            ilike(leads.email, `%${searchParams.query}%`),
            ilike(leads.phone, `%${searchParams.query}%`),
            ilike(leads.companyName, `%${searchParams.query}%`)
          )
        );
      }

      // Apply sorting
      if (searchParams.sortBy) {
        const sortField = leads[searchParams.sortBy as keyof typeof leads];
        // Only use actual column fields (exclude table metadata properties)
        if (sortField && typeof sortField !== 'function' && 'name' in sortField) {
          orderByClause = searchParams.sortOrder === 'desc' ? desc(sortField as any) : asc(sortField as any);
        }
      }

      // Build final query
      let query = db.select().from(leads);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      query = query.orderBy(orderByClause) as any;

      // Apply pagination
      const { page = 1, limit = 20 } = searchParams.pagination || {};
      const offset = (page - 1) * limit;

      const leadResults = await query
        .limit(limit)
        .offset(offset);

      // Get total count
      const totalQuery = db.select({ count: count() }).from(leads);
      const countResult = await totalQuery;

      return {
        leads: leadResults,
        pagination: {
          page,
          limit,
          total: countResult[0]?.count || 0,
          totalPages: Math.ceil((countResult[0]?.count || 0) / limit)
        }
      };

    } catch (error) {
      this.logger.error('Failed to search leads', { error, searchParams });
      throw error;
    }
  }
}

export const leadService = new LeadService();