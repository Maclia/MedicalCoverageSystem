import { Request, Response } from 'express';
import { paymentService } from '../services/PaymentService';
import { createLogger } from '../utils/logger';
import {
  ResponseFactory,
  ErrorCodes,
  createValidationErrorResponse
} from '../utils/api-standardization';
import { Joi } from 'joi';

const logger = createLogger();

// Validation schemas
const createPaymentSchema = Joi.object({
  invoiceId: Joi.number().integer().positive().required().messages({
    'number.base': 'Invoice ID must be a number',
    'number.integer': 'Invoice ID must be an integer',
    'number.positive': 'Invoice ID must be positive',
    'any.required': 'Invoice ID is required'
  }),
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
  amount: Joi.number().positive().required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be positive',
    'any.required': 'Amount is required'
  }),
  paymentMethod: Joi.string().valid('cash', 'mpesa', 'card', 'bank_transfer', 'insurance', 'mobile_money').required().messages({
    'any.only': 'Payment method must be one of: cash, mpesa, card, bank_transfer, insurance, mobile_money',
    'string.empty': 'Payment method is required',
    'any.required': 'Payment method is required'
  }),
  methodDetails: Joi.object().when('paymentMethod', {
    is: 'mpesa',
    then: Joi.object({
      phoneNumber: Joi.string().pattern(/^[+]?[0-9]{10,15}$/).required().messages({
        'string.pattern.base': 'Invalid phone number format',
        'any.required': 'Phone number is required for M-Pesa payment'
      }),
      shortCode: Joi.string().required().messages({
        'string.empty': 'Short code is required for M-Pesa payment'
      }),
      accountReference: Joi.string().max(100).required().messages({
        'string.empty': 'Account reference is required for M-Pesa payment'
      }),
      transactionDesc: Joi.string().max(100).required().messages({
        'string.empty': 'Transaction description is required for M-Pesa payment'
      })
    }).required(),
    otherwise: Joi.when('paymentMethod', {
      is: 'card',
      then: Joi.object({
        cardNumber: Joi.string().pattern(/^[0-9]{13,19}$/).required().messages({
          'string.pattern.base': 'Invalid card number format'
        }),
        expiryMonth: Joi.string().pattern(/^(0[1-9]|1[0-2])$/).required().messages({
          'string.pattern.base': 'Invalid expiry month format (01-12)'
        }),
        expiryYear: Joi.string().pattern(/^[0-9]{2}$/).required().messages({
          'string.pattern.base': 'Invalid expiry year format (YY)'
        }),
        cvv: Joi.string().pattern(/^[0-9]{3,4}$/).required().messages({
          'string.pattern.base': 'Invalid CVV format'
        }),
        cardholderName: Joi.string().max(100).required().messages({
          'string.empty': 'Cardholder name is required'
        })
      }).required(),
      otherwise: Joi.when('paymentMethod', {
        is: 'bank_transfer',
        then: Joi.object({
          bankName: Joi.string().required().messages({
            'string.empty': 'Bank name is required'
          }),
          accountNumber: Joi.string().required().messages({
            'string.empty': 'Account number is required'
          }),
          accountName: Joi.string().required().messages({
            'string.empty': 'Account name is required'
          }),
          routingNumber: Joi.string().optional(),
          transactionReference: Joi.string().required().messages({
            'string.empty': 'Transaction reference is required'
          })
        }).required(),
        otherwise: Joi.object().optional()
      })
    })
  }),
  notes: Joi.string().max(500).optional(),
  metadata: Joi.object().optional(),
  processedBy: Joi.number().integer().positive().optional()
});

