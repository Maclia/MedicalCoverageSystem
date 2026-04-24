import { app } from './index.js';
import { createLogger } from './utils/logger.js';
import { checkDatabaseConnection } from './config/database.js';

const logger = createLogger('claims-service');

const PORT = process.env.PORT || 3005;

// Check database connection before starting
checkDatabaseConnection()
  .then((connected: boolean) => {
    if (connected) {
      app.listen(PORT, () => {
        logger.info(`Claims service running on port ${PORT}`);
      });
    } else {
      logger.error('Failed to connect to database. Service will not start.');
      process.exit(1);
    }
  })
  .catch((error: Error) => {
    logger.error('Database connection check failed:', error);
    process.exit(1);
  });