import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { createLogger } from '../utils/logger';
import { ResponseFactory, ErrorCodes } from '../utils/api-standardization';

const logger = createLogger();

// Extend Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
        permissions: string[];
      };
      correlationId?: string;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      const errorResponse = ResponseFactory.createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        'Authorization header is required',
        undefined,
        req.correlationId
      );
      return res.status(401).json(errorResponse);
    }

    // Extract token from "Bearer <token>" format
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      const errorResponse = ResponseFactory.createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        'Invalid authorization header format. Expected: "Bearer <token>"',
        undefined,
        req.correlationId
      );
      return res.status(401).json(errorResponse);
    }

    const token = tokenParts[1];

    // Verify JWT token
    const decoded = jwt.verify(token, config.auth.jwtSecret) as any;

    // Attach user information to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || []
    };

    logger.debug('Authentication successful', {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      correlationId: req.correlationId
    });

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      const errorResponse = ResponseFactory.createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        'Token has expired',
        undefined,
        req.correlationId
      );
      return res.status(401).json(errorResponse);
    }

    if (error instanceof jwt.JsonWebTokenError) {
      const errorResponse = ResponseFactory.createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        'Invalid token',
        undefined,
        req.correlationId
      );
      return res.status(401).json(errorResponse);
    }

    logger.error('Authentication error', error as Error, {
      correlationId: req.correlationId
    });

    const errorResponse = ResponseFactory.createErrorResponse(
      ErrorCodes.INTERNAL_SERVER_ERROR,
      'Authentication failed',
      undefined,
      req.correlationId
    );
    return res.status(500).json(errorResponse);
  }
};

// Role-based access control middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      const errorResponse = ResponseFactory.createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        'Authentication required',
        undefined,
        req.correlationId
      );
      return res.status(401).json(errorResponse);
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Access denied - insufficient role', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
        correlationId: req.correlationId
      });

      const errorResponse = ResponseFactory.createErrorResponse(
        ErrorCodes.FORBIDDEN,
        'Insufficient permissions to access this resource',
        {
          requiredRoles: allowedRoles,
          currentRole: req.user.role
        },
        req.correlationId
      );
      return res.status(403).json(errorResponse);
    }

    next();
  };
};

// Permission-based access control middleware
export const requirePermission = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      const errorResponse = ResponseFactory.createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        'Authentication required',
        undefined,
        req.correlationId
      );
      return res.status(401).json(errorResponse);
    }

    const userPermissions = req.user.permissions || [];
    const hasRequiredPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasRequiredPermissions) {
      logger.warn('Access denied - insufficient permissions', {
        userId: req.user.id,
        userPermissions,
        requiredPermissions,
        path: req.path,
        method: req.method,
        correlationId: req.correlationId
      });

      const errorResponse = ResponseFactory.createErrorResponse(
        ErrorCodes.FORBIDDEN,
        'Insufficient permissions to access this resource',
        {
          requiredPermissions,
          currentPermissions: userPermissions
        },
        req.correlationId
      );
      return res.status(403).json(errorResponse);
    }

    next();
  };
};

// Optional authentication middleware (doesn't fail if no token provided)
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // No token provided, continue without authentication
      return next();
    }

    // Extract token from "Bearer <token>" format
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      // Invalid format, continue without authentication
      return next();
    }

    const token = tokenParts[1];

    // Verify JWT token
    const decoded = jwt.verify(token, config.auth.jwtSecret) as any;

    // Attach user information to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || []
    };

    next();
  } catch (error) {
    // Invalid token, continue without authentication
    next();
  }
};