import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { users, userSessions, companies, medicalInstitutions, medicalPersonnel } from '../shared/schema.js';
import { loggerInstance, securityLog, generateCorrelationId } from './utils/logger';
import { auditService } from './services/AuditService';

// JWT token configuration - CRITICAL: No defaults allowed for production security
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Validate JWT secrets on startup to prevent production with default values
function validateJWTSecrets(): void {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error(
      'JWT_SECRET environment variable is required and must be at least 32 characters long. ' +
      'Never use default or predictable secrets in production.'
    );
  }

  if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 32) {
    throw new Error(
      'JWT_REFRESH_SECRET environment variable is required and must be at least 32 characters long. ' +
      'Never use default or predictable secrets in production.'
    );
  }

  // Check for common insecure default values
  const insecureDefaults = [
    'your-super-secret-jwt-key-change-in-production',
    'your-super-secret-refresh-key-change-in-production',
    'secret',
    'your-secret-key',
    'jwt-secret',
    'change-me'
  ];

  if (insecureDefaults.includes(JWT_SECRET.toLowerCase())) {
    throw new Error(
      'JWT_SECRET is using a default insecure value. Please set a strong, unique secret in production.'
    );
  }

  if (insecureDefaults.includes(JWT_REFRESH_SECRET.toLowerCase())) {
    throw new Error(
      'JWT_REFRESH_SECRET is using a default insecure value. Please set a strong, unique secret in production.'
    );
  }
}

// Validate secrets immediately when module loads
validateJWTSecrets();

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
  entityData: any; // Company, Institution, or Personnel data
}

// Password hashing functions
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// JWT token functions
export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const generateRefreshToken = (payload: Omit<JWTPayload, 'email'>): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
};

export const generateTokens = async (userId: number): Promise<AuthTokens> => {
  // Get user data from database
  const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!userRecord.length) {
    throw new Error('User not found');
  }

  const user = userRecord[0];

  // Get entity-specific data
  let entityData = null;
  switch (user.userType) {
    case 'insurance':
      const companiesData = await db.select().from(companies).where(eq(companies.id, user.entityId)).limit(1);
      entityData = companiesData[0] || null;
      break;
    case 'institution':
      const institutionsData = await db.select().from(medicalInstitutions).where(eq(medicalInstitutions.id, user.entityId)).limit(1);
      entityData = institutionsData[0] || null;
      break;
    case 'provider':
      const personnelData = await db.select().from(medicalPersonnel).where(eq(medicalPersonnel.id, user.entityId)).limit(1);
      entityData = personnelData[0] || null;
      break;
  }

  const payload: JWTPayload = {
    userId: user.id,
    userType: user.userType,
    entityId: user.entityId,
    email: user.email
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({
    userId: user.id,
    userType: user.userType,
    entityId: user.entityId
  });

  // Store refresh token session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  await db.insert(userSessions).values({
    userId: user.id,
    token: refreshToken,
    expiresAt,
    ipAddress: null, // Will be set in the route handler
    userAgent: null // Will be set in the route handler
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
};

export const validateAccessToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};

export const validateRefreshToken = (token: string): Omit<JWTPayload, 'email'> | null => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as Omit<JWTPayload, 'email'>;
  } catch (error) {
    return null;
  }
};

