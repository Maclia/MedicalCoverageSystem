import { Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      startTime?: number;
    }

    interface Response {
      success(data: any, meta?: any): Response;
      paginated(data: any[], page: number, limit: number, total: number, meta?: any): Response;
      created(data: any, location?: string): Response;
      noContent(): Response;
      error(code: string, message: string, details?: any, statusCode?: number): Response;
    }
  }
}

export {};
