import 'express';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      auth: {
        providerId: number;
        userId: number;
        permissions: string[];
      };
      memberVerification: {
        memberId: number;
        isValid: boolean;
        membershipStatus: string;
        coverageDetails: any;
      };
      params: Record<string, string>;
      query: Record<string, any>;
      body: any;
    }
  }
}