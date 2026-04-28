/**
 * Standard Response Formatting Middleware
 * Ensures all API responses follow consistent structure
 * Matches implementation across all microservices
 */
import { Request, Response, NextFunction } from 'express';

// Extend Express Response type with standard sendSuccess method
declare global {
  namespace Express {
    interface Response {
      sendSuccess: (data: any, message?: string) => void;
      sendError: (message: string, statusCode?: number, errors?: any[]) => void;
    }
  }
}

/**
 * Standard success response format
 */
export const responseStandardization = (req: Request, res: Response, next: NextFunction) => {
  // Success response helper
  res.sendSuccess = (data: any, message: string = 'Success') => {
    res.json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  };

  // Error response helper
  res.sendError = (message: string, statusCode: number = 400, errors: any[] = []) => {
    res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  };

  next();
};

export default responseStandardization;