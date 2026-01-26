import { Request, Response } from 'express';
import { invoiceService } from '../services/InvoiceService';
import { createLogger } from '../utils/logger';
import {
  ResponseFactory,
  ErrorCodes,
  createValidationErrorResponse
} from '../utils/api-standardization';
import { Joi } from 'joi';

const logger = createLogger();

// Validation schemas
const createInvoiceSchema = Joi.object({
  patientId: Joi.number().integer().positive().required().messages({
    'number.base': 'Patient ID must be a number',
    'number.integer': 'Patient ID must be an integer',
    'number.positive': 'Patient ID must be positive',
    'any.required': 'Patient ID is required'
  }),
  patientName: Joi.string().required().max(200).messages({
    'string.empty': 'Patient name is required',
    'string.max': 'Patient name cannot exceed 200 characters'
  }),
  patientEmail: Joi.string().email().optional().messages({
    'string.email': 'Invalid email format'
  }),
  patientPhone: Joi.string().required().max(20).messages({
    'string.empty': 'Patient phone number is required',
    'string.max': 'Patient phone number cannot exceed 20 characters'
  }),
  institutionId: Joi.number().integer().positive().optional(),
  institutionName: Joi.string().max(200).optional(),
  description: Joi.string().max(1000).optional(),
  items: Joi.array().items(
    Joi.object({
      itemType: Joi.string().required().messages({
        'string.empty': 'Item type is required'
      }),
      itemCode: Joi.string().max(50).optional(),
      description: Joi.string().required().max(1000).messages({
        'string.empty': 'Item description is required'
      }),
      quantity: Joi.number().integer().positive().required().messages({
        'number.base': 'Quantity must be a number',
        'number.integer': 'Quantity must be an integer',
        'number.positive': 'Quantity must be positive',
        'any.required': 'Quantity is required'
      }),
      unitPrice: Joi.number().positive().required().messages({
        'number.base': 'Unit price must be a number',
        'number.positive': 'Unit price must be positive',
        'any.required': 'Unit price is required'
      }),
      totalPrice: Joi.number().positive().required().messages({
        'number.base': 'Total price must be a number',
        'number.positive': 'Total price must be positive',
        'any.required': 'Total price is required'
      }),
      serviceDate: Joi.date().optional(),
      personnelId: Joi.number().integer().positive().optional(),
      appointmentId: Joi.number().integer().positive().optional(),
      insuranceCoverage: Joi.number().min(0).optional()
    })
  ).min(1).required().messages({
    'array.min': 'At least one invoice item is required',
    'any.required': 'Invoice items are required'
  }),
  issueDate: Joi.date().optional(),
  dueDate: Joi.date().optional(),
  notes: Joi.string().max(1000).optional(),
  metadata: Joi.object().optional(),
  createdBy: Joi.number().integer().positive().optional()
});

const updateInvoiceSchema = createInvoiceSchema.fork(
  ['patientId', 'patientName', 'patientPhone', 'items'],
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

      logger.warn('Invoice validation failed', {
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
    patientId: Joi.number().integer().positive().optional(),
    status: Joi.string().optional(),
    institutionId: Joi.number().integer().positive().optional(),
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

export class InvoicesController {
  // GET /invoices
  static async getInvoices(req: Request, res: Response) {
    try {
      logger.info('Getting invoices', {
        filters: req.query,
        correlationId: req.correlationId
      });

      const pagination = {
        page: Number(req.query.page) || 1,
        limit: Math.min(Number(req.query.limit) || 20, 100)
      };

      const filters = {
        patientId: req.query.patientId ? Number(req.query.patientId) : undefined,
        status: req.query.status as string,
        institutionId: req.query.institutionId ? Number(req.query.institutionId) : undefined,
        dateRange: {
          start: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
          end: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
        }
      };

      const result = await invoiceService.getInvoices(filters, pagination, req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get invoices', error as Error, {
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve invoices',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // GET /invoices/:id
  static async getInvoice(req: Request, res: Response) {
    try {
      const invoiceId = Number(req.params.id);

      if (isNaN(invoiceId) || invoiceId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid invoice ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Getting invoice', {
        invoiceId,
        correlationId: req.correlationId
      });

      const result = await invoiceService.getInvoice(invoiceId, req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get invoice', error as Error, {
        invoiceId: req.params.id,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve invoice',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // POST /invoices
  static async createInvoice(req: Request, res: Response) {
    try {
      logger.info('Creating invoice', {
        patientId: req.body.patientId,
        patientName: req.body.patientName,
        itemCount: req.body.items?.length,
        correlationId: req.correlationId
      });

      // Add created by from authenticated user if available
      if (req.user?.id) {
        req.body.createdBy = req.user.id;
      }

      const result = await invoiceService.createInvoice(req.body, req.correlationId);

      if (result.success) {
        res.status(201).json(result);
      } else {
        const statusCode = result.error?.code === ErrorCodes.VALIDATION_ERROR ? 400 : 500;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to create invoice', error as Error, {
        invoiceData: {
          patientId: req.body.patientId,
          patientName: req.body.patientName,
          itemCount: req.body.items?.length
        },
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to create invoice',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // PUT /invoices/:id
  static async updateInvoice(req: Request, res: Response) {
    try {
      const invoiceId = Number(req.params.id);

      if (isNaN(invoiceId) || invoiceId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid invoice ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Updating invoice', {
        invoiceId,
        updates: Object.keys(req.body),
        correlationId: req.correlationId
      });

      const result = await invoiceService.updateInvoice(invoiceId, req.body, req.correlationId);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 :
                         result.error?.code === ErrorCodes.BUSINESS_RULE_VIOLATION ? 409 : 400;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to update invoice', error as Error, {
        invoiceId: req.params.id,
        updates: req.body,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to update invoice',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // POST /invoices/:id/send
  static async sendInvoice(req: Request, res: Response) {
    try {
      const invoiceId = Number(req.params.id);

      if (isNaN(invoiceId) || invoiceId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid invoice ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Sending invoice', {
        invoiceId,
        correlationId: req.correlationId
      });

      const result = await invoiceService.sendInvoice(invoiceId, req.correlationId);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 : 400;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to send invoice', error as Error, {
        invoiceId: req.params.id,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to send invoice',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // POST /invoices/:id/cancel
  static async cancelInvoice(req: Request, res: Response) {
    try {
      const invoiceId = Number(req.params.id);

      if (isNaN(invoiceId) || invoiceId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid invoice ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      const reason = req.body.reason;

      logger.info('Cancelling invoice', {
        invoiceId,
        reason,
        correlationId: req.correlationId
      });

      const result = await invoiceService.cancelInvoice(invoiceId, reason, req.correlationId);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 : 400;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to cancel invoice', error as Error, {
        invoiceId: req.params.id,
        reason: req.body.reason,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to cancel invoice',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // GET /invoices/stats
  static async getInvoiceStats(req: Request, res: Response) {
    try {
      logger.info('Getting invoice statistics', {
        correlationId: req.correlationId
      });

      const result = await invoiceService.getInvoiceStatistics(req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get invoice statistics', error as Error, {
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve invoice statistics',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }
}

export const invoicesValidationMiddleware = {
  validateCreateInvoice: validate(createInvoiceSchema),
  validateUpdateInvoice: validate(updateInvoiceSchema),
  validateQuery,
  validateCancelInvoice: validate(Joi.object({
    reason: Joi.string().max(1000).optional()
  }))
};