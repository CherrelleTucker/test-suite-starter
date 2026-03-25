/**
 * Template: Usage Quotas, Tier Enforcement & Counter Management
 *
 * WHAT THIS TESTS:
 * Functions that enforce usage limits, manage subscription tiers, track counters,
 * and handle time-based resets. These are critical for freemium/SaaS apps — if
 * quota logic is wrong, you either lose revenue or break the user experience.
 *
 * WHEN TO USE:
 * - Freemium apps with usage limits (searches, API calls, exports)
 * - SaaS with tiered plans (free, pro, enterprise)
 * - Rate limiting (per-user, per-IP, per-feature)
 * - Any counter that resets on a schedule (monthly, daily, per-session)
 * - Subscription entitlement checking (is the user Pro? Pro+?)
 *
 * CRITICAL BUGS THESE CATCH:
 * - Free users getting Pro features (tier bypass)
 * - Pro users hitting free-tier limits (tier not applied)
 * - Counters not resetting at month/day boundary
 * - December → January year rollover breaking reset logic
 * - Month 0 (January) treated as falsy
 */

// ADAPT: Replace with your actual functions
import {
  shouldResetUsage,
  buildResetUsage,
  isQuotaExceeded,
  calcAnnualSavings,
  parseEntitlementDates,
  hasActiveEntitlement,
  buildIncrementedUsage,
} from '../hooks/usageHelpers';

// ═══════════════════════════════════════════════════════════════════════════════
// Monthly Reset Logic
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: Usage counters reset monthly. The reset trigger compares the stored
// month/year against the current date. Bugs here mean users either get
// unlimited free usage (bad for revenue) or lose their remaining quota (bad UX).

