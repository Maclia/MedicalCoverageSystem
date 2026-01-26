// Minimal declaration shims for dependencies not installed in this environment
declare module 'http' {
  export function createServer(handler?: (req: any, res: any) => void): any;
  export type Server = any;
  export type IncomingMessage = any;
  export type ServerResponse = any;
}

declare module 'fs' {
  export const promises: {
    readFile(path: string, encoding: string): Promise<string>;
    writeFile(path: string, data: string): Promise<void>;
  };
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding: string): string;
  export function writeFileSync(path: string, data: string): void;
}

declare module 'path' {
  export function resolve(...paths: string[]): string;
  export function join(...paths: string[]): string;
  export function dirname(path: string): string;
  export function basename(path: string): string;
}

declare module 'express' {
  import type * as http from 'http';
  export type Request = http.IncomingMessage & { body?: any; params?: any; query?: any; originalUrl?: string; ip?: string; get?: (header: string) => string };
  export type Response = http.ServerResponse & { json?: (body: any) => void; status?: (code: number) => Response; set?: (headers: any) => Response; end?: (data: string) => void; sendFile?: (path: string) => void };
  export type NextFunction = (err?: any) => void;
  export type Express = any;
  namespace express {
    type Express = any;
    function static(path: string): any;
  }

  interface ExpressStatic {
    (): Express;
    json(options?: any): any;
    urlencoded(options?: any): any;
    static(path: string): any;
    text(options?: any): any;
    raw(options?: any): any;
  }

  const express: ExpressStatic;
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

declare module 'vite' {
  export function createServer(options?: any): Promise<any>;
  export function createLogger(level?: string): any;
}

declare module 'nanoid' {
  export function nanoid(size?: number): string;
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

interface ImportMeta {
  readonly url: string;
  readonly dirname?: string;
  readonly filename?: string;
  readonly env?: Record<string, string>;
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
  export function index(name: string, ...args: any[]): any;
}

declare module 'drizzle-orm/pg-core' {
  export function pgTable(name: string, columns: any): any;
  export function pgEnum(name: string, values: string[]): any;
  export function jsonb(name: string, config?: any): any;
  export function json(name: string, config?: any): any;
  export const text: any;
  export const serial: any;
  export const integer: any;
  export const boolean: any;
  export const date: any;
  export const timestamp: any;
  export const real: any;
  export const uuid: any;
  export const varchar: any;
  export const decimal: any;
}

declare module 'zod' {
  namespace z {
    function string(): any;
    function number(): any;
    function boolean(): any;
    function date(): any;
    function any(): any;
    function object<T extends Record<string, any>>(shape: T): any;
    function array<T>(schema: T): any;
    function optional<T>(schema: T): any;
    function enum<T extends readonly [string, ...string[]]>(values: T): any;
    function union<T extends readonly any[]>(options: T): any;
    function literal<T extends string | number | boolean>(value: T): any;
    function record<T>(valueSchema: T): any;
    function tuple<T extends readonly any[]>(schemas: T): any;
    function map<K, V>(keySchema: any, valueSchema: any): any;
    function set<T>(valueSchema: T): any;
    function infer<T>(schema: T): any;
  }
  const z: typeof z;
  export { z };
}

declare module 'drizzle-zod' {
  export function createInsertSchema(table: any): any;
}
