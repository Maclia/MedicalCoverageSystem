import { createClient } from 'redis';
import { WinstonLogger } from '../utils/WinstonLogger.js';

const logger = new WinstonLogger('ReportCachingService');

export interface CacheOptions {
  ttl?: number;
  forceRefresh?: boolean;
}

class ReportCachingService {
  private client: any;
  private connected = false;
  private readonly DEFAULT_TTL = 300; // 5 minutes cache

  async initialize(): Promise<void> {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.client.on('error', (err: Error) => {
        logger.error('Redis client error', err);
        this.connected = false;
      });

      await this.client.connect();
      this.connected = true;
      logger.info('Report caching service initialized');

    } catch (error) {
      logger.warn('Redis connection failed - caching disabled', { error: (error as Error).message });
      this.connected = false;
    }
  }

  async getCachedReport(key: string): Promise<any | null> {
    if (!this.connected) return null;

    try {
      const data = await this.client.get(`report:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.warn('Cache get failed', { key, error: (error as Error).message });
      return null;
    }
  }

  async cacheReport(key: string, data: any, options?: CacheOptions): Promise<void> {
    if (!this.connected) return;

    try {
      const ttl = options?.ttl || this.DEFAULT_TTL;
      await this.client.setEx(`report:${key}`, ttl, JSON.stringify(data));
      logger.debug('Report cached', { key, ttl });
    } catch (error) {
      logger.warn('Cache set failed', { key, error: (error as Error).message });
    }
  }

  async invalidateReport(key: string): Promise<void> {
    if (!this.connected) return;

    try {
      await this.client.del(`report:${key}`);
      logger.info('Report cache invalidated', { key });
    } catch (error) {
      logger.warn('Cache invalidate failed', { key, error: (error as Error).message });
    }
  }

  async invalidateAllReports(): Promise<void> {
    if (!this.connected) return;

    try {
      const keys = await this.client.keys('report:*');
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info('All report caches invalidated', { count: keys.length });
      }
    } catch (error) {
      logger.warn('Cache bulk invalidate failed', { error: (error as Error).message });
    }
  }

  isAvailable(): boolean {
    return this.connected;
  }
}

export const reportCachingService = new ReportCachingService();
export default reportCachingService;
