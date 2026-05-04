import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import http from 'http';
import https from 'https';
import { serviceRegistry } from '../services/ServiceRegistry.js';
import { createLogger } from '../utils/logger.js';

// Keep-alive agent configuration for persistent connections
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000,
  keepAliveMsecs: 30000
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000,
  keepAliveMsecs: 30000,
  rejectUnauthorized: process.env.NODE_ENV === 'production'
});

const logger = createLogger();

// Proxy middleware factory for each service
export const createServiceProxy = (serviceName: string, pathRewrite?: Record<string, string>) => {
  const targetUrl = serviceRegistry.getServiceUrl(serviceName);
  if (!targetUrl) {
    throw new Error(`Service ${serviceName} not found`);
  }
  
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: pathRewrite || {},

    // Custom error handler
    onError: (err, req, res) => {
      // Handle EOF / connection reset errors gracefully - these are normal when connections are closed
      const isTransientError = 
        err.message.includes('EOF') || 
        err.message.includes('EO') ||
        err.message.includes('rpc error') ||
        err.message.includes('code = Unavailable') ||
        err.message.includes('error reading from server') ||
        err.message.includes('ECONNRESET') || 
        err.message.includes('EPIPE') ||
        err.message.includes('socket hang up') ||
        err.message.includes('read ECONNRESET');

      if (isTransientError) {
        logger.debug('Transient connection error (normal connection close)', {
          serviceName,
          path: req.url,
          method: req.method,
          error: err.message,
          correlationId: req.correlationId
        });
        
        // If headers haven't been sent yet, return proper 503 with retry hint
        if (!res.headersSent) {
          res.setHeader('Retry-After', '1');
          res.status(503).json({
            success: false,
            error: {
              code: 'TRANSIENT_ERROR',
              message: 'Connection reset - please retry',
              retryable: true
            },
            correlationId: req.correlationId
          });
        }
        return;
      }

      logger.error('Proxy error', err, {
        serviceName,
        path: req.url,
        method: req.method,
        correlationId: req.correlationId
      });

      // Check if service is down
      const serviceHealth = serviceRegistry.getServiceHealth(serviceName);

      if (serviceHealth && (!serviceHealth.healthy || serviceHealth.circuitBreakerOpen)) {
        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: `${serviceName} service is temporarily unavailable`,
              service: serviceName
            },
            correlationId: req.correlationId
          });
        }
        return;
      }

      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          error: {
            code: 'BAD_GATEWAY',
            message: 'Service temporarily unavailable'
          },
          correlationId: req.correlationId
        });
      }
    },

    // Custom request handler
    onProxyReq: (proxyReq, req, res) => {
      // Add correlation ID header
      if (req.correlationId) {
        proxyReq.setHeader('X-Correlation-ID', req.correlationId);
      }

      // Add original auth header for downstream services
      const originalAuthHeader = (req as any).originalAuthHeader;
      if (originalAuthHeader) {
        proxyReq.setHeader('Authorization', originalAuthHeader);
      }

      // Add gateway identification
      proxyReq.setHeader('X-Gateway-Version', '1.0.0');
      proxyReq.setHeader('X-Forwarded-For', req.ip || '');
      proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
      proxyReq.setHeader('X-Forwarded-Host', req.get('host') || '');

      logger.debug('Proxying request', {
        serviceName,
        method: req.method,
        originalUrl: req.url,
        targetUrl: proxyReq.path,
        correlationId: req.correlationId
      });
    },

    // Custom response handler
    onProxyRes: (proxyRes, req, res) => {
      // Add gateway response headers
      res.setHeader('X-Gateway-Service', serviceName);
      res.setHeader('X-Gateway-Response-Time', Date.now() - (req.startTime || Date.now()));

      logger.debug('Proxy response received', {
        serviceName,
        method: req.method,
        url: req.url,
        statusCode: proxyRes.statusCode,
        responseTime: Date.now() - (req.startTime || Date.now()),
        correlationId: req.correlationId
      });
    },

    // Use keep-alive agents for connection pooling
    agent: targetUrl.startsWith('https') ? httpsAgent : httpAgent,
    
    // Disable automatic connection close header
    followRedirects: false,
    preserveHeaderKeyCase: true,
    
    // Timeout configuration
    proxyTimeout: 30000, // 30 seconds
    timeout: 35000, // 35 seconds
    
    // Additional connection stability settings
    secure: process.env.NODE_ENV === 'production',
    xfwd: true,
  });
};

