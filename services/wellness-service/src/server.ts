import { config } from './config/index.js';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Database } from './models/Database.js';
import { WinstonLogger as Logger } from './utils/WinstonLogger';
import { WellnessService } from './services/WellnessService';
import { auditMiddleware } from './middleware/auditMiddleware.js';
import { responseMiddleware, errorHandler, notFoundHandler } from './middleware/responseMiddleware';
import wellnessRoutes from './routes/index.js';

function createApp() {
  const app = express();

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

  // CORS configuration
  app.use(cors({
    origin: config.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-User-ID', 'X-Company-ID'],
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Audit and response middleware
  app.use(auditMiddleware);
  app.use(responseMiddleware);

  // Health check endpoint
  app.get('/health', async (req: Request, res: Response) => {
    const healthStatus = await Database.getInstance().healthCheck();
    res.json({
      service: 'wellness-service',
      status: healthStatus.status,
      timestamp: new Date().toISOString(),
      database: healthStatus,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // API routes
  app.use('/api/wellness', wellnessRoutes);

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      service: 'wellness-service',
      status: 'running',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

async function bootstrap() {
  const logger = new Logger('wellness-service');

  try {
    logger.info('Starting Wellness Service', {
      environment: config.nodeEnv,
      port: config.port,
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
    const app = createApp();

    // Start server
    const server = app.listen(config.port, () => {
      logger.info('Wellness Service started successfully', {
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