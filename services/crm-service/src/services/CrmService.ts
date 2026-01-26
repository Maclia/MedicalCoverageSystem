import { Database } from '../models/Database';
import { WinstonLogger } from '../utils/WinstonLogger';
import {
  leads,
  contacts,
  companies,
  opportunities,
  activities,
  emailCampaigns,
  emailCampaignRecipients,
  crmAnalytics
} from '../models/schema';
import {
  Lead,
  Contact,
  Company,
  Opportunity,
  Activity,
  EmailCampaign,
  NewLead,
  NewContact,
  NewCompany,
  NewOpportunity,
  NewActivity,
  NewEmailCampaign
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

export class CrmService {
  private readonly db: Database;
  private readonly logger: WinstonLogger;

  constructor() {
    this.db = Database.getInstance();
    this.logger = new WinstonLogger('crm-service');
  }

  // Lead Management Methods

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
   * Convert lead to contact and company
   */
  async convertLead(leadId: number, conversionData: any, context: any): Promise<any> {
    const db = this.db.getDb();
    const transaction = await db.beginTransaction();

    try {
      const lead = await this.getLeadById(leadId);

      if (lead.status === 'converted') {
        throw new BusinessRuleError('Lead has already been converted');
      }

      // Create company if it doesn't exist
      let company: Company | null = null;
      if (lead.companyName && !lead.companyId) {
        const companyData: NewCompany = {
          name: lead.companyName,
          industry: lead.industry,
          website: '',
          status: 'active',
          assignedTo: lead.assignedTo || context.userId,
          createdBy: context.userId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        company = await transaction.insert(companies).values(companyData).returning();
        company = company[0];
      }

      // Create contact
      const contactData: NewContact = {
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        companyId: company?.id || lead.companyId!,
        leadId: lead.id,
        isPrimary: true,
        isDecisionMaker: true,
        createdBy: context.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const contact = await transaction.insert(contacts).values(contactData).returning();

      // Update lead status
      await transaction
        .update(leads)
        .set({
          status: 'converted',
          conversionDate: new Date(),
          companyId: company?.id || lead.companyId,
          updatedAt: new Date()
        })
        .where(eq(leads.id, leadId));

      await transaction.commit();

      this.logger.logConversionCompleted(leadId, contact[0].id, company?.id || 0, {
        companyName: company?.name || lead.companyName,
        contactName: `${lead.firstName} ${lead.lastName}`
      });

      return {
        lead,
        contact: contact[0],
        company: company
      };

    } catch (error) {
      await transaction.rollback();
      this.logger.error('Failed to convert lead', { error, leadId });
      throw error;
    }
  }

  /**
   * Search leads with filters
   */
  async searchLeads(searchParams: any): Promise<any> {
    const db = this.db.getDb();

    try {
      let query = db.select().from(leads);

      // Apply filters
      if (searchParams.filters) {
        const { filters } = searchParams;

        if (filters.status) {
          query = query.where(eq(leads.status, filters.status));
        }

        if (filters.source) {
          query = query.where(eq(leads.source, filters.source));
        }

        if (filters.priority) {
          query = query.where(eq(leads.priority, filters.priority));
        }

        if (filters.assignedTo) {
          query = query.where(eq(leads.assignedTo, filters.assignedTo));
        }

        if (filters.scoreMin) {
          query = query.where(sql`${leads.score} >= ${filters.scoreMin}`);
        }

        if (filters.scoreMax) {
          query = query.where(sql`${leads.score} <= ${filters.scoreMax}`);
        }

        if (filters.expectedCloseDateFrom) {
          query = query.where(gte(leads.expectedCloseDate, new Date(filters.expectedCloseDateFrom)));
        }

        if (filters.expectedCloseDateTo) {
          query = query.where(lte(leads.expectedCloseDate, new Date(filters.expectedCloseDateTo)));
        }
      }

      // Apply text search
      if (searchParams.query) {
        query = query.where(
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
        const sortOrder = searchParams.sortOrder === 'desc' ? desc(sortField) : asc(sortField);
        query = query.orderBy(sortOrder);
      } else {
        query = query.orderBy(desc(leads.createdAt));
      }

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

  // Contact Management Methods

  /**
   * Create a new contact
   */
  async createContact(contactData: NewContact, context: any): Promise<Contact> {
    const db = this.db.getDb();

    try {
      // Validate business rules
      await this.validateContactRules(contactData);

      // Check for duplicates
      await this.checkForDuplicateContact(contactData);

      const contact = await db.insert(contacts).values({
        ...contactData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      this.logger.logContactCreated(contact[0].id, contact[0].companyId);

      return contact[0];

    } catch (error) {
      this.logger.error('Failed to create contact', { error, contactData });
      throw error;
    }
  }

  /**
   * Get contact by ID
   */
  async getContactById(contactId: number): Promise<Contact> {
    const db = this.db.getDb();

    try {
      const contact = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, contactId))
        .limit(1);

      if (contact.length === 0) {
        throw new NotFoundError('Contact');
      }

      return contact[0];

    } catch (error) {
      this.logger.error('Failed to get contact', { error, contactId });
      throw error;
    }
  }

  // Company Management Methods

  /**
   * Create a new company
   */
  async createCompany(companyData: NewCompany, context: any): Promise<Company> {
    const db = this.db.getDb();

    try {
      // Validate business rules
      await this.validateCompanyRules(companyData);

      // Check for duplicates
      await this.checkForDuplicateCompany(companyData);

      const company = await db.insert(companies).values({
        ...companyData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      this.logger.logCompanyCreated(company[0].id);

      return company[0];

    } catch (error) {
      this.logger.error('Failed to create company', { error, companyData });
      throw error;
    }
  }

  /**
   * Get company by ID
   */
  async getCompanyById(companyId: number): Promise<Company> {
    const db = this.db.getDb();

    try {
      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (company.length === 0) {
        throw new NotFoundError('Company');
      }

      return company[0];

    } catch (error) {
      this.logger.error('Failed to get company', { error, companyId });
      throw error;
    }
  }

  // Opportunity Management Methods

  /**
   * Create a new opportunity
   */
  async createOpportunity(opportunityData: NewOpportunity, context: any): Promise<Opportunity> {
    const db = this.db.getDb();

    try {
      // Validate business rules
      await this.validateOpportunityRules(opportunityData);

      const opportunity = await db.insert(opportunities).values({
        ...opportunityData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      this.logger.logOpportunityCreated(opportunity[0].id, opportunity[0].companyId, opportunity[0].amount);

      return opportunity[0];

    } catch (error) {
      this.logger.error('Failed to create opportunity', { error, opportunityData });
      throw error;
    }
  }

  /**
   * Update opportunity
   */
  async updateOpportunity(opportunityId: number, updateData: Partial<NewOpportunity>, context: any): Promise<Opportunity> {
    const db = this.db.getDb();

    try {
      const existingOpportunity = await this.getOpportunityById(opportunityId);

      const updatedOpportunity = await db
        .update(opportunities)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(opportunities.id, opportunityId))
        .returning();

      // Log deal won/lost events
      if (updateData.status === 'won' && existingOpportunity.status !== 'won') {
        this.logger.logDealWon(opportunityId, updateData.amount || existingOpportunity.amount, new Date());
      } else if (updateData.status === 'lost' && existingOpportunity.status !== 'lost') {
        this.logger.logDealLost(opportunityId, updateData.lostReason || 'Unknown reason');
      }

      return updatedOpportunity[0];

    } catch (error) {
      this.logger.error('Failed to update opportunity', { error, opportunityId });
      throw error;
    }
  }

  /**
   * Get opportunity by ID
   */
  async getOpportunityById(opportunityId: number): Promise<Opportunity> {
    const db = this.db.getDb();

    try {
      const opportunity = await db
        .select()
        .from(opportunities)
        .where(eq(opportunities.id, opportunityId))
        .limit(1);

      if (opportunity.length === 0) {
        throw new NotFoundError('Opportunity');
      }

      return opportunity[0];

    } catch (error) {
      this.logger.error('Failed to get opportunity', { error, opportunityId });
      throw error;
    }
  }

  // Activity Management Methods

  /**
   * Create a new activity
   */
  async createActivity(activityData: NewActivity, context: any): Promise<Activity> {
    const db = this.db.getDb();

    try {
      const activity = await db.insert(activities).values({
        ...activityData,
        createdBy: context.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      this.logger.logActivityLogged(activityData.type, activity[0].id);

      return activity[0];

    } catch (error) {
      this.logger.error('Failed to create activity', { error, activityData });
      throw error;
    }
  }

  /**
   * Update activity
   */
  async updateActivity(activityId: number, updateData: Partial<NewActivity>, context: any): Promise<Activity> {
    const db = this.db.getDb();

    try {
      const existingActivity = await this.getActivityById(activityId);

      const updatedActivity = await db
        .update(activities)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(activities.id, activityId))
        .returning();

      return updatedActivity[0];

    } catch (error) {
      this.logger.error('Failed to update activity', { error, activityId });
      throw error;
    }
  }

  /**
   * Get activity by ID
   */
  async getActivityById(activityId: number): Promise<Activity> {
    const db = this.db.getDb();

    try {
      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);

      if (activity.length === 0) {
        throw new NotFoundError('Activity');
      }

      return activity[0];

    } catch (error) {
      this.logger.error('Failed to get activity', { error, activityId });
      throw error;
    }
  }

  // Analytics Methods

  /**
   * Get CRM dashboard metrics
   */
  async getDashboardMetrics(filters: any): Promise<any> {
    const db = this.db.getDb();

    try {
      // Get lead metrics
      const leadMetrics = await db
        .select({
          total: count(),
          new: sql<number>`COUNT(CASE WHEN ${leads.status} = 'new' THEN 1 END)`,
          contacted: sql<number>`COUNT(CASE WHEN ${leads.status} = 'contacted' THEN 1 END)`,
          qualified: sql<number>`COUNT(CASE WHEN ${leads.status} = 'qualified' THEN 1 END)`,
          converted: sql<number>`COUNT(CASE WHEN ${leads.status} = 'converted' THEN 1 END)`
        })
        .from(leads);

      // Get opportunity metrics
      const opportunityMetrics = await db
        .select({
          total: count(),
          open: sql<number>`COUNT(CASE WHEN ${opportunities.status} = 'open' THEN 1 END)`,
          won: sql<number>`COUNT(CASE WHEN ${opportunities.status} = 'won' THEN 1 END)`,
          lost: sql<number>`COUNT(CASE WHEN ${opportunities.status} = 'lost' THEN 1 END)`,
          totalValue: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.status} = 'open' THEN ${opportunities.amount} END), 0)`,
          wonValue: sql<number>`COALESCE(SUM(CASE WHEN ${opportunities.status} = 'won' THEN ${opportunities.amount} END), 0)`
        })
        .from(opportunities);

      // Get conversion rate
      const conversionRate = leadMetrics[0]?.total > 0
        ? (leadMetrics[0]?.converted / leadMetrics[0]?.total) * 100
        : 0;

      // Get win rate
      const totalClosedOpportunities = (opportunityMetrics[0]?.won || 0) + (opportunityMetrics[0]?.lost || 0);
      const winRate = totalClosedOpportunities > 0
        ? ((opportunityMetrics[0]?.won || 0) / totalClosedOpportunities) * 100
        : 0;

      return {
        leads: {
          total: leadMetrics[0]?.total || 0,
          new: leadMetrics[0]?.new || 0,
          contacted: leadMetrics[0]?.contacted || 0,
          qualified: leadMetrics[0]?.qualified || 0,
          converted: leadMetrics[0]?.converted || 0,
          conversionRate: Math.round(conversionRate * 100) / 100
        },
        opportunities: {
          total: opportunityMetrics[0]?.total || 0,
          open: opportunityMetrics[0]?.open || 0,
          won: opportunityMetrics[0]?.won || 0,
          lost: opportunityMetrics[0]?.lost || 0,
          totalValue: opportunityMetrics[0]?.totalValue?.toString() || '0',
          wonValue: opportunityMetrics[0]?.wonValue?.toString() || '0',
          winRate: Math.round(winRate * 100) / 100
        }
      };

    } catch (error) {
      this.logger.error('Failed to get dashboard metrics', { error, filters });
      throw error;
    }
  }

  // Private validation methods

  private async validateLeadRules(leadData: NewLead): Promise<void> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(leadData.email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate phone number (basic check)
    if (leadData.phone && leadData.phone.length < 10) {
      throw new ValidationError('Invalid phone number');
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high'];
    if (leadData.priority && !validPriorities.includes(leadData.priority)) {
      throw new ValidationError('Invalid priority level');
    }

    // Validate source
    const validSources = ['website', 'referral', 'cold_call', 'email', 'social_media', 'trade_show', 'other'];
    if (!validSources.includes(leadData.source)) {
      throw new ValidationError('Invalid lead source');
    }
  }

  private async validateContactRules(contactData: NewContact): Promise<void> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactData.email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate contact method
    const validMethods = ['email', 'phone', 'sms', 'mail'];
    if (contactData.preferredContactMethod && !validMethods.includes(contactData.preferredContactMethod)) {
      throw new ValidationError('Invalid preferred contact method');
    }
  }

  private async validateCompanyRules(companyData: NewCompany): Promise<void> {
    // Validate company size
    const validSizes = ['startup', 'small', 'medium', 'large', 'enterprise'];
    if (companyData.size && !validSizes.includes(companyData.size)) {
      throw new ValidationError('Invalid company size');
    }

    // Validate status
    const validStatuses = ['active', 'inactive', 'prospect'];
    if (!validStatuses.includes(companyData.status)) {
      throw new ValidationError('Invalid company status');
    }
  }

  private async validateOpportunityRules(opportunityData: NewOpportunity): Promise<void> {
    // Validate probability
    if (opportunityData.probability && (opportunityData.probability < 0 || opportunityData.probability > 100)) {
      throw new ValidationError('Probability must be between 0 and 100');
    }

    // Validate stage
    const validStages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    if (!validStages.includes(opportunityData.stage)) {
      throw new ValidationError('Invalid opportunity stage');
    }

    // Validate type
    const validTypes = ['new_business', 'existing_business', 'renewal'];
    if (opportunityData.type && !validTypes.includes(opportunityData.type)) {
      throw new ValidationError('Invalid opportunity type');
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

  private async checkForDuplicateContact(contactData: NewContact): Promise<void> {
    const db = this.db.getDb();

    const existingContact = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.email, contactData.email),
          eq(contacts.companyId, contactData.companyId)
        )
      )
      .limit(1);

    if (existingContact.length > 0) {
      throw new DuplicateResourceError('Contact', 'email');
    }
  }

  private async checkForDuplicateCompany(companyData: NewCompany): Promise<void> {
    const db = this.db.getDb();

    const existingCompany = await db
      .select()
      .from(companies)
      .where(eq(companies.name, companyData.name))
      .limit(1);

    if (existingCompany.length > 0) {
      throw new DuplicateResourceError('Company', 'name');
    }
  }
}