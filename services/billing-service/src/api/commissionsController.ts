import { Request, Response } from 'express';
import { commissionService } from '../services/CommissionService';
import { createLogger } from '../utils/logger';
import {
  ResponseFactory,
  ErrorCodes,
  createValidationErrorResponse
} from '../utils/api-standardization';
import { Joi } from 'joi';

const logger = createLogger();

// Validation schemas
const createCommissionSchema = Joi.object({
  personnelId: Joi.number().integer().positive().required().messages({
    'number.base': 'Personnel ID must be a number',
    'number.integer': 'Personnel ID must be an integer',
    'number.positive': 'Personnel ID must be positive',
    'any.required': 'Personnel ID is required'
  }),
  invoiceId: Joi.number().integer().positive().optional(),
  paymentId: Joi.number().integer().positive().optional(),
  commissionType: Joi.string().valid('referral', 'service', 'performance', 'bonus').required().messages({
    'any.only': 'Commission type must be one of: referral, service, performance, bonus',
    'string.empty': 'Commission type is required',
    'any.required': 'Commission type is required'
  }),
  baseAmount: Joi.number().positive().required().messages({
    'number.base': 'Base amount must be a number',
    'number.positive': 'Base amount must be positive',
    'any.required': 'Base amount is required'
  }),
  commissionRate: Joi.number().min(0).max(1).optional().messages({
    'number.base': 'Commission rate must be a number',
    'number.min': 'Commission rate cannot be negative',
    'number.max': 'Commission rate cannot exceed 1 (100%)'
  }),
  description: Joi.string().max(500).optional(),
  calculationDetails: Joi.object().optional(),
  notes: Joi.string().max(1000).optional(),
  approvedBy: Joi.number().integer().positive().optional(),
  paidBy: Joi.number().integer().positive().optional()
});

const approveRejectSchema = Joi.object({
  reason: Joi.string().max(1000).optional()
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

      logger.warn('Commission validation failed', {
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
    personnelId: Joi.number().integer().positive().optional(),
    status: Joi.string().optional(),
    commissionType: Joi.string().optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
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

export class CommissionsController {
  // GET /commissions
  static async getCommissions(req: Request, res: Response) {
    try {
      logger.info('Getting commissions', {
        filters: req.query,
        correlationId: req.correlationId
      });

      const pagination = {
        page: Number(req.query.page) || 1,
        limit: Math.min(Number(req.query.limit) || 20, 100)
      };

      const filters = {
        personnelId: req.query.personnelId ? Number(req.query.personnelId) : undefined,
        status: req.query.status as string,
        commissionType: req.query.commissionType as string,
        dateRange: {
          start: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
          end: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
        }
      };

      const result = await commissionService.getCommissions(filters, pagination, req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get commissions', error as Error, {
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve commissions',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // GET /commissions/:id
  static async getCommission(req: Request, res: Response) {
    try {
      const commissionId = Number(req.params.id);

      if (isNaN(commissionId) || commissionId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid commission ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Getting commission', {
        commissionId,
        correlationId: req.correlationId
      });

      const result = await commissionService.getCommission(commissionId, req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get commission', error as Error, {
        commissionId: req.params.id,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve commission',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // POST /commissions
  static async calculateCommission(req: Request, res: Response) {
    try {
      logger.info('Calculating commission', {
        personnelId: req.body.personnelId,
        commissionType: req.body.commissionType,
        baseAmount: req.body.baseAmount,
        correlationId: req.correlationId
      });

      // Add approved by from authenticated user if available
      if (req.user?.id) {
        req.body.approvedBy = req.user.id;
      }

      const result = await commissionService.calculateCommission(req.body, req.correlationId);

      if (result.success) {
        res.status(201).json(result);
      } else {
        const statusCode = result.error?.code === ErrorCodes.VALIDATION_ERROR ? 400 :
                         result.error?.code === ErrorCodes.BUSINESS_RULE_VIOLATION ? 409 : 500;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to calculate commission', error as Error, {
        commissionData: {
          personnelId: req.body.personnelId,
          commissionType: req.body.commissionType,
          baseAmount: req.body.baseAmount
        },
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to calculate commission',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // POST /commissions/:id/approve
  static async approveCommission(req: Request, res: Response) {
    try {
      const commissionId = Number(req.params.id);

      if (isNaN(commissionId) || commissionId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid commission ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Approving commission', {
        commissionId,
        approvedBy: req.user?.id,
        correlationId: req.correlationId
      });

      const result = await commissionService.approveCommission(
        commissionId,
        req.user?.id || 0,
        req.correlationId
      );

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 :
                         result.error?.code === ErrorCodes.BUSINESS_RULE_VIOLATION ? 409 : 400;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to approve commission', error as Error, {
        commissionId: req.params.id,
        approvedBy: req.user?.id,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to approve commission',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // POST /commissions/:id/pay
  static async payCommission(req: Request, res: Response) {
    try {
      const commissionId = Number(req.params.id);

      if (isNaN(commissionId) || commissionId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid commission ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Paying commission', {
        commissionId,
        paidBy: req.user?.id,
        correlationId: req.correlationId
      });

      const result = await commissionService.payCommission(
        commissionId,
        req.user?.id || 0,
        req.correlationId
      );

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 :
                         result.error?.code === ErrorCodes.BUSINESS_RULE_VIOLATION ? 409 : 400;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to pay commission', error as Error, {
        commissionId: req.params.id,
        paidBy: req.user?.id,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to pay commission',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // POST /commissions/:id/reject
  static async rejectCommission(req: Request, res: Response) {
    try {
      const commissionId = Number(req.params.id);

      if (isNaN(commissionId) || commissionId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid commission ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      const reason = req.body.reason;

      logger.info('Rejecting commission', {
        commissionId,
        reason,
        rejectedBy: req.user?.id,
        correlationId: req.correlationId
      });

      const result = await commissionService.rejectCommission(
        commissionId,
        reason,
        req.user?.id || 0,
        req.correlationId
      );

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 :
                         result.error?.code === ErrorCodes.BUSINESS_RULE_VIOLATION ? 409 : 400;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to reject commission', error as Error, {
        commissionId: req.params.id,
        reason: req.body.reason,
        rejectedBy: req.user?.id,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to reject commission',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // GET /commissions/stats
  static async getCommissionStats(req: Request, res: Response) {
    try {
      logger.info('Getting commission statistics', {
        correlationId: req.correlationId
      });

      const result = await commissionService.getCommissionStatistics(req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get commission statistics', error as Error, {
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve commission statistics',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }
}

export const commissionsValidationMiddleware = {
  validateCreateCommission: validate(createCommissionSchema),
  validateApproveReject: validate(approveRejectSchema),
  validateQuery
};