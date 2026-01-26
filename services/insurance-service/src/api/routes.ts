import { Router } from 'express';
import { SchemesController, validationMiddleware } from './schemesController';
import { BenefitsController, benefitsValidationMiddleware } from './benefitsController';
import { standardizeResponse } from '../utils/api-standardization';
import { createLogger } from '../utils/logger';

const router = Router();
const logger = createLogger();

// Apply response standardization to all routes
router.use(standardizeResponse('insurance-service'));

// Add request timing middleware
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Health check endpoint
router.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'insurance-service',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
    },
    endpoints: {
      schemes: '/schemes',
      benefits: '/benefits',
      health: '/health',
      docs: '/docs'
    }
  };

  logger.debug('Health check accessed', {
    correlationId: req.correlationId,
    uptime: process.uptime()
  });

  res.success(health);
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  const docs = {
    name: 'Insurance Service API',
    version: '1.0.0',
    description: 'Insurance schemes, benefits, and coverage management',
    endpoints: {
      schemes: {
        base: '/schemes',
        methods: {
          GET: 'List schemes (with pagination and filtering)',
          POST: 'Create new scheme',
          GET: '/:id', 'Get specific scheme',
          PUT: '/:id', 'Update scheme',
          DELETE: '/:id', 'Delete scheme',
          POST: '/:id/benefits', 'Add benefit to scheme',
          DELETE: '/:id/benefits/:benefitId', 'Remove benefit from scheme'
        }
      },
      benefits: {
        base: '/benefits',
        methods: {
          GET: 'List benefits (with pagination and filtering)',
          POST: 'Create new benefit',
          GET: '/categories', 'Get benefit categories',
          GET: '/popular', 'Get popular benefits',
          GET: '/:id', 'Get specific benefit',
          PUT: '/:id', 'Update benefit',
          DELETE: '/:id', 'Delete benefit'
        }
      }
    },
    versioning: 'v1',
    responseFormat: {
      success: true,
      data: {},
      meta: {
        pagination: {},
        timestamp: 'ISO string',
        requestId: 'UUID'
      },
      correlationId: 'request-tracking-id'
    }
  };

  logger.info('API documentation accessed', {
    correlationId: req.correlationId
  });

  res.success(docs);
});

// SCHEMES ROUTES

// GET /schemes - List all schemes with filtering and pagination
router.get('/schemes', benefitsValidationMiddleware.validateQuery, SchemesController.getSchemes);

// GET /schemes/:id - Get specific scheme
router.get('/schemes/:id', SchemesController.getScheme);

// POST /schemes - Create new scheme
router.post('/schemes', validationMiddleware.validateCreateScheme, SchemesController.createScheme);

// PUT /schemes/:id - Update scheme
router.put('/schemes/:id', validationMiddleware.validateUpdateScheme, SchemesController.updateScheme);

// DELETE /schemes/:id - Delete scheme
router.delete('/schemes/:id', SchemesController.deleteScheme);

// POST /schemes/:id/benefits - Add benefit to scheme
router.post('/schemes/:id/benefits', validationMiddleware.validateAddBenefitToScheme, SchemesController.addBenefitToScheme);

// DELETE /schemes/:id/benefits/:benefitId - Remove benefit from scheme
router.delete('/schemes/:id/benefits/:benefitId', SchemesController.removeBenefitFromScheme);

// BENEFITS ROUTES

// GET /benefits - List all benefits with filtering and pagination
router.get('/benefits', benefitsValidationMiddleware.validateQuery, BenefitsController.getBenefits);

// GET /benefits/categories - Get benefit categories
router.get('/benefits/categories', BenefitsController.getBenefitCategories);

// GET /benefits/popular - Get popular benefits
router.get('/benefits/popular', BenefitsController.getPopularBenefits);

// GET /benefits/:id - Get specific benefit
router.get('/benefits/:id', BenefitsController.getBenefit);

// POST /benefits - Create new benefit
router.post('/benefits', benefitsValidationMiddleware.validateCreateBenefit, BenefitsController.createBenefit);

// PUT /benefits/:id - Update benefit
router.put('/benefits/:id', benefitsValidationMiddleware.validateUpdateBenefit, BenefitsController.updateBenefit);

// DELETE /benefits/:id - Delete benefit
router.delete('/benefits/:id', BenefitsController.deleteBenefit);

// COVERAGE VERIFICATION ROUTES

