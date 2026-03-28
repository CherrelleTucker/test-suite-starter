# Test Suite Starter

A collection of **battle-tested Jest test templates** extracted from a production mobile + serverless app. Each template covers a specific testing pattern with inline guidance on what it tests, why it matters, and how to adapt it to your project.

These aren't toy examples — they're derived from real bugs caught in production, real edge cases discovered during code review, and real patterns that prevented regressions.

## What's Included

| Template | Pattern | Best For |
|----------|---------|----------|
| `pure-functions.test.js` | Boundary conditions, null handling, case sensitivity | Any utility/helper functions |
| `dedup-and-merge.test.js` | Union strategies, conflict resolution, normalization | Data sync, imports, multi-source merging |
| `quota-and-usage.test.js` | Tier enforcement, counter resets, entitlement checks | SaaS, freemium, rate-limited features |
| `api-resilience.test.js` | Fail-open, network errors, version checking | Any app calling external APIs |
| `structured-logging.test.js` | JSON logging, correlation IDs, request-scoped context | Any backend with observability needs |
| `filter-aggregation.test.js` | Multi-user preference merging (min/max/union/OR) | Collaborative features, multi-tenant apps |
| `origin-and-rate-limit.test.js` | Origin whitelisting, IP rate limiting, fail-open | Any web backend with security middleware |
| `date-time-boundaries.test.js` | Time-of-day calculations, month rollovers, timezone edge cases | Scheduling, closing-soon, monthly resets |
| `state-transitions.test.js` | State machine lifecycle, valid/invalid transitions, auth gates | Session management, order pipelines, subscriptions |
| `database-operations.test.js` | CRUD, transactions, cascade deletes, input sanitization | Any backend with database queries |
| `error-flows.test.js` | Error classification, backoff, partial failure, user messages | Error recovery, retry logic, degraded UX |
| `response-schema.test.js` | API response shapes, dynamic fields, error consistency | Any backend API endpoint |
| `timers-and-debounce.test.js` | Debounce, throttle, exponential backoff, AbortController | Search inputs, polling, rate limiting |
| `property-based.test.js` | Randomized inputs, invariants, adversarial strings | Input processing, encoding, math functions |
| `middleware-isolation.test.js` | Input validation, action routing, method handling | Express/serverless middleware |
| `component-interaction.test.js` | Button presses, form validation, modal visibility | React/React Native UI components |
| `custom-hooks.test.js` | Initial state, state updates, cleanup, async effects | Custom React hooks |
| `network-interceptor.test.js` | HTTP-level interception, request verification, retry simulation | Any outbound API calls (nock/MSW) |
| `code-comments.test.js` | JSDoc coverage, @param/@returns accuracy, TODO markers | Any JS codebase valuing documentation |
| `test-suite-health.test.js` | Coverage gaps, skipped tests, duplicate names, empty blocks | Any project with 3+ test files |
| `data-standardization.test.js` | Secrets, real emails, API keys, PII, .env files | Any public/open-source repository |

## Quick Start

```bash
# 1. Clone or copy into your project
cp -r templates/ your-project/__tests__/

# 2. Install Jest (if not already installed)
npm install --save-dev jest

# 3. Pick the templates that match your code, adapt the imports, run
npx jest
```

## Project Structure

```
test-suite-starter/
├── README.md                          # You're here
├── templates/
│   ├── setup/
│   │   ├── setup-cjs.js               # Jest setup for CommonJS (React Native, Node CJS)
│   │   ├── setup-esm.js               # Jest setup for ESM (Node 18+, Vercel serverless)
│   │   └── mock-examples.js           # Common mock patterns (fetch, storage, Redis, etc.)
│   ├── pure-functions.test.js         # Utility/helper function testing
│   ├── dedup-and-merge.test.js        # Data deduplication and merge logic
│   ├── quota-and-usage.test.js        # Usage quotas, tier enforcement, resets
│   ├── api-resilience.test.js         # External API call resilience
│   ├── structured-logging.test.js     # JSON structured logging verification
│   ├── filter-aggregation.test.js     # Multi-source filter/preference merging
│   ├── origin-and-rate-limit.test.js  # Security middleware (origin + rate limit)
│   ├── code-comments.test.js         # JSDoc/documentation quality (wide)
│   ├── test-suite-health.test.js     # Meta-test: suite validation (wide)
│   └── data-standardization.test.js  # Public repo data safety CI gate (wide)
├── configs/
│   ├── jest.config.cjs.js             # Jest config for CommonJS projects
│   └── jest.config.esm.js             # Jest config for ESM projects
└── PATTERNS.md                        # Detailed pattern guide with decision tree
```

## How to Use These Templates

Each template file follows the same structure:

1. **Header comment** — What this template tests and when to use it
2. **Import section** — Placeholder imports with comments on what to replace
3. **Test blocks** — Real test cases grouped by function, with inline `// WHY:` comments explaining the reasoning
4. **`ADAPT:` markers** — Search for `ADAPT:` to find every line you need to change for your project

### Adaptation workflow

1. Pick the template(s) that match your code
2. Search for `ADAPT:` comments — these mark every project-specific value
3. Replace the placeholder imports with your actual module paths
4. Replace placeholder function names with your actual function names
5. Adjust expected values to match your business logic
6. Delete any test blocks that don't apply to your project
7. Run `npx jest` to verify

## Jest Configuration

### For CommonJS projects (React Native, standard Node.js)

Copy `configs/jest.config.cjs.js` to your project root as `jest.config.js`, or add the config inline in your `package.json`:

```json
{
  "jest": {
    "setupFiles": ["./__tests__/setup.js"],
    "testPathIgnorePatterns": ["__tests__/setup.js", "__tests__/__mocks__/"],
    "transformIgnorePatterns": ["node_modules/(?!(expo|react-native|@react-native)/)"]
  }
}
```

### For ESM projects (Node 18+, Vercel serverless)

Use `configs/jest.config.esm.js` and run Jest with the ESM flag:

```json
{
  "scripts": {
    "test": "node --experimental-vm-modules node_modules/.bin/jest"
  }
}
```

## Testing Philosophy

These templates follow specific principles that were learned the hard way:

1. **Test the function, not the mock.** Never mock the thing you're testing. Mock its dependencies.
2. **Meaningful assertions only.** Every `expect()` verifies a real business rule. No "does not throw" filler.
3. **Edge cases matter more than happy paths.** Null, undefined, empty arrays, boundary values, case sensitivity — these are where real bugs hide.
4. **Fail-open vs. fail-closed is a design decision, not an accident.** API resilience tests explicitly verify which failure mode your app uses.
5. **Local wins on conflict.** When merging data from multiple sources, the test suite verifies which source takes priority — and that this is consistent.
6. **Immutability matters.** Several tests verify that functions don't mutate their input. This prevents subtle state bugs.

## License

MIT — Use freely in any project.