const refundPaymentSchema = Joi.object({
  amount: Joi.number().positive().required().messages({
    'number.base': 'Refund amount must be a number',
    'number.positive': 'Refund amount must be positive',
    'any.required': 'Refund amount is required'
  }),
  reason: Joi.string().required().max(1000).messages({
    'string.empty': 'Refund reason is required',
    'string.max': 'Refund reason cannot exceed 1000 characters'
  })
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

      logger.warn('Payment validation failed', {
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
    invoiceId: Joi.number().integer().positive().optional(),
    patientId: Joi.number().integer().positive().optional(),
    status: Joi.string().optional(),
    paymentMethod: Joi.string().optional(),
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

export class PaymentsController {
  // GET /payments
  static async getPayments(req: Request, res: Response) {
    try {
      logger.info('Getting payments', {
        filters: req.query,
        correlationId: req.correlationId
      });

      const pagination = {
        page: Number(req.query.page) || 1,
        limit: Math.min(Number(req.query.limit) || 20, 100)
      };

      const filters = {
        invoiceId: req.query.invoiceId ? Number(req.query.invoiceId) : undefined,
        patientId: req.query.patientId ? Number(req.query.patientId) : undefined,
        status: req.query.status as string,
        paymentMethod: req.query.paymentMethod as string,
        dateRange: {
          start: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
          end: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
        }
      };

      const result = await paymentService.getPayments(filters, pagination, req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get payments', error as Error, {
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve payments',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // GET /payments/:id
  static async getPayment(req: Request, res: Response) {
    try {
      const paymentId = Number(req.params.id);

      if (isNaN(paymentId) || paymentId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid payment ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Getting payment', {
        paymentId,
        correlationId: req.correlationId
      });

      const result = await paymentService.getPayment(paymentId, req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get payment', error as Error, {
        paymentId: req.params.id,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve payment',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // POST /payments
  static async processPayment(req: Request, res: Response) {
    try {
      logger.info('Processing payment', {
        invoiceId: req.body.invoiceId,
        patientId: req.body.patientId,
        amount: req.body.amount,
        paymentMethod: req.body.paymentMethod,
        correlationId: req.correlationId
      });

      // Add processed by from authenticated user if available
      if (req.user?.id) {
        req.body.processedBy = req.user.id;
      }

      const result = await paymentService.processPayment(req.body, req.correlationId);

      if (result.success) {
        const status = result.data?.status === 'completed' ? 201 : 202;
        res.status(status).json(result);
      } else {
        const statusCode = result.error?.code === ErrorCodes.VALIDATION_ERROR ? 400 :
                         result.error?.code === ErrorCodes.BUSINESS_RULE_VIOLATION ? 409 : 500;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to process payment', error as Error, {
        paymentData: {
          invoiceId: req.body.invoiceId,
          patientId: req.body.patientId,
          amount: req.body.amount
        },
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to process payment',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // POST /payments/:id/refund
  static async refundPayment(req: Request, res: Response) {
    try {
      const paymentId = Number(req.params.id);

      if (isNaN(paymentId) || paymentId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid payment ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      const { amount, reason } = req.body;

      logger.info('Processing payment refund', {
        paymentId,
        amount,
        reason,
        correlationId: req.correlationId
      });

      const result = await paymentService.refundPayment(paymentId, amount, reason, req.correlationId);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 :
                         result.error?.code === ErrorCodes.BUSINESS_RULE_VIOLATION ? 409 : 400;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to process refund', error as Error, {
        paymentId: req.params.id,
        amount: req.body.amount,
        reason: req.body.reason,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to process refund',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // GET /payments/stats
  static async getPaymentStats(req: Request, res: Response) {
    try {
      logger.info('Getting payment statistics', {
        correlationId: req.correlationId
      });

      const result = await paymentService.getPaymentStatistics(req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get payment statistics', error as Error, {
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve payment statistics',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // POST /payments/mpesa/callback
  static async mpesaCallback(req: Request, res: Response) {
    try {
      logger.info('Processing M-Pesa callback', {
        body: req.body,
        correlationId: req.correlationId
      });

      // Process M-Pesa callback
      // This would validate the callback signature and update payment status

      // For now, just acknowledge receipt
      res.json({
        ResultCode: 0,
        ResultDesc: 'Success',
        ThirdPartyTransID: req.body?.Body?.stkCallback?.ThirdPartyTransID || 'unknown'
      });

      logger.info('M-Pesa callback processed', {
        transactionId: req.body?.Body?.stkCallback?.ThirdPartyTransID,
        correlationId: req.correlationId
      });

    } catch (error) {
      logger.error('Failed to process M-Pesa callback', error as Error, {
        body: req.body,
        correlationId: req.correlationId
      });

      // Still acknowledge receipt even if processing failed
      res.json({
        ResultCode: 1,
        ResultDesc: 'Processing failed',
        ThirdPartyTransID: 'unknown'
      });
    }
  }
}

export const paymentsValidationMiddleware = {
  validateCreatePayment: validate(createPaymentSchema),
  validateRefundPayment: validate(refundPaymentSchema),
  validateQuery
};