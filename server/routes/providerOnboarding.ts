import { Router } from 'express';
import { providerOnboardingService } from '../services/providerOnboardingService';
import { storage } from '../storage';

const router = Router();

// ============================================================================
// PROVIDER ONBOARDING ENDPOINTS
// ============================================================================

/**
 * Start onboarding process
 * POST /api/providers/onboarding/start
 */
router.post('/api/providers/onboarding/start', async (req, res) => {
  try {
    const {
      providerName,
      providerType,
      contactEmail,
      contactPhone,
      address,
      taxId,
      specialty,
      initiatedBy
    } = req.body;

    if (!providerName || !providerType || !contactEmail) {
      return res.status(400).json({
        error: "providerName, providerType, and contactEmail are required"
      });
    }

    const onboarding = await providerOnboardingService.initiateOnboarding({
      providerName,
      providerType,
      contactEmail,
      contactPhone,
      address,
      taxId,
      specialty,
      initiatedBy
    });

    res.status(201).json({
      success: true,
      onboarding
    });

  } catch (error) {
    console.error('Error starting onboarding:', error);
    res.status(500).json({ error: "Failed to start onboarding" });
  }
});

/**
 * Get onboarding status
 * GET /api/providers/onboarding/:onboardingId
 */
router.get('/api/providers/onboarding/:onboardingId', async (req, res) => {
  try {
    const { onboardingId } = req.params;

    const onboarding = await providerOnboardingService.getOnboardingStatus(
      Number(onboardingId)
    );

    if (!onboarding) {
      return res.status(404).json({ error: "Onboarding not found" });
    }

    res.json({
      success: true,
      onboarding
    });

  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    res.status(500).json({ error: "Failed to fetch onboarding status" });
  }
});

/**
 * Update onboarding
 * PUT /api/providers/onboarding/:onboardingId
 */
router.put('/api/providers/onboarding/:onboardingId', async (req, res) => {
  try {
    const { onboardingId } = req.params;
    const updates = req.body;

    const onboarding = await providerOnboardingService.updateOnboarding(
      Number(onboardingId),
      updates
    );

    res.json({
      success: true,
      onboarding
    });

  } catch (error) {
    console.error('Error updating onboarding:', error);
    res.status(500).json({ error: "Failed to update onboarding" });
  }
});

/**
 * Complete onboarding
 * POST /api/providers/onboarding/:onboardingId/complete
 */
router.post('/api/providers/onboarding/:onboardingId/complete', async (req, res) => {
  try {
    const { onboardingId } = req.params;
    const { completedBy, notes } = req.body;

    const result = await providerOnboardingService.completeOnboarding(
      Number(onboardingId),
      {
        completedBy,
        notes
      }
    );

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({ error: "Failed to complete onboarding" });
  }
});

/**
 * Get pending onboarding
 * GET /api/providers/onboarding/pending
 */
router.get('/api/providers/onboarding/pending', async (req, res) => {
  try {
    const {
      providerType,
      status = 'in_progress',
      limit = 50,
      offset = 0
    } = req.query;

    const onboardingList = await providerOnboardingService.getPendingOnboarding({
      providerType: providerType as string,
      status: status as string,
      limit: Number(limit),
      offset: Number(offset)
    });

    res.json({
      success: true,
      ...onboardingList
    });

  } catch (error) {
    console.error('Error fetching pending onboarding:', error);
    res.status(500).json({ error: "Failed to fetch pending onboarding" });
  }
});

/**
 * Upload documents
 * POST /api/providers/onboarding/documents/upload
 */
router.post('/api/providers/onboarding/documents/upload', async (req, res) => {
  try {
    const {
      onboardingId,
      documentType,
      fileName,
      fileUrl,
      uploadedBy
    } = req.body;

    if (!onboardingId || !documentType || !fileUrl) {
      return res.status(400).json({
        error: "onboardingId, documentType, and fileUrl are required"
      });
    }

    const document = await providerOnboardingService.uploadDocument({
      onboardingId: Number(onboardingId),
      documentType,
      fileName,
      fileUrl,
      uploadedBy
    });

    res.status(201).json({
      success: true,
      document
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: "Failed to upload document" });
  }
});

/**
 * Get onboarding documents
 * GET /api/providers/onboarding/:onboardingId/documents
 */
router.get('/api/providers/onboarding/:onboardingId/documents', async (req, res) => {
  try {
    const { onboardingId } = req.params;

    const documents = await providerOnboardingService.getOnboardingDocuments(
      Number(onboardingId)
    );

    res.json({
      success: true,
      documents,
      count: documents.length
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

/**
 * Verify document
 * POST /api/providers/onboarding/documents/:documentId/verify
 */
router.post('/api/providers/onboarding/documents/:documentId/verify', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { verified, verifiedBy, notes } = req.body;

    const result = await providerOnboardingService.verifyDocument(
      Number(documentId),
      {
        verified,
        verifiedBy,
        notes
      }
    );

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error verifying document:', error);
    res.status(500).json({ error: "Failed to verify document" });
  }
});

/**
 * Get onboarding checklist
 * GET /api/providers/onboarding/:onboardingId/checklist
 */
router.get('/api/providers/onboarding/:onboardingId/checklist', async (req, res) => {
  try {
    const { onboardingId } = req.params;

    const checklist = await providerOnboardingService.getOnboardingChecklist(
      Number(onboardingId)
    );

    res.json({
      success: true,
      checklist
    });

  } catch (error) {
    console.error('Error fetching checklist:', error);
    res.status(500).json({ error: "Failed to fetch checklist" });
  }
});

/**
 * Update checklist item
 * PUT /api/providers/onboarding/:onboardingId/checklist/:itemId
 */
router.put('/api/providers/onboarding/:onboardingId/checklist/:itemId', async (req, res) => {
  try {
    const { onboardingId, itemId } = req.params;
    const { completed, completedBy, notes } = req.body;

    const result = await providerOnboardingService.updateChecklistItem(
      Number(onboardingId),
      Number(itemId),
      {
        completed,
        completedBy,
        notes
      }
    );

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({ error: "Failed to update checklist item" });
  }
});

export default router;
