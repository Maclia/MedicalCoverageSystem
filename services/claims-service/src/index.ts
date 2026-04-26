import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createLogger, generateCorrelationId } from './utils/logger.js';
import { checkDatabaseConnection } from './config/database.js';
import { schema } from './models/schema.js';
import claimsRoutes from './routes/index.js';

const app = express();
const logger = createLogger();

// Middleware
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
// app.use(cors());

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Correlation ID middleware
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] as string || generateCorrelationId();
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

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

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await checkDatabaseConnection();
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'claims-service',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
      },
      database: {
        connected: dbStatus,
        schemaVersion: 'claims'
      }
    };
    res.json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({ status: 'error', message: 'Service unavailable' });
  }
});

// Claims routes
app.use('/api/claims', claimsRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

/**
 * Bootstrap the service with proper initialization sequence
 */
export async function bootstrap() {
  try {
    logger.info('Starting Claims Service', {
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3010,
      nodeVersion: process.version
    });

    // Test database connection
    const isConnected = await checkDatabaseConnection();
    
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    logger.info('Database connected successfully');

    // Start server
    const PORT = process.env.PORT || 3010;
    const server = app.listen(PORT, () => {
      logger.info('Claims Service started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        pid: process.pid
      });
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown`);

      server.close(async () => {
        logger.info('HTTP server closed');

        // Close database connections
        try {
          const { pool } = await import('./config/database.js');
          await pool.end();
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
    logger.error('Failed to start Claims Service', error as Error);
    process.exit(1);
  }
}

// Export app for testing
export { app };
export default app;

// Start the service if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  bootstrap();
}
