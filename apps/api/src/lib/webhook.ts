import crypto from 'crypto';

/**
 * Verify Meta webhook signature using HMAC-SHA256.
 * Returns true if signature is valid, false otherwise.
 */
export function verifyWebhookSignature(
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
