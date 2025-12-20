import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  decimal,
  jsonb,
  index
} from 'drizzle-orm/pg-core';

// Lead Management Tables
export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }).notNull(),
  companyName: varchar('company_name', { length: 255 }),
  jobTitle: varchar('job_title', { length: 100 }),
  industry: varchar('industry', { length: 100 }),
  companySize: varchar('company_size', { length: 50 }),
  source: varchar('source', { length: 100 }).notNull(), // Website, Referral, Cold Call, etc.
  status: varchar('status', { length: 50 }).notNull().default('new'), // new, contacted, qualified, converted, lost
  priority: varchar('priority', { length: 20 }).notNull().default('medium'), // high, medium, low
  score: integer('score').default(0), // Lead scoring
  assignedTo: integer('assigned_to'), // Sales rep ID
  estimatedValue: decimal('estimated_value', { precision: 12, scale: 2 }),
  expectedCloseDate: timestamp('expected_close_date'),
  notes: text('notes'),
  tags: jsonb('tags'), // Array of tags
  customFields: jsonb('custom_fields'),
  lastContactDate: timestamp('last_contact_date'),
  nextFollowUpDate: timestamp('next_follow_up_date'),
  conversionDate: timestamp('conversion_date'),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('leads_email_idx').on(table.email),
  statusIdx: index('leads_status_idx').on(table.status),
  sourceIdx: index('leads_source_idx').on(table.source),
  assignedToIdx: index('leads_assigned_to_idx').on(table.assignedTo),
  priorityIdx: index('leads_priority_idx').on(table.priority),
}));

// Contact Management Tables
export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  mobile: varchar('mobile', { length: 20 }),
  title: varchar('title', { length: 100 }),
  department: varchar('department', { length: 100 }),
  companyId: integer('company_id').notNull(),
  leadId: integer('lead_id'), // Converted from lead
  isPrimary: boolean('is_primary').default(false),
  isDecisionMaker: boolean('is_decision_maker').default(false),
  role: varchar('role', { length: 100 }), // Decision Maker, Influencer, User, etc.
  preferredContactMethod: varchar('preferred_contact_method', { length: 50 }), // Email, Phone, SMS
  preferredContactTime: varchar('preferred_contact_time', { length: 100 }),
  timezone: varchar('timezone', { length: 50 }),
  language: varchar('language', { length: 10 }).default('en'),
  tags: jsonb('tags'),
  customFields: jsonb('custom_fields'),
  lastContactDate: timestamp('last_contact_date'),
  nextFollowUpDate: timestamp('next_follow_up_date'),
  socialProfiles: jsonb('social_profiles'), // LinkedIn, Twitter, etc.
  notes: text('notes'),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('contacts_email_idx').on(table.email),
  companyIdIdx: index('contacts_company_id_idx').on(table.companyId),
  leadIdIdx: index('contacts_lead_id_idx').on(table.leadId),
  isPrimaryIdx: index('contacts_is_primary_idx').on(table.isPrimary),
}));

// Company/Account Management Tables
export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  website: varchar('website', { length: 255 }),
  industry: varchar('industry', { length: 100 }),
  size: varchar('size', { length: 50 }), // Startup, SMB, Enterprise
  employeeCount: integer('employee_count'),
  annualRevenue: decimal('annual_revenue', { precision: 15, scale: 2 }),
  description: text('description'),
  mission: text('mission'),
  foundedYear: integer('founded_year'),
  stage: varchar('stage', { length: 50 }), // Seed, Series A, Public, etc.
  ownership: varchar('ownership', { length: 50 }), // Private, Public, Non-profit
  taxId: varchar('tax_id', { length: 50 }),
  registrationNumber: varchar('registration_number', { length: 100 }),
  billingAddress: jsonb('billing_address'),
  shippingAddress: jsonb('shipping_address'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  logoUrl: varchar('logo_url', { length: 500 }),
  socialMedia: jsonb('social_media'),
  technologies: jsonb('technologies'), // Stack of technologies they use
  competitors: jsonb('competitors'),
  tags: jsonb('tags'),
  customFields: jsonb('custom_fields'),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, inactive, prospect
  source: varchar('source', { length: 100 }), // Lead conversion, Direct, Partner
  assignedTo: integer('assigned_to'), // Account manager
  tier: varchar('tier', { length: 20 }).default('standard'), // standard, premium, enterprise
  riskLevel: varchar('risk_level', { length: 20 }).default('low'), // low, medium, high
  creditLimit: decimal('credit_limit', { precision: 12, scale: 2 }),
  paymentTerms: varchar('payment_terms', { length: 50 }),
  notes: text('notes'),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('companies_name_idx').on(table.name),
  industryIdx: index('companies_industry_idx').on(table.industry),
  statusIdx: index('companies_status_idx').on(table.status),
  assignedToIdx: index('companies_assigned_to_idx').on(table.assignedTo),
  tierIdx: index('companies_tier_idx').on(table.tier),
}));

