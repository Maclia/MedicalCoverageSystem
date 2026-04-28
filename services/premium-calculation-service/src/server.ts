import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { auditMiddleware } from './middleware/auditMiddleware';
import { responseStandardization } from './middleware/responseStandardization.js';
import { checkDatabaseConnection, closeDatabase } from './config/database.js';
import { createLogger } from './utils/logger';
import routes from './routes';

const logger = createLogger('server');
const app = express();

// MIDDLEWARE ORDER - THIS ORDER IS MANDATORY
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(auditMiddleware);
app.use(express.json({ limit: '1mb' }));
app.use(responseStandardization);

// ROUTES
app.use('/api', routes);

// ERROR HANDLER - ALWAYS LAST
app.use(errorHandler);

// Initialize dependencies
const startServer = async () => {
  try {
    logger.info('Initializing premium calculation service...');
    
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Failed to establish database connection');
    }
    logger.info('✅ Database connection established');

    const server = app.listen(config.port, () => {
      logger.info(`✅ Premium Calculation Service running on port ${config.port}`);
      logger.info(`✅ Environment: ${config.environment}`);
    });

    // Graceful shutdown handlers
    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}, initiating graceful shutdown`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        await closeDatabase();
        logger.info('✅ All resources shutdown completed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Force shutting down after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer();
