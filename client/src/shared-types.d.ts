// Shared types stub for client build
// This file provides type definitions for shared modules that are externalized during build

declare module '@shared/schema' {
  // Export key types that the client needs
  export interface User {
    id: number;
    email: string;
    role: string;
    // Add other user fields as needed
  }

  export interface Company {
    id: number;
    name: string;
    // Add other company fields as needed
  }

  export interface Member {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    // Add other member fields as needed
  }

  // Add other shared types as needed
  // This is a minimal stub to prevent build errors
  // In a real deployment, you'd generate this from the actual shared schema
}

declare module '../shared/schema' {
  // Re-export the same types for relative imports
  export * from '@shared/schema';
}