// Opportunities/Deals Management Tables
export const opportunities = pgTable('opportunities', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  companyId: integer('company_id').notNull(),
  leadId: integer('lead_id'),
  primaryContactId: integer('primary_contact_id'),
  assignedTo: integer('assigned_to').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('USD'),
  probability: integer('probability').default(0), // 0-100
  stage: varchar('stage', { length: 50 }).notNull(), // Prospecting, Qualification, Proposal, Negotiation, Closed Won/Lost
  type: varchar('type', { length: 50 }), // New Business, Existing Business, Renewal
  source: varchar('source', { length: 100 }),
  expectedCloseDate: timestamp('expected_close_date').notNull(),
  actualCloseDate: timestamp('actual_close_date'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  status: varchar('status', { length: 20 }).notNull().default('open'), // open, won, lost
  lostReason: varchar('lost_reason', { length: 255 }),
  competitor: varchar('competitor', { length: 255 }),
  nextStep: varchar('next_step', { length: 255 }),
  nextStepDate: timestamp('next_step_date'),
  forecastCategory: varchar('forecast_category', { length: 20 }), // Pipeline, Best Case, Commit, Closed
  products: jsonb('products'), // Array of products/services
  terms: varchar('terms', { length: 100 }),
  contractLength: integer('contract_length'), // in months
  renewalProbability: integer('renewal_probability'),
  tags: jsonb('tags'),
  customFields: jsonb('custom_fields'),
  notes: text('notes'),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('opportunities_name_idx').on(table.name),
  companyIdIdx: index('opportunities_company_id_idx').on(table.companyId),
  assignedToIdx: index('opportunities_assigned_to_idx').on(table.assignedTo),
  stageIdx: index('opportunities_stage_idx').on(table.stage),
  statusIdx: index('opportunities_status_idx').on(table.status),
  expectedCloseDateIdx: index('opportunities_expected_close_date_idx').on(table.expectedCloseDate),
}));

// Activities/Tasks Management Tables
export const activities = pgTable('activities', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 50 }).notNull(), // Call, Email, Meeting, Task, Note
  subject: varchar('subject', { length: 255 }).notNull(),
  description: text('description'),
  leadId: integer('lead_id'),
  contactId: integer('contact_id'),
  companyId: integer('company_id'),
  opportunityId: integer('opportunity_id'),
  assignedTo: integer('assigned_to').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, completed, cancelled
  priority: varchar('priority', { length: 20 }).default('medium'),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  duration: integer('duration'), // in minutes
  outcome: varchar('outcome', { length: 255 }),
  location: varchar('location', { length: 255 }),
  attendees: jsonb('attendees'), // For meetings
  documents: jsonb('documents'), // Attached files
  tags: jsonb('tags'),
  customFields: jsonb('custom_fields'),
  notes: text('notes'),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  typeIdx: index('activities_type_idx').on(table.type),
  assignedToIdx: index('activities_assigned_to_idx').on(table.assignedTo),
  statusIdx: index('activities_status_idx').on(table.status),
  dueDateIdx: index('activities_due_date_idx').on(table.dueDate),
  leadIdIdx: index('activities_lead_id_idx').on(table.leadId),
  contactIdIdx: index('activities_contact_id_idx').on(table.contactId),
  companyIdIdx: index('activities_company_id_idx').on(table.companyId),
  opportunityIdIdx: index('activities_opportunity_id_idx').on(table.opportunityId),
}));

