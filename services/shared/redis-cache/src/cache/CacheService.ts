import { redisManager } from '../config/redis';
import { createLogger } from '../config/logger';
import { RedisClientType } from 'redis';

const logger = createLogger();

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  nx?: boolean; // Only set if key doesn't exist
  xx?: boolean; // Only set if key exists
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

export interface CachePattern {
  pattern: string;
  description: string;
  ttl?: number;
}

class CacheService {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0
  };

  private readonly patterns: Map<string, CachePattern> = new Map([
    ['patient:*', { pattern: 'patient:*', description: 'Patient data', ttl: 3600 }],
    ['appointment:*', { pattern: 'appointment:*', description: 'Appointment data', ttl: 1800 }],
    ['invoice:*', { pattern: 'invoice:*', description: 'Invoice data', ttl: 7200 }],
    ['payment:*', { pattern: 'payment:*', description: 'Payment data', ttl: 1800 }],
    ['insurance:*', { pattern: 'insurance:*', description: 'Insurance data', ttl: 3600 }],
    ['user:*', { pattern: 'user:*', description: 'User session data', ttl: 900 }],
    ['rate_limit:*', { pattern: 'rate_limit:*', description: 'Rate limiting', ttl: 300 }],
    ['config:*', { pattern: 'config:*', description: 'Configuration data', ttl: 86400 }],
    ['search:*', { pattern: 'search:*', description: 'Search results', ttl: 600 }],
    ['analytics:*', { pattern: 'analytics:*', description: 'Analytics data', ttl: 3600 }]
  ]);

  // Basic cache operations
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = redisManager.getClient();
      const value = await client.get(key);

      if (value) {
        this.stats.hits++;
        this.updateHitRate();
        logger.debug('Cache hit', { key });
        return JSON.parse(value) as T;
      } else {
        this.stats.misses++;
        this.updateHitRate();
        logger.debug('Cache miss', { key });
        return null;
      }
    } catch (error) {
      logger.error('Cache get error', error as Error, { key });
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    try {
      const client = redisManager.getClient();
      const serializedValue = JSON.stringify(value);

      let success = false;

      if (options.nx) {
        // Only set if key doesn't exist
        success = await client.setNX(key, serializedValue);
      } else if (options.xx) {
        // Only set if key exists
        const exists = await client.exists(key);
        if (exists) {
          await client.set(key, serializedValue);
          success = true;
        }
      } else {
        // Set normally
        await client.set(key, serializedValue);
        success = true;
      }

      if (success) {
        // Set TTL if provided
        if (options.ttl) {
          await client.expire(key, options.ttl);
        } else {
          // Use default TTL based on key pattern
          const defaultTtl = this.getDefaultTtl(key);
          if (defaultTtl) {
            await client.expire(key, defaultTtl);
          }
        }

        this.stats.sets++;
        logger.debug('Cache set', { key, ttl: options.ttl || this.getDefaultTtl(key) });
      }

      return success;
    } catch (error) {
      logger.error('Cache set error', error as Error, { key });
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const client = redisManager.getClient();
      const result = await client.del(key);

      if (result > 0) {
        this.stats.deletes++;
        logger.debug('Cache delete', { key });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Cache delete error', error as Error, { key });
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = redisManager.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', error as Error, { key });
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const client = redisManager.getClient();
      const result = await client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error('Cache expire error', error as Error, { key, seconds });
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const client = redisManager.getClient();
      return await client.ttl(key);
    } catch (error) {
      logger.error('Cache TTL error', error as Error, { key });
      return -1;
    }
  }

  // Batch operations
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const client = redisManager.getClient();
      const values = await client.mGet(keys);

      return values.map(value => {
        if (value) {
          this.stats.hits++;
          try {
            return JSON.parse(value) as T;
          } catch {
            this.stats.misses++;
            return null;
          }
        } else {
          this.stats.misses++;
          return null;
        }
      });
    } catch (error) {
      logger.error('Cache mget error', error as Error, { keys });
      return keys.map(() => null);
    }
  }

  async mset<T>(keyValuePairs: Array<[string, T]>): Promise<boolean> {
    try {
      const client = redisManager.getClient();
      const serializedPairs = keyValuePairs.map(([key, value]) => [key, JSON.stringify(value)]);

      await client.mSet(serializedPairs as [string, string][]);

      this.stats.sets += keyValuePairs.length;
      logger.debug('Cache mset', { count: keyValuePairs.length });

      return true;
    } catch (error) {
      logger.error('Cache mset error', error as Error, { count: keyValuePairs.length });
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      const client = redisManager.getClient();
      const keys = await this.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      const result = await client.del(keys);
      this.stats.deletes += result;

      logger.debug('Cache delete pattern', { pattern, count: result });
      return result;
    } catch (error) {
      logger.error('Cache delete pattern error', error as Error, { pattern });
      return 0;
    }
  }

  // Advanced operations
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      const client = redisManager.getClient();
      const result = await client.incrBy(key, amount);
      logger.debug('Cache increment', { key, amount, result });
      return result;
    } catch (error) {
      logger.error('Cache increment error', error as Error, { key, amount });
      throw error;
    }
  }

  async decrement(key: string, amount: number = 1): Promise<number> {
    try {
      const client = redisManager.getClient();
      const result = await client.decrBy(key, amount);
      logger.debug('Cache decrement', { key, amount, result });
      return result;
    } catch (error) {
      logger.error('Cache decrement error', error as Error, { key, amount });
      throw error;
    }
  }

  async addToSet<T>(key: string, member: T): Promise<boolean> {
    try {
      const client = redisManager.getClient();
      const serializedMember = JSON.stringify(member);
      await client.sAdd(key, serializedMember);
      logger.debug('Cache add to set', { key, member });
      return true;
    } catch (error) {
      logger.error('Cache add to set error', error as Error, { key });
      return false;
    }
  }

  async getSetMembers<T>(key: string): Promise<T[]> {
    try {
      const client = redisManager.getClient();
      const members = await client.sMembers(key);
      return members.map(member => JSON.parse(member) as T);
    } catch (error) {
      logger.error('Cache get set members error', error as Error, { key });
      return [];
    }
  }

  // Utility methods
  private getDefaultTtl(key: string): number | undefined {
    for (const [pattern, config] of this.patterns) {
      if (this.keyMatchesPattern(key, pattern)) {
        return config.ttl;
      }
    }
    return undefined;
  }

  private keyMatchesPattern(key: string, pattern: string): boolean {
    const regexPattern = pattern.replace(/\*/g, '.*');
    return new RegExp(`^${regexPattern}$`).test(key);
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  // Management methods
  async keys(pattern: string): Promise<string[]> {
    try {
      const client = redisManager.getClient();
      return await client.keys(pattern);
    } catch (error) {
      logger.error('Cache keys error', error as Error, { pattern });
      return [];
    }
  }

  async flush(): Promise<boolean> {
    try {
      const client = redisManager.getClient();
      await client.flushDb();
      logger.warn('Cache flushed');
      return true;
    } catch (error) {
      logger.error('Cache flush error', error as Error);
      return false;
    }
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0
    };
  }

  getPatterns(): CachePattern[] {
    return Array.from(this.patterns.values());
  }

  // Cache warming strategies
  async warmCache(patterns: string[], dataProvider: (key: string) => Promise<any>): Promise<void> {
    logger.info('Starting cache warming', { patterns });

    for (const pattern of patterns) {
      try {
        const keys = await this.keys(pattern);
        const missingKeys: string[] = [];

        for (const key of keys) {
          const exists = await this.exists(key);
          if (!exists) {
            missingKeys.push(key);
          }
        }

        for (const key of missingKeys) {
          try {
            const data = await dataProvider(key);
            if (data) {
              await this.set(key, data);
            }
          } catch (error) {
            logger.error('Cache warming data provider error', error as Error, { key });
          }
        }

        logger.info('Cache warming completed for pattern', { pattern, warmed: missingKeys.length });
      } catch (error) {
        logger.error('Cache warming pattern error', error as Error, { pattern });
      }
    }
  }

  // Cache invalidation strategies
  async invalidateByPattern(pattern: string): Promise<number> {
    logger.info('Cache invalidation by pattern', { pattern });
    return await this.deletePattern(pattern);
  }

  async invalidateByTag(tag: string): Promise<number> {
    // Implement tag-based invalidation using Redis sets
    const tagKey = `tags:${tag}`;
    const keys = await this.getSetMembers<string>(tagKey);

    if (keys.length > 0) {
      const deletedCount = await this.deletePattern(keys.join('|'));
      await this.delete(tagKey);

      logger.info('Cache invalidation by tag', { tag, count: deletedCount });
      return deletedCount;
    }

    return 0;
  }
}

export const cacheService = new CacheService();
export default cacheService;