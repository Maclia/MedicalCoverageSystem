import express from 'express';
import { cardManagementService, CardGenerationRequest, CardVerificationRequest, CardStatusUpdate } from '../services/cardManagementService';
import { storage } from '../storage';

const router = express.Router();

// Member Card Management Routes

// Generate new card for a member
router.post('/cards/generate', async (req, res) => {
  try {
    const { memberId, cardType, templateId, companyId, expeditedShipping }: CardGenerationRequest = req.body;

    // Validate required fields
    if (!memberId || !cardType) {
      return res.status(400).json({
        success: false,
        error: 'Member ID and card type are required'
      });
    }

    const cards = await cardManagementService.generateCardForMember({
      memberId,
      cardType,
      templateId,
      companyId,
      expeditedShipping
    });

    res.json({
      success: true,
      data: cards,
      message: `Successfully generated ${cards.length} card(s)`
    });
  } catch (error) {
    console.error('Error generating card:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate card'
    });
  }
});

// Get cards for a specific member
router.get('/cards/member/:memberId', async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId);
    if (isNaN(memberId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid member ID'
      });
    }

    const cards = await storage.getMemberCardsByMember(memberId);

    res.json({
      success: true,
      data: cards
    });
  } catch (error) {
    console.error('Error fetching member cards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch member cards'
    });
  }
});

// Get specific card details
router.get('/cards/:cardId', async (req, res) => {
  try {
    const cardId = parseInt(req.params.cardId);
    if (isNaN(cardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card ID'
      });
    }

    const card = await storage.getMemberCard(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      });
    }

    res.json({
      success: true,
      data: card
    });
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch card'
    });
  }
});

// Update card status
router.put('/cards/:cardId/status', async (req, res) => {
  try {
    const cardId = parseInt(req.params.cardId);
    const { status, reason, notes }: CardStatusUpdate = req.body;

    if (isNaN(cardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card ID'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const updatedCard = await cardManagementService.updateCardStatus({
      cardId,
      status,
      reason,
      notes
    });

    res.json({
      success: true,
      data: updatedCard,
      message: 'Card status updated successfully'
    });
  } catch (error) {
    console.error('Error updating card status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update card status'
    });
  }
});

// Request card replacement
router.post('/cards/:cardId/replace', async (req, res) => {
  try {
    const cardId = parseInt(req.params.cardId);
    const { reason, expedited } = req.body;

    if (isNaN(cardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card ID'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Reason for replacement is required'
      });
    }

    const newCard = await cardManagementService.requestCardReplacement(
      cardId,
      reason,
      expedited
    );

    res.json({
      success: true,
      data: newCard,
      message: 'Card replacement requested successfully'
    });
  } catch (error) {
    console.error('Error requesting card replacement:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to request card replacement'
    });
  }
});

// Card Verification Routes

// Verify card (for providers)
router.post('/cards/verify', async (req, res) => {
  try {
    const { qrCodeData, providerId, verificationType, location, deviceInfo }: CardVerificationRequest = req.body;

    if (!qrCodeData || !providerId || !verificationType) {
      return res.status(400).json({
        success: false,
        error: 'QR code data, provider ID, and verification type are required'
      });
    }

    const verificationResult = await cardManagementService.verifyCard({
      qrCodeData,
      providerId,
      verificationType,
      location,
      deviceInfo
    });

    res.json({
      success: true,
      data: verificationResult
    });
  } catch (error) {
    console.error('Error verifying card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify card'
    });
  }
});

// Get verification history for a card
router.get('/cards/:cardId/verifications', async (req, res) => {
  try {
    const cardId = parseInt(req.params.cardId);
    if (isNaN(cardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card ID'
      });
    }

    const verifications = await storage.getCardVerificationEventsByCard(cardId);

    res.json({
      success: true,
      data: verifications
    });
  } catch (error) {
    console.error('Error fetching verification history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch verification history'
    });
  }
});

// Card Template Routes

// Get all card templates
router.get('/templates', async (req, res) => {
  try {
    const { companyId, templateType, active } = req.query;

    let templates;
    if (companyId) {
      templates = await storage.getCardTemplatesByCompany(parseInt(companyId as string));
    } else if (templateType) {
      templates = await storage.getCardTemplatesByType(templateType as string);
    } else if (active !== undefined) {
      templates = active === 'true'
        ? await storage.getActiveCardTemplates()
        : await storage.getCardTemplates();
    } else {
      templates = await storage.getCardTemplates();
    }

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching card templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch card templates'
    });
  }
});

