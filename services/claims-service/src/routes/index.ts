import { Router } from 'express';
import { createLogger } from '../utils/logger';
import { schema } from '../models/schema';
import { validateClaim, validateClaimId } from '../middleware/claimValidation';
import { ClaimsService } from '../services/ClaimsService';
import healthRouter from './health';

const router = Router();
const logger = createLogger('claims-routes');

// Health check endpoint for claims service
router.use('/health', healthRouter);

// Create a new claim
router.post('/', validateClaim, async (req, res) => {
  try {
    const claimData = {
      ...req.validatedClaim,
      createdAt: new Date()
    };
    const createdClaim = await ClaimsService.createClaim(claimData);
    res.status(201).json({
      success: true,
      data: createdClaim,
      message: 'Claim created successfully'
    });
  } catch (error) {
    logger.error('Error creating claim:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create claim',
      error: process.env.NODE_ENV === 'development' ? (error as any).message : undefined
    });
  }
});

// Get all claims with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, memberId, institutionId } = req.query;
    const filters: any = {};
    if (status) filters.status = status;
    if (memberId) filters.memberId = parseInt(memberId as string);
    if (institutionId) filters.institutionId = parseInt(institutionId as string);

    const result = await ClaimsService.getClaims(
      parseInt(page as string),
      parseInt(limit as string),
      filters
    );

    res.json({
      success: true,
      data: result.claims,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Error getting claims:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get claims',
      error: process.env.NODE_ENV === 'development' ? (error as any).message : undefined
    });
  }
});

// Get claim by ID
router.get('/:claimId', validateClaimId, async (req, res) => {
  try {
    if (!req.claimId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid claim ID'
      });
    }
    const claim = await ClaimsService.getClaimById(req.claimId);
    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }
    res.json({
      success: true,
      data: claim
    });
  } catch (error) {
    logger.error('Error getting claim:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get claim',
      error: process.env.NODE_ENV === 'development' ? (error as any).message : undefined
    });
  }
});

// Update claim status
router.patch('/:claimId/status', validateClaimId, async (req, res) => {
  try {
    if (!req.claimId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid claim ID'
      });
    }
    const { status, notes } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const updatedClaim = await ClaimsService.updateClaimStatus(
      req.claimId,
      status,
      notes
    );

    if (!updatedClaim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    res.json({
      success: true,
      data: updatedClaim,
      message: 'Claim status updated successfully'
    });
  } catch (error) {
    logger.error('Error updating claim status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update claim status',
      error: process.env.NODE_ENV === 'development' ? (error as any).message : undefined
    });
  }
});

// Delete claim
router.delete('/:claimId', validateClaimId, async (req, res) => {
  try {
    if (!req.claimId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid claim ID'
      });
    }
    const deletedClaim = await ClaimsService.deleteClaim(req.claimId);
    if (!deletedClaim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }
    res.json({
      success: true,
      message: 'Claim deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting claim:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete claim',
      error: process.env.NODE_ENV === 'development' ? (error as any).message : undefined
    });
  }
});

export default router;
