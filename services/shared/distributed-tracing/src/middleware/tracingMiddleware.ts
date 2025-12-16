import { Request, Response, NextFunction } from 'express';
import { trace, SpanKind, SpanStatusCode, propagation, Context } from '@opentelemetry/api';
import { createLogger } from '../config/logger';

const logger = createLogger();

interface TracingMiddlewareOptions {
  serviceName?: string;
  ignorePaths?: string[];
  ignoreMethods?: string[];
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  includeUserAgent?: boolean;
  customSpanAttributes?: (req: Request, res: Response) => Record<string, string | number | boolean>;
}

interface RequestWithSpan extends Request {
  span?: any;
  tracingContext?: {
    traceId: string;
    spanId: string;
  };
}

export const tracingMiddleware = (options: TracingMiddlewareOptions = {}) => {
  return (req: RequestWithSpan, res: Response, next: NextFunction) => {
    // Check if request should be ignored
    if (shouldIgnoreRequest(req, options)) {
      return next();
    }

    // Extract context from incoming headers
    const context = propagation.extract(Context.current(), {
      traceparent: req.headers['traceparent'] as string,
      tracestate: req.headers['tracestate'] as string,
      baggage: req.headers['baggage'] as string
    });

    // Create span
    const tracer = trace.getTracer(options.serviceName || 'express-server');
    const span = tracer.startSpan(
      `${req.method} ${req.path}`,
      {
        kind: SpanKind.SERVER,
        parentSpan: trace.getSpan(context)
      }
    );

    // Set span attributes
    span.setAttributes({
      'http.method': req.method,
      'http.target': req.path,
      'http.url': req.url,
      'http.scheme': req.protocol,
      'http.host': req.get('host'),
      'http.user_agent': options.includeUserAgent !== false ? req.get('User-Agent') : undefined,
      'net.peer.ip': req.ip,
      'net.peer.port': req.socket?.remotePort,
      'http.route': req.route?.path,
      'express.request.id': req.get('X-Request-ID') || generateRequestId()
    });

    // Add custom attributes if provided
    if (options.customSpanAttributes) {
      const customAttributes = options.customSpanAttributes(req, res);
      span.setAttributes(customAttributes);
    }

    // Add user information if available
    if (req.user) {
      span.setAttributes({
        'user.id': req.user.id,
        'user.email': req.user.email,
        'user.role': req.user.role
      });
    }

    // Add correlation ID if available
    if (req.correlationId) {
      span.setAttributes('correlation.id', req.correlationId);
    }

    // Store span in request
    req.span = span;
    req.tracingContext = {
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId
    };

    // Set context for this request
    const ctx = trace.setSpan(context, span);
    context.with(ctx, () => {
      // Override res.end to capture response
      const originalEnd = res.end;
      const originalWrite = res.write;
      const originalJson = res.json;

      let responseBody: any;
      let responseSize = 0;

      // Capture response body for JSON responses
      if (options.includeResponseBody) {
        res.json = function(data: any) {
          responseBody = data;
          return originalJson.call(this, data);
        };
      }

      // Capture response size
      res.write = function(chunk: any) {
        responseSize += Buffer.byteLength(chunk);
        return originalWrite.call(this, chunk);
      };

      res.end = function(chunk?: any) {
        if (chunk) {
          responseSize += Buffer.byteLength(chunk);
        }

        // Set final span attributes
        span.setAttributes({
          'http.status_code': res.statusCode,
          'http.response_content_length': responseSize
        });

        // Set span status based on status code
        if (res.statusCode >= 500) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${res.statusCode}`
          });
        } else if (res.statusCode >= 400) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${res.statusCode}`
          });
        } else {
          span.setStatus({
            code: SpanStatusCode.OK
          });
        }

        // Log request with tracing information
        logger.info('HTTP Request', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseTime: Date.now() - (req.startTime || Date.now()),
          traceId: span.spanContext().traceId,
          spanId: span.spanContext().spanId,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          correlationId: req.correlationId
        });

        // Add response body to span if configured
        if (options.includeResponseBody && responseBody && res.statusCode < 400) {
          span.addEvent('response.body', {
            'response.body': JSON.stringify(responseBody).substring(0, 1000)
          });
        }

        // End the span
        span.end();

        // Call original end
        return originalEnd.call(this, chunk);
      };

      // Override res.json to capture request body if configured
      if (options.includeRequestBody) {
        const originalJson = res.json;
        res.json = function(data: any) {
          span.addEvent('request.body', {
            'request.body': JSON.stringify(data).substring(0, 1000)
          });
          return originalJson.call(this, data);
        };
      }

      // Add request start time
      req.startTime = Date.now();

      // Continue with the request
      next();
    });
  };
};

