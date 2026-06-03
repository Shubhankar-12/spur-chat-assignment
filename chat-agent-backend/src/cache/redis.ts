import Redis from 'ioredis';
import { Message } from '../lib/types';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  connectTimeout: 1000,
  retryStrategy: () => null,
});

redis.on('error', () => {});

const sessionKey = (sessionId: string) => `session:${sessionId}`;
const TTL_SECONDS = 3600;

export async function cacheSession(
  sessionId: string,
  messages: Message[]
): Promise<void> {
  try {
    await redis.set(
      sessionKey(sessionId),
      JSON.stringify(messages),
      'EX',
      TTL_SECONDS
    );
  } catch {
    console.warn('[cache] Redis unavailable, skipping cache');
  }
}

export async function getCachedSession(
  sessionId: string
): Promise<Message[] | null> {
  try {
    const raw = await redis.get(sessionKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as Message[];
  } catch {
    console.warn('[cache] Redis unavailable, skipping cache');
    return null;
  }
}

export async function isRedisAvailable(): Promise<boolean> {
  try {
    await redis.connect().catch(() => {});
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}
