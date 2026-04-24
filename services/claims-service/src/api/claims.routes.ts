import { Router } from 'express';
import { ClaimsController } from '../controllers/ClaimsController.js';

export const claimsRouter = Router();

// Claims CRUD routes
claimsRouter.get('/', ClaimsController.getClaims);
claimsRouter.get('/:id', ClaimsController.getClaim);
claimsRouter.post('/', ClaimsController.createClaim);
claimsRouter.put('/:id', ClaimsController.updateClaim);
claimsRouter.delete('/:id', ClaimsController.deleteClaim);

// Claim Status management
claimsRouter.patch('/:id/status', ClaimsController.updateClaimStatus);

// Claim Workflow operations
claimsRouter.post('/:id/submit', ClaimsController.submitClaim);
claimsRouter.post('/:id/approve', ClaimsController.approveClaim);
claimsRouter.post('/:id/deny', ClaimsController.denyClaim);

export default claimsRouter;