import { createClient, RedisClientType } from 'redis';
import { createLogger } from './logger';

const logger = createLogger();

interface RedisConfig {
  url: string;
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  tls?: boolean;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  connectTimeout: number;
  commandTimeout: number;
  offlineQueue: boolean;
  isolate: boolean;
}

class RedisManager {
  private static instance: RedisManager;
  private client: RedisClientType;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // 1 second

  private constructor() {
    this.initializeClient();
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  private initializeClient(): void {
    const config: RedisConfig = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'medical_coverage:',
      tls: process.env.NODE_ENV === 'production',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
      offlineQueue: false,
      isolate: false
    };

    this.client = createClient({
      socket: {
        host: config.host,
        port: config.port,
        reconnectStrategy: (retries) => {
          logger.warn('Redis reconnection attempt', {
            attempt: retries,
            maxAttempts: this.maxReconnectAttempts
          });

          if (retries >= this.maxReconnectAttempts) {
            logger.error('Redis reconnection failed after maximum attempts');
            return new Error('Max reconnection attempts reached');
          }

          return Math.min(this.reconnectDelay * Math.pow(2, retries), 30000);
        },
        connectTimeout: config.connectTimeout,
      },
      password: config.password,
      database: config.db,
      name: 'medical-coverage-redis',
    });

    this.setupEventHandlers();
    this.connect();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connecting');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('Redis client ready and connected');
    });

    this.client.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis client error', error as Error);
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis client connection ended');
    });

    this.client.on('reconnecting', () => {
      this.reconnectAttempts++;
      logger.info(`Redis client reconnecting (attempt ${this.reconnectAttempts})`);
    });

    // Handle process termination
    process.on('SIGINT', () => this.disconnect());
    process.on('SIGTERM', () => this.disconnect());
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Redis client connected successfully');
    } catch (error) {
      logger.error('Failed to connect Redis client', error as Error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis client disconnected gracefully');
      }
    } catch (error) {
      logger.error('Error disconnecting Redis client', error as Error);
    }
  }

  public getClient(): RedisClientType {
    return this.client;
  }

  public isReady(): boolean {
    return this.isConnected && this.client.isOpen;
  }

  public async waitForConnection(timeout = 30000): Promise<boolean> {
    const startTime = Date.now();

    while (!this.isConnected && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return this.isConnected;
  }

  // Health check method
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency?: number;
    error?: string;
  }> {
    try {
      if (!this.isReady()) {
        return {
          status: 'unhealthy',
          error: 'Redis client not connected'
        };
      }

      const startTime = Date.now();
      const result = await this.client.ping();
      const latency = Date.now() - startTime;

      if (result === 'PONG') {
        return {
          status: 'healthy',
          latency
        };
      } else {
        return {
          status: 'unhealthy',
          error: 'Unexpected ping response'
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: (error as Error).message
      };
    }
  }

  // Connection statistics
  public getStats(): {
    isConnected: boolean;
    reconnectAttempts: number;
    clientInfo: any;
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      clientInfo: {
        isOpen: this.client.isOpen,
        options: this.client.options
      }
    };
  }
}

export const redisManager = RedisManager.getInstance();
export type { RedisClientType };
export default redisManager;