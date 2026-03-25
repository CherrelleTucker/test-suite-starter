/**
 * Template: Structured Logging Verification
 *
 * WHAT THIS TESTS:
 * JSON-formatted logging functions that write to stdout/stderr. Structured logs
 * are machine-parseable, searchable, and filterable in production — but only if
 * the format is consistent and correct.
 *
 * WHEN TO USE:
 * - Any backend with structured (JSON) logging
 * - Custom logger modules (not just console.log)
 * - Request-scoped logging with correlation IDs
 * - Log routing (info/warn → stdout, error → stderr)
 *
 * WHAT TO VERIFY:
 * 1. Output format is valid JSON (not a stringified object with console.log artifacts)
 * 2. Required fields exist (level, message, timestamp)
 * 3. Log levels route to correct streams (stdout vs stderr)
 * 4. Request context (correlation ID, endpoint, IP) is attached correctly
 * 5. Extra fields are passed through
 */

// ADAPT: Replace with your logger module
// For ESM:
import { jest } from '@jest/globals';
const { forRequest, correlationId, info, error, warn } = await import('../lib/logger.js');

// For CJS, use instead:
// const { forRequest, correlationId, info, error, warn } = require('../lib/logger');

// ═══════════════════════════════════════════════════════════════════════════════

describe('logger', () => {
  let stdoutSpy, stderrSpy;

  beforeEach(() => {
    // WHY: Capture stdout/stderr writes without polluting test output
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  // ─── Correlation IDs ──────────────────────────────────────────────────────
  // WHY: Correlation IDs trace a single request across multiple log lines.
  // They MUST be unique per call.

  test('correlationId returns unique IDs', () => {
    const id1 = correlationId();
    const id2 = correlationId();
    expect(id1).not.toBe(id2);
  });

  // ─── Log Level Routing ────────────────────────────────────────────────────
  // WHY: Production log aggregators (Datadog, CloudWatch, etc.) separate
  // stdout and stderr. If errors go to stdout, they'll be missed by alerts.

  test('info logs to stdout as JSON', () => {
    info('test message', { key: 'value' });
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(stdoutSpy.mock.calls[0][0]);
    expect(output.level).toBe('info');
    expect(output.msg).toBe('test message');
    expect(output.key).toBe('value'); // Extra fields passed through
    expect(output.ts).toBeDefined(); // Timestamp present
  });

  test('error logs to stderr as JSON', () => {
    error('bad thing', { status: 503 });
    expect(stderrSpy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(stderrSpy.mock.calls[0][0]);
    expect(output.level).toBe('error');
    expect(output.msg).toBe('bad thing');
    expect(output.status).toBe(503);
  });

  test('warn logs to stdout (not stderr)', () => {
    warn('caution');
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const output = JSON.parse(stdoutSpy.mock.calls[0][0]);
    expect(output.level).toBe('warn');
  });

  // ─── Request-Scoped Logger ────────────────────────────────────────────────
  // WHY: In a serverless / multi-request environment, each request needs a
  // unique correlation ID and context (endpoint, client IP) attached to every
  // log line. This enables tracing a single request through multiple log entries.

  test('forRequest creates child logger with correlation ID and endpoint', () => {
    // ADAPT: Replace with your request object shape
    const req = { headers: { 'x-forwarded-for': '1.2.3.4' } };
    const log = forRequest(req, 'places');
    expect(log.rid).toBeDefined(); // Correlation ID assigned

    log.info('search started', { keyword: 'tacos' });
    const output = JSON.parse(stdoutSpy.mock.calls[0][0]);
    expect(output.endpoint).toBe('places');
    expect(output.ip).toBe('1.2.3.4');
    expect(output.rid).toBe(log.rid);
    expect(output.keyword).toBe('tacos');
  });

  // WHY: Load balancers/proxies add multiple IPs to x-forwarded-for.
  // The first one is the real client IP.
  test('extracts first IP from x-forwarded-for (proxy chain)', () => {
    const req = { headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' } };
    const log = forRequest(req, 'test');
    log.info('test');
    const output = JSON.parse(stdoutSpy.mock.calls[0][0]);
    expect(output.ip).toBe('10.0.0.1');
  });

  // WHY: Direct connections (no proxy) may have no forwarded-for header
  test('defaults IP to unknown when header is missing', () => {
    const req = { headers: {} };
    const log = forRequest(req, 'test');
    log.info('test');
    const output = JSON.parse(stdoutSpy.mock.calls[0][0]);
    expect(output.ip).toBe('unknown');
  });
});
