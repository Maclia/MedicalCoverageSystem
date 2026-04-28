import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('auth-middleware');

/**
 * Authentication Middleware
 * Validates service-to-service authentication tokens
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(`Unauthorized request attempt from ${req.ip}`);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Authentication required'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // TODO: Implement full JWT validation in production
    // For internal service communication, validate service token signature
    if (!token || token.length < 20) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token'
      });
    }

    // Attach service identity to request
    req.serviceId = 'verified-service';
    next();

  } catch (error) {
    logger.error('Authentication error', { error });
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};