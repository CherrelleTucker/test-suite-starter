# Testing Pattern Guide

A decision tree and reference for choosing the right test template.

## Which Template Do I Need?

```
What are you testing?
│
├─ A utility/helper function (pure input → output)
│  └─ Use: pure-functions.test.js
│
├─ Merging data from two sources (local + cloud, import + existing)
│  └─ Use: dedup-and-merge.test.js
│
├─ Usage limits, subscription tiers, or counters
│  └─ Use: quota-and-usage.test.js
│
├─ A function that calls fetch() or an external API
│  └─ Use: api-resilience.test.js
│
├─ A logging module (JSON output, log levels)
│  └─ Use: structured-logging.test.js
│
├─ Combining preferences/filters from multiple users
│  └─ Use: filter-aggregation.test.js
│
└─ Security middleware (CORS, rate limiting, auth guards)
   └─ Use: origin-and-rate-limit.test.js
```

## Edge Cases to Always Test

Regardless of which template you use, always test these:

### Null / Undefined / Empty
| Input | What breaks | How to test |
|-------|-------------|-------------|
| `null` | Property access crashes (`null.field`) | Pass null, expect graceful return |
| `undefined` | Same as null, plus `typeof` surprises | Pass undefined explicitly |
| `""` (empty string) | Falsy but not nullish — `if (!x)` catches it | Pass `""`, verify behavior matches intent |
| `0` | Falsy but valid — `if (!x)` catches it | Pass `0`, verify it's not treated as "missing" |
| `[]` (empty array) | `.length === 0` but truthy | Pass `[]`, verify no crash |
| `{}` (empty object) | Truthy but has no keys | Pass `{}`, verify no crash |

### Boundaries
| Scenario | Example | What breaks |
|----------|---------|-------------|
| Exactly at limit | `count === 10` when limit is 10 | Off-by-one (`>` vs `>=`) |
| One below limit | `count === 9` | Should be allowed |
| One above limit | `count === 11` | Should be blocked |
| Min equals max | `clamp(5, 3, 3)` | Range collapse |
| Negative values | `clamp(-5, -10, -1)` | Sign handling |

### Case Sensitivity
| Input | What breaks | How to test |
|-------|-------------|-------------|
| `"UPPERCASE"` | Exact string match fails | Compare normalized versions |
| `"  whitespace  "` | Untrimmed strings don't match | Trim before comparing |
| Mixed case | `"McDonalds"` vs `"mcdonalds"` | Use `.toLowerCase()` in comparison |

### Time / Date
| Scenario | What breaks | How to test |
|----------|-------------|-------------|
| Month 0 (January) | Treated as falsy by `if (!month)` | Explicit test with month = 0 |
| Dec → Jan rollover | Year change not detected | Test with month 11 → month 0, year + 1 |
| DST transition | Time-based calculations off by 1 hour | Use UTC or explicit timezone |
| End of month | Feb 28/29, months with 30/31 days | Test boundary dates |

## Merge Strategy Reference

When combining data from multiple sources, each field type needs a different strategy:

| Strategy | When to use | Example |
|----------|-------------|---------|
| **Minimum** (most restrictive) | Limits that protect ALL users | Search radius, max price |
| **Maximum** (highest standard) | Quality floors | Min rating, min reputation |
| **OR** (any vote wins) | Binary constraints | "Open now", "verified only" |
| **Union** | Lists that should combine | Keywords, categories |
| **Union + dedup + normalize** | Lists with user input | Exclude terms (lowercase, trim, dedup) |
| **Local wins** | Conflict resolution with priority | Sync merge (local changes > cloud) |

## Fail-Open vs. Fail-Closed

When an external dependency fails (network, Redis, auth server), your code must choose:

| Strategy | When to use | Example |
|----------|-------------|---------|
| **Fail-open** | Availability > protection | Version check, analytics, logging |
| **Fail-closed** | Security > availability | Auth verification, payment validation |

**Always test both the happy path AND the failure mode.** The failure mode test is more important — it verifies your intentional design decision, not just that the code works when everything is fine.

## Anti-Patterns to Avoid

### Tautological Tests (Always Pass)
```javascript
// BAD: This test always passes — it tests nothing
test('renders without crashing', () => {
  expect(true).toBe(true);
});

// GOOD: This tests an actual behavior
test('returns empty array for null input', () => {
  expect(mergeData(null, null).items).toEqual([]);
});
```

### Mocking the Thing You're Testing
```javascript
// BAD: You mocked the function you're testing
jest.mock('../utils/merge');
test('merge works', () => {
  merge.mockReturnValue({ items: [] });
  expect(merge()).toEqual({ items: [] }); // You're testing your mock, not your code
});

// GOOD: Mock dependencies, test the real function
jest.mock('../lib/storage');
test('merge handles empty storage', () => {
  storage.getItem.mockResolvedValue(null);
  const result = await merge(localData, cloudData);
  expect(result.items).toHaveLength(2);
});
```

### Testing Implementation Instead of Behavior
```javascript
// BAD: Testing HOW it works (brittle — breaks on refactor)
test('calls toLowerCase on input', () => {
  const spy = jest.spyOn(String.prototype, 'toLowerCase');
  normalize('Hello');
  expect(spy).toHaveBeenCalled();
});

// GOOD: Testing WHAT it does (survives refactors)
test('normalizes to lowercase', () => {
  expect(normalize('Hello')).toBe('hello');
});
```

## Coverage vs. Quality

High coverage with weak assertions is worse than low coverage with strong assertions:

```javascript
// 100% coverage, 0% value — just runs the code without checking anything
test('runs without error', () => {
  processOrder(mockOrder);
  // no assertions!
});

// Lower coverage, high value — verifies actual business rules
test('applies 10% discount for orders over $100', () => {
  const result = processOrder({ items: [{ price: 120 }] });
  expect(result.discount).toBe(12);
  expect(result.total).toBe(108);
});
```

## Getting Started Checklist

1. [ ] Pick the templates that match your codebase
2. [ ] Search for `ADAPT:` markers and replace placeholder values
3. [ ] Replace placeholder imports with your actual module paths
4. [ ] Delete test blocks that don't apply to your project
5. [ ] Run `npx jest` to verify all tests pass
6. [ ] Add `npm test` to your CI pipeline
7. [ ] Run `npx jest --coverage` to find gaps
