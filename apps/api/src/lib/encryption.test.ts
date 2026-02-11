import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('encrypt / decrypt', () => {
  const TEST_KEY = 'test-encryption-key-for-vitest';

  beforeEach(() => {
    vi.stubEnv('ENCRYPTION_KEY', TEST_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('roundtrips correctly', async () => {
    const { encrypt, decrypt } = await import('./encryption');
    const plaintext = 'my-secret-access-token';
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it('produces the format iv:tag:ciphertext', async () => {
    const { encrypt } = await import('./encryption');
    const encrypted = encrypt('hello');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
    // IV = 16 bytes = 32 hex chars, tag = 16 bytes = 32 hex chars
    expect(parts[0]!.length).toBe(32);
    expect(parts[1]!.length).toBe(32);
    expect(parts[2]!.length).toBeGreaterThan(0);
  });

  it('uses a random IV each time', async () => {
    const { encrypt } = await import('./encryption');
    const a = encrypt('same-plaintext');
    const b = encrypt('same-plaintext');
    expect(a).not.toBe(b);
  });

  it('throws on tampered ciphertext', async () => {
    const { encrypt, decrypt } = await import('./encryption');
    const encrypted = encrypt('secret');
    const parts = encrypted.split(':');
    // Tamper with the ciphertext portion
    const tampered = `${parts[0]}:${parts[1]}:${'ff'.repeat(parts[2]!.length / 2)}`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it('throws on wrong format (missing parts)', async () => {
    const { decrypt } = await import('./encryption');
    expect(() => decrypt('not-valid-format')).toThrow('Invalid encrypted text format');
  });

  it('throws when ENCRYPTION_KEY is missing', async () => {
    vi.unstubAllEnvs();
    delete process.env.ENCRYPTION_KEY;
    // Re-import to get fresh module
    const mod = await import('./encryption');
    expect(() => mod.encrypt('test')).toThrow('ENCRYPTION_KEY');
  });
});
