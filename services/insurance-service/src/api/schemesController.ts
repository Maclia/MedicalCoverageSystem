import { Request, Response } from 'express';
import { schemeService } from '../services/SchemeService';
import { benefitService } from '../services/BenefitService';
import { createLogger } from '../utils/logger';
import {
  ResponseFactory,
  ErrorCodes,
  createValidationErrorResponse
} from '../utils/api-standardization';
import { Joi } from 'joi';

const logger = createLogger();

// Validation schemas
const createSchemeSchema = Joi.object({
  name: Joi.string().required().max(100).messages({
    'string.empty': 'Scheme name is required',
    'string.max': 'Scheme name cannot exceed 100 characters'
  }),
  description: Joi.string().max(500).optional(),
  companyId: Joi.number().integer().positive().required().messages({
    'number.base': 'Company ID must be a number',
    'number.integer': 'Company ID must be an integer',
    'number.positive': 'Company ID must be positive',
    'any.required': 'Company ID is required'
  }),
  schemeType: Joi.string().required().messages({
    'string.empty': 'Scheme type is required'
  }),
  coverageType: Joi.string().required().messages({
    'string.empty': 'Coverage type is required'
  }),
  minAge: Joi.number().integer().min(0).max(120).required().messages({
    'number.base': 'Minimum age must be a number',
    'number.min': 'Minimum age cannot be negative',
    'number.max': 'Minimum age cannot exceed 120',
    'any.required': 'Minimum age is required'
  }),
  maxAge: Joi.number().integer().min(0).max(120).required().messages({
    'number.base': 'Maximum age must be a number',
    'number.min': 'Maximum age cannot be negative',
    'number.max': 'Maximum age cannot exceed 120',
    'any.required': 'Maximum age is required'
  }),
  isActive: Joi.boolean().default(true).optional(),
  startDate: Joi.date().iso().required().messages({
    'date.format': 'Start date must be a valid ISO date',
    'any.required': 'Start date is required'
  }),
  endDate: Joi.date().iso().optional(),
  premiumCalculationMethod: Joi.string().optional(),
  customRules: Joi.object().optional()
});

const updateSchemeSchema = createSchemeSchema.fork(
  ['name', 'companyId', 'schemeType', 'coverageType', 'minAge', 'maxAge', 'startDate'],
  (schema) => schema.optional()
);

const addBenefitToSchemeSchema = Joi.object({
  benefitId: Joi.number().integer().positive().required().messages({
    'number.base': 'Benefit ID must be a number',
    'number.integer': 'Benefit ID must be an integer',
    'number.positive': 'Benefit ID must be positive',
    'any.required': 'Benefit ID is required'
  }),
  coverageLimit: Joi.number().min(0).optional(),
  waitingPeriod: Joi.number().integer().min(0).optional(),
  copayment: Joi.number().min(0).max(100).optional(),
  deductible: Joi.number().min(0).optional(),
  coveragePercentage: Joi.number().min(0).max(100).optional(),
  annualLimit: Joi.number().min(0).optional(),
  isActive: Joi.boolean().default(true).optional()
});

// Validation middleware
const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: Function) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Validation failed', {
        errors: details,
        correlationId: req.correlationId
      });

      return res.status(400).json(
        createValidationErrorResponse(details, req.correlationId)
      );
    }

    req.body = value;
    next();
  };
};

// Query parameter validation
const validateQuery = (req: Request, res: Response, next: Function) => {
  const schema = Joi.object({
    companyId: Joi.number().integer().positive().optional(),
    schemeType: Joi.string().optional(),
    coverageType: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
    search: Joi.string().max(100).optional(),
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20).optional()
  });

  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    return res.status(400).json(
      createValidationErrorResponse(details, req.correlationId)
    );
  }

  req.query = value;
  next();
};

