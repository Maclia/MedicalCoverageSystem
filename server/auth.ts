import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { users, userSessions, companies, medicalInstitutions, medicalPersonnel } from '../shared/schema.js';

// JWT token configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
const JWT_EXPIRES_IN = '15m';
const JWT_REFRESH_EXPIRES_IN = '7d';

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
export const authenticateUser = async (email: string, password: string, userType?: string): Promise<AuthTokens> => {
  // Build query
  let query = db.select().from(users).where(eq(users.email, email));

  if (userType) {
    // Add user type filter if specified
    query = query.where(eq(users.userType, userType as 'insurance' | 'institution' | 'provider'));
  }

  const userRecords = await query.limit(1);

  if (!userRecords.length) {
    throw new Error('Invalid credentials');
  }

  const user = userRecords[0];

  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  await db.update(users)
    .set({ lastLogin: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return generateTokens(user.id);
};

// Logout function
export const logoutUser = async (refreshToken: string): Promise<void> => {
  await db.delete(userSessions).where(eq(userSessions.token, refreshToken));
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