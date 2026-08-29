import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

export let redisClient: RedisClientType;
export let redisPublisher: RedisClientType;
export let redisSubscriber: RedisClientType;

export const connectRedis = async (): Promise<void> => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = createClient({ url: redisUrl });
  redisPublisher = createClient({ url: redisUrl });
  redisSubscriber = createClient({ url: redisUrl });

  redisClient.on('error', (err) => logger.error('Redis Client Error', err));
  redisPublisher.on('error', (err) => logger.error('Redis Publisher Error', err));
  redisSubscriber.on('error', (err) => logger.error('Redis Subscriber Error', err));

  redisClient.on('connect', () => logger.info('Redis client connected'));
  redisPublisher.on('connect', () => logger.info('Redis publisher connected'));
  redisSubscriber.on('connect', () => logger.info('Redis subscriber connected'));

  await Promise.all([redisClient.connect(), redisPublisher.connect(), redisSubscriber.connect()]);

  logger.info('All Redis connections established');
};
