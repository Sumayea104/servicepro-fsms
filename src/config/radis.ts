import { createClient, RedisClientType } from 'redis';

// Redis client configuration
const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 10000, // 10 seconds
    reconnectStrategy: (retries: number) => {
      // Exponential backoff: 2^n * 100ms, max 30 seconds
      return Math.min(retries * 100, 30000);
    },
  },
};

// Create Redis client
const redisClient: RedisClientType = createClient(redisConfig);

// Redis event handlers
redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('🔄 Redis connecting...');
});

redisClient.on('ready', () => {
  console.log('✅ Redis connected successfully');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

redisClient.on('end', () => {
  console.log('❌ Redis connection ended');
});

// Connect to Redis (only if not in test environment)
if (process.env.NODE_ENV !== 'test') {
  redisClient.connect().catch((err) => {
    console.error('❌ Redis connection failed:', err);
  });
}

// Cache helper functions
export const cache = {
  // Get value from cache
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  },

  // Set value in cache
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<boolean> {
    try {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  },

  // Delete value from cache
  async del(key: string): Promise<boolean> {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  },

  // Delete multiple keys by pattern
  async delByPattern(pattern: string): Promise<boolean> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Redis DEL pattern error:', error);
      return false;
    }
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  },

  // Increment value
  async increment(key: string, incrementBy: number = 1): Promise<number | null> {
    try {
      const result = await redisClient.incrBy(key, incrementBy);
      return result;
    } catch (error) {
      console.error('Redis INCR error:', error);
      return null;
    }
  },

  // Set expiration
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      await redisClient.expire(key, ttlSeconds);
      return true;
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      return false;
    }
  },

  // Get time to live
  async ttl(key: string): Promise<number> {
    try {
      return await redisClient.ttl(key);
    } catch (error) {
      console.error('Redis TTL error:', error);
      return -2;
    }
  },

  // Clear all cache
  async flushAll(): Promise<boolean> {
    try {
      await redisClient.flushAll();
      return true;
    } catch (error) {
      console.error('Redis FLUSH error:', error);
      return false;
    }
  },
};

// Cache key generators
export const cacheKeys = {
  user: (userId: string) => `user:${userId}`,
  technician: (technicianId: string) => `technician:${technicianId}`,
  serviceRequest: (requestId: string) => `service-request:${requestId}`,
  serviceRequestList: (filters: string) => `service-requests:list:${filters}`,
  workOrder: (orderId: string) => `work-order:${orderId}`,
  payment: (paymentId: string) => `payment:${paymentId}`,
  dashboard: (userId: string) => `dashboard:${userId}`,
};

// Rate limiting helper
export const rateLimit = {
  async increment(key: string, windowSeconds: number): Promise<number> {
    const multi = redisClient.multi();
    multi.incr(key);
    multi.expire(key, windowSeconds);
    const result = await multi.exec();
    return result?.[0] as number || 0;
  },
};

export default redisClient;