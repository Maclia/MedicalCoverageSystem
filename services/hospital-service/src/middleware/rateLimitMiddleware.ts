import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';
import { ResponseFactory, ErrorCodes } from '../utils/api-standardization';

const logger = createLogger();

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window per IP
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    lastAccess: number;
  };
}

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore: RateLimitStore = {};

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime <= now) {
      delete rateLimitStore[key];
    }
  });
}, 5 * 60 * 1000);

export const rateLimitMiddleware = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req: Request) => req.ip || 'unknown'
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Clean up expired entries
    if (rateLimitStore[key] && rateLimitStore[key].resetTime <= now) {
      delete rateLimitStore[key];
    }

    // Initialize or get current rate limit info
    if (!rateLimitStore[key]) {
      rateLimitStore[key] = {
        count: 0,
        resetTime: now + windowMs,
        lastAccess: now
      };
    }

    // Increment count
    rateLimitStore[key].count++;
    rateLimitStore[key].lastAccess = now;

    // Add rate limit headers
    const currentCount = rateLimitStore[key].count;
    const resetTime = Math.ceil(rateLimitStore[key].resetTime / 1000);

    res.set({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Current': currentCount.toString(),
      'X-RateLimit-Remaining': Math.max(0, max - currentCount).toString(),
      'X-RateLimit-Reset': resetTime.toString()
    });

    // Check if limit exceeded
    if (currentCount > max) {
      logger.warn('Rate limit exceeded', {
        key,
        count: currentCount,
        limit: max,
        windowMs,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        correlationId: req.correlationId
      });

      const errorResponse = ResponseFactory.createErrorResponse(
        ErrorCodes.TOO_MANY_REQUESTS,
        message,
        {
          limit: max,
          windowMs,
          retryAfter: Math.ceil((rateLimitStore[key].resetTime - now) / 1000)
        },
        req.correlationId
      );

      res.set('Retry-After', Math.ceil((rateLimitStore[key].resetTime - now) / 1000).toString());
      return res.status(429).json(errorResponse);
    }

    // Override res.end to handle successful/failed request counting
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const statusCode = res.statusCode;

      // Decrement count if configured to skip successful or failed requests
      if ((skipSuccessfulRequests && statusCode >= 200 && statusCode < 300) ||
          (skipFailedRequests && statusCode >= 400)) {
        rateLimitStore[key].count = Math.max(0, rateLimitStore[key].count - 1);
      }

      return originalEnd.apply(this, args);
    };

    next();
  };
};

// Predefined rate limit configurations
export const rateLimitConfigurations = {
  // General API rate limit
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later.'
  },

  // Strict rate limit for sensitive operations
  strict: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many sensitive operations, please try again later.'
  },

  // Very strict rate limit for authentication
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true // Don't count successful auth attempts
  },

  // Rate limit for search operations
  search: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 searches per minute
    message: 'Too many search requests, please try again later.'
  },

  // Rate limit for file uploads
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 uploads per hour
    message: 'Too many file uploads, please try again later.'
  }
};

// Rate limiting middleware for different user types
export const createUserBasedRateLimit = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    let options: RateLimitOptions;

    if (req.user) {
      switch (req.user.role) {
        case 'admin':
          // Higher limits for admin users
          options = {
            windowMs: 15 * 60 * 1000,
            max: 2000,
            message: 'Admin rate limit exceeded',
            keyGenerator: (req) => `admin:${req.user?.id}`
          };
          break;
        case 'premium':
          // Moderate limits for premium users
          options = {
            windowMs: 15 * 60 * 1000,
            max: 1500,
            message: 'Premium user rate limit exceeded',
            keyGenerator: (req) => `premium:${req.user?.id}`
          };
          break;
        default:
          // Standard limits for regular users
          options = {
            windowMs: 15 * 60 * 1000,
            max: 1000,
            message: 'Rate limit exceeded',
            keyGenerator: (req) => `user:${req.user?.id}`
          };
      }
    } else {
      // Anonymous users have stricter limits
      options = {
        windowMs: 15 * 60 * 1000,
        max: 500,
        message: 'Anonymous user rate limit exceeded',
        keyGenerator: (req) => `anonymous:${req.ip}`
      };
    }

    return rateLimitMiddleware(options)(req, res, next);
  };
};