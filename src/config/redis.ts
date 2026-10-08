import { createClient } from 'redis';
import { env } from './env.js';
import { logger } from './logger.js';

export const redis = env.REDIS_URL ? createClient({ url: env.REDIS_URL }) : null;

if (redis) {
  redis.on('error', (err) => logger.warn({ err }, 'Redis error (continuing without cache)'));
  redis.connect().catch((err) => logger.warn({ err }, 'Redis connection failed (continuing without cache)'));
}
