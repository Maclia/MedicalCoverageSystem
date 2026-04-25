import { Request, Response, NextFunction } from 'express';
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      singleLine: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  },
});

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
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
      service: 'analytics-service',
      requestId: req.headers['x-request-id']
    }
  });
};