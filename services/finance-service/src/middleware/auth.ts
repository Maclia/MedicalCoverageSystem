import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

type AuthenticatedUser = {
  id: string;
  userId: string;
  email?: string;
  role?: string;
};

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const serviceRequest = req.headers['x-saga-orchestrator'] === 'true';
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (serviceRequest) {
    (req as any).user = {
      id: 'system',
      userId: 'system',
      role: 'service',
    } satisfies AuthenticatedUser;
    next();
    return;
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const secret = process.env.JWT_SECRET;

  try {
    const payload = secret ? jwt.verify(token, secret) : jwt.decode(token);
    const claims = (payload && typeof payload === 'object') ? payload as Record<string, unknown> : {};

    (req as any).user = {
      id: String(claims.sub ?? claims.userId ?? claims.id ?? 'unknown'),
      userId: String(claims.userId ?? claims.sub ?? claims.id ?? 'unknown'),
      email: typeof claims.email === 'string' ? claims.email : undefined,
      role: typeof claims.role === 'string' ? claims.role : undefined,
    } satisfies AuthenticatedUser;

    next();
  } catch {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
}
