import { Request, Response } from 'express';
import { patientService } from '../services/PatientService';
import { createLogger } from '../utils/logger';
import {
  ResponseFactory,
  ErrorCodes,
  createValidationErrorResponse
} from '../utils/api-standardization';
import { Joi } from 'joi';

const logger = createLogger();

// Validation schemas
const createPatientSchema = Joi.object({
  firstName: Joi.string().required().max(100).messages({
    'string.empty': 'First name is required',
    'string.max': 'First name cannot exceed 100 characters'
  }),
  lastName: Joi.string().required().max(100).messages({
    'string.empty': 'Last name is required',
    'string.max': 'Last name cannot exceed 100 characters'
  }),
  dateOfBirth: Joi.date().required().max('now').messages({
    'date.base': 'Date of birth must be a valid date',
    'date.max': 'Date of birth cannot be in the future',
    'any.required': 'Date of birth is required'
  }),
  gender: Joi.string().valid('male', 'female', 'other').required().messages({
    'any.only': 'Gender must be male, female, or other',
    'string.empty': 'Gender is required'
  }),
  email: Joi.string().email().optional().messages({
    'string.email': 'Invalid email format'
  }),
  phone: Joi.string().required().max(20).messages({
    'string.empty': 'Phone number is required',
    'string.max': 'Phone number cannot exceed 20 characters'
  }),
  address: Joi.string().max(500).optional(),
  city: Joi.string().max(100).optional(),
  postalCode: Joi.string().max(20).optional(),
  country: Joi.string().default('Kenya').optional(),
  nationalId: Joi.string().max(50).optional(),
  passportNumber: Joi.string().max(50).optional(),
  emergencyContactName: Joi.string().max(100).optional(),
  emergencyContactPhone: Joi.string().max(20).optional(),
  emergencyContactRelationship: Joi.string().max(50).optional(),
  bloodType: Joi.string().max(10).optional(),
  allergies: Joi.array().items(Joi.string()).optional(),
  chronicConditions: Joi.array().items(Joi.string()).optional(),
  medications: Joi.array().items(Joi.string()).optional(),
  insuranceProvider: Joi.string().max(100).optional(),
  insurancePolicyNumber: Joi.string().max(100).optional(),
  preferredLanguage: Joi.string().default('English').optional(),
  medicalRecordNumber: Joi.string().max(20).optional()
});

const updatePatientSchema = createPatientSchema.fork(
  ['firstName', 'lastName', 'dateOfBirth', 'gender', 'phone'],
  (schema) => schema.optional()
);

const searchPatientsSchema = Joi.object({
  query: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Search query must be at least 2 characters',
    'string.max': 'Search query cannot exceed 100 characters',
    'any.required': 'Search query is required'
  }),
  limit: Joi.number().integer().min(1).max(50).default(10).optional()
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

      logger.warn('Patient validation failed', {
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
    search: Joi.string().max(100).optional(),
    gender: Joi.string().valid('male', 'female', 'other').optional(),
    ageMin: Joi.number().integer().min(0).max(120).optional(),
    ageMax: Joi.number().integer().min(0).max(120).optional(),
    isActive: Joi.boolean().optional(),
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

// Search query validation
const validateSearchQuery = (req: Request, res: Response, next: Function) => {
  const schema = searchPatientsSchema.validate(req.query);

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

export class PatientsController {
  // GET /patients
  static async getPatients(req: Request, res: Response) {
    try {
      logger.info('Getting patients', {
        filters: req.query,
        correlationId: req.correlationId
      });

      const pagination = {
        page: Number(req.query.page) || 1,
        limit: Math.min(Number(req.query.limit) || 20, 100)
      };

      const filters = {
        search: req.query.search as string,
        gender: req.query.gender as string,
        ageRange: {
          min: req.query.ageMin ? Number(req.query.ageMin) : undefined,
          max: req.query.ageMax ? Number(req.query.ageMax) : undefined
        },
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined
      };

      const result = await patientService.getPatients(filters, pagination, req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get patients', error as Error, {
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve patients',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // GET /patients/search
  static async searchPatients(req: Request, res: Response) {
    try {
      const query = req.query.query as string;
      const limit = Math.min(Number(req.query.limit) || 10, 50);

      logger.info('Searching patients', {
        query,
        limit,
        correlationId: req.correlationId
      });

      const result = await patientService.searchPatients(query, limit, req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to search patients', error as Error, {
        query: req.query.query,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to search patients',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // GET /patients/:id
  static async getPatient(req: Request, res: Response) {
    try {
      const patientId = Number(req.params.id);

      if (isNaN(patientId) || patientId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid patient ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Getting patient', {
        patientId,
        correlationId: req.correlationId
      });

      const result = await patientService.getPatient(patientId, req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get patient', error as Error, {
        patientId: req.params.id,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve patient',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // POST /patients
  static async createPatient(req: Request, res: Response) {
    try {
      logger.info('Creating patient', {
        name: `${req.body.firstName} ${req.body.lastName}`,
        email: req.body.email,
        correlationId: req.correlationId
      });

      const result = await patientService.createPatient(req.body, req.correlationId);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      logger.error('Failed to create patient', error as Error, {
        patientData: {
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          email: req.body.email
        },
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to create patient',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // PUT /patients/:id
  static async updatePatient(req: Request, res: Response) {
    try {
      const patientId = Number(req.params.id);

      if (isNaN(patientId) || patientId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid patient ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Updating patient', {
        patientId,
        updates: Object.keys(req.body),
        correlationId: req.correlationId
      });

      const result = await patientService.updatePatient(patientId, req.body, req.correlationId);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 : 400;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to update patient', error as Error, {
        patientId: req.params.id,
        updates: req.body,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to update patient',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // POST /patients/:id/deactivate
  static async deactivatePatient(req: Request, res: Response) {
    try {
      const patientId = Number(req.params.id);
      const reason = req.body.reason;

      if (isNaN(patientId) || patientId <= 0) {
        return res.status(400).json(
          ResponseFactory.createErrorResponse(
            ErrorCodes.BAD_REQUEST,
            'Invalid patient ID',
            { id: req.params.id },
            req.correlationId
          )
        );
      }

      logger.info('Deactivating patient', {
        patientId,
        reason,
        correlationId: req.correlationId
      });

      const result = await patientService.deactivatePatient(patientId, reason, req.correlationId);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.error?.code === ErrorCodes.NOT_FOUND ? 404 : 400;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Failed to deactivate patient', error as Error, {
        patientId: req.params.id,
        reason: req.body.reason,
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to deactivate patient',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }

  // GET /patients/stats
  static async getPatientStats(req: Request, res: Response) {
    try {
      logger.info('Getting patient statistics', {
        correlationId: req.correlationId
      });

      const result = await patientService.getPatientStats(req.correlationId);
      res.json(result);

    } catch (error) {
      logger.error('Failed to get patient statistics', error as Error, {
        correlationId: req.correlationId
      });

      res.status(500).json(
        ResponseFactory.createErrorResponse(
          ErrorCodes.INTERNAL_SERVER_ERROR,
          'Failed to retrieve patient statistics',
          { originalError: (error as Error).message },
          req.correlationId
        )
      );
    }
  }
}

export const patientsValidationMiddleware = {
  validateCreatePatient: validate(createPatientSchema),
  validateUpdatePatient: validate(updatePatientSchema),
  validateQuery,
  validateSearchQuery
};