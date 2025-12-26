declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        userType: 'insurance' | 'institution' | 'provider';
        entityId: number;
        email: string;
      };
      correlationId?: string;
      startTime?: number;
    }
  }
}

export {};