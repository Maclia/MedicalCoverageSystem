import { Router } from 'express';
import { serviceProxies, dynamicProxyMiddleware } from '../middleware/proxy';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { standardRateLimit, authRateLimit, userRateLimit } from '../middleware/rateLimiting';
import { createSuccessResponse, createErrorResponse } from '../middleware/responseStandardization';
import { createLogger } from '../utils/logger';
import { serviceRegistry } from '../services/ServiceRegistry';
import { swaggerUi, specs } from '../swagger';

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

/**
 * @swagger
 * /services:
 *   get:
 *     summary: Service status overview
 *     description: Returns the status of all registered microservices
 *     tags: [Gateway]
 *     security: []
 *     responses:
 *       200:
 *         description: Service status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     services:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           url:
 *                             type: string
 *                           healthy:
 *                             type: boolean
 *                           lastChecked:
 *                             type: string
 *                             format: date-time
 *                           responseTime:
 *                             type: number
 *                           errorCount:
 *                             type: integer
 *                           circuitBreakerOpen:
 *                             type: boolean
 *                     totalServices:
 *                       type: integer
 *                     healthyServices:
 *                       type: integer
 */
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
      core: {
        path: '/api/core/*',
        service: 'core',
        description: 'Member and company management'
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
      finance: {
        path: '/api/finance/*',
        service: 'finance',
        description: 'Financial operations and ledger management'
      },
      crm: {
        path: '/api/crm/*',
        service: 'crm',
        description: 'Customer relationship management'
      },
      membership: {
        path: '/api/membership/*',
        service: 'membership',
        description: 'Membership and enrollment services'
      },
      wellness: {
        path: '/api/wellness/*',
        service: 'wellness',
        description: 'Wellness programs and activities'
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

// Swagger UI
router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Swagger JSON
router.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// Proxy routes for each microservice

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account in the system
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - userType
 *               - entityId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: securepassword123
 *               userType:
 *                 type: string
 *                 enum: [insurance, hospital, provider]
 *                 example: insurance
 *               entityId:
 *                 type: integer
 *                 example: 123
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticates a user and returns access tokens
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - userType
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: securepassword123
 *               userType:
 *                 type: string
 *                 enum: [insurance, hospital, provider]
 *                 example: insurance
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     refreshToken:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         email:
 *                           type: string
 *                         userType:
 *                           type: string
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Core service routes (authentication)
router.use('/api/auth', authRateLimit, dynamicProxyMiddleware('core'));
router.use('/api/core', authenticateToken, dynamicProxyMiddleware('core'));

/**
 * @swagger
 * /api/insurance/schemes:
 *   get:
 *     summary: List insurance schemes
 *     description: Retrieves a paginated list of insurance schemes
 *     tags: [Insurance]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Schemes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     schemes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [active, inactive]
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *   post:
 *     summary: Create insurance scheme
 *     description: Creates a new insurance scheme
 *     tags: [Insurance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - pricingMethodology
 *               - status
 *               - effectiveDate
 *               - expiryDate
 *             properties:
 *               name:
 *                 type: string
 *                 example: Premium Health Plan
 *               description:
 *                 type: string
 *                 example: Comprehensive health coverage
 *               pricingMethodology:
 *                 type: string
 *                 enum: [community_rated, experience_rated]
 *                 example: community_rated
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: active
 *               effectiveDate:
 *                 type: string
 *                 format: date
 *                 example: 2025-01-01
 *               expiryDate:
 *                 type: string
 *                 format: date
 *                 example: 2025-12-31
 *     responses:
 *       201:
 *         description: Scheme created successfully
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

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

// Finance service routes (payments and ledger)
router.use('/api/finance', authenticateToken, dynamicProxyMiddleware('finance'));
router.use('/api/payments', authenticateToken, userRateLimit, dynamicProxyMiddleware('finance'));
router.use('/api/ledger', authenticateToken, dynamicProxyMiddleware('finance'));

// CRM service routes (leads, agents, commissions)
router.use('/api/crm', authenticateToken, dynamicProxyMiddleware('crm'));
router.use('/api/leads', authenticateToken, dynamicProxyMiddleware('crm'));
router.use('/api/agents', authenticateToken, dynamicProxyMiddleware('crm'));
router.use('/api/commissions', authenticateToken, dynamicProxyMiddleware('crm'));

// Membership service routes (enrollments, renewals, benefits)
router.use('/api/membership', authenticateToken, dynamicProxyMiddleware('membership'));
router.use('/api/enrollments', authenticateToken, dynamicProxyMiddleware('membership'));
router.use('/api/renewals', authenticateToken, dynamicProxyMiddleware('membership'));

// Wellness service routes (programs, activities, incentives)
router.use('/api/wellness', authenticateToken, dynamicProxyMiddleware('wellness'));
router.use('/api/programs', authenticateToken, dynamicProxyMiddleware('wellness'));
router.use('/api/activities', authenticateToken, dynamicProxyMiddleware('wellness'));
router.use('/api/incentives', authenticateToken, dynamicProxyMiddleware('wellness'));

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