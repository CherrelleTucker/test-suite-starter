# AI Agent Instructions — Test Suite Starter

This file is designed to be read by AI coding agents (Claude Code, Cursor, Copilot, Aider, etc.) to guide them through selecting, adapting, and running tests from this template suite.

Copy this file (or the relevant sections) into your project's `CLAUDE.md`, `.cursorrules`, or equivalent AI instruction file.

---

## For AI Agents: How to Use This Test Suite

You are working with a set of **test templates** in the `__tests__/` directory (or wherever the project has placed them). Each template file covers a specific testing pattern. Your job is to adapt these templates to the project's actual code and run them.

### Step 1: Identify What Needs Testing

Read the project's source code and categorize each testable module:

| If the module contains... | Use this template |
|---------------------------|-------------------|
| Pure utility/helper functions (math, formatting, validation, string manipulation) | `pure-functions.test.js` |
| Data merging from 2+ sources, deduplication logic, sync/import functions | `dedup-and-merge.test.js` |
| Usage quotas, subscription tiers, counter management, monthly resets | `quota-and-usage.test.js` |
| Functions that call `fetch()` or external HTTP APIs | `api-resilience.test.js` |
| Structured logging (JSON to stdout/stderr), correlation IDs | `structured-logging.test.js` |
| Multi-user preference/filter merging, config aggregation | `filter-aggregation.test.js` |
| Origin/CORS checking, rate limiting, security middleware | `origin-and-rate-limit.test.js` |

### Step 2: Adapt the Template

Each template contains `ADAPT:` markers at every line that needs project-specific changes. For each template:

1. **Replace imports** — Change the placeholder import paths to the actual module paths in this project
2. **Replace function names** — Match the actual exported function names
3. **Replace test values** — Update expected values to match actual business logic (e.g., tier limits, allowed origins, default values)
4. **Remove inapplicable blocks** — Delete `describe()` blocks for functions that don't exist in this project
5. **Add project-specific tests** — If the project has functions not covered by any template, write new tests following the same patterns (boundary values, null handling, case sensitivity)

### Step 3: Set Up Jest

Check if Jest is already configured:
```bash
npx jest --version 2>/dev/null
```

If not installed:
```bash
npm install --save-dev jest
```

Choose the right config based on the project's module system:
- **CommonJS** (`require`/`module.exports`): Use `configs/jest.config.cjs.js`
- **ESM** (`import`/`export`): Use `configs/jest.config.esm.js` and add to package.json:
  ```json
  { "scripts": { "test": "node --experimental-vm-modules node_modules/.bin/jest" } }
  ```

If the project uses React Native or Expo, also copy `templates/setup/setup-cjs.js` to `__tests__/setup.js` and adapt the mocks for the project's native modules.

### Step 4: Run Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage

# Run a specific test file
npx jest __tests__/pure-functions.test.js

# Run tests matching a pattern
npx jest --testPathPattern="quota"
```

### Step 5: Interpret Results

- **All tests pass**: The adapted tests correctly verify the project's logic
- **Test fails with `ReferenceError: X is not defined`**: The import path or function name is wrong — check the actual exports
- **Test fails with wrong expected value**: The template's expected value doesn't match the project's actual logic — update the expected value to match the correct behavior, not the other way around
- **Test fails with `Cannot find module`**: The import path doesn't resolve — check file paths and module aliases

---

## Test Writing Rules for AI Agents

When adapting templates or writing new tests, follow these rules:

### DO
- **Test the function's behavior**, not its implementation
- **Test edge cases first**: null, undefined, empty, zero, boundary values, case sensitivity
- **Use meaningful assertions**: Every `expect()` should verify a real business rule
- **Mock dependencies, not the function being tested**
- **Verify immutability**: If a function should not mutate its input, add a mutation test
- **Test both success AND failure paths**: The failure path test is often more important
- **Use descriptive test names**: `'blocks solo fork at free limit'` not `'test case 3'`

### DO NOT
- Do not write tests that always pass (tautological assertions like `expect(true).toBe(true)`)
- Do not mock the function you're testing
- Do not test implementation details (which internal method was called)
- Do not add `console.log` to tests
- Do not skip failing tests with `.skip` — fix them or remove them
- Do not write tests just to increase coverage numbers — every test should verify a meaningful behavior

### Fail-Open vs. Fail-Closed
When testing functions that depend on external services (APIs, Redis, databases):
- **Verify which failure strategy the code uses** — don't assume
- **Document the strategy in the test name**: `'returns false on network error (FAIL-OPEN)'`
- If the strategy seems wrong (e.g., auth checking fails-open), flag it as a potential security issue

### Merge Strategy Verification
When testing multi-source merging, verify each field's strategy:
- **Minimum** (most restrictive): `radius`, `maxPrice`
- **Maximum** (highest standard): `minRating`, `minReputation`
- **OR** (any vote wins): `openNow`, `verifiedOnly`
- **Union**: keyword lists, category selections
- **Union + dedup + normalize**: exclude lists

### Month/Time Boundary Tests
Always include:
- Month 0 (January) — it's falsy in JS
- December → January rollover (month 11 → month 0, year + 1)
- End of month dates (28, 29, 30, 31)

---

## AI Prompt Templates

### To set up tests for a new project:
```
Read the source code in [directory]. Using the test templates in __tests__/,
create adapted test files for each testable module. Search for ADAPT: markers
and replace all placeholder values with actual function names, import paths,
and expected values from this project. Run the tests to verify they pass.
```

### To add tests for a specific module:
```
Read [file path]. Determine which test template from __tests__/ best matches
this module's pattern. Adapt that template for this specific module. Focus on
edge cases: null inputs, boundary values, and case sensitivity.
```

### To run the full test suite and report:
```
Run npm test with coverage. Report:
1. Total tests: passed / failed / skipped
2. Coverage percentages for each source file
3. Any failing tests with the error message
4. Uncovered files that should have tests
```

### To verify a bug fix:
```
The bug was: [description]. A fix was applied to [file]. Write a regression
test that would have caught this bug — it should fail without the fix and
pass with it. Add it to the appropriate test file.
```

---

## Template File Reference

| File | Tests | Edge Cases Covered |
|------|-------|-------------------|
| `pure-functions.test.js` | Utility/helper functions | null, undefined, 0, empty string, boundary values, negative ranges, case sensitivity, idempotency |
| `dedup-and-merge.test.js` | Data sync and deduplication | Empty sources, ID conflicts, composite key matching, case-insensitive dedup, rename through merge, null arrays, metadata preservation, empty address edge case |
| `quota-and-usage.test.js` | Usage limits and subscriptions | Tier-specific limits, at-limit boundary, month reset, year rollover, month 0 (January), unlimited tier bypass, immutability, entitlement null-safety |
| `api-resilience.test.js` | External API calls | Network failure, non-OK response, missing response fields, fail-open vs fail-closed strategy |
| `structured-logging.test.js` | JSON logging | stdout vs stderr routing, JSON validity, correlation ID uniqueness, proxy IP extraction, missing headers |
| `filter-aggregation.test.js` | Multi-source merging | Min/max/OR/union strategies, null participants, empty strings, deduplication, default values |
| `origin-and-rate-limit.test.js` | Security middleware | Mobile (no origin), whitelisted origins, blocked origins, referer fallback, rate limit boundary, TTL on first request, Redis failure (fail-open) |