// Create new card template
router.post('/templates', async (req, res) => {
  try {
    const templateData = req.body;

    const newTemplate = await storage.createCardTemplate(templateData);

    res.status(201).json({
      success: true,
      data: newTemplate,
      message: 'Card template created successfully'
    });
  } catch (error) {
    console.error('Error creating card template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create card template'
    });
  }
});

// Update card template
router.put('/templates/:templateId', async (req, res) => {
  try {
    const templateId = parseInt(req.params.templateId);
    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID'
      });
    }

    const updatedTemplate = await storage.updateCardTemplate(templateId, req.body);

    res.json({
      success: true,
      data: updatedTemplate,
      message: 'Card template updated successfully'
    });
  } catch (error) {
    console.error('Error updating card template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update card template'
    });
  }
});

// Deactivate card template
router.post('/templates/:templateId/deactivate', async (req, res) => {
  try {
    const templateId = parseInt(req.params.templateId);
    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template ID'
      });
    }

    const deactivatedTemplate = await storage.deactivateCardTemplate(templateId);

    res.json({
      success: true,
      data: deactivatedTemplate,
      message: 'Card template deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating card template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate card template'
    });
  }
});

// Production Batch Routes

// Get production batches
router.get('/batches', async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;

    let batches;
    if (status) {
      batches = await storage.getCardProductionBatchesByStatus(status as string);
    } else if (startDate && endDate) {
      batches = await storage.getCardProductionBatchesByDateRange(
        new Date(startDate as string),
        new Date(endDate as string)
      );
    } else {
      batches = await storage.getCardProductionBatches();
    }

    res.json({
      success: true,
      data: batches
    });
  } catch (error) {
    console.error('Error fetching production batches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch production batches'
    });
  }
});

// Update production batch status
router.put('/batches/:batchId/status', async (req, res) => {
  try {
    const batchId = parseInt(req.params.batchId);
    const { status, trackingNumber } = req.body;

    if (isNaN(batchId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid batch ID'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const updatedBatch = await cardManagementService.updateProductionBatchStatus(
      batchId,
      status,
      trackingNumber
    );

    res.json({
      success: true,
      data: updatedBatch,
      message: 'Production batch status updated successfully'
    });
  } catch (error) {
    console.error('Error updating production batch status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update production batch status'
    });
  }
});

// Analytics and Reporting Routes

// Get card usage statistics
router.get('/analytics/usage', async (req, res) => {
  try {
    const { memberId, startDate, endDate } = req.query;

    const statistics = await cardManagementService.getCardUsageStatistics(
      memberId ? parseInt(memberId as string) : undefined,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error fetching usage statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage statistics'
    });
  }
});

// Get verification events
router.get('/verifications', async (req, res) => {
  try {
    const { cardId, memberId, startDate, endDate } = req.query;

    let verifications;
    if (cardId) {
      verifications = await storage.getCardVerificationEventsByCard(parseInt(cardId as string));
    } else if (memberId) {
      verifications = await storage.getCardVerificationEventsByMember(parseInt(memberId as string));
    } else if (startDate && endDate) {
      verifications = await storage.getCardVerificationEventsByDateRange(
        new Date(startDate as string),
        new Date(endDate as string)
      );
    } else {
      verifications = await storage.getCardVerificationEvents();
    }

    res.json({
      success: true,
      data: verifications
    });
  } catch (error) {
    console.error('Error fetching verification events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch verification events'
    });
  }
});

// Member-facing Routes

// Get member's active cards
router.get('/member/active-cards/:memberId', async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId);
    if (isNaN(memberId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid member ID'
      });
    }

    const activeCards = await storage.getActiveMemberCards(memberId);

    res.json({
      success: true,
      data: activeCards
    });
  } catch (error) {
    console.error('Error fetching active cards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active cards'
    });
  }
});

// Download digital card (returns card data for mobile app)
router.get('/member/download-card/:cardId', async (req, res) => {
  try {
    const cardId = parseInt(req.params.cardId);
    if (isNaN(cardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card ID'
      });
    }

    const card = await storage.getMemberCard(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      });
    }

    if (card.cardType !== 'digital') {
      return res.status(400).json({
        success: false,
        error: 'Only digital cards can be downloaded'
      });
    }

    // Get member and template information for complete card data
    const member = await storage.getMember(card.memberId);
    const template = await storage.getCardTemplate(card.templateId);

    const cardData = {
      card,
      member: {
        id: member?.id,
        name: `${member?.firstName} ${member?.lastName}`,
        memberType: member?.memberType,
        dateOfBirth: member?.dateOfBirth
      },
      template,
      qrCodeData: card.qrCodeData
    };

    res.json({
      success: true,
      data: cardData
    });
  } catch (error) {
    console.error('Error downloading card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download card'
    });
  }
});

export default router;