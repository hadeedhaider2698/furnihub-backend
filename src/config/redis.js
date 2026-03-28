import { Redis } from '@upstash/redis';
import logger from '../utils/logger.js';

let redisClient = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redisClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  logger.info('Upstash Redis REST client configured');
} else {
  logger.warn('No Upstash Redis configuration found');
}

export const connectRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.ping();
      logger.info('Upstash Redis Connected successfully');
    } catch (err) {
      logger.error('Upstash Redis Connection Error', err);
    }
  }
};

export default redisClient;