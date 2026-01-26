import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";

// Extend Express Request type to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        userType: string;
        entityId: number;
        permissions: string[];
      };
    }
  }
}

/**
 * Middleware factory that checks if user has specified token permission
 */
export function requireTokenPermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        });
      }

      // Get user from database to check permissions
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.user.id),
      });

      if (!user) {
        return res.status(401).json({
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        });
      }

      // Check if user has the required permission
      const userPermissions = user.permissions || [];
      const hasPermission = userPermissions.includes(permission);

      if (!hasPermission) {
        return res.status(403).json({
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: `User does not have ${permission} permission`,
            details: {
              required: permission,
              userPermissions,
            },
          },
        });
      }

      // User has permission, continue to next middleware
      next();
    } catch (error: any) {
      console.error("Error checking token permission:", error);
      return res.status(500).json({
        error: {
          code: "PERMISSION_CHECK_ERROR",
          message: "Error checking permissions",
          details: error.message,
        },
      });
    }
  };
}

/**
 * Middleware to verify user belongs to the organization
 */
export async function verifyOrganizationAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const organizationId = parseInt(
      req.params.organizationId || req.body.organizationId
    );

    if (!organizationId) {
      return res.status(400).json({
        error: {
          code: "INVALID_ORGANIZATION",
          message: "Organization ID is required",
        },
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    // Verify user's entityId matches the requested organizationId
    // (assuming entityId references the organization for organization users)
    if (req.user.entityId !== organizationId) {
      return res.status(403).json({
        error: {
          code: "ORGANIZATION_ACCESS_DENIED",
          message: "User does not have access to this organization",
          details: {
            requestedOrganization: organizationId,
            userOrganization: req.user.entityId,
          },
        },
      });
    }

    next();
  } catch (error: any) {
    console.error("Error verifying organization access:", error);
    return res.status(500).json({
      error: {
        code: "ORGANIZATION_VERIFICATION_ERROR",
        message: "Error verifying organization access",
        details: error.message,
      },
    });
  }
}

/**
 * Combined middleware for token operations - checks both permission and organization access
 */
export function requireTokenPermissionForOrganization(permission: string) {
  return [requireTokenPermission(permission), verifyOrganizationAccess];
}
