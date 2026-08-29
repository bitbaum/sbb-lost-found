import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient, RedisClientType } from 'redis';
import { logger } from './utils/logger';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

let redisSub: RedisClientType;
let redisPub: RedisClientType;

// Keep a small in-memory buffer of recent events for quick diagnostics
const recentEvents: Array<{ channel: string; payload: any; at: string }> = [];
const pushRecent = (channel: string, payload: any) => {
  recentEvents.push({ channel, payload, at: new Date().toISOString() });
  if (recentEvents.length > 200) recentEvents.shift();
};

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
  });
});

// List recent relayed notifications (diagnostics only)
app.get('/api/notifications/recent', (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
  res.json({ success: true, data: recentEvents.slice(-limit).reverse() });
});

// Manually publish a notification event for testing
app.post('/api/notifications', async (req, res) => {
  try {
    const { channel = 'driver_notification', payload } = req.body || {};
    if (!payload || typeof payload !== 'object') {
      return res
        .status(400)
        .json({
          success: false,
          error: { code: 'INVALID_PAYLOAD', message: 'payload object is required' },
        });
    }
    await redisPub.publish(channel, JSON.stringify(payload));
    res.status(202).json({ success: true });
  } catch (error) {
    logger.error('Failed to publish notification', { error });
    res
      .status(500)
      .json({
        success: false,
        error: { code: 'PUBLISH_FAILED', message: 'Failed to publish notification' },
      });
  }
});

const start = async () => {
  try {
    const port = Number(process.env.PORT || 3003);
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisSub = createClient({ url: redisUrl });
    redisPub = createClient({ url: redisUrl });
    redisSub.on('error', (err) => logger.error('Redis subscriber error', { err }));
    redisPub.on('error', (err) => logger.error('Redis publisher error', { err }));
    await Promise.all([redisSub.connect(), redisPub.connect()]);
    logger.info('Redis subscriber connected');

    // Channels to relay as WebSocket events
    const channels = ['driver_notification', 'lost_item_created', 'lost_item_status_updated'];

    for (const ch of channels) {
      await redisSub.subscribe(ch, (message: string) => {
        try {
          const event = JSON.parse(message);
          io.emit(ch, event);
          logger.debug('Relayed event', { channel: ch, type: event?.type });
          pushRecent(ch, event);
        } catch (error) {
          logger.error('Failed to relay event', { error, channel: ch, raw: message });
        }
      });
    }

    httpServer.listen(port, () => {
      logger.info(`Notification service listening on ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start notification service', { error });
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down');
  try {
    await Promise.allSettled([redisSub?.quit(), redisPub?.quit()]);
  } catch (error) {
    // Best-effort on the way down — a failed quit must not block shutdown, but
    // swallowing it silently is how a connection leak stays invisible.
    logger.warn('Redis quit failed during shutdown', { error });
  }
  httpServer.close(() => process.exit(0));
});

start();
