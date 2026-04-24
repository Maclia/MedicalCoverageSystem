declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        userId: number;
        userType: 'insurance' | 'institution' | 'provider';
        entityId: number;
        email: string;
        role: string;
        permissions: string[];
      };
      correlationId?: string;
      startTime?: number;
    }
  }
}

export {};