import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { serviceRegistry } from '../services/ServiceRegistry';
import { createLogger } from '../utils/logger';

const logger = createLogger();

// Proxy middleware factory for each service
export const createServiceProxy = (serviceName: string, pathRewrite?: Record<string, string>) => {
  return createProxyMiddleware({
    target: serviceRegistry.getServiceUrl(serviceName),
    changeOrigin: true,
    pathRewrite: pathRewrite || {},

    // Custom error handler
    onError: (err, req, res) => {
      logger.error('Proxy error', err, {
        serviceName,
        path: req.url,
        method: req.method,
        correlationId: req.correlationId
      });

      // Check if service is down
      const serviceHealth = serviceRegistry.getServiceHealth(serviceName);

      if (!serviceHealth?.healthy || serviceHealth?.circuitBreakerOpen) {
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: `${serviceName} service is temporarily unavailable`,
            service: serviceName
          },
          correlationId: req.correlationId
        });
        return;
      }

      res.status(502).json({
        success: false,
        error: {
          code: 'BAD_GATEWAY',
          message: 'Service temporarily unavailable'
        },
        correlationId: req.correlationId
      });
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
      proxyReq.setHeader('X-Forwarded-For', req.ip);
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
      res.setHeader('X-Gateway-Response-Time', Date.now() - req.startTime);

      logger.debug('Proxy response received', {
        serviceName,
        method: req.method,
        url: req.url,
        statusCode: proxyRes.statusCode,
        responseTime: Date.now() - req.startTime,
        correlationId: req.correlationId
      });
    },

    // Timeout configuration
    proxyTimeout: 30000, // 30 seconds
    timeout: 35000, // 35 seconds
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

  payment: {
    middleware: createServiceProxy('payment', {
      '^/api/payment': '',
      '^/api/payments': '/payments',
      '^/api/commissions': '/commissions',
      '^/api/refunds': '/refunds'
    }),
    paths: ['/api/payment', '/api/payments', '/api/commissions', '/api/refunds']
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
  return createProxyMiddleware({
    target: serviceRegistry.getServiceUrl(serviceName),
    changeOrigin: true,
    ws: true, // Enable WebSocket proxying
    pathRewrite: {
      [`^${wsPath}`: ''
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