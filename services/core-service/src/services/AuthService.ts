import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../config/database';
import { users, userSessions, companies, medicalInstitutions, medicalPersonnel } from '../../../shared/schema';
import { config } from '../config';
import { createLogger, generateCorrelationId } from '../utils/logger';
import { auditService } from '../services/AuditService';
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  ErrorFactory
} from '../utils/errors';

const logger = createLogger();

export interface JWTPayload {
  userId: number;
  userType: 'insurance' | 'institution' | 'provider';
  entityId: number;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface UserProfile {
  id: number;
  email: string;
  userType: 'insurance' | 'institution' | 'provider';
  entityId: number;
  isActive: boolean;
  lastLogin?: Date;
  entityData: any;
}

export class AuthService {
  private static instance: AuthService;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private validateJWTSecrets(): void {
    if (!config.jwt.secret || config.jwt.secret.length < 32) {
      throw new Error(
        'JWT_SECRET environment variable is required and must be at least 32 characters long'
      );
    }

    if (!config.jwt.refreshSecret || config.jwt.refreshSecret.length < 32) {
      throw new Error(
        'JWT_REFRESH_SECRET environment variable is required and must be at least 32 characters long'
      );
    }
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, config.security.bcryptRounds);
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, config.jwt.secret!, { expiresIn: config.jwt.expiresIn });
  }

  private generateRefreshToken(payload: Omit<JWTPayload, 'email'>): string {
    return jwt.sign(payload, config.jwt.refreshSecret!, { expiresIn: config.jwt.refreshExpiresIn });
  }

  private async getEntityData(userType: string, entityId: number): Promise<any> {
    switch (userType) {
      case 'insurance':
        const companiesData = await db
          .select()
          .from(companies)
          .where(eq(companies.id, entityId))
          .limit(1);
        return companiesData[0] || null;

      case 'institution':
        const institutionsData = await db
          .select()
          .from(medicalInstitutions)
          .where(eq(medicalInstitutions.id, entityId))
          .limit(1);
        return institutionsData[0] || null;

      case 'provider':
        const personnelData = await db
          .select()
          .from(medicalPersonnel)
          .where(eq(medicalPersonnel.id, entityId))
          .limit(1);
        return personnelData[0] || null;

      default:
        return null;
    }
  }

  async register(userData: {
    email: string;
    password: string;
    userType: 'insurance' | 'institution' | 'provider';
    entityId: number;
  }): Promise<UserProfile> {
    const correlationId = generateCorrelationId();

    try {
      logger.info('User registration attempt', {
        email: userData.email.substring(0, 3) + '***',
        userType: userData.userType,
        correlationId
      });

      // Validate input
      if (!userData.email || !userData.password || !userData.userType || !userData.entityId) {
        throw new ValidationError('All required fields must be provided');
      }

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingUser.length > 0) {
        throw ErrorFactory.userNotFound(userData.email);
      }

      // Validate entity exists
      const entityData = await this.getEntityData(userData.userType, userData.entityId);
      if (!entityData) {
        throw new ValidationError(`Invalid ${userData.userType} entity ID`);
      }

      // Hash password
      const passwordHash = await this.hashPassword(userData.password);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email: userData.email,
          passwordHash,
          userType: userData.userType,
          entityId: userData.entityId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      await auditService.logAuthEvent(
        'USER_REGISTERED',
        newUser.id,
        newUser.email
      );

      logger.info('User registration successful', {
        userId: newUser.id,
        userType: newUser.userType,
        correlationId
      });

      return {
        id: newUser.id,
        email: newUser.email,
        userType: newUser.userType,
        entityId: newUser.entityId,
        isActive: newUser.isActive,
        lastLogin: newUser.lastLogin,
        entityData
      };

    } catch (error) {
      logger.error('User registration failed', error as Error, {
        email: userData.email.substring(0, 3) + '***',
        correlationId
      });
      throw error;
    }
  }

  async authenticate(
    email: string,
    password: string,
    userType?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthTokens> {
    const correlationId = generateCorrelationId();

    try {
      this.validateJWTSecrets();

      logger.info('Authentication attempt', {
        email: email.substring(0, 3) + '***',
        userType,
        correlationId
      });

      // Build query
      let query = db.select().from(users).where(eq(users.email, email));

      if (userType) {
        query = query.where(eq(users.userType, userType as 'insurance' | 'institution' | 'provider'));
      }

      const userRecords = await query.limit(1);

      if (!userRecords.length) {
        await auditService.logAuthEvent('LOGIN_FAILED', undefined, email, ipAddress, userAgent, 'User not found');
        throw ErrorFactory.invalidCredentials();
      }

      const user = userRecords[0];

      if (!user.isActive) {
        await auditService.logAuthEvent('LOGIN_FAILED', user.id, email, ipAddress, userAgent, 'Account deactivated');
        throw ErrorFactory.accountInactive();
      }

      const isValidPassword = await this.verifyPassword(password, user.passwordHash);

      if (!isValidPassword) {
        await auditService.logAuthEvent('LOGIN_FAILED', user.id, email, ipAddress, userAgent, 'Invalid password');
        throw ErrorFactory.invalidCredentials();
      }

      // Update last login
      await db
        .update(users)
        .set({ lastLogin: new Date(), updatedAt: new Date() })
        .where(eq(users.id, user.id));

      // Get entity data
      const entityData = await this.getEntityData(user.userType, user.entityId);

      const payload: JWTPayload = {
        userId: user.id,
        userType: user.userType,
        entityId: user.entityId,
        email: user.email
      };

      const accessToken = this.generateAccessToken(payload);
      const refreshToken = this.generateRefreshToken({
        userId: user.id,
        userType: user.userType,
        entityId: user.entityId
      });

      // Store refresh token session
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.insert(userSessions).values({
        userId: user.id,
        token: refreshToken,
        expiresAt,
        ipAddress,
        userAgent
      });

      await auditService.logAuthEvent('LOGIN_SUCCESS', user.id, user.email, ipAddress, userAgent);

      logger.info('Authentication successful', {
        userId: user.id,
        userType: user.userType,
        correlationId
      });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          userType: user.userType,
          entityId: user.entityId,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          entityData
        }
      };

    } catch (error) {
      logger.error('Authentication failed', error as Error, {
        email: email.substring(0, 3) + '***',
        correlationId
      });
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const correlationId = generateCorrelationId();

    try {
      this.validateJWTSecrets();

      logger.info('Token refresh attempt', { correlationId });

      const payload = jwt.verify(refreshToken, config.jwt.refreshSecret!) as Omit<JWTPayload, 'email'>;

      // Check if refresh token exists in database
      const sessionRecords = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.token, refreshToken))
        .limit(1);

      if (!sessionRecords.length) {
        throw new AuthenticationError('Invalid refresh token');
      }

      const session = sessionRecords[0];

      // Check if token is expired
      if (session.expiresAt < new Date()) {
        await db.delete(userSessions).where(eq(userSessions.token, refreshToken));
        throw new AuthenticationError('Refresh token expired');
      }

      // Get user
      const userRecords = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!userRecords.length) {
        throw new AuthenticationError('User not found');
      }

      const user = userRecords[0];

      if (!user.isActive) {
        throw new AuthenticationError('Account is deactivated');
      }

      // Get entity data
      const entityData = await this.getEntityData(user.userType, user.entityId);

      // Generate new tokens
      const newPayload: JWTPayload = {
        userId: user.id,
        userType: user.userType,
        entityId: user.entityId,
        email: user.email
      };

      const newAccessToken = this.generateAccessToken(newPayload);
      const newRefreshToken = this.generateRefreshToken({
        userId: user.id,
        userType: user.userType,
        entityId: user.entityId
      });

      // Delete old refresh token
      await db.delete(userSessions).where(eq(userSessions.token, refreshToken));

      // Store new refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.insert(userSessions).values({
        userId: user.id,
        token: newRefreshToken,
        expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent
      });

      logger.info('Token refresh successful', {
        userId: user.id,
        correlationId
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          userType: user.userType,
          entityId: user.entityId,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          entityData
        }
      };

    } catch (error) {
      logger.error('Token refresh failed', error as Error, { correlationId });
      throw error;
    }
  }

  async logout(refreshToken: string, userId?: number, ipAddress?: string, userAgent?: string): Promise<void> {
    const correlationId = generateCorrelationId();

    try {
      logger.info('Logout attempt', { userId, correlationId });

      // Get session info before deletion for audit
      const sessionRecords = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.token, refreshToken))
        .limit(1);

      if (sessionRecords.length > 0) {
        const session = sessionRecords[0];
        await auditService.logAuthEvent('LOGOUT', userId || session.userId, undefined, ipAddress, userAgent);
      }

      await db.delete(userSessions).where(eq(userSessions.token, refreshToken));

      logger.info('Logout successful', {
        userId: userId || (sessionRecords[0]?.userId),
        correlationId
      });

    } catch (error) {
      logger.error('Logout failed', error as Error, { userId, correlationId });
      throw error;
    }
  }

  async validateAccessToken(token: string): Promise<JWTPayload> {
    try {
      this.validateJWTSecrets();
      return jwt.verify(token, config.jwt.secret!) as JWTPayload;
    } catch (error) {
      throw new AuthenticationError('Invalid access token');
    }
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const correlationId = generateCorrelationId();

    try {
      logger.info('Password change attempt', { userId, correlationId });

      // Get user
      const userRecords = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!userRecords.length) {
        throw ErrorFactory.userNotFound();
      }

      const user = userRecords[0];

      // Verify current password
      const isValidPassword = await this.verifyPassword(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        await auditService.logAuthEvent('PASSWORD_CHANGE_FAILED', userId, user.email, ipAddress, userAgent, 'Invalid current password');
        throw new AuthenticationError('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password
      await db
        .update(users)
        .set({
          passwordHash: newPasswordHash,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Invalidate all existing sessions (force re-login)
      await db.delete(userSessions).where(eq(userSessions.userId, userId));

      await auditService.logAuthEvent('PASSWORD_CHANGED', userId, user.email, ipAddress, userAgent);

      logger.info('Password change successful', { userId, correlationId });

    } catch (error) {
      logger.error('Password change failed', error as Error, { userId, correlationId });
      throw error;
    }
  }

  async getUserProfile(userId: number): Promise<UserProfile | null> {
    try {
      const userRecords = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!userRecords.length) {
        return null;
      }

      const user = userRecords[0];
      const entityData = await this.getEntityData(user.userType, user.entityId);

      return {
        id: user.id,
        email: user.email,
        userType: user.userType,
        entityId: user.entityId,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        entityData
      };

    } catch (error) {
      logger.error('Failed to get user profile', error as Error, { userId });
      throw error;
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    try {
      await db
        .delete(userSessions)
        .where(eq(userSessions.expiresAt, new Date()));

      logger.info('Expired sessions cleanup completed');

    } catch (error) {
      logger.error('Failed to cleanup expired sessions', error as Error);
    }
  }
}

export const authService = AuthService.getInstance();