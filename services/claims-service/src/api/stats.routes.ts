import { Router } from 'express';
import { ClaimsController } from '../controllers/ClaimsController.js';

export const statsRouter = Router();

// Claim Analytics & Statistics routes
statsRouter.get('/summary', ClaimsController.getClaimStats);
statsRouter.get('/trends', ClaimsController.getClaimTrends);

// Placeholders for future implementation
statsRouter.get('/metrics', (req, res) => res.json({ success: true, data: {} }));
statsRouter.get('/reports', (req, res) => res.json({ success: true, data: {} }));

export default statsRouter;
