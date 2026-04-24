import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/index.js';
import { createLogger } from './utils/logger.js';
import fraudDetectionRoutes from './api/routes.js';
import { authenticateToken } from './middleware/authMiddleware.js';
import auditMiddleware from './middleware/auditMiddleware.js';
import rateLimiter from './middleware/rateLimitMiddleware.js';
import { tracingMiddleware } from '@shared/distributed-tracing/src/index.js';

const app: Express = express();
const logger = createLogger();

// Tracing middleware - FIRST in order
app.use(tracingMiddleware({
  serviceName: 'fraud-detection-service',
  includeUserAgent: true
}));

// Security Middleware
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: config.cors.allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
app.use(rateLimiter);

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.http(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  next();
});

// Audit Logging
app.use(auditMiddleware);

// Health check endpoint (unprotected)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'fraud-detection-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Protected API Routes - apply authentication
app.use('/api/fraud-detection', authenticateToken, fraudDetectionRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
});

// Start server
const port = config.port;
app.listen(port, () => {
  logger.info(`Fraud Detection Service running`, { port, environment: config.nodeEnv });
});

export default app;