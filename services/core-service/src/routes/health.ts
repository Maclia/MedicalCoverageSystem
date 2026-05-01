import { Router } from 'express';
import { createLogger } from '../utils/logger';
import { checkDatabaseConnection } from '../config/database';

const logger = createLogger('health-route');
const router = Router();

interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  version: string;
  database: {
    connected: boolean;
    schemaVersion?: string;
  };
}

router.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    const version = process.env.npm_package_version || '1.0.0';

    // Check database connection
    const databaseConnected = await checkDatabaseConnection();
    const databaseInfo = {
      connected: databaseConnected,
      schemaVersion: databaseConnected ? 'core' : undefined
    };

    const response: HealthResponse = {
      status: 'ok',
      service: 'core-service',
      timestamp,
      version,
      database: databaseInfo
    };

    const responseTime = Date.now() - startTime;
    logger.info(`Health check completed in ${responseTime}ms`);

    res.status(200).json(response);
  } catch (error) {
    logger.error('Health check failed:', error as Error);
    res.status(500).json({
      status: 'error',
      service: 'core-service',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

export default router;
