import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Database } from './models/database';
import { WinstonLogger } from './utils/WinstonLogger';
import { CacheService } from './services/cache.service';
import { AuditService } from './services/audit.service';
import { MetricsService } from './services/metrics.service';

interface AppDependencies {
  database: Database;
  cacheService: CacheService;
  auditService: AuditService;
  metricsService: MetricsService;
  logger: WinstonLogger;
}

export function createApp(deps: AppDependencies) {
  const { database, cacheService, auditService, metricsService, logger } = deps;

  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    next();
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'finance-service',
      timestamp: new Date().toISOString()
    });
  });

  // API routes would go here
  app.get('/api/finance', (req, res) => {
    res.json({ message: 'Finance service API' });
  });

  // Error handling
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
  });

  return app;
}