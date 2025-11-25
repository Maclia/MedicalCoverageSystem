import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import {
  providerOnboardingApplications,
  providerVerificationChecklist,
  medicalInstitutions,
  users,
  insertProviderOnboardingApplicationSchema,
  insertProviderVerificationChecklistSchema,
  providerOnboardingStatusEnum,
  providerVerificationStatusEnum
} from '../shared/schema';
import { providerOnboardingService } from '../services/providerOnboardingService';

const router = Router();

// GET /api/provider-onboarding/applications - List all onboarding applications
router.get('/applications', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, institutionId, priority } = req.query;

    let query = db.select({
      application: providerOnboardingApplications,
      institution: medicalInstitutions
    })
    .from(providerOnboardingApplications)
    .leftJoin(medicalInstitutions, eq(providerOnboardingApplications.institutionId, medicalInstitutions.id));

    // Apply filters
    if (status) {
      query = query.where(eq(providerOnboardingApplications.onboardingStatus, status as string));
    }
    if (institutionId) {
      query = query.where(eq(providerOnboardingApplications.institutionId, parseInt(institutionId as string)));
    }
    if (priority) {
      query = query.where(eq(providerOnboardingApplications.priorityLevel, parseInt(priority as string)));
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const applications = await query
      .orderBy(providerOnboardingApplications.submissionDate)
      .limit(parseInt(limit as string))
      .offset(offset);

    const totalCount = await db.select({ count: count() })
      .from(providerOnboardingApplications)
      .where(
        and(
          status ? eq(providerOnboardingApplications.onboardingStatus, status as string) : undefined,
          institutionId ? eq(providerOnboardingApplications.institutionId, parseInt(institutionId as string)) : undefined
        )
      );

    res.json({
      success: true,
      data: applications,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching onboarding applications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch onboarding applications'
    });
  }
});

// GET /api/provider-onboarding/applications/:id - Get specific application details
router.get('/applications/:id', async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);

    const [application] = await db.select({
      application: providerOnboardingApplications,
      institution: medicalInstitutions,
      assignedCaseWorker: users
    })
    .from(providerOnboardingApplications)
    .leftJoin(medicalInstitutions, eq(providerOnboardingApplications.institutionId, medicalInstitutions.id))
    .leftJoin(users, eq(providerOnboardingApplications.assignedCaseWorker, users.id))
    .where(eq(providerOnboardingApplications.id, applicationId))
    .limit(1);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Get verification checklist for this application
    const checklist = await db.select()
      .from(providerVerificationChecklist)
      .where(eq(providerVerificationChecklist.applicationId, applicationId));

    res.json({
      success: true,
      data: {
        ...application,
        checklist
      }
    });
  } catch (error) {
    console.error('Error fetching application details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch application details'
    });
  }
});

// POST /api/provider-onboarding/applications - Create new onboarding application
router.post('/applications', async (req, res) => {
  try {
    const validatedData = insertProviderOnboardingApplicationSchema.parse(req.body);

    // Generate unique application number
    const applicationNumber = await providerOnboardingService.generateApplicationNumber();

    const [newApplication] = await db.insert(providerOnboardingApplications)
      .values({
        ...validatedData,
        applicationNumber,
        onboardingStatus: 'registered'
      })
      .returning();

    // Create default verification checklist
    await providerOnboardingService.createVerificationChecklist(newApplication.id);

    res.status(201).json({
      success: true,
      data: newApplication
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error creating onboarding application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create onboarding application'
    });
  }
});

// PUT /api/provider-onboarding/applications/:id - Update application
router.put('/applications/:id', async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    const validatedData = insertProviderOnboardingApplicationSchema.partial().parse(req.body);

    const [updatedApplication] = await db.update(providerOnboardingApplications)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(providerOnboardingApplications.id, applicationId))
      .returning();

    if (!updatedApplication) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    res.json({
      success: true,
      data: updatedApplication
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error updating application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update application'
    });
  }
});

// POST /api/provider-onboarding/applications/:id/approve - Approve application
router.post('/applications/:id/approve', async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    const { approvedBy, notes, effectiveDate } = req.body;

    const result = await providerOnboardingService.approveApplication(
      applicationId,
      approvedBy,
      notes,
      effectiveDate
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error approving application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve application'
    });
  }
});

// POST /api/provider-onboarding/applications/:id/reject - Reject application
router.post('/applications/:id/reject', async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    const { rejectedBy, rejectionReason, notes } = req.body;

    const result = await providerOnboardingService.rejectApplication(
      applicationId,
      rejectedBy,
      rejectionReason,
      notes
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject application'
    });
  }
});

