/**
 * Saga Orchestrator Routes
 * API endpoints for managing saga transactions
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import SagaOrchestrator, { StepAction } from '../services/SagaOrchestrator';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();
const sagaOrchestrator = new SagaOrchestrator();

/**
 * POST /api/saga/transactions
 * Start a new saga transaction
 */
router.post(
  '/transactions',
  authenticateToken,
  validateRequest({
    body: {
      sagaName: { type: 'string', required: true },
      claimId: { type: 'string', required: false },
      memberId: { type: 'string', required: true },
      amount: { type: 'number', required: true },
      currency: { type: 'string', required: false },
      metadata: { type: 'object', required: false },
    },
  }),
  async (req: Request, res: Response) => {
    try {
      const { sagaName, memberId, amount, currency = 'USD', metadata = {} } = req.body;
      const correlationId = uuidv4();

      const sagaTransaction = await sagaOrchestrator.startSaga(
        sagaName,
        correlationId,
        {
          memberId,
          amount,
          currency,
          requestId: req.headers['x-request-id'] || uuidv4(),
          initiatedBy: (req as any).user?.id || 'system',
          timestamp: new Date().toISOString(),
          ...metadata,
        }
      );

      res.status(201).json({
        success: true,
        data: {
          sagaId: sagaTransaction.id,
          correlationId: sagaTransaction.correlationId,
          status: sagaTransaction.status,
          startedAt: sagaTransaction.startedAt,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start saga';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * POST /api/saga/transactions/:sagaId/execute
 * Execute a saga transaction through all steps
 */
router.post(
  '/transactions/:sagaId/execute',
  authenticateToken,
  validateRequest({
    params: {
      sagaId: { type: 'string', required: true },
    },
    body: {
      executionPlan: {
        type: 'array',
        required: true,
        items: {
          step: { type: 'string', required: true },
          service: { type: 'string', required: true },
          endpoint: { type: 'string', required: true },
          method: { type: 'string', required: true },
          input: { type: 'object', required: true },
        },
      },
    },
  }),
  async (req: Request, res: Response) => {
    try {
      const { sagaId } = req.params;
      const { executionPlan } = req.body;

      // Fetch existing saga transaction
      const existingSaga = await sagaOrchestrator.getSagaStatus(sagaId);

      if (!existingSaga) {
        return res.status(404).json({
          success: false,
          error: 'Saga transaction not found',
        });
      }

      if (existingSaga.status !== 'pending') {
        return res.status(409).json({
          success: false,
          error: `Cannot execute saga with status: ${existingSaga.status}`,
        });
      }

      // Execute the saga
      const completedSaga = await sagaOrchestrator.executeSaga(
        existingSaga,
        executionPlan
      );

      res.status(200).json({
        success: true,
        data: {
          sagaId: completedSaga.id,
          status: completedSaga.status,
          stepsCompleted: completedSaga.steps.length,
          completedAt: completedSaga.completedAt,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Saga execution failed';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * POST /api/saga/transactions/:sagaId/claim-to-payment
 * Execute Claims → Payment → Notification workflow
 */
router.post(
  '/transactions/:sagaId/claim-to-payment',
  authenticateToken,
  validateRequest({
    params: {
      sagaId: { type: 'string', required: true },
    },
    body: {
      claimDetails: { type: 'object', required: true },
      paymentDetails: { type: 'object', required: true },
      notificationPreferences: { type: 'object', required: false },
    },
  }),
  async (req: Request, res: Response) => {
    try {
      const { sagaId } = req.params;
      const { claimDetails, paymentDetails, notificationPreferences = {} } = req.body;

      const existingSaga = await sagaOrchestrator.getSagaStatus(sagaId);

      if (!existingSaga) {
        return res.status(404).json({
          success: false,
          error: 'Saga transaction not found',
        });
      }

      // Build execution plan for claim-to-payment workflow
      const executionPlan = [
        {
          step: 'claim_created' as StepAction,
          service: 'claims-service',
          endpoint: '/api/claims',
          method: 'POST' as const,
          input: {
            ...claimDetails,
            memberId: existingSaga.metadata.memberId,
            timestamp: new Date().toISOString(),
          },
        },
        {
          step: 'payment_processed' as StepAction,
          service: 'finance-service',
          endpoint: '/api/payments/process',
          method: 'POST' as const,
          input: {
            ...paymentDetails,
            memberId: existingSaga.metadata.memberId,
            amount: existingSaga.metadata.amount,
            currency: existingSaga.metadata.currency,
            timestamp: new Date().toISOString(),
          },
        },
        {
          step: 'notification_sent' as StepAction,
          service: 'notification-service',
          endpoint: '/api/notifications',
          method: 'POST' as const,
          input: {
            ...notificationPreferences,
            memberId: existingSaga.metadata.memberId,
            messageType: 'payment_processed',
            timestamp: new Date().toISOString(),
          },
        },
      ];

      const completedSaga = await sagaOrchestrator.executeSaga(
        existingSaga,
        executionPlan
      );

      res.status(200).json({
        success: true,
        data: {
          sagaId: completedSaga.id,
          status: completedSaga.status,
          workflow: 'claim_to_payment',
          stepsCompleted: completedSaga.steps.length,
          completedAt: completedSaga.completedAt,
          results: completedSaga.steps.map(step => ({
            step: step.stepName,
            status: step.status,
            output: step.output,
          })),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Workflow execution failed';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * GET /api/saga/transactions/:sagaId
 * Get saga transaction status and details
 */
router.get(
  '/transactions/:sagaId',
  authenticateToken,
  validateRequest({
    params: {
      sagaId: { type: 'string', required: true },
    },
  }),
  async (req: Request, res: Response) => {
    try {
      const { sagaId } = req.params;

      const sagaTransaction = await sagaOrchestrator.getSagaStatus(sagaId);

      if (!sagaTransaction) {
        return res.status(404).json({
          success: false,
          error: 'Saga transaction not found',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          id: sagaTransaction.id,
          correlationId: sagaTransaction.correlationId,
          sagaName: sagaTransaction.sagaName,
          status: sagaTransaction.status,
          startedAt: sagaTransaction.startedAt,
          completedAt: sagaTransaction.completedAt,
          compensatedAt: sagaTransaction.compensatedAt,
          steps: sagaTransaction.steps.map(step => ({
            id: step.id,
            name: step.stepName,
            status: step.status,
            retryCount: step.retryCount,
            error: step.error,
            compensationExecuted: step.compensationExecuted,
            startedAt: step.startedAt,
            completedAt: step.completedAt,
          })),
          metadata: sagaTransaction.metadata,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch saga status';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * POST /api/saga/transactions/:sagaId/retry
 * Retry a failed saga from a specific step
 */
router.post(
  '/transactions/:sagaId/retry',
  authenticateToken,
  validateRequest({
    params: {
      sagaId: { type: 'string', required: true },
    },
    body: {
      fromStep: { type: 'number', required: true },
      executionPlan: { type: 'array', required: true },
    },
  }),
  async (req: Request, res: Response) => {
    try {
      const { sagaId } = req.params;
      const { fromStep, executionPlan } = req.body;

      const existingSaga = await sagaOrchestrator.getSagaStatus(sagaId);

      if (!existingSaga) {
        return res.status(404).json({
          success: false,
          error: 'Saga transaction not found',
        });
      }

      if (existingSaga.status !== 'failed') {
        return res.status(409).json({
          success: false,
          error: 'Can only retry failed sagas',
        });
      }

      if (fromStep < 0 || fromStep >= existingSaga.steps.length) {
        return res.status(400).json({
          success: false,
          error: 'Invalid step index',
        });
      }

      const retriedSaga = await sagaOrchestrator.retrySagaFromStep(
        existingSaga,
        fromStep,
        executionPlan
      );

      res.status(200).json({
        success: true,
        data: {
          sagaId: retriedSaga.id,
          status: retriedSaga.status,
          stepsCompleted: retriedSaga.steps.length,
          completedAt: retriedSaga.completedAt,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Retry failed';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * GET /api/saga/transactions
 * List all saga transactions with optional filtering
 */
router.get(
  '/transactions',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { status, correlationId, limit = 50, offset = 0 } = req.query;

      // Query database for sagas with optional filters
      const filters: any[] = [];

      // This would be implemented based on your actual database schema
      // For now, returning a basic response structure

      res.status(200).json({
        success: true,
        data: {
          total: 0,
          limit: Number(limit),
          offset: Number(offset),
          sagas: [],
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch sagas';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * GET /api/saga/transactions/:sagaId/audit-trail
 * Get detailed audit trail for a saga
 */
router.get(
  '/transactions/:sagaId/audit-trail',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { sagaId } = req.params;

      const sagaTransaction = await sagaOrchestrator.getSagaStatus(sagaId);

      if (!sagaTransaction) {
        return res.status(404).json({
          success: false,
          error: 'Saga transaction not found',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          sagaId: sagaTransaction.id,
          auditTrail: sagaTransaction.auditTrail,
          totalEntries: sagaTransaction.auditTrail.length,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch audit trail';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

export default router;
