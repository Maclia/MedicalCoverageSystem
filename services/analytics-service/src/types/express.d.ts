declare global {
  namespace Express {
    interface Response {
      success: (data: any, meta?: any) => this;
      error: (code: string, message: string, details?: any) => this;
    }
  }
}

export {};