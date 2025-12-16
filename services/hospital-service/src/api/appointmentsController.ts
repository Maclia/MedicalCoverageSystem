import { Request, Response } from 'express';
import { appointmentService } from '../services/AppointmentService';
import { createLogger } from '../utils/logger';
import {
  ResponseFactory,
  ErrorCodes,
  createValidationErrorResponse
} from '../utils/api-standardization';
import { Joi } from 'joi';
import moment from 'moment';

const logger = createLogger();

// Validation schemas
const createAppointmentSchema = Joi.object({
  patientId: Joi.number().integer().positive().required().messages({
    'number.base': 'Patient ID must be a number',
    'number.integer': 'Patient ID must be an integer',
    'number.positive': 'Patient ID must be positive',
    'any.required': 'Patient ID is required'
  }),
  personnelId: Joi.number().integer().positive().required().messages({
    'number.base': 'Personnel ID must be a number',
    'number.integer': 'Personnel ID must be an integer',
    'number.positive': 'Personnel ID must be positive',
    'any.required': 'Personnel ID is required'
  }),
  institutionId: Joi.number().integer().positive().optional(),
  appointmentType: Joi.string().required().messages({
    'string.empty': 'Appointment type is required'
  }),
  appointmentDateTime: Joi.date().required().min('now').messages({
    'date.base': 'Appointment date/time must be a valid date',
    'date.min': 'Appointment date/time must be in the future',
    'any.required': 'Appointment date/time is required'
  }),
  duration: Joi.number().integer().min(15).max(180).required().messages({
    'number.base': 'Duration must be a number',
    'number.integer': 'Duration must be an integer',
    'number.min': 'Duration must be at least 15 minutes',
    'number.max': 'Duration cannot exceed 180 minutes',
    'any.required': 'Duration is required'
  }),
  reason: Joi.string().max(500).optional(),
  isEmergency: Joi.boolean().default(false).optional(),
  notes: Joi.string().max(1000).optional(),
  referredBy: Joi.number().integer().positive().optional(),
  预约方式: Joi.string().optional(),
  department: Joi.string().optional()
});

const updateAppointmentSchema = createAppointmentSchema.fork(
  ['patientId', 'personnelId', 'appointmentType', 'appointmentDateTime', 'duration'],
  (schema) => schema.optional()
);

const timeSlotsSchema = Joi.object({
  personnelId: Joi.number().integer().positive().required().messages({
    'number.base': 'Personnel ID must be a number',
    'number.integer': 'Personnel ID must be an integer',
    'number.positive': 'Personnel ID must be positive',
    'any.required': 'Personnel ID is required'
  }),
  startDate: Joi.date().required().min('now').messages({
    'date.base': 'Start date must be a valid date',
    'date.min': 'Start date must be today or later',
    'any.required': 'Start date is required'
  }),
  endDate: Joi.date().required().greater(Joi.ref('startDate')).messages({
    'date.base': 'End date must be a valid date',
    'any.required': 'End date is required',
    'date.greater': 'End date must be after start date'
  }),
  duration: Joi.number().integer().min(15).max(180).required().messages({
    'number.base': 'Duration must be a number',
    'number.integer': 'Duration must be an integer',
    'number.min': 'Duration must be at least 15 minutes',
    'number.max': 'Duration cannot exceed 180 minutes',
    'any.required': 'Duration is required'
  })
});

