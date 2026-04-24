import { createClient, RedisClientType } from 'redis';
import { createLogger } from './logger.js';

const logger = createLogger();

class RedisManager {
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error', err);
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis client connected');
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis client disconnected');
    });

    this.connect().catch(err => {
      logger.error('Failed to connect to Redis on startup', err);
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }
}

export const redisManager = new RedisManager();