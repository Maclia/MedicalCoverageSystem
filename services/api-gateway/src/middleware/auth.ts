import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { serviceRegistry } from '../services/ServiceRegistry';
import { createLogger } from '../utils/logger';

const logger = createLogger();

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        userType: 'insurance' | 'institution' | 'provider';
        entityId: number;
        email: string;
      };
      correlationId?: string;
    }
  }
}

export interface JWTPayload {
  userId: number;
  userType: 'insurance' | 'institution' | 'provider';
  entityId: number;
  email: string;
  iat?: number;
  exp?: number;
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Access token is required'
        },
        correlationId: req.correlationId
      });
    }

    // Validate JWT token
    const payload = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    }) as JWTPayload;

    // Verify user exists by calling core service
    const coreClient = serviceRegistry.createServiceClient('core');
    if (!coreClient) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Authentication service temporarily unavailable'
        },
        correlationId: req.correlationId
      });
    }

    try {
      const response = await coreClient.get(`/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Correlation-ID': req.correlationId
        }
      });

      if (!response.data.success) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'User not found or inactive'
          },
          correlationId: req.correlationId
        });
      }

      req.user = {
        userId: payload.userId,
        userType: payload.userType,
        entityId: payload.entityId,
        email: payload.email
      };

      logger.debug('Token authentication successful', {
        userId: payload.userId,
        userType: payload.userType,
        correlationId: req.correlationId
      });

      next();
    } catch (apiError) {
      logger.warn('User verification failed', {
        error: (apiError as Error).message,
        userId: payload.userId,
        correlationId: req.correlationId
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_VERIFICATION_FAILED',
          message: 'Unable to verify user with authentication service'
        },
        correlationId: req.correlationId
      });
    }

  } catch (error) {
    let errorMessage = 'Invalid access token';
    let errorCode = 'INVALID_TOKEN';

    if (error instanceof jwt.TokenExpiredError) {
      errorMessage = 'Access token expired';
      errorCode = 'TOKEN_EXPIRED';
    } else if (error instanceof jwt.JsonWebTokenError) {
      errorMessage = 'Malformed access token';
      errorCode = 'MALFORMED_TOKEN';
    }

    logger.warn('Token authentication failed', {
      error: (error as Error).message,
      errorCode,
      correlationId: req.correlationId
    });

    return res.status(401).json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage
      },
      correlationId: req.correlationId
    });
  }
};

export const requireUserType = (allowedTypes: ('insurance' | 'institution' | 'provider')[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        },
        correlationId: req.correlationId
      });
    }

    if (!allowedTypes.includes(req.user.userType)) {
      logger.warn('User type authorization failed', {
        userId: req.user.userId,
        userType: req.user.userType,
        allowedTypes,
        correlationId: req.correlationId
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. Required user type: ${allowedTypes.join(', ')}`
        },
        correlationId: req.correlationId
      });
    }

    logger.debug('User type authorization successful', {
      userId: req.user.userId,
      userType: req.user.userType,
      allowedTypes,
      correlationId: req.correlationId
    });

    next();
  };
};

export const requireInsuranceUser = requireUserType(['insurance']);
export const requireInstitutionUser = requireUserType(['institution']);
export const requireProviderUser = requireUserType(['provider']);
export const requireMedicalUser = requireUserType(['institution', 'provider']);

export const requireEntityAccess = (entityType: 'company' | 'institution' | 'personnel') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        },
        correlationId: req.correlationId
      });
    }

    // Get the entity ID from request parameters or query
    const entityId = req.params.id || req.params.entityId || req.query.entityId;

    if (!entityId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ENTITY_ID',
          message: 'Entity ID is required'
        },
        correlationId: req.correlationId
      });
    }

    const requestedEntityId = parseInt(entityId as string, 10);

    if (isNaN(requestedEntityId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ENTITY_ID',
          message: 'Invalid entity ID format'
        },
        correlationId: req.correlationId
      });
    }

    // Check if user has access to the requested entity
    if (req.user.entityId !== requestedEntityId) {
      logger.warn('Entity access authorization failed', {
        userId: req.user.userId,
        userType: req.user.userType,
        userEntityId: req.user.entityId,
        requestedEntityId,
        entityType,
        correlationId: req.correlationId
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'ENTITY_ACCESS_DENIED',
          message: 'Access denied. You can only access your own entity resources'
        },
        correlationId: req.correlationId
      });
    }

    logger.debug('Entity access authorization successful', {
      userId: req.user.userId,
      userType: req.user.userType,
      userEntityId: req.user.entityId,
      requestedEntityId,
      entityType,
      correlationId: req.correlationId
    });

    next();
  };
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const payload = jwt.verify(token, config.jwt.secret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience
      }) as JWTPayload;

      // Try to verify user with core service
      const coreClient = serviceRegistry.createServiceClient('core');
      if (coreClient) {
        try {
          const response = await coreClient.get(`/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Correlation-ID': req.correlationId
            }
          });

          if (response.data.success) {
            req.user = {
              userId: payload.userId,
              userType: payload.userType,
              entityId: payload.entityId,
              email: payload.email
            };

            logger.debug('Optional authentication successful', {
              userId: payload.userId,
              userType: payload.userType,
              correlationId: req.correlationId
            });
          }
        } catch (apiError) {
          logger.debug('Optional authentication failed, continuing without user', {
            error: (apiError as Error).message,
            correlationId: req.correlationId
          });
        }
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't throw errors, just continue without user
    logger.debug('Optional authentication failed, continuing without user', {
      error: (error as Error).message,
      correlationId: req.correlationId
    });
    next();
  }
};

// Middleware to add authentication headers to downstream requests
export const addAuthHeaders = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    // Store original auth header for downstream services
    (req as any).originalAuthHeader = authHeader;
  }

  next();
};

// Service-to-service authentication middleware
export const serviceAuth = (req: Request, res: Response, next: NextFunction): void => {
  const serviceToken = req.headers['x-service-token'] as string;

  if (!serviceToken) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'SERVICE_TOKEN_REQUIRED',
        message: 'Service token is required for this endpoint'
      },
      correlationId: req.correlationId
    });
  }

  try {
    // Validate service token (simplified - in production, use proper service-to-service auth)
    const payload = jwt.verify(serviceToken, config.jwt.secret) as any;

    if (!payload.service) {
      throw new Error('Invalid service token');
    }

    // Add service info to request
    (req as any).service = {
      name: payload.service,
      permissions: payload.permissions || []
    };

    logger.debug('Service authentication successful', {
      service: payload.service,
      correlationId: req.correlationId
    });

    next();
  } catch (error) {
    logger.warn('Service authentication failed', {
      error: (error as Error).message,
      correlationId: req.correlationId
    });

    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_SERVICE_TOKEN',
        message: 'Invalid or expired service token'
      },
      correlationId: req.correlationId
    });
  }
};