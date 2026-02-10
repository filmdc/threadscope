import cors from 'cors';

const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

// Only allow a specific extension ID, not all Chrome extensions
const allowedExtensionId = process.env.EXTENSION_ID;

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Requests with no Origin header (server-to-server, curl, mobile apps).
    // These bypass CORS but are still gated by JWT/API-key auth on each route.
    if (!origin) {
      callback(null, true);
      return;
    }

    // Allow specific Chrome extension origin only
    if (
      allowedExtensionId &&
      origin === `chrome-extension://${allowedExtensionId}`
    ) {
      callback(null, true);
      return;
    }

    // Allow configured origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Extension-Version',
  ],
});