// Helper function to check if request should be ignored
function shouldIgnoreRequest(req: Request, options: TracingMiddlewareOptions): boolean {
  // Check method ignore list
  if (options.ignoreMethods?.includes(req.method)) {
    return true;
  }

  // Check path ignore list
  if (options.ignorePaths?.some(path => req.path.startsWith(path))) {
    return true;
  }

  // Ignore health checks by default
  if (req.path === '/health' || req.path === '/ready' || req.path === '/live') {
    return true;
  }

  // Ignore metrics and monitoring endpoints
  if (req.path.startsWith('/metrics') || req.path.startsWith('/prometheus')) {
    return true;
  }

  return false;
}

// Helper function to generate request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Error handling middleware to record errors in spans
export const errorTracingMiddleware = (error: Error, req: RequestWithSpan, res: Response, next: NextFunction) => {
  if (req.span) {
    req.span.recordException(error);
    req.span.setAttributes({
      'error.message': error.message,
      'error.stack': error.stack,
      'error.name': error.name,
      'http.status_code': res.statusCode || 500
    });

    req.span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });

    // Add error event
    req.span.addEvent('error', {
      'error.type': error.name,
      'error.message': error.message
    });
  }

  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    traceId: req.tracingContext?.traceId,
    spanId: req.tracingContext?.spanId,
    correlationId: req.correlationId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  next(error);
};

// Helper middleware to add custom span attributes
export const addSpanAttributes = (attributes: Record<string, string | number | boolean>) => {
  return (req: RequestWithSpan, res: Response, next: NextFunction) => {
    if (req.span) {
      req.span.setAttributes(attributes);
    }
    next();
  };
};

// Helper middleware to add span events
export const addSpanEvent = (name: string, attributes?: Record<string, string | number | boolean>) => {
  return (req: RequestWithSpan, res: Response, next: NextFunction) => {
    if (req.span) {
      req.span.addEvent(name, attributes);
    }
    next();
  };
};

// Async operation tracing helper
export const traceAsyncOperation = (
  name: string,
  operation: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: RequestWithSpan, res: Response, next: NextFunction) => {
    if (!req.span) {
      return operation(req, res, next).catch(next);
    }

    const tracer = trace.getTracer('async-operation');
    const span = tracer.startSpan(name, {
      kind: SpanKind.INTERNAL,
      parentSpan: req.span
    });

    tracer.startActiveSpan(name, { parentSpan: req.span }, async (activeSpan) => {
      try {
        await operation(req, res, next);
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message
        });
        throw error;
      } finally {
        span.end();
      }
    });
  };
};

// Database operation tracing helper
export const traceDatabaseOperation = (
  operation: string,
  query?: string,
  execute: () => Promise<any>
) => {
  return async (req: RequestWithSpan, res: Response, next: NextFunction) => {
    if (!req.span) {
      return execute().then(result => next(result)).catch(next);
    }

    const tracer = trace.getTracer('database-operation');
    const span = tracer.startSpan(`db.${operation}`, {
      kind: SpanKind.CLIENT,
      parentSpan: req.span
    });

    span.setAttributes({
      'db.system': 'postgresql',
      'db.operation': operation
    });

    if (query) {
      span.setAttributes({
        'db.statement': query.substring(0, 1000) // Limit to first 1000 chars
      });
    }

    try {
      const result = await execute();
      span.setStatus({ code: SpanStatusCode.OK });
      next(result);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message
      });
      next(error);
    } finally {
      span.end();
    }
  };
};

export default tracingMiddleware;