import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('claims-auth');

export type UserRole =
  | 'insurance'
  | 'institution'
  | 'provider'
  | 'sales_admin'
  | 'sales_manager'
  | 'team_lead'
  | 'sales_agent'
  | 'broker'
  | 'underwriter';

interface AuthTokenPayload extends JwtPayload {
  userId: number;
  userType: UserRole;
  entityId: number;
  email: string;
  role: string;
  permissions?: string[];
}

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
    }
  }
}

const getJwtSecret = (): string | undefined => process.env.JWT_SECRET;

const getBearerToken = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return undefined;
  }

  return authHeader.slice('Bearer '.length).trim();
};

const toPayload = (decoded: string | JwtPayload): AuthTokenPayload | null => {
  if (typeof decoded === 'string') {
    return null;
  }

  if (
    typeof decoded.userId !== 'number' ||
    typeof decoded.userType !== 'string' ||
    typeof decoded.entityId !== 'number' ||
    typeof decoded.email !== 'string' ||
    typeof decoded.role !== 'string'
  ) {
    return null;
  }

  return {
    ...decoded,
    userType: decoded.userType as UserRole,
    permissions: Array.isArray(decoded.permissions)
      ? decoded.permissions.filter((permission): permission is string => typeof permission === 'string')
      : []
  } as AuthTokenPayload;
};

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access token is required'
    });
    return;
  }

  const secret = getJwtSecret();
  if (!secret) {
    logger.error('JWT_SECRET is not configured');
    res.status(500).json({
      success: false,
      message: 'Authentication is not configured'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret);
    const payload = toPayload(decoded);

    if (!payload) {
      res.status(401).json({
        success: false,
        message: 'Invalid access token'
      });
      return;
    }

    req.user = {
      id: payload.userId,
      userId: payload.userId,
      userType: payload.userType,
      entityId: payload.entityId,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions ?? []
    };

    next();
  } catch (error) {
    logger.warn('Token authentication failed', { error: (error as Error).message });
    res.status(401).json({
      success: false,
      message: 'Invalid access token'
    });
  }
};

export const requireUserType = (allowedTypes: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!allowedTypes.includes(req.user.userType)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required user type: ${allowedTypes.join(', ')}`
      });
      return;
    }

    next();
  };
};

export const requireMedicalUser = requireUserType(['institution', 'provider']);

export const requirePermission = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasRequiredPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasRequiredPermissions) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required permissions: ${requiredPermissions.join(', ')}`
      });
      return;
    }

    next();
  };
};

export const requireModuleAccess = (moduleName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const modulePermission = `module:${moduleName}`;
    const userPermissions = req.user.permissions || [];

    if (!userPermissions.includes(modulePermission) && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: `Access denied. You do not have rights to access the ${moduleName} module`
      });
      return;
    }

    next();
  };
};
