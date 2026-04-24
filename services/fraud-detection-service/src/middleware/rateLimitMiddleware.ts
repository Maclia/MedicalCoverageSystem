import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'production' ? 100 : 1000, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the request limit. Please try again later.'
  },
  skip: (req) => {
    // Skip rate limiting for internal services
    const internalIps = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    return internalIps.includes(req.ip || '');
  }
});

export const strictRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the request limit for this endpoint. Please try again later.'
  }
});

export default rateLimiter;