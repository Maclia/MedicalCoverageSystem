import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('rate-limit');

// Simple in-memory rate limiting for internal service usage
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Configuration
const MAX_REQUESTS_PER_MINUTE = 100;
const WINDOW_MS = 60 * 1000;

/**
 * Simple rate limiting middleware for premium calculation endpoints
 * Prevents abuse of calculation resources
 */
export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientIp = req.ip || 'unknown';
    const now = Date.now();
    
    let clientData = requestCounts.get(clientIp);
    
    // Reset window if expired
    if (!clientData || now > clientData.resetTime) {
      clientData = {
        count: 0,
        resetTime: now + WINDOW_MS
      };
      requestCounts.set(clientIp, clientData);
    }
    
    clientData.count++;
    
    if (clientData.count > MAX_REQUESTS_PER_MINUTE) {
      logger.warn(`Rate limit exceeded for ${clientIp}`);
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_MINUTE);
    res.setHeader('X-RateLimit-Remaining', MAX_REQUESTS_PER_MINUTE - clientData.count);
    res.setHeader('X-RateLimit-Reset', Math.ceil(clientData.resetTime / 1000));
    
    next();
    
  } catch (error) {
    logger.error('Rate limit error', { error });
    next(); // Allow request through on error
  }
};