import express from 'express';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { auditMiddleware } from './middleware/auditMiddleware.js';
import { responseStandardization } from './middleware/responseStandardization.js';
import routes from './routes/index.js';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Database } from './models/Database.js';

const app = express();

// MIDDLEWARE ORDER - STANDARD MANDATORY ORDER
app.use(auditMiddleware);
app.use(helmet());
// CORS configuration - HANDLED AT API GATEWAY EDGE
// Disabled to eliminate duplicate processing overhead
// app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(responseStandardization);

// ROUTES
app.use('/api', routes);

// ERROR HANDLER - ALWAYS LAST
app.use(errorHandler);

// Initialize database connection before starting server
async function startServer() {
  try {
    // Initialize database connection
    const db = Database.getInstance();
    const dbConnected = await db.testConnection();
    
    if (!dbConnected) {
      throw new Error('Failed to establish database connection');
    }
    
    console.log('✅ Finance database connection established successfully');

    // Start server
    const server = app.listen(config.port, () => {
      console.log(`✅ Finance Service running on port ${config.port}`);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception in Finance Service:', error);
      gracefulShutdown(server);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection in Finance Service at:', promise, 'reason:', reason);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));

  } catch (error) {
    console.error('❌ Failed to start Finance Service:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(server: any) {
  console.log('🔄 Starting graceful shutdown of Finance Service...');
  
  try {
    // Close database connection
    const db = Database.getInstance();
    await db.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }

  server.close(() => {
    console.log('✅ Finance Service shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Force shutting down Finance Service after timeout');
    process.exit(1);
  }, 10000);
}

// Start the server
startServer();
