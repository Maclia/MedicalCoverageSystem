import { Request, Response, NextFunction } from 'express';
import { validateAccessToken, JWTPayload } from '../auth';

// Extended Request interface to include user information
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

// Authentication middleware
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = validateAccessToken(token);

    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Attach user payload to request
    req.user = payload;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: ('insurance' | 'institution' | 'provider')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.userType)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

// Ownership verification middleware
export const requireOwnership = (ownershipCheck: (user: JWTPayload, resourceId: any) => boolean) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const resourceId = req.params.id || req.params.companyId || req.params.institutionId || req.body.companyId || req.body.institutionId;

    if (!ownershipCheck(req.user, resourceId)) {
      res.status(403).json({ error: 'Access denied - resource not owned by user' });
      return;
    }

    next();
  };
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = validateAccessToken(token);

      if (payload) {
        req.user = payload;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

// Error handling for auth middleware
export const handleAuthError = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({ error: 'Token expired' });
    return;
  }

  next(error);
};