import express from 'express';
import dotenv from 'dotenv';
import { pino } from 'pino';
import { analyticsRoutes } from './api/routes.js';
import { MetricsCollector } from './services/MetricsCollector.js';
import { AnalyticsAggregator } from './services/AnalyticsAggregator.js';
import { DatabaseConnection } from './services/DatabaseConnection.js';

dotenv.config();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      singleLine: false,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  },
});

const app = express();
const PORT = process.env.PORT || 3009;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'analytics-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Initialize services
let metricsCollector: MetricsCollector;
let analyticsAggregator: AnalyticsAggregator;

async function initializeServices() {
  try {
    // Connect to database
    const dbConnection = new DatabaseConnection(logger);
    await dbConnection.connect();
    const db = dbConnection.getClient();

    logger.info('Database connected: medical_coverage_analytics');

    // Initialize metrics collector
    metricsCollector = new MetricsCollector(db, logger);
    logger.info('MetricsCollector initialized');

    // Initialize analytics aggregator
    analyticsAggregator = new AnalyticsAggregator(db, logger);
    logger.info('AnalyticsAggregator initialized');

    // Start background aggregation (every 5 minutes)
    analyticsAggregator.startAggregationSchedule(5 * 60 * 1000);
    logger.info('Aggregation schedule started (5 minute interval)');

    // Register routes
app.use('/api/analytics', analyticsRoutes(metricsCollector, analyticsAggregator, logger));

    logger.info('All analytics routes registered');
    logger.info('Endpoints:');
    logger.info('  GET /api/analytics/health');
    logger.info('  GET /api/analytics/metrics');
    logger.info('  GET /api/analytics/claims');
    logger.info('  GET /api/analytics/payments');
    logger.info('  GET /api/analytics/sagas');
    logger.info('  GET /api/analytics/services');
    logger.info('  GET /api/analytics/summary');
    logger.info('  POST /api/analytics/events');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Analytics Service listening on http://localhost:${PORT}`);
      logger.info('Service ready for connections!');
    });
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (analyticsAggregator) {
    analyticsAggregator.stopAggregationSchedule();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (analyticsAggregator) {
    analyticsAggregator.stopAggregationSchedule();
  }
  process.exit(0);
});

// Initialize and start
initializeServices().catch((error) => {
  logger.error('Fatal error during initialization:', error);
  process.exit(1);
});

export default app;
