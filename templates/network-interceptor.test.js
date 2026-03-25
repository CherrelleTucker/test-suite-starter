/**
 * Template: Network Interceptor Testing (nock / MSW)
 *
 * WHAT THIS TESTS:
 * Outbound HTTP calls at the NETWORK level using interceptors, rather than
 * mocking at the code level. This is a black-box approach — your code makes
 * real fetch() calls, but the interceptor catches them before they leave.
 *
 * WHY THIS IS DIFFERENT FROM api-resilience.test.js:
 * - api-resilience: mocks `global.fetch` directly (code-level)
 * - network-interceptor: intercepts at the HTTP layer (nock/MSW)
 *
 * Network-level interception catches bugs that code-level mocking misses:
 * - URL construction errors (wrong path, missing query params)
 * - Header mistakes (missing Content-Type, wrong auth format)
 * - Body serialization bugs (wrong JSON structure)
 *
 * WHEN TO USE:
 * - Testing actual fetch() calls against known URL patterns
 * - Verifying request payloads (not just responses)
 * - Simulating slow responses, timeouts, and connection drops
 * - Testing retry logic at the HTTP level
 *
 * SETUP:
 * npm install --save-dev nock   (for Node.js / backend tests)
 *   OR
 * npm install --save-dev msw    (for browser / React tests)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Using nock (Node.js / backend)
// ═══════════════════════════════════════════════════════════════════════════════

// Uncomment after installing nock:
// import nock from 'nock';

describe('network interceptor — nock examples', () => {
  // afterEach(() => {
  //   nock.cleanAll(); // Remove all interceptors after each test
  // });

  test.skip('intercepts GET request and verifies URL', async () => {
    // const scope = nock('https://api.example.com')
    //   .get('/users/123')
    //   .reply(200, { id: '123', name: 'Alice' });
    //
    // const result = await fetchUser('123');
    // expect(result.name).toBe('Alice');
    // expect(scope.isDone()).toBe(true); // Verifies the request was made
  });

  test.skip('intercepts POST and verifies request body', async () => {
    // const scope = nock('https://api.example.com')
    //   .post('/items', { name: 'New Item', category: 'test' })
    //   .reply(201, { id: '456', name: 'New Item' });
    //
    // const result = await createItem({ name: 'New Item', category: 'test' });
    // expect(result.id).toBe('456');
    // expect(scope.isDone()).toBe(true);
  });

  test.skip('verifies request headers', async () => {
    // const scope = nock('https://api.example.com')
    //   .get('/protected')
    //   .matchHeader('Authorization', 'Bearer test-token')
    //   .matchHeader('X-App-Version', /^\d+\.\d+\.\d+$/)
    //   .reply(200, { data: 'secret' });
    //
    // await fetchProtected('test-token');
    // expect(scope.isDone()).toBe(true);
  });

  // ─── Error Simulation ──────────────────────────────────────────────────

  test.skip('simulates 500 server error', async () => {
    // nock('https://api.example.com')
    //   .get('/data')
    //   .reply(500, { error: 'Internal server error' });
    //
    // const result = await fetchData();
    // expect(result.error).toBeTruthy();
  });

  test.skip('simulates network timeout', async () => {
    // nock('https://api.example.com')
    //   .get('/data')
    //   .delayConnection(15000) // delay longer than timeout
    //   .reply(200, {});
    //
    // await expect(fetchData()).rejects.toThrow(); // or check for timeout handling
  });

  test.skip('simulates connection refused', async () => {
    // nock('https://api.example.com')
    //   .get('/data')
    //   .replyWithError('ECONNREFUSED');
    //
    // const result = await fetchData();
    // expect(result.error).toContain('Network error');
  });

  // ─── Sequential Responses (Retry Testing) ────────────────────────────

  test.skip('simulates retry: first call fails, second succeeds', async () => {
    // nock('https://api.example.com')
    //   .get('/data')
    //   .reply(503, { error: 'Temporarily unavailable' })
    //   .get('/data')
    //   .reply(200, { items: ['a', 'b'] });
    //
    // const result = await fetchDataWithRetry();
    // expect(result.items).toHaveLength(2);
  });

  // ─── Rate Limiting ───────────────────────────────────────────────────

  test.skip('handles 429 Too Many Requests', async () => {
    // nock('https://api.example.com')
    //   .get('/data')
    //   .reply(429, { error: 'Rate limited' }, { 'Retry-After': '30' });
    //
    // const result = await fetchData();
    // expect(result.error).toContain('rate');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Using MSW (Mock Service Worker — browser / React)
// ═══════════════════════════════════════════════════════════════════════════════

// Uncomment after installing msw:
// import { setupServer } from 'msw/node';
// import { http, HttpResponse } from 'msw';

describe('network interceptor — MSW examples', () => {
  // const server = setupServer();
  //
  // beforeAll(() => server.listen());
  // afterEach(() => server.resetHandlers());
  // afterAll(() => server.close());

  test.skip('intercepts API call with MSW', async () => {
    // server.use(
    //   http.get('https://api.example.com/users/:id', ({ params }) => {
    //     return HttpResponse.json({ id: params.id, name: 'Alice' });
    //   })
    // );
    //
    // const result = await fetchUser('123');
    // expect(result.name).toBe('Alice');
  });

  test.skip('simulates error with MSW', async () => {
    // server.use(
    //   http.get('https://api.example.com/data', () => {
    //     return new HttpResponse(null, { status: 500 });
    //   })
    // );
    //
    // const result = await fetchData();
    // expect(result.error).toBeTruthy();
  });
});
