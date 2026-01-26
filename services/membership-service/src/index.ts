import { config } from 'dotenv';
import { Database } from './models/Database';
import { WinstonLogger } from './utils/WinstonLogger';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import membershipRoutes from './routes/membership';
import { auditMiddleware } from './middleware/auditMiddleware';
import { responseMiddleware, errorHandler, notFoundHandler } from './middleware/responseMiddleware';

// Load environment variables
config();

const PORT = process.env.PORT || 3005;
const NODE_ENV = process.env.NODE_ENV || 'development';

function createApp() {
  const logger = new WinstonLogger('membership-service');

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
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
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
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Audit and response middleware
  app.use(auditMiddleware);
  app.use(responseMiddleware);

  // Health check endpoint
  app.get('/health', async (req, res) => {
    const db = Database.getInstance();
    const health = await db.healthCheck();

    res.json({
      status: health.status,
      timestamp: new Date().toISOString(),
      service: 'membership-service',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      database: health.status,
      latency: health.latency
    });
  });

  // API routes
  app.use('/api/members', membershipRoutes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      service: 'membership-service',
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
  const logger = new WinstonLogger('membership-service');

  try {
    logger.info('Starting Membership Service', {
      environment: NODE_ENV,
      port: PORT,
      nodeVersion: process.version
    });

    // Test database connection
    const database = Database.getInstance();
    const isConnected = await database.testConnection();

    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    logger.info('Database connected successfully');

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(PORT, () => {
      logger.info('Membership Service started successfully', {
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
    logger.error('Failed to start Membership Service', { error });
    process.exit(1);
  }
}

// Start the service
bootstrap();