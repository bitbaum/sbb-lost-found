import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

export const rateLimit = (maxRequests: number, windowSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = `rate_limit:${req.ip}:${req.route?.path || req.path}`;
      const current = await redisClient.incr(key);

      if (current === 1) {
        await redisClient.expire(key, windowSeconds);
      }

      if (current > maxRequests) {
        const ttl = await redisClient.ttl(key);
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          current,
          maxRequests,
          resetIn: ttl,
        });

        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            details: {
              limit: maxRequests,
              window: windowSeconds,
              resetIn: ttl,
            },
          },
        });
        return;
      }

      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, maxRequests - current).toString(),
        'X-RateLimit-Reset': new Date(
          Date.now() + (await redisClient.ttl(key)) * 1000,
        ).toISOString(),
      });

      next();
    } catch (error) {
      logger.error('Rate limiting error', { error });
      // Don't fail the request if rate limiting fails
      next();
    }
  };
};
