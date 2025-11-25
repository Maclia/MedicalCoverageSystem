/**
 * Consolidated Server Imports Index
 * Centralizes all commonly used imports for server modules
 * Version: 1.0.0
 */

// Core Node.js imports
import express from 'express';
import { Request, Response, NextFunction } from 'express';

// Database and ORM imports
import { IStorage } from './storage';
import * as schema from '../shared/schema.js';
import { db } from './db';
import { eq, and, desc, asc, like, inArray, between, sql, count, sum, avg } from 'drizzle-orm';

// Validation and utility imports
import { z } from 'zod';

// Server utility imports - these need to be imported dynamically to avoid circular dependencies
export const importServerUtils = () => ({
  premiumCalculator: require('./utils/premiumCalculator'),
  enhancedPremiumCalculator: require('./utils/enhancedPremiumCalculator'),
  actuarialConfig: require('./utils/actuarialConfig'),
  actuarialRateEngine: require('./utils/actuarialRateEngine'),
  premiumOptimization: require('./utils/premiumOptimization'),
  dbOperations: require('./utils/dbOperations')
});

export const importServices = () => ({
  claimsProcessingWorkflow: require('./services/claimsProcessingWorkflow'),
  wellnessIntegrationService: require('./services/wellnessIntegrationService'),
  premiumCalculationService: require('./services/premiumCalculationService')
});

// Export core types and interfaces
export {
  Request,
  Response,
  NextFunction,
  IStorage,
  db,
  // Database operators
  eq,
  and,
  desc,
  asc,
  like,
  inArray,
  between,
  sql,
  count,
  sum,
  avg,
  // Validation
  z
};

// Export schema with more explicit naming
export {
  schema
};

// Export commonly used schema types
export type {
  Company,
  InsertCompany,
  Member,
  InsertMember,
  InsertPrincipalMember,
  InsertDependentMember,
  Period,
  InsertPeriod,
  Premium,
  InsertPremium,
  PremiumRate,
  InsertPremiumRate,
  Benefit,
  InsertBenefit,
  Claim,
  InsertClaim,
  Card,
  InsertCard
} from '../shared/schema.js';

// Express app factory
export const createExpressApp = () => {
  const app = express();

  // Standard middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  return app;
};

// Error handling utilities
export const createErrorHandler = () => {
  return (error: unknown, req: Request, res: Response, next: NextFunction) => {
    console.error('Server error:', error);

    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Unknown server error',
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Standard response utilities
export const createResponse = (res: Response) => ({
  success: (data: any, message?: string) => {
    res.json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    });
  },

  error: (message: string, statusCode: number = 500, details?: any) => {
    res.status(statusCode).json({
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString()
    });
  },

  validationError: (errors: string[]) => {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors,
      timestamp: new Date().toISOString()
    });
  }
});

// Request validation utility
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return createResponse(res).validationError(errors);
      }
      return createResponse(res).error('Invalid request format');
    }
  };
};

// Async error wrapper
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Common database operations
export const createDbOperations = (storage: IStorage) => ({
  // Generic find by ID
  findById: async (table: any, id: number) => {
    const result = await db.select().from(table).where(eq(table.id, id)).limit(1);
    return result[0] || null;
  },

  // Generic create
  create: async (table: any, data: any) => {
    const result = await db.insert(table).values(data).returning();
    return result[0];
  },

  // Generic update
  update: async (table: any, id: number, data: any) => {
    const result = await db.update(table).set(data).where(eq(table.id, id)).returning();
    return result[0];
  },

  // Generic delete
  delete: async (table: any, id: number) => {
    const result = await db.delete(table).where(eq(table.id, id)).returning();
    return result[0];
  }
});

// Constants for server configuration
export const SERVER_CONFIG = {
  PORT: 5000,
  HOST: '0.0.0.0',
  CORS_ORIGIN: process.env.NODE_ENV === 'production' ? false : true,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  API_VERSION: 'v1'
} as const;

export default createExpressApp;