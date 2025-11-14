import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;
let redisAvailable = false;

export async function initRedis() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
  redisClient = createClient({
    url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.warn('Redis connection failed after multiple retries. Continuing without Redis cache.');
            return false; // Stop retrying
          }
          return Math.min(retries * 50, 500);
        },
      },
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
      redisAvailable = false;
  });

  redisClient.on('connect', () => {
    console.log('Redis Client Connected');
      redisAvailable = true;
  });

  await redisClient.connect();
  
  // Test the connection
  try {
    await redisClient.ping();
    console.log('Redis connection test successful');
      redisAvailable = true;
      return redisClient;
    } catch (error) {
      console.warn('Redis connection test failed. Continuing without Redis cache:', error);
      redisAvailable = false;
      // Don't throw - allow server to continue without Redis
      return null;
    }
  } catch (error) {
    console.warn('Failed to initialize Redis. Continuing without Redis cache:', error);
    redisAvailable = false;
    // Don't throw - allow server to continue without Redis
    return null;
  }
}

export function getRedis() {
  if (!redisClient || !redisAvailable || !redisClient.isOpen) {
    return null;
  }
  return redisClient;
}

export function isRedisAvailable() {
  return redisAvailable && redisClient !== null && redisClient.isOpen;
}

export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
  }
}