// Service-specific proxy configurations
export const serviceProxies = {
  core: {
    middleware: createServiceProxy('core', {
      '^/api/auth': '/auth',
      '^/api/core': ''
    }),
    paths: ['/api/auth', '/api/core']
  },

  insurance: {
    middleware: createServiceProxy('insurance', {
      '^/api/insurance': '',
      '^/api/schemes': '/schemes',
      '^/api/benefits': '/benefits',
      '^/api/coverage': '/coverage'
    }),
    paths: ['/api/insurance', '/api/schemes', '/api/benefits', '/api/coverage']
  },

  hospital: {
    middleware: createServiceProxy('hospital', {
      '^/api/hospital': '',
      '^/api/patients': '/patients',
      '^/api/appointments': '/appointments',
      '^/api/medical-records': '/medical-records',
      '^/api/personnel': '/personnel'
    }),
    paths: ['/api/hospital', '/api/patients', '/api/appointments', '/api/medical-records', '/api/personnel']
  },

  billing: {
    middleware: createServiceProxy('billing', {
      '^/api/billing': '',
      '^/api/invoices': '/invoices',
      '^/api/accounts-receivable': '/accounts-receivable',
      '^/api/tariffs': '/tariffs'
    }),
    paths: ['/api/billing', '/api/invoices', '/api/accounts-receivable', '/api/tariffs']
  },

  claims: {
    middleware: createServiceProxy('claims', {
      '^/api/claims': '',
      '^/api/disputes': '/disputes',
      '^/api/reconciliation': '/reconciliation'
    }),
    paths: ['/api/claims', '/api/disputes', '/api/reconciliation']
  },

  membership: {
    middleware: createServiceProxy('membership', {
      '^/api/membership': '',
      '^/api/enrollments': '/enrollments',
      '^/api/renewals': '/renewals'
    }),
    paths: ['/api/membership', '/api/enrollments', '/api/renewals', '/api/admin/dashboard', '/api/admin/documents']
  },

  payment: {
    middleware: createServiceProxy('payment', {
      '^/api/payment': '',
      '^/api/payments': '/payments',
      '^/api/commissions': '/commissions',
      '^/api/refunds': '/refunds'
    }),
    paths: ['/api/payment', '/api/payments', '/api/commissions', '/api/refunds']
  },

  fraud: {
    middleware: createServiceProxy('fraud', {
      '^/api/fraud': ''
    }),
    paths: ['/api/fraud']
  }
};

// Dynamic proxy middleware that checks service health before proxying
export const dynamicProxyMiddleware = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if service is healthy
    if (!serviceRegistry.isServiceHealthy(serviceName)) {
      logger.warn('Service unavailable for request', {
        serviceName,
        path: req.path,
        method: req.method,
        correlationId: req.correlationId
      });

      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: `${serviceName} service is temporarily unavailable`,
          service: serviceName
        },
        correlationId: req.correlationId
      });
    }

    // Get the proxy middleware for this service
    const proxyConfig = serviceProxies[serviceName as keyof typeof serviceProxies];
    if (!proxyConfig) {
      return next(new Error(`No proxy configuration found for service: ${serviceName}`));
    }

    // Apply the proxy middleware
    proxyConfig.middleware(req, res, next);
  };
};

// Load balancer for multiple service instances
export const createLoadBalancedProxy = (serviceName: string, instances: string[]) => {
  let currentIndex = 0;

  const roundRobin = () => {
    const instance = instances[currentIndex];
    currentIndex = (currentIndex + 1) % instances.length;
    return instance;
  };

  return createProxyMiddleware({
    target: instances[0], // Default target
    changeOrigin: true,
    router: (req) => roundRobin(),

    onError: (err, req, res) => {
      logger.error('Load balanced proxy error', err, {
        serviceName,
        path: req.url,
        correlationId: req.correlationId
      });

      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: `${serviceName} service is temporarily unavailable`
        },
        correlationId: req.correlationId
      });
    },

    onProxyReq: (proxyReq, req, res) => {
      if (req.correlationId) {
        proxyReq.setHeader('X-Correlation-ID', req.correlationId);
      }
    }
  });
};

// WebSocket proxy for real-time features
export const createWebSocketProxy = (serviceName: string, wsPath: string) => {
  const targetUrl = serviceRegistry.getServiceUrl(serviceName);
  if (!targetUrl) {
    throw new Error(`Service ${serviceName} not found for WebSocket proxy`);
  }
  
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    ws: true, // Enable WebSocket proxying
    pathRewrite: {
      [`^${wsPath}`]: ''
    },

    onError: (err, req, res) => {
      logger.error('WebSocket proxy error', err, {
        serviceName,
        wsPath,
        correlationId: req.correlationId
      });
    }
  });
};
