import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService';
import { createLogger } from '../utils/logger';
import {
  asyncHandler,
  ValidationError,
  AuthenticationError
} from '../utils/errors';

const logger = createLogger();

export class AuthController {
  static register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, userType, entityId } = req.body;

    const user = await authService.register({
      email,
      password,
      userType,
      entityId
    });

    logger.info('User registration completed', {
      userId: user.id,
      userType: user.userType,
      correlationId: req.correlationId
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          userType: user.userType,
          entityId: user.entityId,
          isActive: user.isActive,
          entityData: user.entityData
        }
      }
    });
  });

  static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, userType } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    const tokens = await authService.authenticate(
      email,
      password,
      userType,
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: tokens.user
      }
    });
  });

  static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    const tokens = await authService.refreshToken(refreshToken);

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: tokens.user
      }
    });
  });

  static logout = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    await authService.logout(
      refreshToken,
      req.user?.userId,
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });

  static changePassword = asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    if (!currentPassword || !newPassword) {
      throw new ValidationError('Current password and new password are required');
    }

    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters long');
    }

    await authService.changePassword(
      req.user!.userId,
      currentPassword,
      newPassword,
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  });

  static getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const profile = await authService.getUserProfile(userId);

    if (!profile) {
      throw new AuthenticationError('User not found');
    }

    res.json({
      success: true,
      data: {
        user: {
          id: profile.id,
          email: profile.email,
          userType: profile.userType,
          entityId: profile.entityId,
          isActive: profile.isActive,
          lastLogin: profile.lastLogin,
          entityData: profile.entityData
        }
      }
    });
  });

  static updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { email } = req.body;

    // TODO: Implement profile update logic
    // This would involve updating the user's email and other profile information

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        // Return updated profile
      }
    });
  });
}