import { Router } from 'express';
import { createLogger } from '../utils/logger.js';
import { schema } from '../models/schema.js';
import { validateClaim, validateClaimId } from '../middleware/claimValidation.js';
import { ClaimsService } from '../services/ClaimsService.js';
import healthRouter from './health.js';
import { authenticateToken, requireModuleAccess, requirePermission, requireMedicalUser } from '@core/middleware/auth.js';

const router = Router();
const logger = createLogger('claims-routes');

// Health check endpoint for claims service
router.use('/health', healthRouter);

// Apply authentication and module access to all claim routes
router.use(authenticateToken);
router.use(requireModuleAccess('claims'));

// Create a new claim
router.post('/', validateClaim, requirePermission(['claim:create']), async (req, res) => {
  try {
    const claimData = {
      ...req.validatedClaim,
      createdAt: new Date()
    };
    const createdClaim = await ClaimsService.createClaim(claimData);
    return res.status(201).json({
      success: true,
      data: createdClaim,
      message: 'Claim created successfully'
    });
  } catch (error) {
    logger.error('Error creating claim:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create claim',
      error: process.env.NODE_ENV === 'development' ? (error as any).message : undefined
    });
  }
});

// Get all claims with pagination
router.get('/', requirePermission(['claim:read']), async (req, res) => {
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

    return res.json({
      success: true,
      data: result.claims,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Error getting claims:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get claims',
      error: process.env.NODE_ENV === 'development' ? (error as any).message : undefined
    });
  }
});

// Get claim by ID
router.get('/:claimId', validateClaimId, requirePermission(['claim:read']), async (req, res) => {
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
    return res.json({
      success: true,
      data: claim
    });
  } catch (error) {
    logger.error('Error getting claim:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get claim',
      error: process.env.NODE_ENV === 'development' ? (error as any).message : undefined
    });
  }
});

// Update claim status
router.patch('/:claimId/status', validateClaimId, requirePermission(['claim:update']), async (req, res) => {
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

    return res.json({
      success: true,
      data: updatedClaim,
      message: 'Claim status updated successfully'
    });
  } catch (error) {
    logger.error('Error updating claim status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update claim status',
      error: process.env.NODE_ENV === 'development' ? (error as any).message : undefined
    });
  }
});

// Delete claim
router.delete('/:claimId', validateClaimId, requirePermission(['claim:delete']), async (req, res) => {
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
    return res.json({
      success: true,
      message: 'Claim deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting claim:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete claim',
      error: process.env.NODE_ENV === 'development' ? (error as any).message : undefined
    });
  }
});

export default router;
