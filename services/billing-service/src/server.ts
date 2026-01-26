import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { config } from './config';
import { createLogger, generateCorrelationId } from './utils/logger';
import routes from './routes';
import { errorHandlerMiddleware, notFoundHandlerMiddleware } from './middleware/responseStandardizationMiddleware';
import { validateEnvironmentVariables } from './utils/validation';

const logger = createLogger();

class BillingServer {
  private app: express.Application;
  private server: any;
  private isShuttingDown = false;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
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

    // CORS configuration
    const corsOptions = {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = config.cors.allowedOrigins;
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID'],
      exposedHeaders: ['X-Total-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
    };

    this.app.use(cors(corsOptions));

    // Compression middleware
    this.app.use(compression());

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Correlation ID middleware
    this.app.use((req, res, next) => {
      req.correlationId = req.headers['x-correlation-id'] as string || generateCorrelationId();
      res.setHeader('X-Correlation-ID', req.correlationId);
      next();
    });

    // Request logging middleware
    this.app.use((req, res, next) => {
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
  }

  private setupRoutes(): void {
    // Health check endpoint (before authentication)
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'billing-service',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        environment: config.server.environment,
        correlationId: req.correlationId
      });
    });

    // API routes
    this.app.use('/api/v1', routes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'billing-service',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          api: '/api/v1',
          invoices: '/api/v1/invoices',
          payments: '/api/v1/payments',
          commissions: '/api/v1/commissions'
        },
        correlationId: req.correlationId
      });
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandlerMiddleware);

    // Global error handler
    this.app.use(errorHandlerMiddleware);
  }

  public async start(): Promise<void> {
    try {
      // Validate environment variables
      await validateEnvironmentVariables();

      // Create HTTP server
      this.server = createServer(this.app);

      // Start listening
      this.server.listen(config.server.port, () => {
        logger.info('Billing service started successfully', {
          port: config.server.port,
          environment: config.server.environment,
          nodeVersion: process.version,
          pid: process.pid
        });
      });

      // Handle server errors
      this.server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${config.server.port} is already in use`);
        } else {
          logger.error('Server error', error);
        }
        process.exit(1);
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start billing service', error as Error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        logger.warn('Shutdown already in progress, ignoring signal', { signal });
        return;
      }

      this.isShuttingDown = true;
      logger.info(`Received ${signal}, starting graceful shutdown`);

      try {
        // Stop accepting new connections
        if (this.server) {
          this.server.close(async () => {
            logger.info('HTTP server closed');

            // Close database connections
            try {
              const { db } = await import('./config/database');
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
        }
      } catch (error) {
        logger.error('Error during graceful shutdown', error as Error);
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', error);
      shutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', {
        reason: reason instanceof Error ? reason.message : reason,
        promise: promise.toString()
      });
      shutdown('unhandledRejection');
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new BillingServer();
  server.start();
}

export default BillingServer;