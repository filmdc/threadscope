import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordSchema,
  keywordSchema,
  composePostSchema,
  dateRangeSchema,
  alertConfigSchema,
  reportConfigSchema,
} from './validation';

// -------------------------------------------------------
// emailSchema
// -------------------------------------------------------
describe('emailSchema', () => {
  it('accepts a valid email', () => {
    expect(emailSchema.safeParse('user@example.com').success).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(emailSchema.safeParse('').success).toBe(false);
  });

  it('rejects a string without @', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });

  it('trims whitespace before validation', () => {
    const result = emailSchema.safeParse('  user@example.com  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('user@example.com');
    }
  });

  it('rejects an email exceeding 254 characters', () => {
    const longEmail = 'a'.repeat(246) + '@test.com';
    expect(longEmail.length).toBeGreaterThan(254);
    expect(emailSchema.safeParse(longEmail).success).toBe(false);
  });
});

// -------------------------------------------------------
// passwordSchema
// -------------------------------------------------------
describe('passwordSchema', () => {
  it('accepts a valid password', () => {
    expect(passwordSchema.safeParse('Abcdef1!').success).toBe(true);
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(passwordSchema.safeParse('Ab1').success).toBe(false);
  });

  it('rejects passwords longer than 128 characters', () => {
    const longPassword = 'Aa1' + 'x'.repeat(126);
    expect(longPassword.length).toBeGreaterThan(128);
    expect(passwordSchema.safeParse(longPassword).success).toBe(false);
  });

  it('rejects passwords without uppercase letters', () => {
    expect(passwordSchema.safeParse('abcdefg1').success).toBe(false);
  });

  it('rejects passwords without lowercase letters', () => {
    expect(passwordSchema.safeParse('ABCDEFG1').success).toBe(false);
  });

  it('rejects passwords without digits', () => {
    expect(passwordSchema.safeParse('Abcdefgh').success).toBe(false);
  });
});

// -------------------------------------------------------
// keywordSchema
// -------------------------------------------------------
describe('keywordSchema', () => {
  it('accepts valid keywords', () => {
    expect(keywordSchema.safeParse('#trending').success).toBe(true);
  });

  it('rejects keywords shorter than 2 characters', () => {
    expect(keywordSchema.safeParse('a').success).toBe(false);
  });

  it('rejects keywords with invalid characters', () => {
    expect(keywordSchema.safeParse('hello!world').success).toBe(false);
  });

  it('rejects keywords exceeding 100 characters', () => {
    const longKeyword = 'a'.repeat(101);
    expect(keywordSchema.safeParse(longKeyword).success).toBe(false);
  });
});

// -------------------------------------------------------
// composePostSchema
// -------------------------------------------------------
describe('composePostSchema', () => {
  const validPost = {
    text: 'Hello world!',
    mediaType: 'TEXT' as const,
  };

  it('accepts a minimal valid post', () => {
    expect(composePostSchema.safeParse(validPost).success).toBe(true);
  });

  it('rejects empty text', () => {
    expect(composePostSchema.safeParse({ ...validPost, text: '' }).success).toBe(false);
  });

  it('rejects text exceeding 500 characters', () => {
    expect(
      composePostSchema.safeParse({ ...validPost, text: 'x'.repeat(501) }).success,
    ).toBe(false);
  });

  it('rejects invalid mediaType', () => {
    expect(
      composePostSchema.safeParse({ ...validPost, mediaType: 'AUDIO' }).success,
    ).toBe(false);
  });

  it('accepts all valid media types', () => {
    for (const type of ['TEXT', 'IMAGE', 'VIDEO', 'CAROUSEL']) {
      expect(
        composePostSchema.safeParse({ ...validPost, mediaType: type }).success,
      ).toBe(true);
    }
  });

  it('accepts optional fields', () => {
    const post = {
      ...validPost,
      replyToId: 'some-id',
      replyControl: 'everyone' as const,
      topicTag: 'tech',
    };
    expect(composePostSchema.safeParse(post).success).toBe(true);
  });

  it('rejects poll with fewer than 2 options', () => {
    expect(
      composePostSchema.safeParse({ ...validPost, pollOptions: ['only one'] }).success,
    ).toBe(false);
  });

  it('rejects poll with more than 4 options', () => {
    expect(
      composePostSchema.safeParse({
        ...validPost,
        pollOptions: ['a', 'b', 'c', 'd', 'e'],
      }).success,
    ).toBe(false);
  });
});

// -------------------------------------------------------
// dateRangeSchema
// -------------------------------------------------------
describe('dateRangeSchema', () => {
  it('accepts a valid date range', () => {
    expect(
      dateRangeSchema.safeParse({
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-31T23:59:59Z',
      }).success,
    ).toBe(true);
  });

  it('rejects when start is after end', () => {
    expect(
      dateRangeSchema.safeParse({
        start: '2024-02-01T00:00:00Z',
        end: '2024-01-01T00:00:00Z',
      }).success,
    ).toBe(false);
  });

  it('rejects invalid datetime strings', () => {
    expect(
      dateRangeSchema.safeParse({
        start: 'not-a-date',
        end: '2024-01-31T23:59:59Z',
      }).success,
    ).toBe(false);
  });
});

// -------------------------------------------------------
// alertConfigSchema
// -------------------------------------------------------
describe('alertConfigSchema', () => {
  const validAlert = {
    type: 'KEYWORD_SPIKE' as const,
    condition: {
      threshold: 100,
      metric: 'mentions',
      direction: 'above' as const,
    },
    channels: ['email' as const],
  };

  it('accepts a valid alert config', () => {
    expect(alertConfigSchema.safeParse(validAlert).success).toBe(true);
  });

  it('rejects invalid alert type', () => {
    expect(
      alertConfigSchema.safeParse({ ...validAlert, type: 'INVALID_TYPE' }).success,
    ).toBe(false);
  });

  it('rejects empty channels array', () => {
    expect(
      alertConfigSchema.safeParse({ ...validAlert, channels: [] }).success,
    ).toBe(false);
  });

  it('accepts optional trackedKeywordId', () => {
    expect(
      alertConfigSchema.safeParse({
        ...validAlert,
        trackedKeywordId: 'kw-123',
      }).success,
    ).toBe(true);
  });
});

// -------------------------------------------------------
// reportConfigSchema
// -------------------------------------------------------
describe('reportConfigSchema', () => {
  it('accepts a valid report config with defaults', () => {
    const result = reportConfigSchema.safeParse({
      type: 'ACCOUNT_PERFORMANCE',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid report type', () => {
    expect(
      reportConfigSchema.safeParse({ type: 'INVALID_REPORT' }).success,
    ).toBe(false);
  });

  it('accepts report config with parameters', () => {
    expect(
      reportConfigSchema.safeParse({
        type: 'POST_PERFORMANCE',
        parameters: { days: 30, mediaType: 'IMAGE' },
      }).success,
    ).toBe(true);
  });

  it('rejects days outside valid range', () => {
    expect(
      reportConfigSchema.safeParse({
        type: 'POST_PERFORMANCE',
        parameters: { days: 0 },
      }).success,
    ).toBe(false);
  });
});
