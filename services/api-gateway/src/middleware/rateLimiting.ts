import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { Redis } from 'redis';
import { config } from '../config';
import { createLogger } from '../utils/logger';

const logger = createLogger();

// In-memory store for development (fallback)
const memoryStore = new Map<string, { count: number; resetTime: number }>();

// Redis store for production
class RedisStore {
  private redis: Redis | null = null;

  constructor() {
    if (config.redis.url && config.redis.url !== 'redis://localhost:6379') {
      try {
        this.redis = new Redis({
          url: config.redis.url,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
        });

        this.redis.on('error', (error) => {
          logger.error('Redis store error', error);
        });

        logger.info('Redis rate limit store initialized');
      } catch (error) {
        logger.warn('Failed to initialize Redis, falling back to memory store', error);
      }
    }
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    if (this.redis) {
      try {
        const windowMs = config.rateLimiting.windowMs;
        const now = Date.now();
        const resetTime = new Date(now + windowMs);

        const result = await this.redis
          .multi()
          .incr(key)
          .expire(key, Math.ceil(windowMs / 1000))
          .exec();

        const totalHits = result ? result[0][1] as number : 1;

        return { totalHits, resetTime };
      } catch (error) {
        logger.error('Redis increment failed, using memory store', error);
        return this.memoryIncrement(key);
      }
    }

    return this.memoryIncrement(key);
  }

  private async memoryIncrement(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const windowMs = config.rateLimiting.windowMs;
    const now = Date.now();
    const resetTime = new Date(now + windowMs);

    const current = memoryStore.get(key);

    if (!current || now > current.resetTime) {
      memoryStore.set(key, { count: 1, resetTime: now + windowMs });
      return { totalHits: 1, resetTime };
    }

    current.count++;
    return { totalHits: current.count, resetTime: new Date(current.resetTime) };
  }
}

const redisStore = new RedisStore();

// Key generator for rate limiting
const generateKey = (req: Request): string => {
  // Use user ID if authenticated, otherwise IP address
  const userId = (req as any).user?.userId;
  const identifier = userId || req.ip || 'unknown';
  const endpoint = req.route?.path || req.path;

  return `rate_limit:${identifier}:${endpoint}`;
};

// Custom rate limiter implementation
export const createRateLimiter = (options: {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) => {
  const windowMs = options.windowMs || config.rateLimiting.windowMs;
  const maxRequests = options.maxRequests || config.rateLimiting.maxRequests;
  const defaultMessage = options.message || 'Too many requests, please try again later';
  const keyGenerator = options.keyGenerator || generateKey;

  return async (req: Request, res: Response, next: Function) => {
    try {
      const key = keyGenerator(req);
      const result = await redisStore.increment(key);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, maxRequests - result.totalHits).toString(),
        'X-RateLimit-Reset': Math.ceil(result.resetTime.getTime() / 1000).toString()
      });

      if (result.totalHits > maxRequests) {
        logger.warn('Rate limit exceeded', {
          key,
          totalHits: result.totalHits,
          maxRequests,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          correlationId: req.correlationId
        });

        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: defaultMessage,
            retryAfter: Math.ceil((result.resetTime.getTime() - Date.now()) / 1000)
          },
          correlationId: req.correlationId
        });
      }

      // Log rate limit status in debug mode
      logger.debug('Rate limit check', {
        key,
        totalHits: result.totalHits,
        maxRequests,
        remaining: maxRequests - result.totalHits,
        correlationId: req.correlationId
      });

      next();
    } catch (error) {
      logger.error('Rate limiter error', error as Error, {
        path: req.path,
        ip: req.ip,
        correlationId: req.correlationId
      });

      // Fail open - allow request if rate limiting fails
      next();
    }
  };
};

// Standard rate limiter for general API usage
export const standardRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  message: 'Too many requests from this IP, please try again later'
});

// Strict rate limiter for sensitive endpoints
export const strictRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  message: 'Too many authentication attempts, please try again later'
});

// Authentication-specific rate limiter
export const authRateLimit = createRateLimiter({
  windowMs: 900000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, account temporarily locked'
});

// User-based rate limiter (after authentication)
export const userRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 200, // 200 requests per minute for authenticated users
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      throw new Error('User rate limiter requires authentication');
    }
    return `user_rate_limit:${userId}`;
  }
});

// Admin rate limiter (higher limits for admin users)
export const adminRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 1000, // 1000 requests per minute for admin users
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    if (!user || user.userType !== 'insurance') {
      throw new Error('Admin rate limiter requires insurance user type');
    }
    return `admin_rate_limit:${user.userId}`;
  }
});

// WebSocket rate limiter
export const websocketRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 60, // 60 messages per minute
  keyGenerator: (req: Request) => {
    const connectionId = (req as any).connectionId;
    return `ws_rate_limit:${connectionId || 'unknown'}`;
  }
});

// Cleanup function for expired entries (only needed for memory store)
export const cleanupRateLimits = (): void => {
  const now = Date.now();
  const expiredKeys: string[] = [];

  for (const [key, data] of memoryStore.entries()) {
    if (now > data.resetTime) {
      expiredKeys.push(key);
    }
  }

  expiredKeys.forEach(key => memoryStore.delete(key));

  if (expiredKeys.length > 0) {
    logger.debug('Cleaned up expired rate limit entries', {
      count: expiredKeys.length
    });
  }
};

// Schedule cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);