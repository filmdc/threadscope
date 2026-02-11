import { describe, it, expect } from 'vitest';
import {
  calculateEngagementRate,
  calculatePostScore,
  classifyTrend,
} from './engagement';

// -------------------------------------------------------
// calculateEngagementRate
// -------------------------------------------------------
describe('calculateEngagementRate', () => {
  it('returns 0 when views is 0', () => {
    expect(calculateEngagementRate(10, 5, 3, 2, 0)).toBe(0);
  });

  it('returns 0 when views is negative', () => {
    expect(calculateEngagementRate(10, 5, 3, 2, -100)).toBe(0);
  });

  it('calculates correct rate for typical values', () => {
    // (10 + 5 + 3 + 2) / 1000 = 0.02
    expect(calculateEngagementRate(10, 5, 3, 2, 1000)).toBeCloseTo(0.02);
  });

  it('returns 1 when all viewers engaged once', () => {
    // (100 + 0 + 0 + 0) / 100 = 1.0
    expect(calculateEngagementRate(100, 0, 0, 0, 100)).toBe(1);
  });

  it('can exceed 1 when engagement > views', () => {
    // (200 + 100 + 50 + 50) / 100 = 4.0
    expect(calculateEngagementRate(200, 100, 50, 50, 100)).toBe(4);
  });

  it('returns 0 when all metrics are 0', () => {
    expect(calculateEngagementRate(0, 0, 0, 0, 0)).toBe(0);
  });

  it('handles small fractional results', () => {
    // 1 / 1_000_000 = 0.000001
    expect(calculateEngagementRate(1, 0, 0, 0, 1_000_000)).toBeCloseTo(0.000001);
  });
});

// -------------------------------------------------------
// calculatePostScore
// -------------------------------------------------------
describe('calculatePostScore', () => {
  it('returns 0 for all-zero metrics', () => {
    expect(
      calculatePostScore({
        likes: 0,
        replies: 0,
        reposts: 0,
        quotes: 0,
        views: 0,
      }),
    ).toBe(0);
  });

  it('applies correct weight to likes (1x)', () => {
    expect(
      calculatePostScore({
        likes: 10,
        replies: 0,
        reposts: 0,
        quotes: 0,
        views: 0,
      }),
    ).toBe(10);
  });

  it('applies correct weight to replies (3x)', () => {
    expect(
      calculatePostScore({
        likes: 0,
        replies: 10,
        reposts: 0,
        quotes: 0,
        views: 0,
      }),
    ).toBe(30);
  });

  it('applies correct weight to reposts (5x)', () => {
    expect(
      calculatePostScore({
        likes: 0,
        replies: 0,
        reposts: 10,
        quotes: 0,
        views: 0,
      }),
    ).toBe(50);
  });

  it('applies correct weight to quotes (5x)', () => {
    expect(
      calculatePostScore({
        likes: 0,
        replies: 0,
        reposts: 0,
        quotes: 10,
        views: 0,
      }),
    ).toBe(50);
  });

  it('applies correct weight to views (0.001x)', () => {
    expect(
      calculatePostScore({
        likes: 0,
        replies: 0,
        reposts: 0,
        quotes: 0,
        views: 10000,
      }),
    ).toBeCloseTo(10);
  });

  it('includes optional shares (2x) and clicks (1x)', () => {
    expect(
      calculatePostScore({
        likes: 0,
        replies: 0,
        reposts: 0,
        quotes: 0,
        views: 0,
        shares: 10,
        clicks: 10,
      }),
    ).toBe(30);
  });

  it('calculates composite score correctly', () => {
    // 10*1 + 5*3 + 3*5 + 2*5 + 4*2 + 6*1 + 1000*0.001
    // = 10 + 15 + 15 + 10 + 8 + 6 + 1 = 65
    expect(
      calculatePostScore({
        likes: 10,
        replies: 5,
        reposts: 3,
        quotes: 2,
        views: 1000,
        shares: 4,
        clicks: 6,
      }),
    ).toBeCloseTo(65);
  });

  it('defaults shares and clicks to 0 when omitted', () => {
    const withOptional = calculatePostScore({
      likes: 5,
      replies: 5,
      reposts: 5,
      quotes: 5,
      views: 5000,
      shares: 0,
      clicks: 0,
    });
    const withoutOptional = calculatePostScore({
      likes: 5,
      replies: 5,
      reposts: 5,
      quotes: 5,
      views: 5000,
    });
    expect(withOptional).toBe(withoutOptional);
  });
});

// -------------------------------------------------------
// classifyTrend
// -------------------------------------------------------
describe('classifyTrend', () => {
  it('returns stable for empty array', () => {
    expect(classifyTrend([])).toBe('stable');
  });

  it('returns stable for single data point', () => {
    expect(classifyTrend([100])).toBe('stable');
  });

  it('returns rising for steadily increasing values', () => {
    expect(classifyTrend([10, 20, 30, 40, 50])).toBe('rising');
  });

  it('returns falling for steadily decreasing values', () => {
    expect(classifyTrend([50, 40, 30, 20, 10])).toBe('falling');
  });

  it('returns stable for constant values', () => {
    expect(classifyTrend([100, 100, 100, 100])).toBe('stable');
  });

  it('returns stable for minor fluctuations within 5% band', () => {
    // Mean ~100, minor fluctuations
    expect(classifyTrend([100, 101, 99, 100, 100])).toBe('stable');
  });

  it('returns rising when mean is 0 and slope is positive', () => {
    expect(classifyTrend([0, 0, 0, 1])).toBe('rising');
  });

  it('returns falling when mean is 0 and slope is negative', () => {
    expect(classifyTrend([1, 0, 0, 0])).toBe('falling');
  });

  it('returns stable when all values are 0', () => {
    expect(classifyTrend([0, 0, 0, 0])).toBe('stable');
  });
});
