/**
 * Template: State Machine / Multi-Step Flow Transitions
 *
 * WHAT THIS TESTS:
 * Entities that move through defined states (session lifecycle, order pipeline,
 * subscription status). Tests verify that valid transitions work, invalid
 * transitions are rejected, and terminal states can't be exited.
 *
 * WHEN TO USE:
 * - Session/room lifecycle (waiting → active → completed)
 * - Order pipeline (draft → submitted → processing → shipped → delivered)
 * - Subscription lifecycle (free → trial → active → expired → cancelled)
 * - Auth flow (unauthenticated → authenticating → authenticated → expired)
 * - Any entity with a `status` field that changes over time
 *
 * STATE MACHINE RULES TO TEST:
 * 1. Valid transitions succeed and produce correct new state
 * 2. Invalid transitions are rejected (not silently ignored)
 * 3. Terminal states cannot be exited
 * 4. Concurrent transitions don't corrupt state
 * 5. Side effects (notifications, cleanup) fire on specific transitions
 */

// ADAPT: Replace with your actual state management functions
import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('ioredis', () => ({ default: jest.fn() }));

const {
  createSession,
  joinSession,
  submitFilters,
  startPick,
  saveResult,
  leaveSession,
  getSession,
} = await import('../lib/group.js');

// ═══════════════════════════════════════════════════════════════════════════════
// Session Lifecycle: waiting → picking → done
// ═══════════════════════════════════════════════════════════════════════════════

