import { Request, Response, NextFunction } from 'express';
import { WinstonLogger } from '../utils/WinstonLogger';

const logger = new WinstonLogger('finance-service');

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Unhandled error', err);
  
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    },
    meta: {
      timestamp: new Date().toISOString(),
      service: 'finance-service',
      requestId: req.headers['x-request-id']
    }
  });
};
