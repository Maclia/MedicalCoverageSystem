import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3009', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  database: {
    url: process.env.DATABASE_URL,
    pool: {
      max: 25,
      idleTimeoutMillis: 30000,
      statement_timeout: 30000,
      keepAlive: true
    }
  },
  redisUrl: process.env.REDIS_URL
};
