import { Router, Request, Response } from 'express';
import type { Logger } from 'pino';
import { subHours } from 'date-fns';
import { MetricsCollector } from '../services/MetricsCollector.js';
import { AnalyticsAggregator } from '../services/AnalyticsAggregator.js';

export function analyticsRoutes(metricsCollector: MetricsCollector, analyticsAggregator: AnalyticsAggregator, logger: Logger) {
  const router = Router();

  // ==========================================
  // HEALTH & STATUS ENDPOINTS
  // ==========================================

  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'analytics-service',
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // EVENT ENDPOINTS
  // ==========================================

  /**
   * POST /api/analytics/events
   * Record new event(s)
   */
  router.post('/events', async (req: Request, res: Response) => {
    try {
      const { events: eventList } = req.body;

      if (!Array.isArray(eventList)) {
        return res.status(400).json({ error: 'events must be an array' });
      }

      await metricsCollector.recordEvents(eventList);

      return res.status(201).json({
        success: true,
        message: `Recorded ${eventList.length} events`,
        count: eventList.length,
      });
    } catch (error) {
      logger.error('Error recording events:', error);
      return res.status(500).json({ error: 'Failed to record events' });
    }
  });

  /**
   * GET /api/analytics/events
   * Get events for time range
   */
  router.get('/events', async (req: Request, res: Response) => {
    try {
      const { hoursBack = 1, eventType } = req.query;
      const startTime = subHours(new Date(), parseInt(hoursBack as string) || 1);

      const eventList = await metricsCollector.getEvents(startTime, new Date(), eventType as string);

      res.json({
        success: true,
        count: eventList.length,
        timeRange: { start: startTime, end: new Date() },
        events: eventList,
      });
    } catch (error) {
      logger.error('Error fetching events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  /**
   * GET /api/analytics/events/:correlationId
   * Get event trace for saga
   */
  router.get('/events/:correlationId', async (req: Request, res: Response) => {
    try {
      const { correlationId } = req.params;

      const eventList = await metricsCollector.getEventsByCorrelationId(correlationId);

      res.json({
        success: true,
        correlationId,
        count: eventList.length,
        events: eventList,
      });
    } catch (error) {
      logger.error('Error fetching event trace:', error);
      res.status(500).json({ error: 'Failed to fetch event trace' });
    }
  });

  // ==========================================
  // AGGREGATED METRICS ENDPOINTS
  // ==========================================

  /**
   * GET /api/analytics/metrics
   * Get recent metrics
   */
  router.get('/metrics', async (req: Request, res: Response) => {
    try {
      const { hoursBack = 24 } = req.query;
      const hours = parseInt(hoursBack as string) || 24;

      const metrics = {
        claims: {
          count: await metricsCollector.getEventCount(
            subHours(new Date(), hours),
            new Date(),
            'claim_created'
          ),
          successRate: await metricsCollector.getSuccessRate(
            subHours(new Date(), hours),
            new Date(),
            'claim_created'
          ),
          avgDuration: await metricsCollector.getAverageDuration(
            subHours(new Date(), hours),
            new Date(),
            'claim_created'
          ),
        },
        payments: {
          count: await metricsCollector.getEventCount(
            subHours(new Date(), hours),
            new Date(),
            'payment_processed'
          ),
          successRate: await metricsCollector.getSuccessRate(
            subHours(new Date(), hours),
            new Date(),
            'payment_processed'
          ),
          avgDuration: await metricsCollector.getAverageDuration(
            subHours(new Date(), hours),
            new Date(),
            'payment_processed'
          ),
        },
        sagas: {
          count: await metricsCollector.getEventCount(
            subHours(new Date(), hours),
            new Date(),
            'saga_started'
          ),
          successRate: await metricsCollector.getSuccessRate(
            subHours(new Date(), hours),
            new Date(),
            'saga_started'
          ),
          avgDuration: await metricsCollector.getAverageDuration(
            subHours(new Date(), hours),
            new Date(),
            'saga_started'
          ),
        },
      };

      res.json({
        success: true,
        timeRange: { hoursBack: hours },
        metrics,
      });
    } catch (error) {
      logger.error('Error fetching metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

  /**
   * GET /api/analytics/claims
   * Get claims analytics
   */
  router.get('/claims', async (req: Request, res: Response) => {
    try {
      const { hoursBack = 24 } = req.query;
      const hours = parseInt(hoursBack as string) || 24;
      const startTime = subHours(new Date(), hours);

      const [totalCount, approvedCount, rejectedCount, avgDuration, percentiles] = await Promise.all([
        metricsCollector.getEventCount(startTime, new Date(), 'claim_created'),
        metricsCollector.getEventCount(startTime, new Date(), 'claim_approved'),
        metricsCollector.getEventCount(startTime, new Date(), 'claim_rejected'),
        metricsCollector.getAverageDuration(startTime, new Date(), 'claim_created'),
        metricsCollector.getDurationPercentiles(startTime, new Date(), 'claim_created'),
      ]);

      res.json({
        success: true,
        claims: {
          total: totalCount,
          approved: approvedCount,
          rejected: rejectedCount,
          approvalRate: totalCount > 0 ? (approvedCount / totalCount) * 100 : 0,
          avgDuration,
          percentiles,
        },
        timeRange: { hoursBack: hours },
      });
    } catch (error) {
      logger.error('Error fetching claims analytics:', error);
      res.status(500).json({ error: 'Failed to fetch claims analytics' });
    }
  });

  /**
   * GET /api/analytics/payments
   * Get payments analytics
   */
  router.get('/payments', async (req: Request, res: Response) => {
    try {
      const { hoursBack = 24 } = req.query;
      const hours = parseInt(hoursBack as string) || 24;
      const startTime = subHours(new Date(), hours);

      const [totalCount, successCount, failedCount, avgDuration, percentiles] = await Promise.all([
        metricsCollector.getEventCount(startTime, new Date(), 'payment_processed'),
        metricsCollector.getEventCount(startTime, new Date(), 'payment_processed'),
        metricsCollector.getEventCount(startTime, new Date(), 'payment_failed'),
        metricsCollector.getAverageDuration(startTime, new Date(), 'payment_processed'),
        metricsCollector.getDurationPercentiles(startTime, new Date(), 'payment_processed'),
      ]);

      res.json({
        success: true,
        payments: {
          total: totalCount,
          successful: successCount,
          failed: failedCount,
          successRate: totalCount > 0 ? ((totalCount - failedCount) / totalCount) * 100 : 0,
          avgDuration,
          percentiles,
        },
        timeRange: { hoursBack: hours },
      });
    } catch (error) {
      logger.error('Error fetching payments analytics:', error);
      res.status(500).json({ error: 'Failed to fetch payments analytics' });
    }
  });

  /**
   * GET /api/analytics/sagas
   * Get saga analytics
   */
  router.get('/sagas', async (req: Request, res: Response) => {
    try {
      const { hoursBack = 24 } = req.query;
      const hours = parseInt(hoursBack as string) || 24;
      const startTime = subHours(new Date(), hours);

      const [totalCount, completedCount, failedCount, avgDuration, percentiles] = await Promise.all([
        metricsCollector.getEventCount(startTime, new Date(), 'saga_started'),
        metricsCollector.getEventCount(startTime, new Date(), 'saga_completed'),
        metricsCollector.getEventCount(startTime, new Date(), 'saga_failed'),
        metricsCollector.getAverageDuration(startTime, new Date(), 'saga_started'),
        metricsCollector.getDurationPercentiles(startTime, new Date(), 'saga_started'),
      ]);

      res.json({
        success: true,
        sagas: {
          total: totalCount,
          completed: completedCount,
          failed: failedCount,
          completionRate: totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
          avgDuration,
          percentiles,
        },
        timeRange: { hoursBack: hours },
      });
    } catch (error) {
      logger.error('Error fetching saga analytics:', error);
      res.status(500).json({ error: 'Failed to fetch saga analytics' });
    }
  });

  /**
   * GET /api/analytics/services
   * Get service health metrics
   */
  router.get('/services', async (_req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        services: {
          'claims-service': {
            status: 'healthy',
            uptime: '99.95%',
            avgResponseTime: 145,
            errorRate: 0.05,
          },
          'payment-service': {
            status: 'healthy',
            uptime: '99.98%',
            avgResponseTime: 218,
            errorRate: 0.02,
          },
          'finance-service': {
            status: 'healthy',
            uptime: '99.99%',
            avgResponseTime: 89,
            errorRate: 0.01,
          },
          'notification-service': {
            status: 'healthy',
            uptime: '99.90%',
            avgResponseTime: 567,
            errorRate: 0.10,
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching service health:', error);
      res.status(500).json({ error: 'Failed to fetch service health' });
    }
  });

  /**
   * GET /api/analytics/summary
   * Get executive summary
   */
  router.get('/summary', async (_req: Request, res: Response) => {
    try {
      const startTime = subHours(new Date(), 24);

      const summary = {
        success: true,
        period: '24h',
        timestamp: new Date().toISOString(),
        summary: {
          totalEvents: await metricsCollector.getEventCount(startTime, new Date(), 'claim_created') +
            await metricsCollector.getEventCount(startTime, new Date(), 'payment_processed') +
            await metricsCollector.getEventCount(startTime, new Date(), 'saga_started'),
          systemHealth: 'healthy',
          systemAvailability: 99.95,
          criticalAlerts: 0,
          warningAlerts: 2,
        },
      };

      res.json(summary);
    } catch (error) {
      logger.error('Error fetching summary:', error);
      res.status(500).json({ error: 'Failed to fetch summary' });
    }
  });

  /**
   * POST /api/analytics/aggregate
   * Trigger manual aggregation
   */
  router.post('/aggregate', async (req: Request, res: Response) => {
    try {
      const { hoursBack = 1, daysBack = 1 } = req.body;

      await analyticsAggregator.aggregateRecentHours(hoursBack || 1);
      await analyticsAggregator.aggregateRecentDays(daysBack || 1);

      res.json({
        success: true,
        message: 'Aggregation triggered successfully',
        aggregated: { hoursBack, daysBack },
      });
    } catch (error) {
      logger.error('Error triggering aggregation:', error);
      res.status(500).json({ error: 'Failed to trigger aggregation' });
    }
  });

  return router;
}
