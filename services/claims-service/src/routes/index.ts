import { Router } from 'express';
import { validateClaim, validateClaimId } from '../middleware/claimValidation.js';
import { ClaimsController } from '../controllers/ClaimsController.js';
import healthRouter from './health.js';
import { authenticateToken, requireModuleAccess, requirePermission } from '../middleware/auth.js';

const router = Router();

// Health check endpoint for claims service
router.use('/health', healthRouter);

// Apply authentication and module access to all claim routes
router.use(authenticateToken);
router.use(requireModuleAccess('claims'));

// Claim CRUD Operations
router.post('/', validateClaim, requirePermission(['claim:create']), ClaimsController.createClaim);
router.get('/', requirePermission(['claim:read']), ClaimsController.getClaims);
router.get('/:claimId', validateClaimId, requirePermission(['claim:read']), ClaimsController.getClaim);
router.patch('/:claimId/status', validateClaimId, requirePermission(['claim:update']), ClaimsController.updateClaimStatus);
router.delete('/:claimId', validateClaimId, requirePermission(['claim:delete']), ClaimsController.deleteClaim);

// Claim Workflow Operations
router.post('/:claimId/submit', validateClaimId, requirePermission(['claim:submit']), ClaimsController.submitClaim);
router.post('/:claimId/approve', validateClaimId, requirePermission(['claim:approve']), ClaimsController.approveClaim);
router.post('/:claimId/deny', validateClaimId, requirePermission(['claim:approve']), ClaimsController.denyClaim);

// Statistics & Reporting
router.get('/stats/summary', requirePermission(['claim:read']), ClaimsController.getClaimStats);
router.get('/stats/trends', requirePermission(['claim:read']), ClaimsController.getClaimTrends);

export default router;
