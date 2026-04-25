import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

/**
 * Required document types by procedure code
 * These requirements are cached locally and periodically synchronized with insurance service
 */
const DOCUMENT_REQUIREMENTS: Record<string, string[]> = {
  '100.0': ['CLINICAL_NOTES', 'PRESCRIPTION'],
  '200.0': ['LAB_RESULTS', 'RADIOLOGY_REPORT'],
  '300.0': ['HOSPITAL_DISCHARGE_SUMMARY', 'OPERATIVE_NOTE'],
  '400.0': ['CONSULTATION_REPORT', 'SPECIALIST_REFERRAL'],
  '500.0': ['EMERGENCY_DEPARTMENT_NOTE', 'POLICE_REPORT?'],
  'default': ['CLINICAL_NOTES']
};

/**
 * Validate that required supporting documents are attached to requests
 */
export const documentValidationMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req as any).correlationId;

  try {
    const procedureCodes = req.body.procedureCodes || req.body.procedureCode ? 
      [req.body.procedureCode || req.body.procedureCodes].flat() : [];
    
    const providedDocuments = req.body.supportingDocuments || [];

    // Skip validation for status queries
    if (req.method === 'GET') {
      return next();
    }

    logger.debug('Validating supporting documents', {
      procedureCodes,
      documentCount: providedDocuments.length,
      correlationId
    });

    // Get all required document types
    const requiredDocuments = new Set<string>();
    
    for (const code of procedureCodes) {
      const requirements = DOCUMENT_REQUIREMENTS[code] || DOCUMENT_REQUIREMENTS.default;
      requirements.forEach(doc => {
        // Optional documents marked with ? are not enforced
        if (!doc.endsWith('?')) {
          requiredDocuments.add(doc);
        }
      });
    }

    // Check for missing required documents
    const missingDocuments: string[] = [];
    const providedTypes = providedDocuments.map((d: any) => typeof d === 'object' ? d.type : d);

    for (const required of requiredDocuments) {
      if (!providedTypes.includes(required)) {
        missingDocuments.push(required);
      }
    }

    if (missingDocuments.length > 0) {
      logger.warn('Rejected submission due to missing required documents', {
        missingDocuments,
        procedureCodes,
        correlationId
      });

      return res.status(422).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_DOCUMENTS',
          message: 'Required supporting documents are missing for this procedure',
          missingDocuments,
          documentationUrl: 'https://docs.medicalsystem.com/procedure-requirements'
        },
        correlationId
      });
    }

    // Validate document references exist (integrity check)
    if (providedDocuments.length > 0) {
      // This would call document service to verify existence
      // For now, perform format validation
      const invalidReferences = providedDocuments.filter((docId: string) => {
        return !docId.match(/^doc_[a-f0-9]{24}$/i);
      });

      if (invalidReferences.length > 0) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'INVALID_DOCUMENT_REFERENCE',
            message: 'One or more document references are invalid',
            invalidCount: invalidReferences.length
          },
          correlationId
        });
      }
    }

    logger.debug('Document validation passed', {
      procedureCodes,
      documentsValidated: providedDocuments.length,
      correlationId
    });

    next();

  } catch (error) {
    logger.error('Document validation failed', error as Error, { correlationId });
    
    // Fail open to not block submissions during system issues
    // Log incident and continue processing
    next();
  }
};