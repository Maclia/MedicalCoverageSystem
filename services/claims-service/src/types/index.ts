import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      validatedClaim?: any;
      claimId?: number;
      correlationId?: string;
    }
  }
}

export {};