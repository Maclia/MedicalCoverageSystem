import { Router } from 'express';
import { serviceProxies, dynamicProxyMiddleware } from '../middleware/proxy';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { standardRateLimit, authRateLimit, userRateLimit } from '../middleware/rateLimiting';
import { createSuccessResponse, createErrorResponse } from '../middleware/responseStandardization';
import { createLogger } from '../utils/logger';
import { serviceRegistry } from '../services/ServiceRegistry';

const router = Router();
const logger = createLogger();

// Apply rate limiting to all routes
router.use(standardRateLimit);

// Health check endpoint (no auth required)
router.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'api-gateway',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
    },
    services: {
      healthy: serviceRegistry.getHealthyServices().length,
      total: serviceRegistry.getAllServices().length,
      list: Array.from(serviceRegistry.getServiceHealth().entries()).map(([name, health]) => ({
        name,
        healthy: health.healthy,
        responseTime: health.responseTime,
        circuitBreakerOpen: health.circuitBreakerOpen
      }))
    }
  };

  res.json(createSuccessResponse(health, undefined, req.correlationId));
});

// Service status endpoint
router.get('/services', optionalAuth, (req, res) => {
  const serviceHealth = serviceRegistry.getServiceHealth();
  const services = Array.from(serviceHealth.entries()).map(([name, health]) => ({
    name,
    url: health.url,
    healthy: health.healthy,
    lastChecked: health.lastChecked,
    responseTime: health.responseTime,
    errorCount: health.errorCount,
    circuitBreakerOpen: health.circuitBreakerOpen
  }));

  res.json(createSuccessResponse({
    services,
    totalServices: services.length,
    healthyServices: services.filter(s => s.healthy && !s.circuitBreakerOpen).length
  }, undefined, req.correlationId));
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  const docs = {
    name: 'Medical Coverage System API Gateway',
    version: '1.0.0',
    description: 'Central API gateway for Medical Coverage System microservices',
    endpoints: {
      authentication: {
        path: '/api/auth/*',
        service: 'core',
        description: 'Authentication and user management'
      },
      insurance: {
        path: '/api/insurance/*',
        service: 'insurance',
        description: 'Insurance schemes and benefits management'
      },
      hospital: {
        path: '/api/hospital/*',
        service: 'hospital',
        description: 'Hospital operations and patient management'
      },
      billing: {
        path: '/api/billing/*',
        service: 'billing',
        description: 'Financial transactions and invoicing'
      },
      claims: {
        path: '/api/claims/*',
        service: 'claims',
        description: 'Claims processing and disputes'
      },
      payment: {
        path: '/api/payment/*',
        service: 'payment',
        description: 'Payment processing and commissions'
      },
      health: {
        path: '/health',
        service: 'gateway',
        description: 'Gateway health check'
      },
      services: {
        path: '/services',
        service: 'gateway',
        description: 'Service health status'
      }
    },
    versioning: 'v1',
    authentication: 'JWT Bearer Token',
    rateLimiting: 'Applied per endpoint and user type',
    correlationId: 'X-Correlation-ID header for request tracing'
  };

  res.json(createSuccessResponse(docs, undefined, req.correlationId));
});

// Proxy routes for each microservice

// Core service routes (authentication)
router.use('/api/auth', authRateLimit, dynamicProxyMiddleware('core'));
router.use('/api/core', authenticateToken, dynamicProxyMiddleware('core'));

// Insurance service routes
router.use('/api/insurance', authenticateToken, dynamicProxyMiddleware('insurance'));
router.use('/api/schemes', authenticateToken, dynamicProxyMiddleware('insurance'));
router.use('/api/benefits', authenticateToken, dynamicProxyMiddleware('insurance'));
router.use('/api/coverage', authenticateToken, dynamicProxyMiddleware('insurance'));

// Hospital service routes
router.use('/api/hospital', authenticateToken, dynamicProxyMiddleware('hospital'));
router.use('/api/patients', authenticateToken, userRateLimit, dynamicProxyMiddleware('hospital'));
router.use('/api/appointments', authenticateToken, dynamicProxyMiddleware('hospital'));
router.use('/api/medical-records', authenticateToken, dynamicProxyMiddleware('hospital'));
router.use('/api/personnel', authenticateToken, dynamicProxyMiddleware('hospital'));

// Billing service routes
router.use('/api/billing', authenticateToken, dynamicProxyMiddleware('billing'));
router.use('/api/invoices', authenticateToken, userRateLimit, dynamicProxyMiddleware('billing'));
router.use('/api/accounts-receivable', authenticateToken, dynamicProxyMiddleware('billing'));
router.use('/api/tariffs', authenticateToken, dynamicProxyMiddleware('billing'));

// Claims service routes
router.use('/api/claims', authenticateToken, userRateLimit, dynamicProxyMiddleware('claims'));
router.use('/api/disputes', authenticateToken, dynamicProxyMiddleware('claims'));
router.use('/api/reconciliation', authenticateToken, dynamicProxyMiddleware('claims'));

// Payment service routes
router.use('/api/payment', authenticateToken, userRateLimit, dynamicProxyMiddleware('payment'));
router.use('/api/payments', authenticateToken, userRateLimit, dynamicProxyMiddleware('payment'));
router.use('/api/commissions', authenticateToken, dynamicProxyMiddleware('payment'));
router.use('/api/refunds', authenticateToken, dynamicProxyMiddleware('payment'));

// Admin routes (restricted access)
router.use('/api/admin', authenticateToken, userRateLimit, (req, res, next) => {
  // Check if user is admin (insurance type user)
  if (!req.user || req.user.userType !== 'insurance') {
    return res.status(403).json(
      createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        'Admin access required',
        undefined,
        req.correlationId
      )
    );
  }
  next();
});

// Admin route to view all service health
router.get('/api/admin/services/health', (req, res) => {
  const serviceHealth = serviceRegistry.getServiceHealth();
  const circuitBreakerMetrics = Array.from(serviceRegistry.getServiceHealth().entries()).map(([name]) => {
    const serviceClient = serviceRegistry.createServiceClient(name);
    return {
      name,
      metrics: serviceClient ? 'Available' : 'Unavailable'
    };
  });

  const adminData = {
    serviceHealth: Array.from(serviceHealth.entries()).map(([name, health]) => health),
    circuitBreakerMetrics,
    gatewayInfo: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0'
    }
  };

  res.json(createSuccessResponse(adminData, undefined, req.correlationId));
});

// 404 handler for unknown routes
router.use('*', (req, res) => {
  res.status(404).json(
    createErrorResponse(
      'NOT_FOUND',
      `Route ${req.method} ${req.originalUrl} not found`,
      {
        method: req.method,
        url: req.originalUrl,
        availableServices: serviceRegistry.getHealthyServices()
      },
      req.correlationId
    )
  );
});

export default router;