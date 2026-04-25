import { Router } from 'express';
import type { Logger } from 'pino';
import healthRoutes from './health.js';
import { analyticsRoutes } from '../api/routes.js';
import { MetricsCollector } from '../services/MetricsCollector.js';
import { AnalyticsAggregator } from '../services/AnalyticsAggregator.js';

export function createRoutes(metricsCollector: MetricsCollector, analyticsAggregator: AnalyticsAggregator, logger: Logger) {
  const router = Router();

  // Health check
  router.use('/health', healthRoutes);

  // API Routes
  router.use('/analytics', analyticsRoutes(metricsCollector, analyticsAggregator, logger));

  return router;
}

export default createRoutes;
