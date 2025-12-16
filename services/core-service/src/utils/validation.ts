import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errors';
import { createLogger } from './logger';

const logger = createLogger();

export const validationSchemas = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
    userType: Joi.string().valid('insurance', 'institution', 'provider').required().messages({
      'any.only': 'User type must be one of: insurance, institution, provider',
      'any.required': 'User type is required'
    }),
    entityId: Joi.number().integer().positive().required().messages({
      'number.base': 'Entity ID must be a number',
      'number.integer': 'Entity ID must be an integer',
      'number.positive': 'Entity ID must be positive',
      'any.required': 'Entity ID is required'
    })
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    }),
    userType: Joi.string().valid('insurance', 'institution', 'provider').optional()
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required'
    })
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required'
    }),
    newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required().messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required'
    })
  }),

  updateProfile: Joi.object({
    email: Joi.string().email().optional().messages({
      'string.email': 'Please provide a valid email address'
    }),
    // Add other updatable fields as needed
  })
};

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
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

      throw new ValidationError('Request validation failed', { errors: details });
    }

    // Replace req.body with validated and cleaned data
    req.body = value;
    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Parameter validation failed', {
        errors: details,
        correlationId: req.correlationId
      });

      throw new ValidationError('Parameter validation failed', { errors: details });
    }

    // Replace req.params with validated and cleaned data
    req.params = value;
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
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

      logger.warn('Query validation failed', {
        errors: details,
        correlationId: req.correlationId
      });

      throw new ValidationError('Query validation failed', { errors: details });
    }

    // Replace req.query with validated and cleaned data
    req.query = value;
    next();
  };
};