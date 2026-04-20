import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createLogger } from './utils/logger';
import { checkDatabaseConnection } from './config/database';
import { schema } from './models/schema';
import claimsRoutes from './routes';

const app = express();
const logger = createLogger();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

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
        schemaVersion: schema.claims.$name
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

// Export app for testing
export { app };
export default app;

// Start server
const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  logger.info(`Claims service running on port ${PORT}`);
});
