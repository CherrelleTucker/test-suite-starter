/**
 * Template: Database Operation Testing (CRUD + Constraints)
 *
 * WHAT THIS TESTS:
 * Database queries, batch operations, transactions, and cascade deletes.
 * These tests mock the database client to verify query construction, parameter
 * handling, and error recovery without needing a real database.
 *
 * WHEN TO USE:
 * - Any backend with database queries (SQL, NoSQL)
 * - Batch insert/upsert operations
 * - Transactions (atomic multi-query operations)
 * - Cascade delete (account deletion)
 * - Data validation before database writes
 *
 * MOCKING STRATEGY:
 * Mock the database client, not the handler. This lets you verify:
 * - Correct SQL/query construction
 * - Parameter sanitization (string truncation, type validation)
 * - Transaction atomicity (all-or-nothing)
 * - Error handling (503 on DB failure, not 500)
 */

// ADAPT: Replace with your actual imports and mocks
import { jest } from '@jest/globals';

// Mock the database module
const mockSql = jest.fn();
mockSql.transaction = jest.fn();
jest.unstable_mockModule('../lib/db.js', () => ({
  getDb: () => mockSql,
}));

// Mock auth
jest.unstable_mockModule('../lib/auth.js', () => ({
  verifyToken: jest.fn(() => 'clerk_user_123'),
  ensureUser: jest.fn(() => 42),
}));

// Mock security (pass-through)
jest.unstable_mockModule('../lib/security.js', () => ({
  runSecurityChecks: jest.fn(() => true),
}));

// Mock logger
jest.unstable_mockModule('../lib/logger.js', () => ({
  forRequest: jest.fn(() => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(),
  })),
}));

const handler = (await import('../api/user/history.js')).default;

// ═══════════════════════════════════════════════════════════════════════════════
// Helper: Build mock req/res objects
// ═══════════════════════════════════════════════════════════════════════════════

function mockReq(method, body = {}, query = {}) {
  return {
    method,
    body,
    query,
    headers: { 'x-forwarded-for': '1.2.3.4' },
  };
}

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
  };
  return res;
}

// ═══════════════════════════════════════════════════════════════════════════════

describe('database operations', () => {
  beforeEach(() => {
    mockSql.mockReset();
    mockSql.transaction.mockReset();
  });

  // ─── Read Operations ─────────────────────────────────────────────────────

  describe('GET sync data', () => {
    test('returns favorites, blocked, and custom spots', async () => {
      // ADAPT: Mock your DB response shape
      mockSql.mockResolvedValueOnce([{ place_id: 'p1', name: 'Fav' }])  // favorites
             .mockResolvedValueOnce([{ place_id: 'b1', name: 'Block' }]) // blocked
             .mockResolvedValueOnce([{ name: 'Custom' }]);               // customSpots

      const req = mockReq('GET', {}, { action: 'sync' });
      const res = mockRes();
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.favorites).toHaveLength(1);
      expect(res.body.blocked).toHaveLength(1);
      expect(res.body.customSpots).toHaveLength(1);
    });

    test('returns 503 on database error', async () => {
      mockSql.mockRejectedValueOnce(new Error('Connection refused'));

      const req = mockReq('GET', {}, { action: 'sync' });
      const res = mockRes();
      await handler(req, res);

      expect(res.statusCode).toBe(503);
      expect(res.body.error).toContain('unavailable');
    });
  });

  // ─── Write Operations ────────────────────────────────────────────────────

  describe('POST sync data', () => {
    test('empty sync (no arrays) returns ok without transaction', async () => {
      const req = mockReq('POST', { type: 'sync' });
      const res = mockRes();
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      // Transaction should NOT be called for empty sync
      expect(mockSql.transaction).not.toHaveBeenCalled();
    });

    test('sync with data runs transaction', async () => {
      mockSql.transaction.mockResolvedValueOnce();
      const req = mockReq('POST', {
        type: 'sync',
        favorites: [{ place_id: 'p1', name: 'Test Fav' }],
        blocked: [],
        customSpots: [],
      });
      const res = mockRes();
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockSql.transaction).toHaveBeenCalled();
    });
  });

  // ─── Input Validation ────────────────────────────────────────────────────

  describe('POST history — input validation', () => {
    test('rejects missing name for solo history', async () => {
      const req = mockReq('POST', { type: 'solo' });
      const res = mockRes();
      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('name');
    });

    test('rejects invalid role for group history', async () => {
      const req = mockReq('POST', {
        type: 'group',
        resultName: 'Restaurant',
        role: 'admin', // invalid
      });
      const res = mockRes();
      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('role');
    });

    test('rejects invalid type', async () => {
      const req = mockReq('POST', { type: 'invalid' });
      const res = mockRes();
      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  // ─── Delete Operations ───────────────────────────────────────────────────

  describe('DELETE — account deletion', () => {
    test('cascade delete removes user + returns ok', async () => {
      // ADAPT: Mock the cascade delete and third-party cleanup calls
      mockSql.mockResolvedValueOnce(); // DELETE FROM users

      // Mock fetch for Clerk + RevenueCat cleanup
      const originalFetch = global.fetch;
      global.fetch = jest.fn(() => Promise.resolve({ ok: true }));

      const req = mockReq('DELETE', { type: 'account' });
      const res = mockRes();

      // Set env vars for third-party cleanup
      process.env.CLERK_SECRET_KEY = 'test_key';
      process.env.REVENUECAT_API_KEY = 'test_key';
      process.env.REVENUECAT_PROJECT_ID = 'test_project';

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);

      global.fetch = originalFetch;
      delete process.env.CLERK_SECRET_KEY;
      delete process.env.REVENUECAT_API_KEY;
      delete process.env.REVENUECAT_PROJECT_ID;
    });

    // WHY: If Clerk or RevenueCat fails, the DB delete already happened.
    // The user should still get a success response with a warning.
    test('partial third-party failure returns ok with warning', async () => {
      mockSql.mockResolvedValueOnce(); // DB delete succeeds

      const originalFetch = global.fetch;
      global.fetch = jest.fn(() => Promise.reject(new Error('Timeout')));

      const req = mockReq('DELETE', { type: 'account' });
      const res = mockRes();
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.warning).toBeTruthy();

      global.fetch = originalFetch;
    });
  });

  // ─── Method Not Allowed ──────────────────────────────────────────────────
  test('returns 405 for unsupported methods', async () => {
    const req = mockReq('PUT', {});
    const res = mockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(405);
  });
});
