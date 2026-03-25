/**
 * Template: Pure Function Testing
 *
 * WHAT THIS TESTS:
 * Utility/helper functions that take inputs and return outputs with no side effects.
 * These are the easiest functions to test and the most valuable — they catch bugs
 * in math, string manipulation, null handling, and boundary conditions.
 *
 * WHEN TO USE:
 * - Any utils/ or helpers/ file with exported functions
 * - Formatting functions (currency, dates, labels)
 * - Validation functions (input checking, pattern matching)
 * - Transformation functions (normalize, clamp, pick)
 * - Classification/detection functions (matching, filtering)
 *
 * WHAT TO LOOK FOR:
 * - Boundary values (min, max, zero, negative, exactly-at-limit)
 * - Null/undefined/empty handling (does it crash or return a sensible default?)
 * - Case sensitivity (user input is unpredictable)
 * - Type coercion edge cases (0 is falsy, "" is falsy)
 */

// ADAPT: Replace with your actual imports
import {
  clamp,
  normalize,
  pickRandom,
  formatPrice,
  matchesPattern,
  classifyItem,
} from '../utils/helpers';

// ═══════════════════════════════════════════════════════════════════════════════
// Numeric Clamping / Bounding
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: Clamping functions appear everywhere (UI sliders, API limits, pagination).
// The bugs hide at the boundaries: what happens at exactly min, exactly max,
// and when min === max?