// Main authentication function
export const authenticateUser = async (
  email: string,
  password: string,
  userType?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthTokens> => {
  const correlationId = generateCorrelationId();

  try {
    loggerInstance.info('Authentication attempt', {
      email: email.substring(0, 3) + '***', // Partial email for logging
      userType,
      timestamp: new Date().toISOString()
    }, correlationId);

    // Build query
    let query = db.select().from(users).where(eq(users.email, email));

    if (userType) {
      // Add user type filter if specified
      query = query.where(eq(users.userType, userType as 'insurance' | 'institution' | 'provider'));
    }

    const userRecords = await query.limit(1);

    if (!userRecords.length) {
      await auditService.logAuthEvent('LOGIN_FAILED', undefined, email, ipAddress, userAgent, 'User not found');

      securityLog('AUTHENTICATION_FAILED', 'MEDIUM', {
        reason: 'User not found',
        email: email.substring(0, 3) + '***',
        userType
      }, ipAddress, userAgent, correlationId);

      throw new Error('Invalid credentials');
    }

    const user = userRecords[0];

    if (!user.isActive) {
      await auditService.logAuthEvent('LOGIN_FAILED', user.id, email, ipAddress, userAgent, 'Account deactivated');

      securityLog('AUTHENTICATION_FAILED', 'MEDIUM', {
        reason: 'Account deactivated',
        userId: user.id,
        email: email.substring(0, 3) + '***'
      }, ipAddress, userAgent, correlationId);

      throw new Error('Account is deactivated');
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      await auditService.logAuthEvent('LOGIN_FAILED', user.id, email, ipAddress, userAgent, 'Invalid password');

      securityLog('AUTHENTICATION_FAILED', 'HIGH', {
        reason: 'Invalid password',
        userId: user.id,
        email: email.substring(0, 3) + '***'
      }, ipAddress, userAgent, correlationId);

      throw new Error('Invalid credentials');
    }

    // Update last login
    await db.update(users)
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    const tokens = await generateTokens(user.id);

    // Update session with IP and User Agent
    if (tokens.refreshToken) {
      await db.update(userSessions)
        .set({
          ipAddress,
          userAgent,
          updatedAt: new Date()
        })
        .where(eq(userSessions.token, tokens.refreshToken));
    }

    await auditService.logAuthEvent('LOGIN_SUCCESS', user.id, user.email, ipAddress, userAgent);

    loggerInstance.info('Authentication successful', {
      userId: user.id,
      userType: user.userType,
      timestamp: new Date().toISOString()
    }, correlationId);

    return tokens;
  } catch (error) {
    loggerInstance.error('Authentication error', error as Error, {
      email: email.substring(0, 3) + '***',
      userType
    }, correlationId);
    throw error;
  }
};

// Logout function
export const logoutUser = async (
  refreshToken: string,
  userId?: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  const correlationId = generateCorrelationId();

  try {
    loggerInstance.info('Logout attempt', {
      userId,
      timestamp: new Date().toISOString()
    }, correlationId);

    // Get session info before deletion for audit
    const sessionRecords = await db.select().from(userSessions)
      .where(eq(userSessions.token, refreshToken))
      .limit(1);

    if (sessionRecords.length > 0) {
      const session = sessionRecords[0];
      await auditService.logAuthEvent('LOGOUT', userId || session.userId, undefined, ipAddress, userAgent);
    }

    await db.delete(userSessions).where(eq(userSessions.token, refreshToken));

    loggerInstance.info('Logout successful', {
      userId: userId || (sessionRecords[0]?.userId),
      timestamp: new Date().toISOString()
    }, correlationId);
  } catch (error) {
    loggerInstance.error('Logout error', error as Error, {
      userId,
      timestamp: new Date().toISOString()
    }, correlationId);
    throw error;
  }
};

// Refresh token function
export const refreshUserToken = async (refreshToken: string): Promise<AuthTokens> => {
  // Validate refresh token
  const payload = validateRefreshToken(refreshToken);

  if (!payload) {
    throw new Error('Invalid refresh token');
  }

  // Check if refresh token exists in database
  const sessionRecords = await db.select().from(userSessions)
    .where(eq(userSessions.token, refreshToken))
    .limit(1);

  if (!sessionRecords.length) {
    throw new Error('Refresh token not found');
  }

  const session = sessionRecords[0];

  // Check if token is expired
  if (session.expiresAt < new Date()) {
    await db.delete(userSessions).where(eq(userSessions.token, refreshToken));
    throw new Error('Refresh token expired');
  }

  // Get user and generate new tokens
  const userRecords = await db.select().from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!userRecords.length) {
    throw new Error('User not found');
  }

  const user = userRecords[0];

  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  // Delete old refresh token
  await db.delete(userSessions).where(eq(userSessions.token, refreshToken));

  // Generate new tokens
  return generateTokens(user.id);
};

// Cleanup expired sessions
export const cleanupExpiredSessions = async (): Promise<void> => {
  await db.delete(userSessions).where(eq(userSessions.expiresAt, new Date()));
};