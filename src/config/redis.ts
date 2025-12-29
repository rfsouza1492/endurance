import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.error('ERROR: REDIS_URL environment variable is required');
  process.exit(1);
}

const isUpstash = REDIS_URL.includes('upstash.io');

const url = isUpstash && REDIS_URL.startsWith('redis://')
  ? REDIS_URL.replace('redis://', 'rediss://')
  : REDIS_URL;

export const createRedisClient = (): RedisClientType => {
  const useTls = url.startsWith('rediss://');
  
  if (useTls) {
    return createClient({
      url: url,
      socket: {
        tls: true,
        rejectUnauthorized: false,
      },
    });
  }
  
  return createClient({
    url: url,
  });
};

const client = createRedisClient();

client.on('error', (err) => {
  console.error('Redis client error:', err);
});

export const testRedisConnection = async (): Promise<boolean> => {
  try {
    if (!client.isOpen) {
      await client.connect();
    }
    await client.ping();
    return true;
  } catch (error) {
    console.error('Redis connection test failed:', error);
    return false;
  }
};

export default client;

