import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

// Extend Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        userId: number;
        userType: string;
        entityId: number;
        email: string;
        role: string;
        permissions: string[];
      };
      correlationId?: string;
      startTime?: number;
    }
  }
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
      res.status(401).json({ error: 'Access token is required' });
      return;
    }

    const payload = jwt.verify(token, config.jwt.secret) as any;

    req.user = {
      id: payload.userId,
      userId: payload.userId,
      userType: payload.userType,
      entityId: payload.entityId,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions || []
    };

    logger.debug('Token authentication successful', {
      userId: payload.userId,
      userType: payload.userType,
      role: payload.role,
      correlationId: req.correlationId
    });

    next();
  } catch (error) {
    logger.warn('Token authentication failed', {
      error: (error as Error).message,
      correlationId: req.correlationId
    });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Access denied - insufficient role', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        correlationId: req.correlationId
      });

      res.status(403).json({
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
      return;
    }

    logger.debug('Role authorization successful', {
      userId: req.user.userId,
      role: req.user.role,
      allowedRoles,
      correlationId: req.correlationId
    });

    next();
  };
};

export const requirePermission = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasRequiredPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasRequiredPermissions) {
      logger.warn('Access denied - insufficient permissions', {
        userId: req.user.userId,
        userPermissions,
        requiredPermissions,
        correlationId: req.correlationId
      });

      res.status(403).json({
        error: `Access denied. Required permissions: ${requiredPermissions.join(', ')}`
      });
      return;
    }

    logger.debug('Permission authorization successful', {
      userId: req.user.userId,
      permissions: userPermissions,
      requiredPermissions,
      correlationId: req.correlationId
    });

    next();
  };
};