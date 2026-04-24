import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  const startTime = Date.now();

  res.json = function(data: any) {
    const duration = Date.now() - startTime;
    
    logger.info('Audit Log', {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.userId,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId,
      query: req.query,
      params: req.params
    });

    return originalJson.call(this, data);
  };

  next();
};

export default auditMiddleware;