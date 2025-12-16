import { Request, Response, NextFunction } from 'express';
import { createLogger, generateCorrelationId } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      user?: any;
      startTime?: number;
    }
  }
}

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = generateCorrelationId();
  req.correlationId = correlationId;

  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);

  const logger = createLogger(correlationId);
  logger.info('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Log response when it finishes
  res.on('finish', () => {
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: req.startTime ? Date.now() - req.startTime : undefined
    });
  });

  next();
};

export const requestTimingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.startTime = Date.now();
  next();
};

export const errorAuditMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  const logger = createLogger(req.correlationId);

  logger.error('Service request error', err, {
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    body: req.body,
    params: req.params,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  next(err);
};