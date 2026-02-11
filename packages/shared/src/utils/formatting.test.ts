import { describe, it, expect } from 'vitest';
import {
  abbreviateNumber,
  formatPercentage,
  formatEngagementRate,
} from './formatting';

// -------------------------------------------------------
// abbreviateNumber
// -------------------------------------------------------
describe('abbreviateNumber', () => {
  it('returns small numbers as-is', () => {
    expect(abbreviateNumber(999)).toBe('999');
  });

  it('abbreviates thousands with K', () => {
    expect(abbreviateNumber(1200)).toBe('1.2K');
  });

  it('abbreviates millions with M', () => {
    expect(abbreviateNumber(1_500_000)).toBe('1.5M');
  });

  it('abbreviates billions with B', () => {
    expect(abbreviateNumber(2_300_000_000)).toBe('2.3B');
  });

  it('strips trailing .0', () => {
    expect(abbreviateNumber(1000)).toBe('1K');
  });

  it('handles zero', () => {
    expect(abbreviateNumber(0)).toBe('0');
  });

  it('handles negative numbers', () => {
    expect(abbreviateNumber(-1500)).toBe('-1.5K');
  });
});

// -------------------------------------------------------
// formatPercentage
// -------------------------------------------------------
describe('formatPercentage', () => {
  it('formats a decimal as percentage with default precision', () => {
    expect(formatPercentage(4.2)).toBe('4.2%');
  });

  it('respects custom decimal places', () => {
    expect(formatPercentage(4.256, 2)).toBe('4.26%');
  });
});

// -------------------------------------------------------
// formatEngagementRate
// -------------------------------------------------------
describe('formatEngagementRate', () => {
  it('converts 0-1 scale to percentage', () => {
    expect(formatEngagementRate(0.042)).toBe('4.20%');
  });

  it('handles 0', () => {
    expect(formatEngagementRate(0)).toBe('0.00%');
  });

  it('handles 1 (100%)', () => {
    expect(formatEngagementRate(1)).toBe('100.00%');
  });
});
