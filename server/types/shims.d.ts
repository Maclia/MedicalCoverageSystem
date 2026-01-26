// Minimal declaration shims for dependencies not installed in this environment
declare module 'http' {
  export function createServer(handler?: (req: any, res: any) => void): any;
  export type Server = any;
  export type IncomingMessage = any;
  export type ServerResponse = any;
}

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

declare module 'zod-validation-error' {
  export function fromZodError(error: any): any;
}

declare module 'date-fns' {
  export function addDays(date: Date, amount: number): Date;
  export function differenceInYears(dateLeft: Date | number, dateRight: Date | number): number;
  export function parseISO(argument: string): Date;
}

// Provide setImmediate and process when Node types are not installed
declare var setImmediate: (callback: (...args: any[]) => void, ...args: any[]) => any;

declare var process: {
  env: Record<string, string | undefined>;
  exit: (code: number) => never;
  on: (event: string, handler: (...args: any[]) => void) => void;
  uptime: () => number;
  memoryUsage: () => { rss: number; heapTotal: number; heapUsed: number; external: number; arrayBuffers: number };
};

declare class Buffer {
  static from(data: string | any[], encoding?: string): any;
  toString(encoding?: string): string;
}

declare function require(module: string): any;

declare module 'zod' {
  export class ZodError {
    errors: Array<{ path: string[]; message: string }>;
  }
  export interface ZodSchema {
    parse(data: any): any;
  }
  export const z: {
    ZodError: typeof ZodError;
    object: (shape: any) => any;
    string: () => any;
    number: () => any;
    boolean: () => any;
    date: () => any;
    enum: (values: any[]) => any;
    array: (schema: any) => any;
    optional: (schema: any) => any;
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
