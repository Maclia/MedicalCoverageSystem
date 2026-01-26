import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../cache/CacheService';
import { createLogger } from '../config/logger';

const logger = createLogger();

interface CacheMiddlewareOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request, res: Response) => boolean;
  invalidateOn?: string[]; // HTTP methods that should invalidate cache
  varyBy?: string[]; // Request headers to vary cache by
  headers?: {
    'Cache-Control'?: string;
    'X-Cache'?: string;
  };
}

interface CachedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
}

export const cacheMiddleware = (options: CacheMiddlewareOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET and HEAD requests by default
    if (!['GET', 'HEAD'].includes(req.method) || options.invalidateOn?.includes(req.method)) {
      if (options.invalidateOn?.includes(req.method)) {
        // Invalidate cache for this request pattern
        const cacheKey = generateCacheKey(req, options);
        await cacheService.delete(cacheKey);
        logger.debug('Cache invalidated', { key: cacheKey, method: req.method });
      }
      return next();
    }

    // Check if caching should be skipped
    if (options.condition && !options.condition(req, res)) {
      return next();
    }

    const cacheKey = generateCacheKey(req, options);

    try {
      // Try to get cached response
      const cached = await cacheService.get<CachedResponse>(cacheKey);

      if (cached) {
        logger.debug('Cache hit', { key: cacheKey, url: req.url });

        // Set cache headers
        res.setHeader('X-Cache', 'HIT');
        if (options.headers?.['Cache-Control']) {
          res.setHeader('Cache-Control', options.headers['Cache-Control']);
        }

        // Restore cached headers
        Object.entries(cached.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });

        // Send cached response
        res.status(cached.statusCode).json(cached.body);
        return;
      }

      logger.debug('Cache miss', { key: cacheKey, url: req.url });

      // Capture the response
      const originalJson = res.json;
      const originalStatus = res.status;
      let responseSent = false;

      // Override json method to cache the response
      res.json = function(body: any) {
        if (responseSent) {
          return originalJson.call(this, body);
        }

        responseSent = true;

        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const responseToCache: CachedResponse = {
            statusCode: res.statusCode,
            headers: res.getHeaders() as Record<string, string>,
            body,
            timestamp: Date.now()
          };

          // Cache the response asynchronously
          cacheService.set(cacheKey, responseToCache, { ttl: options.ttl }).catch(error => {
            logger.error('Failed to cache response', error, { key: cacheKey });
          });

          // Set cache headers
          res.setHeader('X-Cache', 'MISS');
          if (options.headers?.['Cache-Control']) {
            res.setHeader('Cache-Control', options.headers['Cache-Control']);
          }
        }

        // Send the original response
        return originalJson.call(this, body);
      };

      // Override status method to capture status code
      res.status = function(code: number) {
        res.statusCode = code;
        return originalStatus.call(this, code);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', error as Error, { key: cacheKey });
      next();
    }
  };
};

export const invalidateCacheMiddleware = (patterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Continue to next middleware first
    next();

    // After response, invalidate cache patterns
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        for (const pattern of patterns) {
          try {
            const deletedCount = await cacheService.deletePattern(pattern);
            logger.debug('Cache pattern invalidated', { pattern, count: deletedCount });
          } catch (error) {
            logger.error('Failed to invalidate cache pattern', error as Error, { pattern });
          }
        }
      }
    });
  };
};

export const cacheTagMiddleware = (tags: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Continue to next middleware first
    next();

    // After response, tag the cached content
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const cacheKey = generateCacheKey(req);

        for (const tag of tags) {
          const tagKey = `tags:${tag}`;
          await cacheService.addToSet(tagKey, cacheKey);
        }

        logger.debug('Cache tags added', { key: cacheKey, tags });
      }
    });
  };
};

function generateCacheKey(req: Request, options: CacheMiddlewareOptions = {}): string {
  if (options.keyGenerator) {
    return options.keyGenerator(req);
  }

  const parts = [
    req.method.toLowerCase(),
    req.path,
    req.query ? JSON.stringify(req.query, Object.keys(req.query).sort()) : '',
    options.varyBy ? options.varyBy.map(header => req.headers[header.toLowerCase()] || '').join('|') : ''
  ];

  // Hash the key to avoid very long keys
  const keyString = parts.filter(Boolean).join(':');
  const hash = require('crypto').createHash('sha256').update(keyString).digest('hex');

  return `response:${hash}`;
}

