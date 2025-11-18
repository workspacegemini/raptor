import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis;
  private readonly defaultTTL = 3600; // 1 hour

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.redis = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.redis.on('connect', () => {
      this.logger.log('✅ Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
    this.logger.log('Redis disconnected');
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttl, serialized);
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Cache DEL pattern: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      this.logger.error(`Cache DEL pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment counter
   */
  async increment(key: string, ttl?: number): Promise<number> {
    try {
      const value = await this.redis.incr(key);
      if (ttl && value === 1) {
        await this.redis.expire(key, ttl);
      }
      return value;
    } catch (error) {
      this.logger.error(`Cache INCR error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get or set with callback (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = this.defaultTTL,
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.logger.debug(`Cache HIT: ${key}`);
      return cached;
    }

    this.logger.debug(`Cache MISS: ${key}`);

    // Generate value
    const value = await factory();

    // Store in cache
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Cache keys generator helpers
   */
  keys = {
    organization: (id: string) => `org:${id}`,
    organizationSettings: (id: string) => `org:${id}:settings`,
    organizationStats: (id: string) => `org:${id}:stats`,
    user: (id: string) => `user:${id}`,
    userProgress: (id: string) => `user:${id}:progress`,
    course: (id: string) => `course:${id}`,
    coursesList: (orgId: string, filters: string) => `courses:${orgId}:${filters}`,
    skill: (id: string) => `skill:${id}`,
    skillsHierarchy: (orgId: string) => `skills:${orgId}:hierarchy`,
    lesson: (id: string) => `lesson:${id}`,
    aiJob: (id: string) => `ai-job:${id}`,
  };

  /**
   * Cache TTL constants (in seconds)
   */
  ttl = {
    short: 300, // 5 minutes
    medium: 900, // 15 minutes
    long: 3600, // 1 hour
    veryLong: 86400, // 24 hours
  };

  /**
   * Invalidate cache for organization
   */
  async invalidateOrganization(organizationId: string): Promise<void> {
    await this.delPattern(`org:${organizationId}*`);
    await this.delPattern(`courses:${organizationId}*`);
    await this.delPattern(`skills:${organizationId}*`);
    this.logger.log(`Invalidated cache for organization: ${organizationId}`);
  }

  /**
   * Invalidate cache for user
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.delPattern(`user:${userId}*`);
    this.logger.log(`Invalidated cache for user: ${userId}`);
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const info = await this.redis.info('stats');
      const dbSize = await this.redis.dbsize();

      return {
        connected: this.redis.status === 'ready',
        keysCount: dbSize,
        info: info.split('\r\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, string>),
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return { connected: false, error: error.message };
    }
  }
}
