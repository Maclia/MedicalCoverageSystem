import { Router } from 'express';
import { CrmService } from '../services/CrmService';
import {
  auditMiddleware,
  crmOperationMiddleware,
  crmDataAccessMiddleware,
  leadLifecycleMiddleware,
  opportunityLifecycleMiddleware,
  emailCampaignMiddleware,
  dataOperationMiddleware
} from '../middleware/auditMiddleware';
import { CrmResponseHelper, asyncHandler } from '../middleware/responseMiddleware';

const router = Router();
const crmService = new CrmService();

// Apply audit middleware to all routes
router.use(auditMiddleware);

/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', asyncHandler(async (req, res) => {
  const db = require('../models/Database').database;
  const health = await db.healthCheck();

  CrmResponseHelper.success(res, {
    status: health.status,
    service: 'crm-service',
    uptime: process.uptime(),
    database: health.status,
    latency: health.latency
  });
}));

/**
 * @route   GET /
 * @desc    Root endpoint
 * @access  Public
 */
router.get('/', (req, res) => {
  CrmResponseHelper.success(res, {
    service: 'crm-service',
    status: 'running',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// LEAD MANAGEMENT ROUTES

/**
 * @route   GET /leads
 * @desc    Search leads with filters and pagination
 * @access  Private
 */
router.get('/leads',
  crmDataAccessMiddleware('leads', 'read'),
  asyncHandler(async (req, res) => {
    const searchParams = {
      query: req.query.search || req.query.query,
      filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as string,
      pagination: {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      }
    };

    const result = await crmService.searchLeads(searchParams);

    CrmResponseHelper.searchResults(res, result, 'leads');
  })
);

/**
 * @route   POST /leads
 * @desc    Create a new lead
 * @access  Private
 */
router.post('/leads',
  crmOperationMiddleware('create_lead', 'lead'),
  asyncHandler(async (req, res) => {
    const lead = await crmService.createLead(req.body, {
      userId: (req.user as any)?.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    CrmResponseHelper.leadCreated(res, lead);
  })
);

/**
 * @route   GET /leads/:id
 * @desc    Get lead by ID
 * @access  Private
 */
router.get('/leads/:id',
  crmDataAccessMiddleware('leads', 'read'),
  asyncHandler(async (req, res) => {
    const lead = await crmService.getLeadById(parseInt(req.params.id));

    CrmResponseHelper.success(res, lead, 'Lead retrieved successfully');
  })
);

/**
 * @route   PUT /leads/:id
 * @desc    Update lead information
 * @access  Private
 */
router.put('/leads/:id',
  crmOperationMiddleware('update_lead', 'lead'),
  asyncHandler(async (req, res) => {
    const lead = await crmService.updateLead(
      parseInt(req.params.id),
      req.body,
      {
        userId: (req.user as any)?.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    CrmResponseHelper.success(res, lead, 'Lead updated successfully');
  })
);

/**
 * @route   POST /leads/:id/convert
 * @desc    Convert lead to contact and company
 * @access  Private
 */
router.post('/leads/:id/convert',
  leadLifecycleMiddleware('conversion'),
  crmOperationMiddleware('convert_lead', 'lead'),
  asyncHandler(async (req, res) => {
    const result = await crmService.convertLead(parseInt(req.params.id), req.body, {
      userId: (req.user as any)?.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    CrmResponseHelper.leadConverted(res, result);
  })
);

// CONTACT MANAGEMENT ROUTES

/**
 * @route   GET /contacts
 * @desc    Search contacts with filters and pagination
 * @access  Private
 */
router.get('/contacts',
  crmDataAccessMiddleware('contacts', 'read'),
  asyncHandler(async (req, res) => {
    // Similar search implementation for contacts
    const searchParams = {
      query: req.query.search || req.query.query,
      filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
      pagination: {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      }
    };

    // Placeholder - would implement searchContacts in CrmService
    const result = { contacts: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

    CrmResponseHelper.searchResults(res, result, 'contacts');
  })
);

/**
 * @route   POST /contacts
 * @desc    Create a new contact
 * @access  Private
 */
router.post('/contacts',
  crmOperationMiddleware('create_contact', 'contact'),
  asyncHandler(async (req, res) => {
    const contact = await crmService.createContact(req.body, {
      userId: (req.user as any)?.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    CrmResponseHelper.contactCreated(res, contact);
  })
);

/**
 * @route   GET /contacts/:id
 * @desc    Get contact by ID
 * @access  Private
 */
router.get('/contacts/:id',
  crmDataAccessMiddleware('contacts', 'read'),
  asyncHandler(async (req, res) => {
    const contact = await crmService.getContactById(parseInt(req.params.id));

    CrmResponseHelper.success(res, contact, 'Contact retrieved successfully');
  })
);

// COMPANY MANAGEMENT ROUTES

/**
 * @route   GET /companies
 * @desc    Search companies with filters and pagination
 * @access  Private
 */
router.get('/companies',
  crmDataAccessMiddleware('companies', 'read'),
  asyncHandler(async (req, res) => {
    // Similar search implementation for companies
    const searchParams = {
      query: req.query.search || req.query.query,
      filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
      pagination: {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      }
    };

    // Placeholder - would implement searchCompanies in CrmService
    const result = { companies: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

    CrmResponseHelper.searchResults(res, result, 'companies');
  })
);

/**
 * @route   POST /companies
 * @desc    Create a new company
 * @access  Private
 */
router.post('/companies',
  crmOperationMiddleware('create_company', 'company'),
  asyncHandler(async (req, res) => {
    const company = await crmService.createCompany(req.body, {
      userId: (req.user as any)?.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    CrmResponseHelper.companyCreated(res, company);
  })
);

/**
 * @route   GET /companies/:id
 * @desc    Get company by ID
 * @access  Private
 */
router.get('/companies/:id',
  crmDataAccessMiddleware('companies', 'read'),
  asyncHandler(async (req, res) => {
    const company = await crmService.getCompanyById(parseInt(req.params.id));

    CrmResponseHelper.success(res, company, 'Company retrieved successfully');
  })
);

// OPPORTUNITY MANAGEMENT ROUTES

/**
 * @route   GET /opportunities
 * @desc    Search opportunities with filters and pagination
 * @access  Private
 */
router.get('/opportunities',
  crmDataAccessMiddleware('opportunities', 'read'),
  asyncHandler(async (req, res) => {
    // Similar search implementation for opportunities
    const searchParams = {
      query: req.query.search || req.query.query,
      filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
      pagination: {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      }
    };

    // Placeholder - would implement searchOpportunities in CrmService
    const result = { opportunities: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

    CrmResponseHelper.searchResults(res, result, 'opportunities');
  })
);

/**
 * @route   POST /opportunities
 * @desc    Create a new opportunity
 * @access  Private
 */
router.post('/opportunities',
  opportunityLifecycleMiddleware('creation'),
  crmOperationMiddleware('create_opportunity', 'opportunity'),
  asyncHandler(async (req, res) => {
    const opportunity = await crmService.createOpportunity(req.body, {
      userId: (req.user as any)?.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    CrmResponseHelper.opportunityCreated(res, opportunity);
  })
);

/**
 * @route   GET /opportunities/:id
 * @desc    Get opportunity by ID
 * @access  Private
 */
router.get('/opportunities/:id',
  crmDataAccessMiddleware('opportunities', 'read'),
  asyncHandler(async (req, res) => {
    const opportunity = await crmService.getOpportunityById(parseInt(req.params.id));

    CrmResponseHelper.success(res, opportunity, 'Opportunity retrieved successfully');
  })
);

/**
 * @route   PUT /opportunities/:id
 * @desc    Update opportunity
 * @access  Private
 */
router.put('/opportunities/:id',
  opportunityLifecycleMiddleware('update'),
  crmOperationMiddleware('update_opportunity', 'opportunity'),
  asyncHandler(async (req, res) => {
    const opportunity = await crmService.updateOpportunity(
      parseInt(req.params.id),
      req.body,
      {
        userId: (req.user as any)?.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    CrmResponseHelper.opportunityUpdated(res, opportunity);
  })
);

// ACTIVITY MANAGEMENT ROUTES

/**
 * @route   GET /activities
 * @desc    Search activities with filters and pagination
 * @access  Private
 */
router.get('/activities',
  crmDataAccessMiddleware('activities', 'read'),
  asyncHandler(async (req, res) => {
    // Similar search implementation for activities
    const searchParams = {
      query: req.query.search || req.query.query,
      filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
      pagination: {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      }
    };

    // Placeholder - would implement searchActivities in CrmService
    const result = { activities: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

    CrmResponseHelper.searchResults(res, result, 'activities');
  })
);

/**
 * @route   POST /activities
 * @desc    Create a new activity
 * @access  Private
 */
router.post('/activities',
  crmOperationMiddleware('create_activity', 'activity'),
  asyncHandler(async (req, res) => {
    const activity = await crmService.createActivity(req.body, {
      userId: (req.user as any)?.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    CrmResponseHelper.activityCreated(res, activity);
  })
);

/**
 * @route   GET /activities/:id
 * @desc    Get activity by ID
 * @access  Private
 */
router.get('/activities/:id',
  crmDataAccessMiddleware('activities', 'read'),
  asyncHandler(async (req, res) => {
    const activity = await crmService.getActivityById(parseInt(req.params.id));

    CrmResponseHelper.success(res, activity, 'Activity retrieved successfully');
  })
);

/**
 * @route   PUT /activities/:id
 * @desc    Update activity
 * @access  Private
 */
router.put('/activities/:id',
  crmOperationMiddleware('update_activity', 'activity'),
  asyncHandler(async (req, res) => {
    const activity = await crmService.updateActivity(
      parseInt(req.params.id),
      req.body,
      {
        userId: (req.user as any)?.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    CrmResponseHelper.success(res, activity, 'Activity updated successfully');
  })
);

// EMAIL CAMPAIGN ROUTES

/**
 * @route   GET /email-campaigns
 * @desc    Get email campaigns with pagination
 * @access  Private
 */
router.get('/email-campaigns',
  crmDataAccessMiddleware('email_campaigns', 'read'),
  asyncHandler(async (req, res) => {
    // Placeholder - would implement email campaign search
    const result = { campaigns: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

    CrmResponseHelper.searchResults(res, result, 'campaigns');
  })
);

/**
 * @route   POST /email-campaigns
 * @desc    Create a new email campaign
 * @access  Private
 */
router.post('/email-campaigns',
  emailCampaignMiddleware('creation'),
  crmOperationMiddleware('create_email_campaign', 'campaign'),
  asyncHandler(async (req, res) => {
    // Placeholder - would implement createEmailCampaign in CrmService
    const campaign = { id: 1, ...req.body, createdAt: new Date() };

    CrmResponseHelper.emailCampaignCreated(res, campaign);
  })
);

/**
 * @route   POST /email-campaigns/:id/send
 * @desc    Send email campaign
 * @access  Private
 */
router.post('/email-campaigns/:id/send',
  emailCampaignMiddleware('send'),
  crmOperationMiddleware('send_email_campaign', 'campaign'),
  asyncHandler(async (req, res) => {
    // Placeholder - would implement sendEmailCampaign in CrmService
    const campaign = { id: parseInt(req.params.id), sentAt: new Date() };
    const recipientCount = req.body.recipientCount || 0;

    CrmResponseHelper.emailCampaignSent(res, campaign, recipientCount);
  })
);

// ANALYTICS AND DASHBOARD ROUTES

/**
 * @route   GET /dashboard/metrics
 * @desc    Get CRM dashboard metrics
 * @access  Private
 */
router.get('/dashboard/metrics',
  crmDataAccessMiddleware('analytics', 'read'),
  asyncHandler(async (req, res) => {
    const metrics = await crmService.getDashboardMetrics(req.query);

    CrmResponseHelper.dashboardMetrics(res, metrics);
  })
);

/**
 * @route   GET /analytics
 * @desc    Get detailed analytics reports
 * @access  Private
 */
router.get('/analytics',
  crmDataAccessMiddleware('analytics', 'read'),
  asyncHandler(async (req, res) => {
    // Placeholder - would implement detailed analytics
    const analytics = {
      leadConversionRate: 25.5,
      salesCycleLength: 45,
      winRate: 35.2,
      averageDealSize: 50000,
      revenueByMonth: [],
      pipelineValue: 250000
    };

    CrmResponseHelper.success(res, analytics, 'Analytics data retrieved successfully');
  })
);

// BULK OPERATIONS ROUTES

/**
 * @route   POST /leads/bulk-update
 * @desc    Bulk update leads
 * @access  Private
 */
router.post('/leads/bulk-update',
  crmOperationMiddleware('bulk_update', 'leads'),
  asyncHandler(async (req, res) => {
    // Placeholder - would implement bulkUpdateLeads
    const result = { updatedCount: req.body.leadIds?.length || 0 };

    CrmResponseHelper.bulkOperation(res, result, 'update', 'Bulk lead update completed');
  })
);

/**
 * @route   POST /opportunities/bulk-update
 * @desc    Bulk update opportunities
 * @access  Private
 */
router.post('/opportunities/bulk-update',
  opportunityLifecycleMiddleware('bulk_update'),
  crmOperationMiddleware('bulk_update', 'opportunities'),
  asyncHandler(async (req, res) => {
    // Placeholder - would implement bulkUpdateOpportunities
    const result = { updatedCount: req.body.opportunityIds?.length || 0 };

    CrmResponseHelper.bulkOperation(res, result, 'update', 'Bulk opportunity update completed');
  })
);

// DATA EXPORT/IMPORT ROUTES

/**
 * @route   POST /export/leads
 * @desc    Export leads data
 * @access  Private
 */
router.post('/export/leads',
  dataOperationMiddleware('export', 'leads'),
  asyncHandler(async (req, res) => {
    // Placeholder - would implement exportLeads
    const exportResult = {
      downloadUrl: '/downloads/leads_export.csv',
      recordCount: 150,
      format: 'csv',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    CrmResponseHelper.exportComplete(res, exportResult, 'leads');
  })
);

/**
 * @route   POST /import/leads
 * @desc    Import leads data
 * @access  Private
 */
router.post('/import/leads',
  dataOperationMiddleware('import', 'leads'),
  asyncHandler(async (req, res) => {
    // Placeholder - would implement importLeads
    const importResult = {
      importedCount: 125,
      failedCount: 5,
      duplicatesCount: 10,
      errors: ['Row 23: Invalid email format', 'Row 45: Duplicate lead']
    };

    CrmResponseHelper.importComplete(res, importResult, 'leads');
  })
);

/**
 * @route   POST /export/contacts
 * @desc    Export contacts data
 * @access  Private
 */
router.post('/export/contacts',
  dataOperationMiddleware('export', 'contacts'),
  asyncHandler(async (req, res) => {
    // Placeholder - would implement exportContacts
    const exportResult = {
      downloadUrl: '/downloads/contacts_export.csv',
      recordCount: 300,
      format: 'csv',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    CrmResponseHelper.exportComplete(res, exportResult, 'contacts');
  })
);

export default router;