// Email Campaign Management Tables
export const emailCampaigns = pgTable('email_campaigns', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // Newsletter, Product Announcement, Event Invitation
  subject: varchar('subject', { length: 255 }).notNull(),
  fromName: varchar('from_name', { length: 100 }).notNull(),
  fromEmail: varchar('from_email', { length: 255 }).notNull(),
  template: text('template').notNull(),
  htmlContent: text('html_content'),
  plainTextContent: text('plain_text_content'),
  attachments: jsonb('attachments'),
  targetAudience: jsonb('target_audience'), // Filters for lead/contact selection
  scheduledFor: timestamp('scheduled_for'),
  sentAt: timestamp('sent_at'),
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, scheduled, sending, sent, cancelled
  totalRecipients: integer('total_recipients').default(0),
  sentCount: integer('sent_count').default(0),
  deliveredCount: integer('delivered_count').default(0),
  openedCount: integer('opened_count').default(0),
  clickedCount: integer('clicked_count').default(0),
  unsubscribedCount: integer('unsubscribed_count').default(0),
  bouncedCount: integer('bounced_count').default(0),
  spamCount: integer('spam_count').default(0),
  tags: jsonb('tags'),
  customFields: jsonb('custom_fields'),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  typeIdx: index('email_campaigns_type_idx').on(table.type),
  statusIdx: index('email_campaigns_status_idx').on(table.status),
  scheduledForIdx: index('email_campaigns_scheduled_for_idx').on(table.scheduledFor),
  createdByIdx: index('email_campaigns_created_by_idx').on(table.createdBy),
}));

// Email Campaign Recipients Tables
export const emailCampaignRecipients = pgTable('email_campaign_recipients', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').notNull(),
  leadId: integer('lead_id'),
  contactId: integer('contact_id'),
  email: varchar('email', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, sent, delivered, opened, clicked, bounced, unsubscribed
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),
  bouncedAt: timestamp('bounced_at'),
  unsubscribedAt: timestamp('unsubscribed_at'),
  openCount: integer('open_count').default(0),
  clickCount: integer('click_count').default(0),
  lastOpenedAt: timestamp('last_opened_at'),
  lastClickedAt: timestamp('last_clicked_at'),
  errorMessage: text('error_message'),
  customData: jsonb('custom_data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  campaignIdIdx: index('email_campaign_recipients_campaign_id_idx').on(table.campaignId),
  leadIdIdx: index('email_campaign_recipients_lead_id_idx').on(table.leadId),
  contactIdIdx: index('email_campaign_recipients_contact_id_idx').on(table.contactId),
  emailIdx: index('email_campaign_recipients_email_idx').on(table.email),
  statusIdx: index('email_campaign_recipients_status_idx').on(table.status),
}));

// Analytics and Reporting Tables
export const crmAnalytics = pgTable('crm_analytics', {
  id: serial('id').primaryKey(),
  metricType: varchar('metric_type', { length: 100 }).notNull(), // lead_conversion, sales_cycle, etc.
  metricValue: decimal('metric_value', { precision: 15, scale: 2 }).notNull(),
  metricUnit: varchar('metric_unit', { length: 50 }), // percentage, days, count, currency
  period: varchar('period', { length: 50 }).notNull(), // daily, weekly, monthly, yearly
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  filters: jsonb('filters'), // Applied filters for this metric
  dimensions: jsonb('dimensions'), // Additional dimensions
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  metricTypeIdx: index('crm_analytics_metric_type_idx').on(table.metricType),
  periodIdx: index('crm_analytics_period_idx').on(table.period),
  startDateIdx: index('crm_analytics_start_date_idx').on(table.startDate),
  endDateIdx: index('crm_analytics_end_date_idx').on(table.endDate),
}));

// Export all tables
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type NewEmailCampaign = typeof emailCampaigns.$inferInsert;
export type EmailCampaignRecipient = typeof emailCampaignRecipients.$inferSelect;
export type NewEmailCampaignRecipient = typeof emailCampaignRecipients.$inferInsert;
export type CrmAnalytics = typeof crmAnalytics.$inferSelect;
export type NewCrmAnalytics = typeof crmAnalytics.$inferInsert;