// Predefined middleware configurations
export const cacheMiddlewareConfigs = {
  // Short-lived cache for frequently changing data
  shortLived: cacheMiddleware({
    ttl: 300, // 5 minutes
    headers: {
      'Cache-Control': 'public, max-age=300'
    }
  }),

  // Medium-lived cache for relatively stable data
  mediumLived: cacheMiddleware({
    ttl: 3600, // 1 hour
    headers: {
      'Cache-Control': 'public, max-age=3600'
    }
  }),

  // Long-lived cache for static data
  longLived: cacheMiddleware({
    ttl: 86400, // 24 hours
    headers: {
      'Cache-Control': 'public, max-age=86400'
    }
  }),

  // Cache for user-specific data
  userSpecific: cacheMiddleware({
    ttl: 900, // 15 minutes
    varyBy: ['authorization', 'x-user-id'],
    headers: {
      'Cache-Control': 'private, max-age=900'
    }
  }),

  // Cache for API responses that should be revalidated
  revalidating: cacheMiddleware({
    ttl: 1800, // 30 minutes
    headers: {
      'Cache-Control': 'public, max-age=1800, must-revalidate'
    }
  }),

  // Cache for search results
  searchResults: cacheMiddleware({
    ttl: 600, // 10 minutes
    varyBy: ['authorization'],
    headers: {
      'Cache-Control': 'private, max-age=600'
    },
    keyGenerator: (req) => {
      return `search:${req.path}:${JSON.stringify(req.query, Object.keys(req.query).sort())}`;
    }
  }),

  // Cache for pagination results
  paginated: cacheMiddleware({
    ttl: 1800, // 30 minutes
    varyBy: ['authorization'],
    keyGenerator: (req) => {
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      return `paginated:${req.path}:${page}:${limit}`;
    }
  })
};

// API-specific middleware
export const patientCacheMiddleware = cacheMiddleware({
  ttl: 3600, // 1 hour
  varyBy: ['authorization'],
  keyGenerator: (req) => `patient:${req.params.id || 'list'}:${JSON.stringify(req.query)}`
});

export const appointmentCacheMiddleware = cacheMiddleware({
  ttl: 1800, // 30 minutes
  varyBy: ['authorization'],
  keyGenerator: (req) => `appointment:${req.params.id || 'list'}:${JSON.stringify(req.query)}`
});

export const invoiceCacheMiddleware = cacheMiddleware({
  ttl: 3600, // 1 hour
  varyBy: ['authorization'],
  keyGenerator: (req) => `invoice:${req.params.id || 'list'}:${JSON.stringify(req.query)}`
});

export const paymentCacheMiddleware = cacheMiddleware({
  ttl: 900, // 15 minutes
  varyBy: ['authorization'],
  keyGenerator: (req) => `payment:${req.params.id || 'list'}:${JSON.stringify(req.query)}`
});

export const insuranceCacheMiddleware = cacheMiddleware({
  ttl: 7200, // 2 hours
  varyBy: ['authorization'],
  keyGenerator: (req) => `insurance:${req.params.id || 'list'}:${JSON.stringify(req.query)}`
});

// Cache warming function
export const warmApiCache = async () => {
  const apiEndpoints = [
    '/api/v1/patients/stats',
    '/api/v1/appointments/stats',
    '/api/v1/invoices/stats',
    '/api/v1/payments/stats',
    '/api/v1/insurance/schemes',
    '/api/v1/benefits'
  ];

  logger.info('Starting API cache warming');

  // This would typically make HTTP requests to warm the cache
  // For now, just log the endpoints that would be warmed
  for (const endpoint of apiEndpoints) {
    logger.debug('API endpoint ready for cache warming', { endpoint });
  }

  logger.info('API cache warming completed');
};

export default cacheMiddleware;