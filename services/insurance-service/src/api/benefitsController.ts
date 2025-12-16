import { Request, Response } from 'express';
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
const createBenefitSchema = Joi.object({
  name: Joi.string().required().max(100).messages({
    'string.empty': 'Benefit name is required',
    'string.max': 'Benefit name cannot exceed 100 characters'
  }),
  description: Joi.string().max(500).optional(),
  category: Joi.string().valid(
    'medical', 'dental', 'vision', 'wellness', 'hospital',
    'prescription', 'emergency', 'maternity', 'specialist', 'other'
  ).required().messages({
    'any.only': 'Category must be one of: medical, dental, vision, wellness, hospital, prescription, emergency, maternity, specialist, other',
    'string.empty': 'Category is required'
  }),
  coverageType: Joi.string().optional(),
  isActive: Joi.boolean().default(true).optional(),
  standardLimit: Joi.number().min(0).optional(),
  standardWaitingPeriod: Joi.number().integer().min(0).optional(),
  standardCopayment: Joi.number().min(0).max(100).optional(),
  standardDeductible: Joi.number().min(0).optional(),
  coveragePercentage: Joi.number().min(0).max(100).optional(),
  requiresPreauthorization: Joi.boolean().default(false).optional(),
  documentationRequired: Joi.array().items(Joi.string()).optional()
});

const updateBenefitSchema = createBenefitSchema.fork(
  ['name', 'category'],
  (schema) => schema.optional()
);

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
    category: Joi.string().valid(
      'medical', 'dental', 'vision', 'wellness', 'hospital',
      'prescription', 'emergency', 'maternity', 'specialist', 'other'
    ).optional(),
    coverageType: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
    requiresPreauthorization: Joi.boolean().optional(),
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

export class BenefitsController {
  // GET /benefits
  static async getBenefits(req: Request, res: Response) {
    try {
      logger.info('Getting benefits', {
        filters: req.query,
        correlationId: req.correlationId
      });

      const pagination = {
        page: Number(req.query.page) || 1,
        limit: Math.min(Number(req.query.limit) || 20, 100)
      };

      const filters = {
        category: req.query.category as string,
        coverageType: req.query.coverageType as string,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        requiresPreauthorization: req.query.requiresPreauthorization !== undefined ? req.query.requiresPreauthorization === 'true' : undefined,
        search: req.query.search as string
      };

      const result = await benefitService.getBenefits(filters, pagination, req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get benefits', error as Error, {
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve benefits',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // GET /benefits/categories
  static async getBenefitCategories(req: Request, res: Response) {
    try {
      logger.info('Getting benefit categories', {
        correlationId: req.correlationId
      });

      const result = await benefitService.getBenefitCategories(req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get benefit categories', error as Error, {
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve benefit categories',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // GET /benefits/popular
  static async getPopularBenefits(req: Request, res: Response) {
    try {
      const limit = Math.min(Number(req.query.limit) || 10, 50);

      logger.info('Getting popular benefits', {
        limit,
        correlationId: req.correlationId
      });

      const result = await benefitService.getPopularBenefits(limit, req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get popular benefits', error as Error, {
        limit: req.query.limit,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve popular benefits',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // GET /benefits/:id
  static async getBenefit(req: Request, res: Response) {
    try {
      const benefitId = Number(req.params.id);

      if (isNaN(benefitId) || benefitId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid benefit ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Getting benefit', {
        benefitId,
        correlationId: req.correlationId
      });

      const result = await benefitService.getBenefit(benefitId, req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get benefit', error as Error, {
        benefitId: req.params.id,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve benefit',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // POST /benefits
  static async createBenefit(req: Request, res: Response) {
    try {
      logger.info('Creating benefit', {
        benefitName: req.body.name,
        category: req.body.category,
        correlationId: req.correlationId
      });

      const result = await benefitService.createBenefit(req.body, req.correlationId);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      logger.error('Failed to create benefit', error as Error, {
        benefitData: req.body,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to create benefit',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // PUT /benefits/:id
  static async updateBenefit(req: Request, res: Response) {
    try {
      const benefitId = Number(req.params.id);

      if (isNaN(benefitId) || benefitId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid benefit ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Updating benefit', {
        benefitId,
        updates: Object.keys(req.body),
        correlationId: req.correlationId
      });

      const result = await benefitService.updateBenefit(benefitId, req.body, req.correlationId);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 : 400;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to update benefit', error as Error, {
        benefitId: req.params.id,
        updates: req.body,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to update benefit',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // DELETE /benefits/:id
  static async deleteBenefit(req: Request, res: Response) {
    try {
      const benefitId = Number(req.params.id);

      if (isNaN(benefitId) || benefitId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid benefit ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Deleting benefit', {
        benefitId,
        correlationId: req.correlationId
      });

      const result = await benefitService.deleteBenefit(benefitId, req.correlationId);

      if (result.success) {
        res.status(204).send();
      } else {
        const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 :
                         result.error?.code === ErrorCodes.CONFLICT ? 409 : 400;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to delete benefit', error as Error, {
        benefitId: req.params.id,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to delete benefit',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }
}

export const benefitsValidationMiddleware = {
  validateCreateBenefit: validate(createBenefitSchema),
  validateUpdateBenefit: validate(updateBenefitSchema),
  validateQuery
};