// POST /api/provider-onboarding/applications/:id/assign-case-worker - Assign case worker
router.post('/applications/:id/assign-case-worker', async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    const { caseWorkerId } = req.body;

    const [updatedApplication] = await db.update(providerOnboardingApplications)
      .set({
        assignedCaseWorker: caseWorkerId,
        updatedAt: new Date()
      })
      .where(eq(providerOnboardingApplications.id, applicationId))
      .returning();

    if (!updatedApplication) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    res.json({
      success: true,
      data: updatedApplication
    });
  } catch (error) {
    console.error('Error assigning case worker:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign case worker'
    });
  }
});

// GET /api/provider-onboarding/checklist/:applicationId - Get verification checklist
router.get('/checklist/:applicationId', async (req, res) => {
  try {
    const applicationId = parseInt(req.params.applicationId);

    const checklist = await db.select()
      .from(providerVerificationChecklist)
      .where(eq(providerVerificationChecklist.applicationId, applicationId))
      .orderBy(providerVerificationChecklist.verificationCategory, providerVerificationChecklist.checklistItem);

    res.json({
      success: true,
      data: checklist
    });
  } catch (error) {
    console.error('Error fetching verification checklist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch verification checklist'
    });
  }
});

// POST /api/provider-onboarding/checklist - Add checklist item
router.post('/checklist', async (req, res) => {
  try {
    const validatedData = insertProviderVerificationChecklistSchema.parse(req.body);

    const [newChecklistItem] = await db.insert(providerVerificationChecklist)
      .values(validatedData)
      .returning();

    res.status(201).json({
      success: true,
      data: newChecklistItem
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error creating checklist item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create checklist item'
    });
  }
});

// PUT /api/provider-onboarding/checklist/:id - Update checklist item
router.put('/checklist/:id', async (req, res) => {
  try {
    const checklistId = parseInt(req.params.id);
    const validatedData = insertProviderVerificationChecklistSchema.partial().parse(req.body);

    const [updatedChecklistItem] = await db.update(providerVerificationChecklist)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(providerVerificationChecklist.id, checklistId))
      .returning();

    if (!updatedChecklistItem) {
      return res.status(404).json({
        success: false,
        error: 'Checklist item not found'
      });
    }

    res.json({
      success: true,
      data: updatedChecklistItem
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error updating checklist item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update checklist item'
    });
  }
});

// POST /api/provider-onboarding/checklist/:id/complete - Mark checklist item as completed
router.post('/checklist/:id/complete', async (req, res) => {
  try {
    const checklistId = parseInt(req.params.id);
    const { completedBy, completionNotes } = req.body;

    const [updatedChecklistItem] = await db.update(providerVerificationChecklist)
      .set({
        isCompleted: true,
        completionDate: new Date(),
        completedBy,
        verificationNotes: completionNotes,
        updatedAt: new Date()
      })
      .where(eq(providerVerificationChecklist.id, checklistId))
      .returning();

    if (!updatedChecklistItem) {
      return res.status(404).json({
        success: false,
        error: 'Checklist item not found'
      });
    }

    // Check if all required items are completed
    await providerOnboardingService.checkApplicationCompletion(updatedChecklistItem.applicationId);

    res.json({
      success: true,
      data: updatedChecklistItem
    });
  } catch (error) {
    console.error('Error completing checklist item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete checklist item'
    });
  }
});

// GET /api/provider-onboarding/analytics - Get onboarding analytics
router.get('/analytics', async (req, res) => {
  try {
    const { period = '30' } = req.query; // Default to last 30 days

    const analytics = await providerOnboardingService.getOnboardingAnalytics(parseInt(period as string));

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching onboarding analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch onboarding analytics'
    });
  }
});

// POST /api/provider-onboarding/applications/:id/appeal - Submit appeal
router.post('/applications/:id/appeal', async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    const { appealReason, supportingDocuments } = req.body;

    const result = await providerOnboardingService.submitAppeal(
      applicationId,
      appealReason,
      supportingDocuments
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error submitting appeal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit appeal'
    });
  }
});

// POST /api/provider-onboarding/automated-verification - Run automated verification
router.post('/automated-verification', async (req, res) => {
  try {
    const { applicationId } = req.body;

    const result = await providerOnboardingService.runAutomatedVerification(applicationId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error running automated verification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run automated verification'
    });
  }
});

export default router;