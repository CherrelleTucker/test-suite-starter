/**
 * Template: Origin Whitelisting & Rate Limiting
 *
 * WHAT THIS TESTS:
 * Security middleware that controls who can access your API and how often.
 * These are critical backend tests — if origin checking fails, anyone can call
 * your API. If rate limiting fails, a single client can exhaust your resources.
 *
 * WHEN TO USE:
 * - Any backend with CORS or origin restrictions
 * - APIs accessed by both web and mobile clients
 * - Rate-limited endpoints (per-IP, per-user, per-API-key)
 * - Any middleware that returns allow/deny decisions
 *
 * KEY DESIGN DECISIONS:
 * 1. Mobile apps don't send Origin headers — should they be allowed?
 * 2. Should rate limiting fail-open (allow) or fail-closed (block) on Redis error?
 * 3. What's the rate limit window and threshold?
 */

// ADAPT: Replace with your security module
import { jest } from '@jest/globals';

// Mock Redis (rate limiting depends on it)
jest.unstable_mockModule('ioredis', () => ({
  default: jest.fn(),
}));

// Mock logger (security functions log decisions)
jest.unstable_mockModule('../lib/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  forRequest: jest.fn(() => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() })),
}));

// Mock the module that provides the Redis client
const mockRedis = {
  incr: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
};
jest.unstable_mockModule('../lib/group.js', () => ({
  getRedis: jest.fn(() => mockRedis),
}));

const { checkOrigin, checkRateLimit } = await import('../lib/security.js');

// ═══════════════════════════════════════════════════════════════════════════════
// Origin Whitelisting
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: Your API should only accept requests from known clients. This prevents
// unauthorized websites from calling your API using your users' credentials.

describe('checkOrigin', () => {
  // WHY: Mobile apps and direct API calls don't include Origin or Referer headers.
  // Blocking them would break native app functionality.
  test('allows requests with no origin or referer (mobile/direct)', () => {
    const req = { headers: {} };
    const result = checkOrigin(req);
    expect(result.allowed).toBe(true);
    expect(result.origin).toBe('mobile/direct'); // ADAPT: your label
  });

  // ADAPT: Replace with your actual allowed origins
  test('allows production web origin', () => {
    const req = { headers: { origin: 'https://your-app.vercel.app' } };
    const result = checkOrigin(req);
    expect(result.allowed).toBe(true);
  });

  test('allows custom domain origin', () => {
    const req = { headers: { origin: 'https://yourdomain.io' } };
    const result = checkOrigin(req);
    expect(result.allowed).toBe(true);
  });

  // WHY: This is the actual security test — unauthorized origins MUST be blocked
  test('blocks unauthorized origin', () => {
    const req = { headers: { origin: 'https://evil.com' } };
    const result = checkOrigin(req);
    expect(result.allowed).toBe(false);
  });

  // WHY: Some browsers send Referer instead of Origin. Both need to be checked.
  test('blocks unauthorized referer', () => {
    const req = { headers: { referer: 'https://evil.com/page' } };
    const result = checkOrigin(req);
    expect(result.allowed).toBe(false);
  });

  // WHY: Referer includes the full path — your check should match by prefix/origin
  test('allows valid referer when no origin header', () => {
    const req = { headers: { referer: 'https://your-app.vercel.app/page/subpage' } };
    const result = checkOrigin(req);
    expect(result.allowed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Rate Limiting (IP-based, with Redis)
// ═══════════════════════════════════════════════════════════════════════════════

describe('checkRateLimit', () => {
  beforeEach(() => {
    mockRedis.incr.mockReset();
    mockRedis.expire.mockReset();
    mockRedis.ttl.mockReset();
  });

  test('allows request under limit', async () => {
    mockRedis.incr.mockResolvedValue(5);
    const req = { headers: { 'x-forwarded-for': '1.2.3.4' }, socket: {} };
    const result = await checkRateLimit(req);
    expect(result.allowed).toBe(true);
    // ADAPT: Replace 55 with (your_limit - 5)
    expect(result.remaining).toBe(55);
  });

  // WHY: The TTL (time-to-live) on the rate limit key defines the window.
  // It must only be set on the FIRST request, not every request (which would
  // keep extending the window and make the limit more restrictive than intended).
  test('sets TTL on first request only', async () => {
    mockRedis.incr.mockResolvedValue(1); // First request returns count = 1
    const req = { headers: { 'x-forwarded-for': '1.2.3.4' }, socket: {} };
    await checkRateLimit(req);
    expect(mockRedis.expire).toHaveBeenCalled();
  });

  test('blocks request over limit', async () => {
    // ADAPT: Replace 61 with your_limit + 1
    mockRedis.incr.mockResolvedValue(61);
    mockRedis.ttl.mockResolvedValue(30);
    const req = { headers: { 'x-forwarded-for': '1.2.3.4' }, socket: {} };
    const result = await checkRateLimit(req);
    expect(result.allowed).toBe(false);
    // WHY: Returning retryAfter helps well-behaved clients back off
    expect(result.retryAfter).toBe(30);
  });

  // WHY: If Redis goes down, should your API stop working entirely?
  // Most APIs choose fail-open: allow the request and log the Redis error.
  // Only choose fail-closed if abuse prevention is more important than availability.
  test('fails open on Redis error (availability > protection)', async () => {
    mockRedis.incr.mockRejectedValue(new Error('Redis down'));
    const req = { headers: { 'x-forwarded-for': '1.2.3.4' }, socket: {} };
    const result = await checkRateLimit(req);
    expect(result.allowed).toBe(true);
  });

  // ALTERNATIVE: If your API should fail-closed on Redis error:
  // test('fails closed on Redis error (protection > availability)', async () => {
  //   mockRedis.incr.mockRejectedValue(new Error('Redis down'));
  //   const result = await checkRateLimit(req);
  //   expect(result.allowed).toBe(false);
  // });
});
