import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/index.js';
import {
  correlationIdMiddleware,
  requestTimingMiddleware,
  errorAuditMiddleware
} from './middleware/auditMiddleware.js';
import {
  standardErrorResponse,
  addSecurityHeaders,
  addApiVersion,
  addRequestTiming
} from './middleware/responseStandardization.js';
import routes from './api/routes.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger();

// Setup global error handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', new Error(String(reason)), {
    promise: promise.toString()
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

const app = express();

// Trust proxy for correct IP addresses
app.set('trust proxy', 1);

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
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from any origin in development
    if (config.nodeEnv === 'development') {
      callback(null, true);
      return;
    }

    // Allow specific origins in production
    const allowedOrigins = [
      'http://localhost:3000', // API Gateway
      'http://localhost:3001', // Core Service
      'http://localhost:3003', // Hospital Service
      'http://localhost:3004', // Billing Service
      'http://localhost:3005', // Claims Service
      'http://localhost:3006'  // Payment Service
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Correlation-ID',
    'X-Service-Token'
  ],
  exposedHeaders: [
    'X-Correlation-ID',
    'X-Response-Time',
    'API-Version',
    'X-Service-Name'
  ]
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Custom middleware
app.use(correlationIdMiddleware);
app.use(requestTimingMiddleware);
app.use(addSecurityHeaders);
app.use(addApiVersion('v1'));
app.use(addRequestTiming);

// Request logging
app.use((req, res, next) => {
  req.startTime = Date.now();

  logger.info('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    correlationId: req.correlationId
  });

  res.on('finish', () => {
    const responseTime = Date.now() - (req.startTime || 0);
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      correlationId: req.correlationId
    });
  });

  next();
});

// API routes
app.use('/', routes);

// Enhanced error handling
app.use(errorAuditMiddleware);
app.use(standardErrorResponse);

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  // Close server
  server.close((err) => {
    if (err) {
      logger.error('Error during shutdown', err);
      process.exit(1);
    } else {
      logger.info('Graceful shutdown completed');
      process.exit(0);
    }
  });
};

// Start server
const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info(`🏥 Insurance Service starting on port ${config.port}`);
  logger.info(`💼 Medical Coverage System - Insurance Schemes & Benefits`);
  logger.info(`🔧 Environment: ${config.nodeEnv}`);
  logger.info(`🛡️ Security: Enhanced with helmet, CORS, and validation`);
  logger.info(`📊 Database: ${config.database.url ? 'Connected' : 'Not configured'}`);
  logger.info(`📈 Health: http://localhost:${config.port}/health`);
  logger.info(`📚 Docs: http://localhost:${config.port}/docs`);
  logger.info(`🔍 Schemes: http://localhost:${config.port}/schemes`);
  logger.info(`💊 Benefits: http://localhost:${config.port}/benefits`);

  // Log configuration
  logger.info('Service configuration', {
    port: config.port,
    nodeEnv: config.nodeEnv,
    database: config.database.url ? 'Configured' : 'Not configured',
    redis: config.redis.url,
    maxBenefitLimit: config.business.maxBenefitLimit,
    defaultSchemeDuration: config.business.defaultSchemeDuration
  });
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle SIGUSR2 for nodemon restart
process.once('SIGUSR2', () => {
  gracefulShutdown('SIGUSR2');
  process.kill(process.pid, 'SIGUSR2');
});

export default app;