import { Router, Request, Response } from 'express';
import { SagaStateRepository } from '../../../shared/message-queue/src/orchestrator/SagaStateRepository';
import { DeadLetterQueueManager } from '../../../shared/message-queue/src/queue/DeadLetterQueueManager';
import { EventStore } from '../../../shared/message-queue/src/events/EventStore';
import { createLogger } from '../../../shared/message-queue/src/config/logger';
import { errorAuditMiddleware as auditMiddleware } from '../middleware/auditMiddleware';
import { authenticateToken as authMiddleware } from '../middleware/auth';
import { db } from '../config/database.js';

const logger = createLogger();
const router = Router();
type SagaStatus = 'pending' | 'failed' | 'completed' | 'running' | 'compensating' | 'compensated';

// Initialize repositories
const sagaRepository = new SagaStateRepository(db);
const dlqManager = new DeadLetterQueueManager(db);
const eventStore = new EventStore(db);

// Initialize all repositories
(async () => {
  try {
    await sagaRepository.initialize();
    await dlqManager.initialize();
    await eventStore.initialize();
    logger.info('Operational tools repositories initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize operational tools repositories', error as Error);
  }
})();

/**
 * Saga Inspector Endpoints
 */

// Get all sagas with filtering
router.get('/sagas', authMiddleware, auditMiddleware, async (req: Request, res: Response) => {
  try {
    const { status, correlationId, limit = 100 } = req.query;
    
    let sagas;
    if (status) {
      sagas = await sagaRepository.getSagasByStatus(status as SagaStatus);
    } else if (correlationId) {
      sagas = await sagaRepository.getSagasByCorrelation(correlationId as string);
    } else {
      sagas = await sagaRepository.getPendingSagas();
    }
    
    res.json({
      success: true,
      data: sagas.slice(0, Number(limit))
    });
  } catch (error) {
    logger.error('Failed to fetch sagas', error as Error);
    res.status(500).json({ success: false, error: 'Failed to fetch sagas' });
  }
});

// Get specific saga details
router.get('/sagas/:id', authMiddleware, auditMiddleware, async (req: Request, res: Response) => {
  try {
    const saga = await sagaRepository.getSaga(req.params.id);
    
    if (!saga) {
      return res.status(404).json({ success: false, error: 'Saga not found' });
    }
    
    res.json({
      success: true,
      data: saga
    });
  } catch (error) {
    logger.error('Failed to fetch saga', error as Error);
    res.status(500).json({ success: false, error: 'Failed to fetch saga' });
  }
});

// Resume failed saga
router.post('/sagas/:id/resume', authMiddleware, auditMiddleware, async (req: Request, res: Response) => {
  try {
    const saga = await sagaRepository.getSaga(req.params.id);
    
    if (!saga) {
      return res.status(404).json({ success: false, error: 'Saga not found' });
    }
    
    // Reset saga status to running and retry from current step
    saga.status = 'running';
    saga.error = undefined;
    await sagaRepository.saveSaga(saga);
    
    logger.info('Saga resumed manually', { sagaId: req.params.id, userId: (req as any).user?.id });
    
    res.json({
      success: true,
      message: 'Saga resumed successfully',
      data: saga
    });
  } catch (error) {
    logger.error('Failed to resume saga', error as Error);
    res.status(500).json({ success: false, error: 'Failed to resume saga' });
  }
});

// Force retry specific saga step
router.post('/sagas/:id/retry-step/:step', authMiddleware, auditMiddleware, async (req: Request, res: Response) => {
  try {
    const saga = await sagaRepository.getSaga(req.params.id);
    
    if (!saga) {
      return res.status(404).json({ success: false, error: 'Saga not found' });
    }
    
    const stepIndex = parseInt(req.params.step);
    if (isNaN(stepIndex) || stepIndex < 0 || stepIndex >= saga.steps.length) {
      return res.status(400).json({ success: false, error: 'Invalid step index' });
    }
    
    // Set current step and reset status
    saga.currentStep = stepIndex;
    saga.status = 'running';
    saga.error = undefined;
    await sagaRepository.saveSaga(saga);
    
    logger.info('Saga step retry requested', { 
      sagaId: req.params.id, 
      step: stepIndex, 
      userId: (req as any).user?.id 
    });
    
    res.json({
      success: true,
      message: `Saga step ${stepIndex} retry initiated`,
      data: saga
    });
  } catch (error) {
    logger.error('Failed to retry saga step', error as Error);
    res.status(500).json({ success: false, error: 'Failed to retry saga step' });
  }
});