describe('shouldResetUsage', () => {
  it('returns false when month and year match (no reset needed)', () => {
    const now = new Date(2026, 2, 15); // March 2026
    expect(shouldResetUsage({ month: 2, year: 2026 }, now)).toBe(false);
  });

  it('returns true when month differs', () => {
    const now = new Date(2026, 3, 1); // April 2026
    expect(shouldResetUsage({ month: 2, year: 2026 }, now)).toBe(true);
  });

  it('returns true when year differs', () => {
    const now = new Date(2027, 2, 15);
    expect(shouldResetUsage({ month: 2, year: 2026 }, now)).toBe(true);
  });

  // WHY: Year rollover is the classic boundary bug. December (month 11) → January (month 0)
  // changes both month AND year. Make sure the reset fires.
  it('handles December→January year rollover', () => {
    const now = new Date(2027, 0, 1); // Jan 2027
    expect(shouldResetUsage({ month: 11, year: 2026 }, now)).toBe(true);
  });

  // WHY: January is month 0 in JavaScript. If your code does `if (!month)`, January
  // is treated as falsy and the reset logic breaks.
  it('handles month 0 (January) correctly', () => {
    const now = new Date(2026, 0, 31); // Jan 31
    expect(shouldResetUsage({ month: 0, year: 2026 }, now)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Reset State Builder
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildResetUsage', () => {
  it('returns zeroed counters with current month/year', () => {
    const now = new Date(2026, 5, 10);
    // ADAPT: Replace field names with your counter fields
    expect(buildResetUsage(now)).toEqual({ solo: 0, group: 0, month: 5, year: 2026 });
  });

  it('handles January (month 0)', () => {
    const now = new Date(2027, 0, 1);
    expect(buildResetUsage(now)).toEqual({ solo: 0, group: 0, month: 0, year: 2027 });
  });

  it('handles December (month 11)', () => {
    const now = new Date(2026, 11, 31);
    expect(buildResetUsage(now)).toEqual({ solo: 0, group: 0, month: 11, year: 2026 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Quota Enforcement (Tier-Aware)
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: The quota function must enforce DIFFERENT limits per tier. A common bug
// is applying the same limit to all tiers, or checking the wrong tier flag.

describe('isQuotaExceeded', () => {
  // ADAPT: Replace tier names, limits, and parameter shape with yours
  // Example: isQuotaExceeded(type, usage, isPro, isProPlus)

  // ─── Free Tier ─────────────────────────────────────────────────────────────
  it('allows usage under free limit', () => {
    expect(isQuotaExceeded('solo', { solo: 0, group: 0 }, false, false)).toBe(false);
    expect(isQuotaExceeded('solo', { solo: 9, group: 0 }, false, false)).toBe(false);
  });

  // WHY: Test at EXACTLY the limit — this catches >= vs > bugs
  it('blocks usage at free limit', () => {
    expect(isQuotaExceeded('solo', { solo: 10, group: 0 }, false, false)).toBe(true);
  });

  it('blocks usage above free limit', () => {
    expect(isQuotaExceeded('solo', { solo: 15, group: 0 }, false, false)).toBe(true);
  });

  // ─── Second Counter Type ─────────────────────────────────────────────────
  it('allows first group action', () => {
    expect(isQuotaExceeded('group', { solo: 0, group: 0 }, false, false)).toBe(false);
  });

  it('blocks group action at free limit', () => {
    expect(isQuotaExceeded('group', { solo: 0, group: 1 }, false, false)).toBe(true);
  });

  // ─── Pro Tier ──────────────────────────────────────────────────────────────
  // WHY: Pro users must get HIGHER limits, not the same as free
  it('Pro users get higher solo limit', () => {
    expect(isQuotaExceeded('solo', { solo: 10, group: 0 }, true, false)).toBe(false);
    expect(isQuotaExceeded('solo', { solo: 19, group: 0 }, true, false)).toBe(false);
    expect(isQuotaExceeded('solo', { solo: 20, group: 0 }, true, false)).toBe(true);
  });

  it('Pro users get higher group limit', () => {
    expect(isQuotaExceeded('group', { solo: 0, group: 1 }, true, false)).toBe(false);
    expect(isQuotaExceeded('group', { solo: 0, group: 3 }, true, false)).toBe(true);
  });

  // ─── Unlimited Tier ────────────────────────────────────────────────────────
  // WHY: The highest tier should bypass ALL quota checks. Use absurdly high
  // numbers to verify it's truly unlimited and not just a higher limit.
  it('unlimited tier bypasses solo quota', () => {
    expect(isQuotaExceeded('solo', { solo: 100, group: 0 }, false, true)).toBe(false);
  });

  it('unlimited tier bypasses group quota', () => {
    expect(isQuotaExceeded('group', { solo: 0, group: 50 }, false, true)).toBe(false);
  });

  // ─── Unknown Type Fallback ─────────────────────────────────────────────────
  // WHY: If a new feature type is added but not mapped, it should default to
  // the most restrictive quota (fail-closed, not fail-open)
  it('defaults to most restrictive quota for unknown type', () => {
    expect(isQuotaExceeded('unknown', { solo: 0, group: 1 }, false, false)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Annual Savings Calculator
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: Subscription paywalls show "Save X%" for annual plans. The math must be
// correct, null-safe, and not crash on edge cases (divide by zero, negative prices).

describe('calcAnnualSavings', () => {
  it('calculates correct savings percentage', () => {
    // ADAPT: Use your actual price points
    // 1 - (14.99 / (1.99 * 12)) ≈ 37%
    expect(calcAnnualSavings(1.99, 14.99)).toBe(37);
  });

  it('returns 0% when annual equals 12x monthly (no savings)', () => {
    expect(calcAnnualSavings(5.0, 60.0)).toBe(0);
  });

  // WHY: Division by zero / invalid prices must not crash
  it('returns null for zero annual price', () => {
    expect(calcAnnualSavings(1.99, 0)).toBeNull();
  });

  it('returns null for zero monthly price', () => {
    expect(calcAnnualSavings(0, 14.99)).toBeNull();
  });

  it('returns null for negative monthly price', () => {
    expect(calcAnnualSavings(-1, 14.99)).toBeNull();
  });

  it('returns null for null inputs', () => {
    expect(calcAnnualSavings(1.99, null)).toBeNull();
    expect(calcAnnualSavings(undefined, undefined)).toBeNull();
  });

  it('rounds to nearest integer', () => {
    // 1 - (10 / (3 * 12)) = 72.22% → 72
    expect(calcAnnualSavings(3.0, 10.0)).toBe(72);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Entitlement / Subscription Status
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: Subscription providers (RevenueCat, Stripe, etc.) return deeply nested
// objects. Null-safety is critical — a crash here locks users out of paid features.

describe('hasActiveEntitlement', () => {
  it('returns true when entitlement exists', () => {
    // ADAPT: Match your subscription provider's response shape
    const info = { entitlements: { active: { pro: { isActive: true } } } };
    expect(hasActiveEntitlement(info, 'pro')).toBe(true);
  });

  it('returns false when entitlement is missing', () => {
    const info = { entitlements: { active: {} } };
    expect(hasActiveEntitlement(info, 'pro')).toBe(false);
  });

  // WHY: Each level of nesting can be null/undefined. Test all levels.
  it('returns false when info is null', () => {
    expect(hasActiveEntitlement(null, 'pro')).toBe(false);
  });

  it('returns false when info is undefined', () => {
    expect(hasActiveEntitlement(undefined, 'pro')).toBe(false);
  });

  it('returns false when entitlements object is missing', () => {
    expect(hasActiveEntitlement({}, 'pro')).toBe(false);
  });

  // WHY: Verify the function checks the CORRECT entitlement ID, not just "any"
  it('checks the correct entitlement ID', () => {
    const info = { entitlements: { active: { premium: { isActive: true } } } };
    expect(hasActiveEntitlement(info, 'pro')).toBe(false);
    expect(hasActiveEntitlement(info, 'premium')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Counter Incrementing (Immutable)
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: Counter functions must not mutate the original object. If they do,
// React won't re-render (same object reference) and the UI will be stale.

describe('buildIncrementedUsage', () => {
  const now = new Date(2026, 2, 22);

  it('increments the correct counter type', () => {
    const current = { solo: 5, group: 1, month: 2, year: 2026 };
    const result = buildIncrementedUsage(current, 'solo', now);
    expect(result.solo).toBe(6);
    expect(result.group).toBe(1); // Other counter unchanged
  });

  // WHY: This is the most important test in this block. Mutation bugs cause
  // stale UI in React and data corruption in sync flows.
  it('does not mutate original object', () => {
    const current = { solo: 3, group: 0, month: 2, year: 2026 };
    buildIncrementedUsage(current, 'solo', now);
    expect(current.solo).toBe(3); // Original unchanged
  });

  it('stamps current month/year', () => {
    const current = { solo: 0, group: 0, month: 1, year: 2025 };
    const result = buildIncrementedUsage(current, 'solo', now);
    expect(result.month).toBe(2);
    expect(result.year).toBe(2026);
  });

  it('handles incrementing from zero', () => {
    const current = { solo: 0, group: 0, month: 2, year: 2026 };
    expect(buildIncrementedUsage(current, 'solo', now).solo).toBe(1);
    expect(buildIncrementedUsage(current, 'group', now).group).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Entitlement Date Parsing
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: Subscription providers return purchase/expiry dates in various formats.
// Parse them safely, and handle missing dates (lifetime purchases have no expiry).

describe('parseEntitlementDates', () => {
  it('returns both dates when present', () => {
    const ent = {
      originalPurchaseDate: '2026-01-15T00:00:00Z',
      expirationDate: '2026-04-15T00:00:00Z',
    };
    const result = parseEntitlementDates(ent);
    expect(result.proSince).toBeTruthy();
    expect(result.proRenew).toBeTruthy();
  });

  it('returns null dates when entitlement is undefined', () => {
    expect(parseEntitlementDates(undefined)).toEqual({ proSince: null, proRenew: null });
  });

  it('returns null dates when entitlement is null', () => {
    expect(parseEntitlementDates(null)).toEqual({ proSince: null, proRenew: null });
  });

  // WHY: Lifetime purchases have a purchase date but no expiration
  it('returns proSince only when no expiration (lifetime)', () => {
    const ent = { originalPurchaseDate: '2026-03-01T00:00:00Z' };
    const result = parseEntitlementDates(ent);
    expect(result.proSince).toBeTruthy();
    expect(result.proRenew).toBeNull();
  });

  // WHY: Empty strings are falsy — make sure they become null, not Date objects
  it('handles empty string dates gracefully', () => {
    const ent = { originalPurchaseDate: '', expirationDate: '' };
    expect(parseEntitlementDates(ent)).toEqual({ proSince: null, proRenew: null });
  });
});
