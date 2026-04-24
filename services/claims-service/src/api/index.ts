import { Router } from 'express';
import claimsRouter from './claims.routes.js';
import statsRouter from './stats.routes.js';

const apiRouter = Router();

// Mount domain-specific routes
apiRouter.use('/claims', claimsRouter);
apiRouter.use('/stats', statsRouter);

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'claims-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * BACKWARD COMPATIBILITY LAYER
 * 
 * Maps old flat route structure to new modular routes
 * Maintains 100% compatibility with existing clients
 * All existing API endpoints continue to work exactly as before
 * Using Express native mounting with correct types
 */

// Mount routers at root level for backward compatibility
apiRouter.use('/', claimsRouter);
apiRouter.use('/', statsRouter);

export default apiRouter;