import { describe, it, expect } from 'vitest';
import { PLAN_LIMITS, METRIC_DEFINITIONS } from './metrics';
import type { PlanTier } from './metrics';

describe('PLAN_LIMITS', () => {
  it('defines all four plan tiers', () => {
    const tiers: PlanTier[] = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];
    for (const tier of tiers) {
      expect(PLAN_LIMITS[tier]).toBeDefined();
    }
  });

  it('FREE tier has the most restrictive limits', () => {
    expect(PLAN_LIMITS.FREE.maxAccounts).toBe(1);
    expect(PLAN_LIMITS.FREE.aiInsights).toBe(false);
    expect(PLAN_LIMITS.FREE.exportEnabled).toBe(false);
  });

  it('ENTERPRISE tier has the most generous limits', () => {
    expect(PLAN_LIMITS.ENTERPRISE.maxAccounts).toBe(25);
    expect(PLAN_LIMITS.ENTERPRISE.aiInsights).toBe(true);
    expect(PLAN_LIMITS.ENTERPRISE.historyDays).toBe(365);
  });

  it('each tier has increasing apiRequestsPerDay', () => {
    const tiers: PlanTier[] = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];
    for (let i = 1; i < tiers.length; i++) {
      expect(PLAN_LIMITS[tiers[i]!].apiRequestsPerDay).toBeGreaterThan(
        PLAN_LIMITS[tiers[i - 1]!].apiRequestsPerDay,
      );
    }
  });

  it('all plan limits have required numeric fields', () => {
    for (const tier of Object.values(PLAN_LIMITS)) {
      expect(typeof tier.maxAccounts).toBe('number');
      expect(typeof tier.maxTrackedKeywords).toBe('number');
      expect(typeof tier.maxCompetitors).toBe('number');
      expect(typeof tier.historyDays).toBe('number');
      expect(typeof tier.maxScheduledPosts).toBe('number');
      expect(typeof tier.maxAlerts).toBe('number');
      expect(typeof tier.apiRequestsPerDay).toBe('number');
    }
  });
});

describe('METRIC_DEFINITIONS', () => {
  it('contains definitions for core metrics', () => {
    const expectedMetrics = [
      'views',
      'likes',
      'replies',
      'reposts',
      'quotes',
      'engagementRate',
    ];
    for (const metric of expectedMetrics) {
      expect(METRIC_DEFINITIONS[metric]).toBeDefined();
      expect(METRIC_DEFINITIONS[metric]!.label).toBeTruthy();
      expect(METRIC_DEFINITIONS[metric]!.description).toBeTruthy();
      expect(METRIC_DEFINITIONS[metric]!.icon).toBeTruthy();
    }
  });
});
