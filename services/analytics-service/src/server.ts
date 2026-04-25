import express from 'express';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { responseStandardization } from './middleware/responseStandardization.js';
import createRoutes from './routes/index.js';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { pino } from 'pino';
import { MetricsCollector } from './services/MetricsCollector.js';
import { AnalyticsAggregator } from './services/AnalyticsAggregator.js';
import { DatabaseConnection } from './services/DatabaseConnection.js';

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// MIDDLEWARE ORDER - STANDARD MANDATORY ORDER
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(responseStandardization);

async function startServer() {
  try {
    // Initialize services
    const dbConnection = new DatabaseConnection(logger);
    await dbConnection.connect();
    const db = dbConnection.getClient();

    const metricsCollector = new MetricsCollector(db, logger);
    const analyticsAggregator = new AnalyticsAggregator(db, logger);
    analyticsAggregator.startAggregationSchedule(5 * 60 * 1000);

    // ROUTES - pass initialized dependencies
    app.use('/api', createRoutes(metricsCollector, analyticsAggregator, logger));

    // ERROR HANDLER - ALWAYS LAST
    app.use(errorHandler);

    app.listen(config.port, () => {
      logger.info(`Analytics Service running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