// GET /coverage/verify/:memberId - Verify coverage for member
router.get('/coverage/verify/:memberId', async (req, res) => {
  try {
    const memberId = Number(req.params.id);

    if (isNaN(memberId) || memberId <= 0) {
      return res.error(
        ErrorCodes.BAD_REQUEST,
        'Invalid member ID',
        { memberId: req.params.id }
      );
    }

    const benefitId = Number(req.query.benefitId);
    const schemeId = Number(req.query.schemeId);
    const serviceType = req.query.serviceType as string;
    const estimatedCost = Number(req.query.estimatedCost);

    logger.info('Coverage verification requested', {
      memberId,
      benefitId,
      schemeId,
      serviceType,
      estimatedCost,
      correlationId: req.correlationId
    });

    // TODO: Implement coverage verification logic
    // This would involve:
    // 1. Checking member's active scheme
    // 2. Validating benefit coverage
    // 3. Calculating coverage based on limits and waiting periods
    // 4. Checking preauthorization requirements
    // 5. Calculating patient responsibility

    const mockCoverage = {
      memberId,
      benefitId,
      schemeId,
      serviceType,
      estimatedCost,
      coverage: {
        isCovered: true,
        coveragePercentage: 80,
        patientResponsibility: estimatedCost * 0.2,
        planPays: estimatedCost * 0.8,
        requiresPreauthorization: serviceType === 'specialist' || serviceType === 'hospital',
        waitingPeriodDays: 0,
        annualLimitRemaining: 50000,
        explanation: 'Coverage confirmed based on active scheme and benefits'
      },
      verifiedAt: new Date().toISOString()
    };

    logger.info('Coverage verification completed', {
      memberId,
      isCovered: mockCoverage.coverage.isCovered,
      coveragePercentage: mockCoverage.coverage.coveragePercentage,
      correlationId: req.correlationId
    });

    res.success(mockCoverage);

  } catch (error) {
    logger.error('Failed to verify coverage', error as Error, {
      memberId: req.params.id,
      correlationId: req.correlationId
    });

    res.error(
      ErrorCodes.INTERNAL_SERVER_ERROR,
      'Failed to verify coverage',
      { originalError: (error as Error).message }
    );
  }
});

// GET /coverage/summary/:memberId - Get member's coverage summary
router.get('/coverage/summary/:memberId', async (req, res) => {
  try {
    const memberId = Number(req.params.id);

    if (isNaN(memberId) || memberId <= 0) {
      return res.error(
        ErrorCodes.BAD_REQUEST,
        'Invalid member ID',
        { memberId: req.params.id }
      );
    }

    logger.info('Coverage summary requested', {
      memberId,
      correlationId: req.correlationId
    });

    // TODO: Implement coverage summary logic
    // This would provide a comprehensive view of:
    // 1. Active scheme details
    // 2. All covered benefits
    // 3. Limits and remaining amounts
    // 4. Waiting periods
    // 5. Preauthorization requirements

    const mockSummary = {
      memberId,
      activeScheme: {
        id: 1,
        name: 'Comprehensive Health Plan',
        type: 'individual',
        coverageType: 'comprehensive',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      },
      benefits: [
        {
          id: 1,
          name: 'General Practitioner Consultation',
          category: 'medical',
          coveragePercentage: 100,
          copayment: 0,
          annualLimit: 10000,
          remainingLimit: 9500,
          requiresPreauthorization: false
        },
        {
          id: 2,
          name: 'Specialist Consultation',
          category: 'specialist',
          coveragePercentage: 80,
          copayment: 50,
          annualLimit: 5000,
          remainingLimit: 4800,
          requiresPreauthorization: true
        }
      ],
      summary: {
        totalAnnualLimit: 1000000,
        usedAmount: 1200,
        remainingLimit: 998800,
        benefitsCount: 15,
        activeBenefits: 13,
        pendingPreauthorizations: 2
      },
      generatedAt: new Date().toISOString()
    };

    res.success(mockSummary);

  } catch (error) {
    logger.error('Failed to get coverage summary', error as Error, {
      memberId: req.params.id,
      correlationId: req.correlationId
    });

    res.error(
      ErrorCodes.INTERNAL_SERVER_ERROR,
      'Failed to retrieve coverage summary',
      { originalError: (error as Error).message }
    );
  }
});

// 404 handler for unknown routes
router.use('*', (req, res) => {
  res.error(
    ErrorCodes.NOT_FOUND,
    `Route ${req.method} ${req.originalUrl} not found`,
    {
      method: req.method,
      url: req.originalUrl,
      availableEndpoints: [
        'GET /health',
        'GET /docs',
        'GET /schemes',
        'POST /schemes',
        'GET /schemes/:id',
        'PUT /schemes/:id',
        'DELETE /schemes/:id',
        'GET /benefits',
        'POST /benefits',
        'GET /benefits/:id',
        'PUT /benefits/:id',
        'DELETE /benefits/:id',
        'GET /coverage/verify/:memberId',
        'GET /coverage/summary/:memberId'
      ]
    }
  );
});

export default router;