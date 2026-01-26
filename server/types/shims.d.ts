// Minimal declaration shims for dependencies not installed in this environment
declare module 'express' {
  import type * as http from 'http';
  export type Request = http.IncomingMessage & { body?: any; params?: any; query?: any };
  export type Response = http.ServerResponse & { json?: (body: any) => void; status?: (code: number) => Response };
  export type NextFunction = (err?: any) => void;
  export type Express = any;
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

// Provide setImmediate when Node types are not installed
declare var setImmediate: (callback: (...args: any[]) => void, ...args: any[]) => any;
