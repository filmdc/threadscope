import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyWebhookSignature } from './webhook';

const APP_SECRET = 'test-app-secret';

function sign(body: Buffer, secret: string): string {
  const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${sig}`;
}

describe('verifyWebhookSignature', () => {
  it('returns true for a valid signature', () => {
    const body = Buffer.from('{"event":"test"}');
    const signature = sign(body, APP_SECRET);
    expect(verifyWebhookSignature(body, signature, APP_SECRET)).toBe(true);
  });

  it('returns false when signature is undefined', () => {
    const body = Buffer.from('{"event":"test"}');
    expect(verifyWebhookSignature(body, undefined, APP_SECRET)).toBe(false);
  });

  it('returns false for a wrong signature', () => {
    const body = Buffer.from('{"event":"test"}');
    expect(verifyWebhookSignature(body, 'sha256=0000deadbeef', APP_SECRET)).toBe(false);
  });

  it('returns false when body has been tampered with', () => {
    const original = Buffer.from('{"event":"test"}');
    const signature = sign(original, APP_SECRET);
    const tampered = Buffer.from('{"event":"hacked"}');
    expect(verifyWebhookSignature(tampered, signature, APP_SECRET)).toBe(false);
  });

  it('returns true for an empty body with matching signature', () => {
    const body = Buffer.from('');
    const signature = sign(body, APP_SECRET);
    expect(verifyWebhookSignature(body, signature, APP_SECRET)).toBe(true);
  });
});