describe('session state transitions', () => {
  // ADAPT: Replace with your session/entity creation logic

  // ─── Creation (Initial State) ────────────────────────────────────────────
  test('new session starts in "waiting" state', async () => {
    const { session } = await createSession('Host', { latitude: 0, longitude: 0 }, '', null);
    expect(session.status).toBe('waiting');
  });

  test('new session has exactly one participant (the host)', async () => {
    const { session } = await createSession('Host', { latitude: 0, longitude: 0 }, '', null);
    const participants = Object.values(session.participants);
    expect(participants).toHaveLength(1);
    expect(participants[0].isHost).toBe(true);
  });

  // ─── Valid Transitions ───────────────────────────────────────────────────
  test('waiting → picking succeeds when enough participants are ready', async () => {
    const { code, hostId } = await createSession('Host', { latitude: 0, longitude: 0 }, '', null);
    const { participantId } = await joinSession(code, 'Guest');
    await submitFilters(code, hostId, { radiusMiles: 5 });
    await submitFilters(code, participantId, { radiusMiles: 3 });

    const { session } = await startPick(code, hostId);
    expect(session.status).toBe('picking');
  });

  test('picking → done succeeds when result is saved', async () => {
    const { code, hostId } = await createSession('Host', { latitude: 0, longitude: 0 }, '', null);
    const { participantId } = await joinSession(code, 'Guest');
    await submitFilters(code, hostId, { radiusMiles: 5 });
    await submitFilters(code, participantId, { radiusMiles: 3 });
    await startPick(code, hostId);

    const session = await saveResult(code, { name: 'Test Restaurant' });
    expect(session.status).toBe('done');
    expect(session.result).toBeTruthy();
  });

  // ─── Invalid Transitions ─────────────────────────────────────────────────
  // WHY: These tests catch bugs where state checks are missing or wrong

  test('cannot pick from a non-waiting session (ALREADY_PICKING)', async () => {
    const { code, hostId } = await createSession('Host', { latitude: 0, longitude: 0 }, '', null);
    const { participantId } = await joinSession(code, 'Guest');
    await submitFilters(code, hostId, { radiusMiles: 5 });
    await submitFilters(code, participantId, { radiusMiles: 3 });
    await startPick(code, hostId);

    // Trying to pick again should fail
    await expect(startPick(code, hostId)).rejects.toThrow('ALREADY_PICKING');
  });

  test('cannot join a non-waiting session', async () => {
    const { code, hostId } = await createSession('Host', { latitude: 0, longitude: 0 }, '', null);
    const { participantId } = await joinSession(code, 'Guest');
    await submitFilters(code, hostId, { radiusMiles: 5 });
    await submitFilters(code, participantId, { radiusMiles: 3 });
    await startPick(code, hostId);

    await expect(joinSession(code, 'Late Joiner')).rejects.toThrow('SESSION_NOT_JOINABLE');
  });

  test('cannot submit filters to a non-waiting session', async () => {
    const { code, hostId } = await createSession('Host', { latitude: 0, longitude: 0 }, '', null);
    const { participantId } = await joinSession(code, 'Guest');
    await submitFilters(code, hostId, { radiusMiles: 5 });
    await submitFilters(code, participantId, { radiusMiles: 3 });
    await startPick(code, hostId);

    await expect(
      submitFilters(code, participantId, { radiusMiles: 2 }),
    ).rejects.toThrow('SESSION_NOT_JOINABLE');
  });

  // ─── Authorization Gates ─────────────────────────────────────────────────
  // WHY: Only the host should be able to trigger picks

  test('non-host cannot trigger pick (NOT_HOST)', async () => {
    const { code, hostId } = await createSession('Host', { latitude: 0, longitude: 0 }, '', null);
    const { participantId } = await joinSession(code, 'Guest');
    await submitFilters(code, hostId, { radiusMiles: 5 });
    await submitFilters(code, participantId, { radiusMiles: 3 });

    await expect(startPick(code, participantId)).rejects.toThrow('NOT_HOST');
  });

  // ─── Minimum Readiness ───────────────────────────────────────────────────
  // WHY: Picking with too few ready participants produces bad results

  test('cannot pick with fewer than 2 ready participants', async () => {
    const { code, hostId } = await createSession('Host', { latitude: 0, longitude: 0 }, '', null);
    await joinSession(code, 'Guest'); // joins but doesn't submit filters
    await submitFilters(code, hostId, { radiusMiles: 5 }); // only host is ready

    await expect(startPick(code, hostId)).rejects.toThrow('NOT_ENOUGH_READY');
  });

  // ─── Capacity Limits ─────────────────────────────────────────────────────
  test('cannot exceed max participants', async () => {
    const { code } = await createSession('Host', { latitude: 0, longitude: 0 }, '', null);
    // ADAPT: Replace 7 with your max - 1 (host is already in)
    for (let i = 0; i < 7; i++) {
      await joinSession(code, `Guest ${i}`);
    }
    // 9th participant (8 total) should fail
    await expect(joinSession(code, 'One Too Many')).rejects.toThrow('SESSION_FULL');
  });

  // ─── Non-Existent Entity ─────────────────────────────────────────────────
  test('operations on non-existent session throw SESSION_NOT_FOUND', async () => {
    await expect(joinSession('ZZZZ', 'Guest')).rejects.toThrow('SESSION_NOT_FOUND');
    await expect(submitFilters('ZZZZ', 'fake-id', {})).rejects.toThrow('SESSION_NOT_FOUND');
    await expect(startPick('ZZZZ', 'fake-id')).rejects.toThrow('SESSION_NOT_FOUND');
  });

  // ─── Leave / Cleanup ────────────────────────────────────────────────────
  test('host leaving destroys the session', async () => {
    const { code, hostId } = await createSession('Host', { latitude: 0, longitude: 0 }, '', null);
    const result = await leaveSession(code, hostId);
    expect(result).toBeNull(); // session deleted

    const session = await getSession(code);
    expect(session).toBeNull();
  });

  test('guest leaving removes them but keeps the session', async () => {
    const { code } = await createSession('Host', { latitude: 0, longitude: 0 }, '', null);
    const { participantId } = await joinSession(code, 'Guest');

    const session = await leaveSession(code, participantId);
    expect(session).not.toBeNull();
    expect(Object.keys(session.participants)).toHaveLength(1);
  });

  test('leaving a session you are not in throws NOT_IN_SESSION', async () => {
    const { code } = await createSession('Host', { latitude: 0, longitude: 0 }, '', null);
    await expect(leaveSession(code, 'nonexistent-id')).rejects.toThrow('NOT_IN_SESSION');
  });
});
