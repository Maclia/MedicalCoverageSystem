import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import {
  correlationIdMiddleware,
  requestTimingMiddleware,
  errorAuditMiddleware
} from './middleware/auditMiddleware';
import {
  standardizeResponse,
  addSecurityHeaders,
  addApiVersion,
  addRequestTiming,
  standardErrorResponse
} from './middleware/responseStandardization';
import { addAuthHeaders } from './middleware/auth';
import routes from './api/routes';
import { createLogger } from './utils/logger';
import { serviceRegistry } from './services/ServiceRegistry';

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
if (config.security.trustProxy) {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: config.security.enableCSP ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  } : false,
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
    const allowedOrigins = config.security.corsOrigins;

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
    'X-Service-Token',
    'X-Forwarded-For',
    'X-Forwarded-Proto',
    'X-Forwarded-Host'
  ],
  exposedHeaders: [
    'X-Correlation-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Response-Time',
    'API-Version',
    'X-Gateway-Service'
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
app.use(addAuthHeaders);
app.use(standardizeResponse);
app.use(addSecurityHeaders);
app.use(addApiVersion('v1'));
app.use(addRequestTiming);

// Request timing logging
app.use((req, res, next) => {
  req.startTime = Date.now();
  res.on('finish', () => {
    const responseTime = Date.now() - (req.startTime || Date.now());
    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
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

  // Shutdown service registry
  serviceRegistry.shutdown();

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
  logger.info(`🚀 API Gateway starting on port ${config.port}`);
  logger.info(`🏥 Medical Coverage System - Central API Gateway`);
  logger.info(`🔧 Environment: ${config.nodeEnv}`);
  logger.info(`🛡️ Security: Enhanced with helmet, CORS, and rate limiting`);
  logger.info(`🔄 Services: ${serviceRegistry.getAllServices().length} registered`);
  logger.info(`📊 Health: http://localhost:${config.port}/health`);
  logger.info(`📚 Docs: http://localhost:${config.port}/docs`);
  logger.info(`� Swagger UI: http://localhost:${config.port}/api-docs`);
  logger.info(`�📈 Services: http://localhost:${config.port}/services`);

  // Log service registry status
  const healthyServices = serviceRegistry.getHealthyServices();
  logger.info('Service registry initialized', {
    totalServices: serviceRegistry.getAllServices().length,
    healthyServices: healthyServices.length,
    services: serviceRegistry.getAllServices()
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