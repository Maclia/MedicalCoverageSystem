import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger();

import { UserRole } from '../services/AuthService';

// Extend Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        userId: number;
        userType: UserRole;
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
      throw new AuthenticationError('Access token is required');
    }

    const payload = await authService.validateAccessToken(token);

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
      permissions: payload.permissions || [],
      correlationId: req.correlationId
    });

    next();
  } catch (error) {
    logger.warn('Token authentication failed', {
      error: (error as Error).message,
      correlationId: req.correlationId
    });
    next(error);
  }
};

export const requireUserType = (allowedTypes: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!allowedTypes.includes(req.user.userType)) {
      throw new AuthorizationError(
        `Access denied. Required user type: ${allowedTypes.join(', ')}`
      );
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
export const requireMemberUser = requireUserType(['member']);
export const requireCompanyUser = requireUserType(['insurance']);

// Role-based access control middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Access denied - insufficient role', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        correlationId: req.correlationId
      });

      throw new AuthorizationError(
        `Access denied. Required roles: ${allowedRoles.join(', ')}`
      );
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

// Permission-based access control middleware
export const requirePermission = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
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

      throw new AuthorizationError(
        `Access denied. Required permissions: ${requiredPermissions.join(', ')}`
      );
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

// Module access restriction middleware
export const requireModuleAccess = (moduleName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const modulePermission = `module:${moduleName}`;
    const userPermissions = req.user.permissions || [];

    if (!userPermissions.includes(modulePermission) && req.user.role !== 'admin') {
      logger.warn('Access denied - module access restricted', {
        userId: req.user.userId,
        module: moduleName,
        userPermissions,
        correlationId: req.correlationId
      });

      throw new AuthorizationError(
        `Access denied. You do not have rights to access the ${moduleName} module`
      );
    }

    logger.debug('Module access authorized', {
      userId: req.user.userId,
      module: moduleName,
      correlationId: req.correlationId
    });

    next();
  };
};

export const requireEntityAccess = (entityType: 'company' | 'institution' | 'personnel') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Get the entity ID from request parameters or query
    const entityId = req.params.id || req.params.entityId || req.query.entityId;

    if (!entityId) {
      throw new AuthorizationError('Entity ID is required');
    }

    const requestedEntityId = parseInt(entityId as string, 10);

    if (isNaN(requestedEntityId)) {
      throw new AuthorizationError('Invalid entity ID format');
    }

    // Check if user has access to the requested entity
    if (req.user.entityId !== requestedEntityId) {
      throw new AuthorizationError(
        'Access denied. You can only access your own entity resources'
      );
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
      const payload = await authService.validateAccessToken(token);
      req.user = {
        id: payload.userId,
        userId: payload.userId,
        userType: payload.userType,
        entityId: payload.entityId,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions || []
      };

      logger.debug('Optional authentication successful', {
        userId: payload.userId,
        userType: payload.userType,
        correlationId: req.correlationId
      });
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

// Middleware to add rate limiting headers
export const rateLimitHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', '100');
  res.setHeader('X-RateLimit-Remaining', '99');
  res.setHeader('X-RateLimit-Reset', new Date(Date.now() + 60000).toISOString());

  next();
};