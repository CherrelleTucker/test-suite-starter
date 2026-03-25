/**
 * Template: API Response Schema Validation
 *
 * WHAT THIS TESTS:
 * That API endpoints return responses matching expected shapes — correct field
 * names, types, and structure. This catches breaking API changes before they
 * crash the client.
 *
 * WHEN TO USE:
 * - Any backend API endpoint
 * - After refactoring response construction
 * - When multiple clients depend on the same API (mobile, web, third-party)
 *
 * KEY TECHNIQUE: expect.any() and expect.objectContaining()
 * For dynamic fields (IDs, timestamps), verify the TYPE not the VALUE:
 *   expect(response.id).toEqual(expect.any(String))
 */

// ADAPT: Replace with your API handler
import { jest } from '@jest/globals';

// Mock dependencies so the handler can run in isolation
jest.unstable_mockModule('ioredis', () => ({ default: jest.fn() }));
jest.unstable_mockModule('../lib/security.js', () => ({
  runSecurityChecks: jest.fn(() => true),
}));
jest.unstable_mockModule('../lib/logger.js', () => ({
  forRequest: jest.fn(() => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() })),
}));

// ADAPT: Import your handler
// const handler = (await import('../api/endpoint.js')).default;

// ═══════════════════════════════════════════════════════════════════════════════
// Helper
// ═══════════════════════════════════════════════════════════════════════════════

function mockReq(method, body = {}, query = {}) {
  return { method, body, query, headers: {} };
}

function mockRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  return res;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Create Response Schema
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /create — response schema', () => {
  test('returns code, hostId, and participantCount', async () => {
    // ADAPT: Call your handler
    // const req = mockReq('POST', { hostName: 'Alice', latitude: 38, longitude: -77 });
    // const res = mockRes();
    // await handler(req, res);

    // expect(res.statusCode).toBe(200);
    // expect(res.body).toEqual(expect.objectContaining({
    //   code: expect.any(String),
    //   hostId: expect.any(String),
    //   participantCount: expect.any(Number),
    // }));
    // expect(res.body.code).toHaveLength(4); // 4-letter code
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Join Response Schema
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /join — response schema', () => {
  test('returns participantId, participants array, and metadata', async () => {
    // ADAPT: Create session first, then join
    // expect(res.body).toEqual(expect.objectContaining({
    //   participantId: expect.any(String),
    //   code: expect.any(String),
    //   locationName: expect.any(String),
    //   meetUpTime: null, // or expect.any(String)
    //   hostName: expect.any(String),
    //   hostRadius: null, // host hasn't set filters yet
    //   participants: expect.any(Array),
    // }));
  });

  test('each participant has name, isHost, and ready fields', async () => {
    // ADAPT: After joining, verify participant shape
    // for (const p of res.body.participants) {
    //   expect(p).toEqual(expect.objectContaining({
    //     name: expect.any(String),
    //     isHost: expect.any(Boolean),
    //     ready: expect.any(Boolean),
    //   }));
    // }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Error Response Schema
// ═══════════════════════════════════════════════════════════════════════════════

describe('error responses — consistent shape', () => {
  // WHY: Clients parse error responses too. If the shape varies, the client
  // error handler breaks.

  test('400 errors have { error: string }', async () => {
    // ADAPT: Trigger a validation error
    // const req = mockReq('POST', { /* missing required field */ });
    // const res = mockRes();
    // await handler(req, res);
    // expect(res.statusCode).toBe(400);
    // expect(res.body).toEqual({ error: expect.any(String) });
  });

  test('503 errors have { error: string }', async () => {
    // ADAPT: Trigger a service error
    // expect(res.body).toEqual({ error: expect.any(String) });
    // expect(res.body.error).not.toContain('stack'); // no stack traces
  });

  test('error messages do not leak internal details', async () => {
    // WHY: Error messages sent to clients should not contain stack traces,
    // file paths, SQL queries, or environment variable names.
    // ADAPT: Trigger an error and check the message
    // expect(res.body.error).not.toMatch(/node_modules|\.js:|at\s+/);
    // expect(res.body.error).not.toMatch(/SELECT|INSERT|DELETE/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Partial Response (Warning Field)
// ═══════════════════════════════════════════════════════════════════════════════

describe('account deletion — conditional warning field', () => {
  test('clean deletion: { ok: true } with no warning', async () => {
    // ADAPT: Mock all third-party calls succeeding
    // expect(res.body).toEqual({ ok: true });
    // expect(res.body.warning).toBeUndefined();
  });

  test('partial failure: { ok: true, warning: string }', async () => {
    // ADAPT: Mock a third-party call failing
    // expect(res.body.ok).toBe(true);
    // expect(res.body.warning).toEqual(expect.any(String));
  });
});
