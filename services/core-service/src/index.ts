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
  globalErrorHandler,
  notFoundHandler,
  setupGlobalErrorHandlers
} from './middleware/errorHandler';
import routes from './api/routes';
import { createLogger } from './utils/logger';
import { authService } from './services/AuthService';

const logger = createLogger();

// Setup global error handlers
setupGlobalErrorHandlers();

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
      config.services.apiGateway,
      'http://localhost:3000',
      'http://localhost:3001'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  exposedHeaders: ['X-Correlation-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Add correlation ID and timing middleware
app.use(correlationIdMiddleware);
app.use(requestTimingMiddleware);

// Health check endpoint (before authentication middleware)
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'core-service',
    version: '1.0.0',
    environment: config.nodeEnv,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
    }
  };

  res.json({
    success: true,
    data: health,
    correlationId: req.correlationId
  });
});

// API documentation endpoint
app.get('/docs', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'core-service',
      version: '1.0.0',
      description: 'Core authentication and user management service',
      endpoints: {
        authentication: '/auth',
        health: '/health',
        docs: '/docs'
      },
      documentation: `${req.protocol}://${req.get('host')}/api-docs`,
      correlationId: req.correlationId
    }
  });
});

// API routes
app.use('/auth', routes);

// Enhanced error handling with audit logging
app.use(errorAuditMiddleware);
app.use(globalErrorHandler);

// Handle 404 errors
app.use(notFoundHandler);

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  // Cleanup expired sessions
  authService.cleanupExpiredSessions().catch(error => {
    logger.error('Failed to cleanup expired sessions during shutdown', error);
  });

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
  logger.info(`🚀 Core Service starting on port ${config.port}`);
  logger.info(`🏥 Medical Coverage System - Authentication Service`);
  logger.info(`🔧 Environment: ${config.nodeEnv}`);
  logger.info(`🛡️ Security: Enhanced with helmet, CORS, and audit logging`);
  logger.info(`📊 Health: http://localhost:${config.port}/health`);
  logger.info(`📚 Docs: http://localhost:${config.port}/docs`);

  // Cleanup expired sessions on startup
  authService.cleanupExpiredSessions().catch(error => {
    logger.error('Failed to cleanup expired sessions on startup', error);
  });
});

// Setup session cleanup interval (run every hour)
setInterval(async () => {
  try {
    await authService.cleanupExpiredSessions();
  } catch (error) {
    logger.error('Failed to cleanup expired sessions', error);
  }
}, 60 * 60 * 1000); // 1 hour

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections and uncaught exceptions (already set up in setupGlobalErrorHandlers)

export default app;