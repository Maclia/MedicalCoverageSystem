import { config } from 'dotenv';
import { createApp } from './app';
import { Database } from './models/database';
import { Logger } from './utils/logger';
import { CacheService } from './services/cache.service';
import { AuditService } from './services/audit.service';
import { MetricsService } from './services/metrics.service';

// Load environment variables
config();

const PORT = process.env.PORT || 3008;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function bootstrap() {
  const logger = new Logger('WellnessService');

  try {
    logger.info('Starting Wellness Service', {
      environment: NODE_ENV,
      port: PORT,
      nodeVersion: process.version
    });

    // Initialize database connection
    const database = new Database();
    await database.connect();
    logger.info('Database connected successfully');

    // Initialize cache service
    const cacheService = new CacheService();
    await cacheService.connect();
    logger.info('Cache service connected successfully');

    // Initialize audit service
    const auditService = new AuditService(database, logger);
    logger.info('Audit service initialized');

    // Initialize metrics service
    const metricsService = new MetricsService();
    await metricsService.initialize();
    logger.info('Metrics service initialized');

    // Create Express app
    const app = createApp({
      database,
      cacheService,
      auditService,
      metricsService,
      logger
    });

    // Start server
    const server = app.listen(PORT, () => {
      logger.info('Wellness Service started successfully', {
        port: PORT,
        environment: NODE_ENV,
        pid: process.pid
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await cacheService.disconnect();
          await database.disconnect();
          await metricsService.shutdown();

          logger.info('All services disconnected gracefully');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle process signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error });
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
      gracefulShutdown('unhandledRejection');
    });

    return server;

  } catch (error) {
    logger.error('Failed to start Wellness Service', { error });
    process.exit(1);
  }
}

// Start the service
bootstrap();