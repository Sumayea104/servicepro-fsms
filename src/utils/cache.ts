import { redis } from '../config/redis.js';

export async function withCache<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  if (!redis) return fn();
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;
  } catch {
    // fall through to source of truth
  }
  const result = await fn();
  try {
    await redis.set(key, JSON.stringify(result), { EX: ttlSeconds });
  } catch {
    // non-fatal
  }
  return result;
}

export async function invalidateCache(prefix: string): Promise<void> {
  if (!redis) return;
  try {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length) await redis.del(keys);
  } catch {
    // best-effort
  }
}