export class SchemesController {
  // GET /schemes
  static async getSchemes(req: Request, res: Response) {
    try {
      logger.info('Getting schemes', {
        filters: req.query,
        correlationId: req.correlationId
      });

      const pagination = {
        page: Number(req.query.page) || 1,
        limit: Math.min(Number(req.query.limit) || 20, 100)
      };

      const filters = {
        companyId: req.query.companyId ? Number(req.query.companyId) : undefined,
        schemeType: req.query.schemeType as string,
        coverageType: req.query.coverageType as string,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        search: req.query.search as string
      };

      const result = await schemeService.getSchemes(filters, pagination, req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get schemes', error as Error, {
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve schemes',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // GET /schemes/:id
  static async getScheme(req: Request, res: Response) {
    try {
      const schemeId = Number(req.params.id);

      if (isNaN(schemeId) || schemeId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid scheme ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Getting scheme', {
        schemeId,
        correlationId: req.correlationId
      });

      const result = await schemeService.getScheme(schemeId, req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get scheme', error as Error, {
        schemeId: req.params.id,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve scheme',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // POST /schemes
  static async createScheme(req: Request, res: Response) {
    try {
      logger.info('Creating scheme', {
        schemeName: req.body.name,
        companyId: req.body.companyId,
        correlationId: req.correlationId
      });

      const result = await schemeService.createScheme(req.body, req.correlationId);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      logger.error('Failed to create scheme', error as Error, {
        schemeData: req.body,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to create scheme',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // PUT /schemes/:id
  static async updateScheme(req: Request, res: Response) {
    try {
      const schemeId = Number(req.params.id);

      if (isNaN(schemeId) || schemeId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid scheme ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Updating scheme', {
        schemeId,
        updates: Object.keys(req.body),
        correlationId: req.correlationId
      });

      const result = await schemeService.updateScheme(schemeId, req.body, req.correlationId);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 : 400;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to update scheme', error as Error, {
        schemeId: req.params.id,
        updates: req.body,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to update scheme',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // DELETE /schemes/:id
  static async deleteScheme(req: Request, res: Response) {
    try {
      const schemeId = Number(req.params.id);

      if (isNaN(schemeId) || schemeId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid scheme ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Deleting scheme', {
        schemeId,
        correlationId: req.correlationId
      });

      const result = await schemeService.deleteScheme(schemeId, req.correlationId);

      if (result.success) {
        res.status(204).send();
      } else {
        const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 : 400;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to delete scheme', error as Error, {
        schemeId: req.params.id,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to delete scheme',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // POST /schemes/:id/benefits
  static async addBenefitToScheme(req: Request, res: Response) {
    try {
      const schemeId = Number(req.params.id);

      if (isNaN(schemeId) || schemeId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid scheme ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Adding benefit to scheme', {
        schemeId,
        benefitId: req.body.benefitId,
        correlationId: req.correlationId
      });

      const benefitData = { ...req.body, schemeId };
      const result = await schemeService.addBenefitToScheme(benefitData, req.correlationId);

      if (result.success) {
        res.status(201).json(result);
      } else {
        const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 : 400;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to add benefit to scheme', error as Error, {
        schemeId: req.params.id,
        benefitData: req.body,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to add benefit to scheme',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // DELETE /schemes/:id/benefits/:benefitId
  static async removeBenefitFromScheme(req: Request, res: Response) {
    try {
      const schemeId = Number(req.params.id);
      const benefitId = Number(req.params.benefitId);

      if (isNaN(schemeId) || schemeId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid scheme ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      if (isNaN(benefitId) || benefitId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid benefit ID',
            { benefitId: req.params.benefitId },
            req.correlationId
          )
        );
      }

      logger.info('Removing benefit from scheme', {
        schemeId,
        benefitId,
        correlationId: req.correlationId
      });

      const result = await schemeService.removeBenefitFromScheme(schemeId, benefitId, req.correlationId);

      if (result.success) {
        res.status(204).send();
      } else {
        const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 : 400;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to remove benefit from scheme', error as Error, {
        schemeId: req.params.id,
        benefitId: req.params.benefitId,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to remove benefit from scheme',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }
}

export const validationMiddleware = {
  validateCreateScheme: validate(createSchemeSchema),
  validateUpdateScheme: validate(updateSchemeSchema),
  validateAddBenefitToScheme: validate(addBenefitToSchemeSchema),
  validateQuery
};