import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const responseStandardization = (_req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalJson = res.json;

  res.json = function(body: any) {
    const processingTime = Date.now() - startTime;
    const requestId = randomUUID();

    if (body && typeof body === 'object' && 'success' in body) {
      if (!body.meta) body.meta = {};
      body.meta.requestId = requestId;
      body.meta.processingTime = processingTime;
      body.meta.service = 'analytics-service';
      
      return originalJson.call(this, body);
    }

    const isError = res.statusCode >= 400;

    if (isError) {
      return originalJson.call(this, {
        success: false,
        error: body,
        meta: {
          requestId,
          processingTime,
          service: 'analytics-service',
          timestamp: new Date().toISOString()
        }
      });
    }

    return originalJson.call(this, {
      success: true,
      data: body,
      meta: {
        requestId,
        processingTime,
        service: 'analytics-service',
        timestamp: new Date().toISOString()
      }
    });
  };

  // Add helper methods
  res.success = (data: any, meta?: any) => {
    return res.json({
      success: true,
      data,
      meta: {
        ...meta,
        processingTime: Date.now() - startTime,
        service: 'analytics-service',
        timestamp: new Date().toISOString()
      }
    });
  };

  res.error = (code: string, message: string, details?: any) => {
    res.status(400);
    return res.json({
      success: false,
      error: {
        code,
        message,
        details
      }
    });
  };

  next();
};