describe('clamp', () => {
  test('returns value when within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  test('clamps to min when value is below', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  test('clamps to max when value is above', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  // WHY: This edge case catches off-by-one errors in >= vs > comparisons
  test('returns min when min equals max', () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });

  // WHY: Negative ranges are valid (temperature, coordinates, timezone offsets)
  test('handles negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(0, -10, -1)).toBe(-1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// String Normalization
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: User input is messy. Normalization functions need to handle null, undefined,
// empty strings, numbers, and whitespace — not just valid strings.
// The 0 case is especially tricky because it's falsy but not nullish.

describe('normalize', () => {
  test('lowercases and trims', () => {
    expect(normalize('  Hello World  ')).toBe('hello world');
  });

  // WHY: These four tests verify your null-safety strategy is consistent.
  // Pick one return value for "bad input" (empty string, null, or throw) and stick with it.
  test('returns empty string for null', () => {
    expect(normalize(null)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(normalize(undefined)).toBe('');
  });

  test('returns empty string for empty string', () => {
    expect(normalize('')).toBe('');
  });

  // WHY: 0 is falsy in JS. If your function does `if (!input)`, it'll treat 0
  // the same as null. This test catches that bug.
  test('returns empty string for zero (falsy but not nullish)', () => {
    expect(normalize(0)).toBe('');
  });

  test('handles already-normalized input (idempotent)', () => {
    expect(normalize('hello')).toBe('hello');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Random Selection
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: Random functions can't be tested for specific outputs, but they CAN be
// tested for correct handling of edge cases and for returning valid results.

describe('pickRandom', () => {
  // WHY: Empty/null arrays are the #1 crash source for random pickers
  test('returns null for empty array', () => {
    expect(pickRandom([])).toBeNull();
  });

  test('returns null for null input', () => {
    expect(pickRandom(null)).toBeNull();
  });

  test('returns null for undefined input', () => {
    expect(pickRandom(undefined)).toBeNull();
  });

  // WHY: Single-element arrays should always return that element (not null, not undefined)
  test('returns the only element from single-element array', () => {
    expect(pickRandom(['only'])).toBe('only');
  });

  // WHY: Can't test exact output (it's random), but we CAN verify it comes from the array
  test('returns an element from the array', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = pickRandom(arr);
    expect(arr).toContain(result);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Formatting / Display
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: Formatting functions are called in rendering hot paths. They must never
// crash, and they must handle every possible input gracefully — including values
// from external APIs that may be null, 0, or unexpected types.

// ADAPT: Replace with your formatting function (currency, dates, labels, etc.)
describe('formatPrice', () => {
  // WHY: 0 and null are common API responses for "no data"
  test('returns fallback for null', () => {
    expect(formatPrice(null)).toBe('Price —');
  });

  test('returns fallback for 0', () => {
    expect(formatPrice(0)).toBe('Price —');
  });

  test('returns fallback for negative', () => {
    expect(formatPrice(-1)).toBe('Price —');
  });

  // WHY: Test every valid value in the enum/range to catch off-by-one in switch/if chains
  test('formats each valid level', () => {
    expect(formatPrice(1)).toBe('$');
    expect(formatPrice(2)).toBe('$$');
    expect(formatPrice(3)).toBe('$$$');
    expect(formatPrice(4)).toBe('$$$$');
  });

  test('returns fallback for undefined', () => {
    expect(formatPrice(undefined)).toBe('Price —');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Pattern Matching / Classification
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: Classification functions that use AND logic (keyword AND count) are
// frequently broken by treating conditions as OR. These tests verify the
// exact boolean logic your function uses.

// ADAPT: Replace with your classification/detection function
describe('matchesPattern — AND logic', () => {
  // WHY: Both conditions must be true (this is the AND test)
  test('returns true when BOTH conditions met', () => {
    expect(matchesPattern('keyword-match', 500)).toBe(true);
  });

  // WHY: Keyword alone is NOT enough — this catches OR-logic bugs
  test('returns false for keyword match with low count (AND logic)', () => {
    expect(matchesPattern('keyword-match', 100)).toBe(false);
  });

  // WHY: High count alone is NOT enough — this catches the other OR-logic bug
  test('returns false for high count without keyword match (AND logic)', () => {
    expect(matchesPattern('no-match', 500)).toBe(false);
  });

  test('returns false when neither condition met', () => {
    expect(matchesPattern('no-match', 50)).toBe(false);
  });

  // WHY: Missing/null secondary value should not crash or accidentally match
  test('returns false with null secondary value', () => {
    expect(matchesPattern('no-match', null)).toBe(false);
  });

  // WHY: Boundary value — test the exact threshold (499 vs 500)
  test('returns false at one below threshold', () => {
    expect(matchesPattern('keyword-match', 499)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Exclude / Filter Matching
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: Exclusion logic (blocklists, content filters, search filters) needs to
// handle case insensitivity, missing fields, and partial matches.

// ADAPT: Replace with your filter/exclude function
describe('matchesExclude', () => {
  test('returns false for empty exclude terms', () => {
    expect(matchesExclude({ name: 'Item', types: ['category'] }, [])).toBe(false);
  });

  // WHY: Case-insensitive matching prevents user frustration
  test('matches by name (case-insensitive)', () => {
    expect(matchesExclude({ name: 'Blocked Item', types: [] }, ['blocked item'])).toBe(true);
  });

  test('matches by type/category', () => {
    expect(matchesExclude({ name: 'Item', types: ['bar', 'restaurant'] }, ['bar'])).toBe(true);
  });

  test('does not match when no terms hit', () => {
    expect(matchesExclude({ name: 'Italian', types: ['restaurant'] }, ['sushi', 'thai'])).toBe(false);
  });

  // WHY: Missing fields should not crash the function
  test('handles item with no name', () => {
    expect(matchesExclude({ types: ['cafe'] }, ['cafe'])).toBe(true);
  });

  test('handles item with no types', () => {
    expect(matchesExclude({ name: 'Sushi Place' }, ['sushi'])).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// URL / Link Building
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: URL builders must properly encode special characters and handle missing
// optional parameters without producing broken URLs.

// ADAPT: Replace with your URL/link building function
describe('buildLinks', () => {
  test('returns expected number of links', () => {
    const links = buildLinks('Primary', 'Secondary');
    expect(links).toHaveLength(3); // ADAPT: your expected count
  });

  test('includes parameters in URLs (properly encoded)', () => {
    const links = buildLinks("O'Brien's", 'Special Item');
    expect(links[0].url).toContain('Special%20Item');
  });

  test('handles missing optional parameter', () => {
    const links = buildLinks('Primary Only');
    expect(links[0].url).toBeDefined();
    // Should not contain "undefined" in the URL
    expect(links[0].url).not.toContain('undefined');
  });

  test('each link has required properties', () => {
    const links = buildLinks('Test', 'Item');
    for (const link of links) {
      expect(link).toHaveProperty('label');
      expect(link).toHaveProperty('url');
    }
  });
});
