import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { createLogger, generateCorrelationId } from './utils/logger.js';
import routes from './routes/index.js';
import { errorHandlerMiddleware, notFoundHandlerMiddleware } from './middleware/responseStandardizationMiddleware.js';
import { validateEnvironmentVariables } from './utils/validation.js';
import { auditMiddleware } from './middleware/auditMiddleware.js';
import PreAuthEscalationService from './services/PreAuthEscalationService.js';

const logger = createLogger();

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
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // CORS configuration - HANDLED AT API GATEWAY EDGE
  // Disabled to eliminate duplicate processing overhead
  // const corsOptions = {
  //   origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  //     // Allow requests with no origin (like mobile apps or curl requests)
  //     if (!origin) return callback(null, true);

  //     const allowedOrigins = config.cors.allowedOrigins;
  //     if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
  //       callback(null, true);
  //     } else {
  //       callback(new Error('Not allowed by CORS'), false);
  //     }
  //   },
  //   credentials: true,
  //   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  //   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID'],
  //   exposedHeaders: ['X-Total-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
  // };

  // app.use(cors(corsOptions));

  // Compression middleware
  app.use(compression());

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Correlation ID middleware
  app.use((req, res, next) => {
    req.correlationId = req.headers['x-correlation-id'] as string || generateCorrelationId();
    res.setHeader('X-Correlation-ID', req.correlationId);
    next();
  });

  // Audit middleware
  app.use(auditMiddleware);

  // Request logging middleware
  app.use((req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        correlationId: req.correlationId
      });
    });

    next();
  });

  // Health check endpoint (before authentication)
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'hospital-service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      environment: config.server.environment,
      correlationId: req.correlationId
    });
  });

  // API routes
  app.use('/api/v1', routes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      service: 'hospital-service',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        api: '/api/v1',
        patients: '/api/v1/patients',
        appointments: '/api/v1/appointments'
      },
      correlationId: req.correlationId
    });
  });

  // Error handling
  app.use(notFoundHandlerMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}

async function bootstrap() {
  try {
    // Validate environment variables
    await validateEnvironmentVariables();

    logger.info('Starting Hospital Service', {
      environment: config.server.environment,
      port: config.server.port,
      nodeVersion: process.version
    });

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(config.server.port, () => {
    logger.info('Hospital service started successfully', {
      port: config.server.port,
      environment: config.server.environment,
      nodeVersion: process.version,
      pid: process.pid
    });

    // Start background services
    PreAuthEscalationService.start();
    logger.info('✅ All background services initialized');
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.server.port} is already in use`);
      } else {
        logger.error('Server error', error);
      }
      process.exit(1);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown`);

      server.close(async () => {
        logger.info('HTTP server closed');

        // Stop background services
        PreAuthEscalationService.stop();
        logger.info('Background services stopped');

        // Close database connections
        try {
          const { db } = await import('./config/database.js');
          await db.$client.end();
          logger.info('Database connections closed');
        } catch (error) {
          logger.error('Error closing database connections', error as Error);
        }

        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force shutdown after timeout
      setTimeout(() => {
        logger.error('Graceful shutdown timeout, forcing exit');
        process.exit(1);
      }, 30000); // 30 seconds timeout
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', error);
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', undefined, {
        reason: reason instanceof Error ? reason.message : reason,
        promise: promise.toString()
      });
      gracefulShutdown('unhandledRejection');
    });

    return server;

  } catch (error) {
    logger.error('Failed to start Hospital service', error as Error);
    process.exit(1);
  }
}

// Start the service
bootstrap();