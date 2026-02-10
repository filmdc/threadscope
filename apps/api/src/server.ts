import express from 'express';
import { corsMiddleware } from './middleware/cors';
import { generalRateLimit } from './middleware/rate-limit';
import { authRouter } from './router/auth';
import { extensionRouter } from './router/extension';
import { prisma } from './lib/db';

const app = express();
const PORT = parseInt(process.env.PORT ?? '4000', 10);

// ==================== Global Middleware ====================

app.use(express.json({ limit: '10mb' }));
app.use(corsMiddleware);
app.use(generalRateLimit);

// Trust proxy for rate limiting behind Railway/nginx
app.set('trust proxy', 1);

// ==================== Health Check ====================

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database connection failed',
    });
  }
});

// ==================== Auth Routes ====================

app.use('/auth', authRouter);

// ==================== Extension REST API ====================

app.use('/api/v1/ext', extensionRouter);

// ==================== Webhook Receiver ====================

app.post('/api/webhooks/threads', express.json(), (req, res) => {
  // Webhook verification (GET for subscription, POST for events)
  if (req.query['hub.mode'] === 'subscribe') {
    const verifyToken = process.env.THREADS_WEBHOOK_VERIFY_TOKEN;
    if (req.query['hub.verify_token'] === verifyToken) {
      res.send(req.query['hub.challenge']);
      return;
    }
    res.status(403).send('Verification failed');
    return;
  }

  // Process webhook event
  console.log('Webhook event received:', JSON.stringify(req.body));
  // TODO: Queue webhook processing job
  res.sendStatus(200);
});

// Webhook verification for GET requests
app.get('/api/webhooks/threads', (req, res) => {
  const verifyToken = process.env.THREADS_WEBHOOK_VERIFY_TOKEN;
  if (
    req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === verifyToken
  ) {
    res.send(req.query['hub.challenge']);
    return;
  }
  res.status(403).send('Verification failed');
});

// ==================== 404 Handler ====================

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ==================== Error Handler ====================

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? err.message
          : 'Internal server error',
    });
  }
);

// ==================== Start Server ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ThreadScope API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

export default app;
