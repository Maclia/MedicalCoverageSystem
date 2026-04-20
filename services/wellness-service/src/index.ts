import { config } from 'dotenv';
import express from 'express';
import { Database } from './models/Database';
import { WinstonLogger as Logger } from './utils/WinstonLogger';
import { WellnessService } from './services/WellnessService';

// Load environment variables
config();

const PORT = process.env.PORT || 3009;
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
  const database = Database.getInstance();
  const isConnected = await database.testConnection();
  
  if (!isConnected) {
    throw new Error('Failed to establish database connection');
  }
  
  logger.info('Database connected successfully');

  // Initialize wellness service
  const wellnessService = new WellnessService();
  logger.info('Wellness service initialized');

  // Create Express app
  const app = express();
  
  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', async (req, res) => {
    const healthStatus = await database.healthCheck();
    res.json({
      service: 'wellness-service',
      status: healthStatus.status,
      timestamp: new Date().toISOString(),
      database: healthStatus
    });
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
          await database.close();
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