/**
 * DLQ Manager Endpoints
 */

// Get DLQ messages
router.get('/dlq', authMiddleware, auditMiddleware, async (req: Request, res: Response) => {
  try {
    const { queueName, limit = 100 } = req.query;
    const messages = await dlqManager.getFailedMessages(queueName as string, Number(limit));
    
    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    logger.error('Failed to fetch DLQ messages', error as Error);
    res.status(500).json({ success: false, error: 'Failed to fetch DLQ messages' });
  }
});

// Retry single DLQ message
router.post('/dlq/:id/retry', authMiddleware, auditMiddleware, async (req: Request, res: Response) => {
  try {
    const success = await dlqManager.retryMessage(req.params.id);
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'Message not found or already processed' });
    }
    
    logger.info('DLQ message retried manually', { messageId: req.params.id, userId: (req as any).user?.id });
    
    res.json({
      success: true,
      message: 'Message queued for retry'
    });
  } catch (error) {
    logger.error('Failed to retry DLQ message', error as Error);
    res.status(500).json({ success: false, error: 'Failed to retry message' });
  }
});

// Batch retry DLQ messages
router.post('/dlq/batch-retry', authMiddleware, auditMiddleware, async (req: Request, res: Response) => {
  try {
    const { messageIds, confirm } = req.body;
    
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, error: 'messageIds array is required' });
    }

    // Batch operation safeguards
    const MAX_BATCH_SIZE = 50;
    if (messageIds.length > MAX_BATCH_SIZE) {
      return res.status(400).json({ 
        success: false, 
        error: `Batch size limited to ${MAX_BATCH_SIZE} messages. Requested: ${messageIds.length}` 
      });
    }

    // Require explicit confirmation for batch operations
    if (confirm !== true && messageIds.length > 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'Batch operation requires explicit confirmation. Pass confirm: true in request body',
        warning: `You are about to retry ${messageIds.length} messages`,
        messageCount: messageIds.length
      });
    }
    
    const results = [];
    for (const id of messageIds) {
      const success = await dlqManager.retryMessage(id);
      results.push({ id, success });
    }
    
    const successCount = results.filter(r => r.success).length;
    
    logger.info('DLQ batch retry completed', { 
      total: messageIds.length, 
      successful: successCount,
      userId: (req as any).user?.id 
    });
    
    res.json({
      success: true,
      message: `Successfully retried ${successCount} of ${messageIds.length} messages`,
      data: results,
      batchSize: messageIds.length
    });
  } catch (error) {
    logger.error('Failed to batch retry DLQ messages', error as Error);
    res.status(500).json({ success: false, error: 'Failed to process batch retry' });
  }
});

// Mark DLQ message as resolved
router.post('/dlq/:id/resolve', authMiddleware, auditMiddleware, async (req: Request, res: Response) => {
  try {
    await dlqManager.resolveMessage(req.params.id);
    
    logger.info('DLQ message marked as resolved', { messageId: req.params.id, userId: (req as any).user?.id });
    
    res.json({
      success: true,
      message: 'Message marked as resolved'
    });
  } catch (error) {
    logger.error('Failed to resolve DLQ message', error as Error);
    res.status(500).json({ success: false, error: 'Failed to resolve message' });
  }
});

/**
 * Event Replay Tool Endpoints
 */

// Get events by correlation ID
router.get('/events/correlation/:correlationId', authMiddleware, auditMiddleware, async (req: Request, res: Response) => {
  try {
    const events = await eventStore.getEventsByCorrelationId(req.params.correlationId);
    
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    logger.error('Failed to fetch events by correlation', error as Error);
    res.status(500).json({ success: false, error: 'Failed to fetch events' });
  }
});

