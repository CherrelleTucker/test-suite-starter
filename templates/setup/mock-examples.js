/**
 * Common Mock Patterns
 *
 * Reference file showing how to mock frequently-used dependencies.
 * Copy the patterns you need into your test files or setup.js.
 *
 * These are NOT meant to be imported directly — they're copy-paste recipes.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GLOBAL FETCH
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: Mock fetch per-test to control API responses without hitting the network.
// Always restore the original after each test to prevent leaking between tests.

const originalFetch = global.fetch;

// In your test:
// beforeEach(() => {
//   global.fetch = jest.fn();
// });
// afterEach(() => {
//   global.fetch = originalFetch;
// });

// Success response:
// global.fetch = jest.fn(() =>
//   Promise.resolve({
//     ok: true,
//     json: () => Promise.resolve({ data: 'value' }),
//   })
// );

// Network failure:
// global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

// Non-OK response:
// global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500 }));


// ═══════════════════════════════════════════════════════════════════════════════
// 2. REDIS / KV STORE
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: Redis calls need to be mocked in unit tests. Create a mock object
// with the methods your code actually calls, then reset between tests.

// const mockRedis = {
//   get: jest.fn(),
//   set: jest.fn(),
//   incr: jest.fn(),
//   expire: jest.fn(),
//   ttl: jest.fn(),
//   del: jest.fn(),
// };

// For CJS:
// jest.mock('ioredis', () => jest.fn(() => mockRedis));

// For ESM:
// jest.unstable_mockModule('ioredis', () => ({ default: jest.fn() }));
// Then inject mockRedis through a factory that your code calls.

// Reset between tests:
// beforeEach(() => {
//   Object.values(mockRedis).forEach(fn => fn.mockReset());
// });


// ═══════════════════════════════════════════════════════════════════════════════
// 3. STDOUT / STDERR (for logging tests)
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: Verify structured logging output without polluting test console.

// let stdoutSpy, stderrSpy;
// beforeEach(() => {
//   stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
//   stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
// });
// afterEach(() => {
//   stdoutSpy.mockRestore();
//   stderrSpy.mockRestore();
// });

// To verify JSON output:
// const output = JSON.parse(stdoutSpy.mock.calls[0][0]);
// expect(output.level).toBe('info');


// ═══════════════════════════════════════════════════════════════════════════════
// 4. DATE / TIME
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: Time-dependent tests should use explicit Date objects, not Date.now().
// Pass the date as a parameter to your function rather than mocking Date globally.

// GOOD: Function accepts a `now` parameter
// function shouldResetUsage(usage, now = new Date()) { ... }
// const now = new Date(2026, 2, 15); // March 15, 2026
// expect(shouldResetUsage(usage, now)).toBe(true);

// AVOID: Mocking the global Date constructor (fragile, leaks between tests)


// ═══════════════════════════════════════════════════════════════════════════════
// 5. MODULE-LEVEL MOCK (CJS)
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: When a module you're testing imports another module at the top level,
// mock it before the import happens.

// __tests__/__mocks__/expo-store-review.js
// module.exports = {
//   isAvailableAsync: jest.fn(() => Promise.resolve(false)),
//   requestReview: jest.fn(() => Promise.resolve()),
// };

// In jest config, add moduleNameMapper:
// "moduleNameMapper": { "expo-store-review": "<rootDir>/__tests__/__mocks__/expo-store-review.js" }


// ═══════════════════════════════════════════════════════════════════════════════
// 6. STATE CALLBACK (React setState pattern)
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: When testing functions that call a setState-like callback, pass a jest.fn()
// and inspect what it was called with.

// const setItems = jest.fn();
// addItem('New Item', { currentItems: [], setItems });
// expect(setItems).toHaveBeenCalledTimes(1);
// const newState = setItems.mock.calls[0][0];
// expect(newState).toHaveLength(1);
// expect(newState[0].name).toBe('New Item');


// ═══════════════════════════════════════════════════════════════════════════════
// 7. ERROR MONITORING (Sentry, Bugsnag, etc.)
// ═══════════════════════════════════════════════════════════════════════════════

// jest.mock('@sentry/react-native', () => ({
//   captureException: jest.fn(),
//   captureMessage: jest.fn(),
//   addBreadcrumb: jest.fn(),
// }));
