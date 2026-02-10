import express from 'express';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import * as trpcExpress from '@trpc/server/adapters/express';
import { corsMiddleware } from './middleware/cors';
import { generalRateLimit } from './middleware/rate-limit';
import { authRouter } from './router/auth';
import { extensionRouter } from './router/extension';
import { prisma } from './lib/db';
import { appRouter } from './trpc/router';
import { createContext } from './trpc/context';
import { startScheduler } from './scheduler';
import { alertEvaluationQueue, syncAnalyticsQueue } from './lib/queue';

const app = express();
const PORT = parseInt(process.env.PORT ?? '4000', 10);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Trust proxy BEFORE any middleware that uses req.ip (rate limiting, etc.)
app.set('trust proxy', 1);

// ==================== Webhook Receiver ====================
// Mounted BEFORE express.json() to ensure raw body is available for HMAC verification.

/**
 * Verify Meta webhook signature using HMAC-SHA256.
 * Returns true if signature is valid, false otherwise.
 */
function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string | undefined,
  appSecret: string
): boolean {
  if (!signature) return false;

  const expectedSig = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  const expected = `sha256=${expectedSig}`;

  // Use constant-time comparison to prevent timing attacks
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

app.post(
  '/api/webhooks/threads',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const appSecret = process.env.THREADS_APP_SECRET;
    if (!appSecret) {
      res.status(500).send('Webhook not configured');
      return;
    }

    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const rawBody = req.body as Buffer;

    if (!Buffer.isBuffer(rawBody) || !verifyWebhookSignature(rawBody, signature, appSecret)) {
      res.status(403).send('Invalid signature');
      return;
    }

    const body = JSON.parse(rawBody.toString());

    // Log only the event type, not the full payload (avoid leaking sensitive data)
    console.log('Webhook event received: object=%s', body.object ?? 'unknown');

    // Process webhook entries
    const entries = Array.isArray(body.entry) ? body.entry : [];
    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        const field = change.field as string | undefined;

        if (field === 'mentions') {
          // Queue alert evaluation for MENTION_ALERT type alerts
          const mentionedUserId = change.value?.thread_owner_id as string | undefined;
          if (mentionedUserId) {
            // Find alerts for the mentioned user's ThreadScope account
            prisma.alert.findMany({
              where: {
                type: 'MENTION_ALERT',
                isActive: true,
                user: { threadsConnection: { threadsUserId: mentionedUserId } },
              },
              select: { id: true },
            }).then((alerts: Array<{ id: string }>) => {
              for (const alert of alerts) {
                alertEvaluationQueue.add(
                  'alert-evaluation',
                  { alertId: alert.id },
                  { jobId: `webhook-mention-${alert.id}-${Date.now()}` },
                ).catch((err: unknown) => console.error('Failed to queue mention alert:', err));
              }
            }).catch((err: unknown) => console.error('Failed to query mention alerts:', err));
          }
        } else if (field === 'replies') {
          // Optionally trigger analytics sync for the thread owner
          const ownerId = entry.id as string | undefined;
          if (ownerId) {
            prisma.threadsConnection.findUnique({
              where: { threadsUserId: ownerId },
              select: { userId: true },
            }).then((conn: { userId: string } | null) => {
              if (conn) {
                syncAnalyticsQueue.add(
                  'sync-own-analytics',
                  { userId: conn.userId },
                ).catch((err: unknown) => console.error('Failed to queue reply sync:', err));
              }
            }).catch((err: unknown) => console.error('Failed to query connection for reply:', err));
          }
        } else if (field === 'threads') {
          // New thread published by user, trigger analytics sync
          const ownerId = entry.id as string | undefined;
          if (ownerId) {
            prisma.threadsConnection.findUnique({
              where: { threadsUserId: ownerId },
              select: { userId: true },
            }).then((conn: { userId: string } | null) => {
              if (conn) {
                syncAnalyticsQueue.add(
                  'sync-own-analytics',
                  { userId: conn.userId },
                ).catch((err: unknown) => console.error('Failed to queue thread sync:', err));
              }
            }).catch((err: unknown) => console.error('Failed to query connection for thread:', err));
          }
        }
      }
    }

    res.sendStatus(200);
  }
);

// Webhook verification for GET requests (subscription confirmation)
app.get('/api/webhooks/threads', (req, res) => {
  const verifyToken = process.env.THREADS_WEBHOOK_VERIFY_TOKEN;
  if (
    req.query['hub.mode'] === 'subscribe' &&
    verifyToken &&
    req.query['hub.verify_token'] === verifyToken
  ) {
    res.send(req.query['hub.challenge']);
    return;
  }
  res.status(403).send('Verification failed');
});

// ==================== Global Middleware ====================

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(corsMiddleware);
app.use(generalRateLimit);

// ==================== Health Check ====================

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch {
    // Don't expose internal error details
    res.status(503).json({
      status: 'unhealthy',
    });
  }
});

// ==================== Auth Routes ====================

app.use('/auth', authRouter);

// ==================== Extension REST API ====================

app.use('/api/v1/ext', extensionRouter);

// ==================== tRPC API ====================

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

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
    // Log error details server-side but never expose internals to client
    console.error('Unhandled error:', IS_PRODUCTION ? err.message : err);
    res.status(500).json({ error: 'Internal server error' });
  }
);

// ==================== Start Server ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ThreadScope API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);

  // Register repeatable BullMQ job schedulers
  startScheduler().catch((err) => {
    console.error('Failed to start scheduler:', err);
  });
});

export default app;