// Get events by type
router.get('/events/type/:type', authMiddleware, auditMiddleware, async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.query;
    const events = await eventStore.getEventsByType(req.params.type, Number(limit));
    
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    logger.error('Failed to fetch events by type', error as Error);
    res.status(500).json({ success: false, error: 'Failed to fetch events' });
  }
});

// Get events after sequence number
router.get('/events/after/:sequence', authMiddleware, auditMiddleware, async (req: Request, res: Response) => {
  try {
    const { limit = 1000 } = req.query;
    const events = await eventStore.getEventsAfterSequence(
      parseInt(req.params.sequence), 
      Number(limit)
    );
    
    res.json({
      success: true,
      data: events,
      nextSequence: events.length > 0 ? events[events.length - 1].sequence : null
    });
  } catch (error) {
    logger.error('Failed to fetch events after sequence', error as Error);
    res.status(500).json({ success: false, error: 'Failed to fetch events' });
  }
});

// Replay events for projection rebuilding
router.post('/events/replay', authMiddleware, auditMiddleware, async (req: Request, res: Response) => {
  try {
    const { 
      fromSequence, 
      eventTypes, 
      limit = 1000, 
      dryRun = true, 
      correlationId,
      aggregateId,
      aggregateType
    } = req.body;

    // Safety Guards
    const MAX_REPLAY_LIMIT = 1000;
    const safeLimit = Math.min(Number(limit), MAX_REPLAY_LIMIT);

    let events;

    // Scoped Replay Support
    if (correlationId) {
      events = await eventStore.getEventsByCorrelationId(correlationId);
    } else if (aggregateId) {
      if (!aggregateType) {
        return res.status(400).json({
          success: false,
          error: 'aggregateType is required when aggregateId is provided'
        });
      }

      events = await eventStore.getEventsForAggregate(aggregateId, aggregateType);
    } else {
      events = await eventStore.getEventsAfterSequence(fromSequence || 0, safeLimit);
    }
    
    if (eventTypes && Array.isArray(eventTypes)) {
      events = events.filter(e => eventTypes.includes(e.type));
    }

    // Apply limit after filtering
    events = events.slice(0, safeLimit);

    logger.info('Event replay requested', { 
      fromSequence, 
      eventTypes, 
      count: events.length,
      dryRun,
      correlationId,
      aggregateId,
      userId: (req as any).user?.id 
    });

    if (dryRun) {
      return res.json({
        success: true,
        message: `Dry run completed. ${events.length} events would be replayed`,
        dryRun: true,
        eventCount: events.length,
        eventPreview: events.slice(0, 10)
      });
    }

    // Actual replay execution only when dryRun is explicitly false
    logger.warn('ACTUAL EVENT REPLAY INITIATED', { 
      count: events.length, 
      userId: (req as any).user?.id 
    });
    
    res.json({
      success: true,
      message: `Replaying ${events.length} events`,
      dryRun: false,
      count: events.length,
      data: events
    });
  } catch (error) {
    logger.error('Failed to initiate event replay', error as Error);
    res.status(500).json({ success: false, error: 'Failed to initiate replay' });
  }
});

/**
 * Reconciliation Dashboard Endpoints
 */

// Get reconciliation statistics
router.get('/reconciliation/stats', authMiddleware, auditMiddleware, async (req: Request, res: Response) => {
  try {
    const [failedSagas, dlqMessages] = await Promise.all([
      sagaRepository.getSagasByStatus('failed'),
      dlqManager.getFailedMessages()
    ]);
    
    const stats = {
      failedSagas: failedSagas.length,
      pendingSagas: (await sagaRepository.getSagasByStatus('pending')).length,
      runningSagas: (await sagaRepository.getSagasByStatus('running')).length,
      dlqMessages: dlqMessages.length,
      dlqByQueue: dlqMessages.reduce((acc: any, msg) => {
        acc[msg.queueName] = (acc[msg.queueName] || 0) + 1;
        return acc;
      }, {}),
      lastUpdated: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to fetch reconciliation stats', error as Error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

export const operationalToolsRouter = router;
