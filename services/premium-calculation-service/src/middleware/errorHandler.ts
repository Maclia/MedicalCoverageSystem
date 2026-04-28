import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('errorHandler');

export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Request failed', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    serviceId: (req as any).serviceId
  });

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    success: false,
    error: {
      message: error.message,
      code: 'SERVER_ERROR'
    },
    requestId: req.headers['x-request-id'] || null
  });
};