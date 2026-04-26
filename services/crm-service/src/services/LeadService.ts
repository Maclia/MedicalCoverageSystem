import { Database } from '../models/Database';
import { WinstonLogger } from '../utils/WinstonLogger';
import { leads } from '../models/schema';
import { Lead, NewLead } from '../models/schema';
import { ValidationError, NotFoundError, BusinessRuleError, DuplicateResourceError } from '../utils/CustomErrors';
import { eq, sql, and, or, desc, asc, inArray, like, gte, lte, ilike, count } from 'drizzle-orm';

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

      await this.validateLeadRules(leadData);
      await this.checkForDuplicateLead(leadData);

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
   * Search leads with filters
   */
  async searchLeads(searchParams: any): Promise<any> {
    const db = this.db.getDb();

    try {
      const conditions: any[] = [];
      let orderByClause: any = desc(leads.createdAt);

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

      if (searchParams.sortBy) {
        const sortField = leads[searchParams.sortBy as keyof typeof leads];
        if (sortField && typeof sortField !== 'function' && 'name' in sortField) {
          orderByClause = searchParams.sortOrder === 'desc' ? desc(sortField as any) : asc(sortField as any);
        }
      }

      let query = db.select().from(leads);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      query = query.orderBy(orderByClause) as any;

      const { page = 1, limit = 20 } = searchParams.pagination || {};
      const offset = (page - 1) * limit;

      const leadResults = await query
        .limit(limit)
        .offset(offset);

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

  private async validateLeadRules(leadData: NewLead): Promise<void> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(leadData.email)) {
      throw new ValidationError('Invalid email format');
    }

    if (leadData.phone && leadData.phone.length < 10) {
      throw new ValidationError('Invalid phone number');
    }

    const validPriorities = ['low', 'medium', 'high'];
    if (leadData.priority && !validPriorities.includes(leadData.priority)) {
      throw new ValidationError('Invalid priority level');
    }

    const validSources = ['website', 'referral', 'cold_call', 'email', 'social_media', 'trade_show', 'other'];
    if (!validSources.includes(leadData.source)) {
      throw new ValidationError('Invalid lead source');
    }
  }

  private async checkForDuplicateLead(leadData: NewLead): Promise<void> {
    const db = this.db.getDb();

    const existingLead = await db
      .select()
      .from(leads)
      .where(eq(leads.email, leadData.email))
      .limit(1);

    if (existingLead.length > 0) {
      throw new DuplicateResourceError('Lead', 'email');
    }
  }
}