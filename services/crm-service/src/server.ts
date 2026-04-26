import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import crmRoutes from './routes';
import { auditMiddleware } from './middleware/auditMiddleware';
import { responseStandardization, errorHandler, notFoundHandler } from './middleware/responseStandardization';
import { Database } from './models/Database';
import { WinstonLogger } from './utils/WinstonLogger';
import { initializeCrmSagas } from './integrations/CrmSagaOrchestrator';
import { eventClient } from './integrations/EventClient';

export function createApp() {
  const logger = new WinstonLogger('crm-service');

  const app = express();

  // ✅ STANDARD MIDDLEWARE ORDER - AUDIT MUST BE FIRST
  app.use(auditMiddleware);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Response Standardization
  app.use(responseStandardization);

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // API routes
  app.use('/api', crmRoutes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export async function bootstrap() {
  const logger = new WinstonLogger('crm-service');

  try {
    logger.info('Starting CRM Service', {
      environment: config.nodeEnv,
      port: config.port,
      nodeVersion: process.version
    });

    // Test database connection
    const database = Database.getInstance();
    const isConnected = await database.testConnection();

    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    logger.info('Database connected successfully');

    // Initialize event client
    eventClient.initialize()
      .then(() => logger.info('Event client initialized successfully'))
      .catch(err => logger.warn('Event client initialization failed', { error: err }));

    // Initialize Saga Orchestrator
    initializeCrmSagas();
    logger.info('CRM Saga orchestrator initialized successfully');

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(config.port, () => {
      logger.info('CRM Service started successfully', {
        port: config.port,
        environment: config.nodeEnv,
        pid: process.pid
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Shutdown event client
          await eventClient.shutdown();
          logger.info('Event client shutdown completed');
          
          // Close database connection
          const database = Database.getInstance();
          await database.close();

          logger.info('Database disconnected gracefully');
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
    logger.error('Failed to start CRM Service', { error });
    process.exit(1);
  }
}