const cancelAppointmentSchema = Joi.object({
  reason: Joi.string().max(500).optional()
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

      logger.warn('Appointment validation failed', {
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
    personnelId: Joi.number().integer().positive().optional(),
    status: Joi.string().optional(),
    appointmentType: Joi.string().optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    isEmergency: Joi.boolean().optional(),
    department: Joi.string().optional(),
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

// Time slots query validation
const validateTimeSlotsQuery = (req: Request, res: Response, next: Function) => {
  const schema = timeSlotsSchema.validate({
    personnelId: req.query.personnelId,
    startDate: new Date(req.query.startDate as string),
    endDate: new Date(req.query.endDate as string),
    duration: Number(req.query.duration)
  });

  if (schema.error) {
    const details = schema.error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    return res.status(400).json(
      createValidationErrorResponse(details, req.correlationId)
    );
  }

  req.query = schema.value;
  next();
};

export class AppointmentsController {
  // GET /appointments
  static async getAppointments(req: Request, res: Response) {
    try {
      logger.info('Getting appointments', {
        filters: req.query,
        correlationId: req.correlationId
      });

      const pagination = {
        page: Number(req.query.page) || 1,
        limit: Math.min(Number(req.query.limit) || 20, 100)
      };

      const filters = {
        patientId: req.query.patientId ? Number(req.query.patientId) : undefined,
        personnelId: req.query.personnelId ? Number(req.query.personnelId) : undefined,
        status: req.query.status as string,
        appointmentType: req.query.appointmentType as string,
        dateRange: {
          start: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
          end: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
        },
        isEmergency: req.query.isEmergency !== undefined ? req.query.isEmergency === 'true' : undefined,
        department: req.query.department as string
      };

      const result = await appointmentService.getAppointments(filters, pagination, req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get appointments', error as Error, {
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve appointments',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // GET /appointments/:id
  static async getAppointment(req: Request, res: Response) {
    try {
      const appointmentId = Number(req.params.id);

      if (isNaN(appointmentId) || appointmentId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid appointment ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Getting appointment', {
        appointmentId,
        correlationId: req.correlationId
      });

      const result = await appointmentService.getAppointment(appointmentId, req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get appointment', error as Error, {
        appointmentId: req.params.id,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve appointment',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // POST /appointments
  static async createAppointment(req: Request, res: Response) {
    try {
      logger.info('Creating appointment', {
        patientId: req.body.patientId,
        personnelId: req.body.personnelId,
        appointmentType: req.body.appointmentType,
        appointmentDateTime: req.body.appointmentDateTime,
        correlationId: req.correlationId
      });

      const result = await appointmentService.createAppointment(req.body, req.correlationId);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      logger.error('Failed to create appointment', error as Error, {
        appointmentData: {
          patientId: req.body.patientId,
          personnelId: req.body.personnelId,
          appointmentType: req.body.appointmentType
        },
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to create appointment',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // PUT /appointments/:id
  static async updateAppointment(req: Request, res: Response) {
    try {
      const appointmentId = Number(req.params.id);

      if (isNaN(appointmentId) || appointmentId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid appointment ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Updating appointment', {
        appointmentId,
        updates: Object.keys(req.body),
        correlationId: req.correlationId
      });

      const result = await appointmentService.updateAppointment(appointmentId, req.body, req.correlationId);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 :
                         result.error?.code === ErrorCodes.BUSINESS_RULE_VIOLATION ? 409 : 400;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to update appointment', error as Error, {
        appointmentId: req.params.id,
        updates: req.body,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to update appointment',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // POST /appointments/:id/cancel
  static async cancelAppointment(req: Request, res: Response) {
    try {
      const appointmentId = Number(req.params.id);

      if (isNaN(appointmentId) || appointmentId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid appointment ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      const reason = req.body.reason;

      logger.info('Cancelling appointment', {
        appointmentId,
        reason,
        correlationId: req.correlationId
      });

      const result = await appointmentService.cancelAppointment(appointmentId, reason, req.correlationId);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 : 400;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to cancel appointment', error as Error, {
        appointmentId: req.params.id,
        reason: req.body.reason,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to cancel appointment',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // GET /appointments/available-slots
  static async getAvailableTimeSlots(req: Request, res: Response) {
    try {
      const personnelId = Number(req.query.personnelId);
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      const duration = Number(req.query.duration) || 30;

      if (isNaN(personnelId) || personnelId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Valid personnel ID is required',
            { personnelId: req.query.personnelId },
            req.correlationId
          )
        );
      }

      if (!startDate || !endDate || startDate >= endDate) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Valid start and end dates are required',
            {
              startDate: req.query.startDate,
              endDate: req.query.endDate
            },
            req.correlationId
          )
        );
      }

      if (isNaN(duration) || duration < 15 || duration > 180) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Duration must be between 15 and 180 minutes',
            { duration: req.query.duration },
            req.correlationId
          )
        );
      }

      logger.info('Getting available time slots', {
        personnelId,
        startDate,
        endDate,
        duration,
        correlationId: req.correlationId
      });

      const result = await appointmentService.getAvailableTimeSlots(
        personnelId,
        startDate,
        endDate,
        duration,
        req.correlationId
      );

      res.json(result);

    } catch (error) {
      logger.error('Failed to get available time slots', error as Error, {
        personnelId: req.query.personnelId,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve available time slots',
          { originalError: (Error as Error).message },
          req.correlationId
        )
      );
    }
  }
}

export const appointmentsValidationMiddleware = {
  validateCreateAppointment: validate(createAppointmentSchema),
  validateUpdateAppointment: validate(updateAppointmentSchema),
  validateCancelAppointment: validate(cancelAppointmentSchema),
  validateQuery,
  validateTimeSlotsQuery
};