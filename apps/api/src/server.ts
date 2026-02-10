import express from 'express';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import { corsMiddleware } from './middleware/cors';
import { generalRateLimit } from './middleware/rate-limit';
import { authRouter } from './router/auth';
import { extensionRouter } from './router/extension';
import { prisma } from './lib/db';

const app = express();
const PORT = parseInt(process.env.PORT ?? '4000', 10);

// ==================== Global Middleware ====================

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
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

// ==================== Webhook Receiver ====================

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

    // Verify the webhook signature
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

    if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
      res.status(403).send('Invalid signature');
      return;
    }

    // Parse the verified body
    const body = JSON.parse(rawBody.toString());

    // Log only the event type, not the full payload (avoid leaking sensitive data)
    console.log('Webhook event received: object=%s', body.object ?? 'unknown');

    // TODO: Queue webhook processing job
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
