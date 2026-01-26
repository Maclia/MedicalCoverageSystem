// Minimal declaration shims for dependencies not installed in this environment
declare module 'express' {
  import type * as http from 'http';
  export type Request = http.IncomingMessage & { body?: any; params?: any; query?: any };
  export type Response = http.ServerResponse & { json?: (body: any) => void; status?: (code: number) => Response };
  export type NextFunction = (err?: any) => void;
  export type Express = any;
  namespace express {
    type Express = any;
  }
  const express: any;
  export default express;
}

declare module 'swagger-jsdoc' {
  const swaggerJSDoc: any;
  export default swaggerJSDoc;
}

declare module 'swagger-ui-express' {
  const swaggerUi: any;
  export default swaggerUi;
}

// Provide setImmediate and process when Node types are not installed
declare var setImmediate: (callback: (...args: any[]) => void, ...args: any[]) => any;

declare var process: {
  env: Record<string, string | undefined>;
  exit: (code: number) => never;
  on: (event: string, handler: (...args: any[]) => void) => void;
};

declare class Buffer {
  static from(data: string | any[], encoding?: string): any;
  toString(encoding?: string): string;
}

declare function require(module: string): any;

declare module 'zod' {
  export namespace z {
    interface ZodError {
      errors: Array<{ path: string[]; message: string }>;
    }
    interface ZodSchema {
      parse(data: any): any;
    }
    class ZodError {
      errors: Array<{ path: string[]; message: string }>;
    }
  }
  export const z: {
    ZodError: typeof z.ZodError;
    ZodSchema: typeof z.ZodSchema;
  } & any;
}

declare namespace NodeJS {
  type Timeout = any;
}

declare module '@neondatabase/serverless' {
  export function neon(connectionString: string): any;
}

declare module 'drizzle-orm/neon-http' {
  export function drizzle(client: any): any;
}

declare module 'drizzle-orm' {
  export function eq(...args: any[]): any;
  export function and(...args: any[]): any;
  export function asc(column: any): any;
  export function desc(column: any): any;
  export function isNull(column: any): any;
  export function isNotNull(column: any): any;
  export function or(...args: any[]): any;
  export function sql(strings: any, ...values: any[]): any;
  export function like(column: any, pattern: any): any;
  export function inArray(column: any, values: any[]): any;
  export function between(column: any, min: any, max: any): any;
  export function count(column?: any): any;
  export function sum(column: any): any;
  export function avg(column: any): any;
}
