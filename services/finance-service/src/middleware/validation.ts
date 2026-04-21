import { Request, Response, NextFunction } from 'express';

type PrimitiveType = 'string' | 'number' | 'boolean' | 'object' | 'array';

type FieldRule = {
  type: PrimitiveType;
  required?: boolean;
  items?: Record<string, FieldRule>;
};

type ValidationSchema = {
  body?: Record<string, FieldRule>;
  params?: Record<string, FieldRule>;
  query?: Record<string, FieldRule>;
};

function isValidType(value: unknown, expectedType: PrimitiveType): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (expectedType === 'array') {
    return Array.isArray(value);
  }

  if (expectedType === 'object') {
    return typeof value === 'object' && !Array.isArray(value);
  }

  return typeof value === expectedType;
}

function validateSection(
  source: Record<string, unknown>,
  rules: Record<string, FieldRule>,
  prefix: string
): string[] {
  const errors: string[] = [];

  for (const [field, rule] of Object.entries(rules)) {
    const value = source[field];

    if ((value === undefined || value === null) && rule.required) {
      errors.push(`${prefix}.${field} is required`);
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    if (!isValidType(value, rule.type)) {
      errors.push(`${prefix}.${field} must be a ${rule.type}`);
      continue;
    }

    if (rule.type === 'array' && rule.items && Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item !== 'object' || item === null) {
          errors.push(`${prefix}.${field}[${index}] must be an object`);
          return;
        }
        errors.push(...validateSection(item as Record<string, unknown>, rule.items!, `${prefix}.${field}[${index}]`));
      });
    }
  }

  return errors;
}

export function validateRequest(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    if (schema.body) {
      errors.push(...validateSection((req.body ?? {}) as Record<string, unknown>, schema.body, 'body'));
    }
    if (schema.params) {
      errors.push(...validateSection((req.params ?? {}) as Record<string, unknown>, schema.params, 'params'));
    }
    if (schema.query) {
      errors.push(...validateSection((req.query ?? {}) as Record<string, unknown>, schema.query, 'query'));
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors,
      });
      return;
    }

    next();
  };
}
