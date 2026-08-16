import express from 'express';
import fs from 'fs';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import { logger } from './utils/logger';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const REPORTING_SERVICE_URL = process.env.REPORTING_SERVICE_URL || 'http://localhost:3001';
const MATCHING_SERVICE_URL = process.env.MATCHING_SERVICE_URL || 'http://localhost:3002';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003';

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Serve the prototype UI under /ui
try {
  const candidates = [
    path.resolve(__dirname, '../public'),
    path.resolve(process.cwd(), 'public'),
    path.resolve(process.cwd(), 'services/api-gateway/public'),
  ];
  const staticDir = candidates.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });
  if (staticDir) {
    app.use('/ui', express.static(staticDir));
  } else {
    logger.warn('Prototype UI not mounted: no public/ directory found', { candidates });
  }
} catch (error) {
  // Was `catch {}`. The prototype UI is optional, so failing to mount it must
  // not stop the gateway — but silence meant /ui could 404 with nothing
  // anywhere saying why.
  logger.warn('Prototype UI not mounted', { error });
}

// Dev-only: mock recent trips for prefill UX
app.get('/me/recent-trips', (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED' } });
  }
  const now = new Date();
  const mkTrip = (offsetH: number, route: string, vehicleId: string) => {
    const dep = new Date(now.getTime() - offsetH * 3600 * 1000);
    const arr = new Date(dep.getTime() + 45 * 60000);
    return {
      id: crypto.randomUUID?.() || String(Math.random()),
      route,
      vehicleId,
      departureTime: dep.toISOString(),
      arrivalTime: arr.toISOString(),
      tripDate: dep.toISOString().slice(0, 10)
    };
  };
  res.json({ success: true, data: [
    mkTrip(1, 'Zürich HB → Bern', 'IC 815'),
    mkTrip(3, 'Bern → Thun', 'S1 3412'),
    mkTrip(6, 'Zürich, Central → Loorenstrasse', 'Bus 761')
  ]});
});

// Aggregated health
app.get('/healthz', async (_req, res) => {
  const targets = [
    { name: 'reporting', url: REPORTING_SERVICE_URL + '/health' },
    { name: 'matching', url: MATCHING_SERVICE_URL + '/health' },
    { name: 'notification', url: NOTIFICATION_SERVICE_URL + '/health' },
  ];
  const results: Record<string, any> = {};
  await Promise.all(targets.map(async (t) => {
    try {
      const r = await fetch(t.url, { method: 'GET' });
      results[t.name] = { ok: r.ok, status: r.status };
    } catch (error) {
      results[t.name] = { ok: false, error: (error as Error).message };
    }
  }));
  res.json({ success: true, services: results });
});

// Lightweight proxy via fetch (avoids extra deps)
async function forward(targetBase: string, req: express.Request, res: express.Response) {
  try {
    const url = targetBase + req.originalUrl.replace(/^\/(reporting|matching|notifications)/, '');
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') headers[k] = v;
    }
    // Remove hop-by-hop headers
    delete headers['host']; delete headers['content-length'];

    let body: any = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.is('application/json') && req.body) {
        body = JSON.stringify(req.body);
        headers['content-type'] = 'application/json';
      }
    }
    const r = await fetch(url, { method: req.method, headers, body });
    res.status(r.status);
    // forward headers selectively
    r.headers.forEach((value, key) => {
      if (['content-type', 'cache-control'].includes(key)) res.setHeader(key, value);
    });
    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (error) {
    logger.error('Proxy error', { error: (error as Error).message, path: req.originalUrl });
    res.status(502).json({ success: false, error: { code: 'BAD_GATEWAY', message: 'Upstream error' } });
  }
}

app.use('/reporting', (req, res) => forward(REPORTING_SERVICE_URL, req, res));
app.use('/matching', (req, res) => forward(MATCHING_SERVICE_URL, req, res));
app.use('/notifications', (req, res) => forward(NOTIFICATION_SERVICE_URL, req, res));

// Not found
app.use('*', (_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => logger.info(`API Gateway listening on ${port}`));
