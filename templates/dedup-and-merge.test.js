/**
 * Template: Data Deduplication & Merge Logic
 *
 * WHAT THIS TESTS:
 * Functions that combine data from multiple sources — local + cloud, import + existing,
 * multiple users, etc. These functions must handle conflicts, duplicates, missing data,
 * and normalization consistently.
 *
 * WHEN TO USE:
 * - Cloud sync (local data + server data merging)
 * - Data imports (CSV, API, bulk operations)
 * - Multi-device sync
 * - Any function that unions, deduplicates, or resolves conflicts between datasets
 *
 * KEY DECISIONS TO TEST:
 * 1. What field(s) determine uniqueness? (ID, name, address, composite key?)
 * 2. Who wins on conflict? (local, cloud, newest, manual?)
 * 3. Is matching case-sensitive? (almost never should be)
 * 4. What happens with null/undefined/empty arrays?
 * 5. Are related fields preserved through the merge? (lat/lng, metadata)
 */

// ADAPT: Replace with your actual merge function
import { mergeData } from '../utils/sync';

// ADAPT: Replace with your actual dedup/add function
import { findDuplicate, addItem } from '../utils/items';

// ═══════════════════════════════════════════════════════════════════════════════
// Merge: Two-Source Data Combining
// ═══════════════════════════════════════════════════════════════════════════════

describe('mergeData', () => {
  // ─── Base Cases ──────────────────────────────────────────────────────────────

  test('returns local data when remote is empty', () => {
    const local = {
      items: [{ id: 'p1', name: 'Item 1' }],
      blocked: [{ id: 'b1', name: 'Blocked 1' }],
    };
    const remote = { items: [], blocked: [] };
    const result = mergeData(local, remote);
    expect(result.items).toHaveLength(1);
    expect(result.blocked).toHaveLength(1);
  });

  test('returns remote data when local is empty', () => {
    const local = { items: [], blocked: [] };
    const remote = {
      items: [{ id: 'p1', name: 'Remote Item' }],
      blocked: [{ id: 'b1', name: 'Remote Block' }],
    };
    const result = mergeData(local, remote);
    expect(result.items).toHaveLength(1);
    expect(result.blocked).toHaveLength(1);
  });

  // ─── ID-Based Deduplication ──────────────────────────────────────────────────
  // WHY: The most common dedup strategy. Two records with the same ID are the
  // same entity — keep one, discard the other. Test which one wins.

  test('deduplicates by ID — local version wins on conflict', () => {
    // ADAPT: Change field names and conflict resolution to match your logic
    const local = {
      items: [{ id: 'p1', name: 'Local Name', address: 'Local Addr' }],
      blocked: [],
    };
    const remote = {
      items: [{ id: 'p1', name: 'Remote Name', address: 'Remote Addr' }],
      blocked: [],
    };
    const result = mergeData(local, remote);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Local Name'); // ADAPT: verify YOUR winner
  });

  test('unions items with different IDs', () => {
    const local = { items: [{ id: 'p1', name: 'A' }], blocked: [] };
    const remote = { items: [{ id: 'p2', name: 'B' }], blocked: [] };
    const result = mergeData(local, remote);
    expect(result.items).toHaveLength(2);
  });

  // ─── Composite Key Deduplication ─────────────────────────────────────────────
  // WHY: Some entities don't have stable IDs (user-created items, imports).
  // Dedup by a composite key like name + address, with normalization.

  test('deduplicates by normalized name + address (case-insensitive)', () => {
    const local = {
      items: [],
      blocked: [],
      customItems: [{ name: "Mom's House", address: '123 Main St', id: 'c1' }],
    };
    const remote = {
      items: [],
      blocked: [],
      customItems: [{ name: "mom's house", address: '123 main st', id: 'c2' }],
    };
    const result = mergeData(local, remote);
    expect(result.customItems).toHaveLength(1);
    // WHY: Verify the winning version retains original casing
    expect(result.customItems[0].name).toBe("Mom's House");
  });

  test('unions custom items with different names', () => {
    const local = {
      items: [],
      blocked: [],
      customItems: [{ name: 'Spot A', address: '111 St', id: 'c1' }],
    };
    const remote = {
      items: [],
      blocked: [],
      customItems: [{ name: 'Spot B', address: '222 St', id: 'c2' }],
    };
    const result = mergeData(local, remote);
    expect(result.customItems).toHaveLength(2);
  });

  // ─── Address Dedup Edge Case ─────────────────────────────────────────────────
  // WHY: Items with empty addresses should NOT be deduped by address — otherwise
  // all "no address" items collapse into one.

  test('empty address items are not deduped by address', () => {
    const local = {
      items: [],
      blocked: [],
      customItems: [{ name: 'Spot A', address: '', id: 'c1' }],
    };
    const remote = {
      items: [],
      blocked: [],
      customItems: [{ name: 'Spot B', address: '', id: 'c2' }],
    };
    const result = mergeData(local, remote);
    expect(result.customItems).toHaveLength(2);
  });

  // ─── Rename / Update Through Merge ───────────────────────────────────────────
  // WHY: When a user renames an item locally, the cloud still has the old name.
  // If the merge uses address-based dedup, the local rename should win.
  // This is a real regression test — it was a bug (#114 in the source project).

  test('local rename replaces remote copy at same address', () => {
    const local = {
      items: [],
      blocked: [],
      customItems: [{ name: 'New Name', address: '123 Main St', id: 'c1' }],
    };
    const remote = {
      items: [],
      blocked: [],
      customItems: [{ name: 'Old Name', address: '123 Main St', id: 'c2' }],
    };
    const result = mergeData(local, remote);
    expect(result.customItems).toHaveLength(1);
    expect(result.customItems[0].name).toBe('New Name');
  });

  // ─── Null Safety ─────────────────────────────────────────────────────────────
  // WHY: First sync, corrupted data, or fresh installs produce null/undefined arrays.
  // The merge function must not crash.

  test('handles null/undefined arrays gracefully', () => {
    const local = { items: null, blocked: undefined, customItems: [] };
    const remote = { items: [], blocked: null, customItems: undefined };
    const result = mergeData(local, remote);
    expect(result.items).toEqual([]);
    expect(result.blocked).toEqual([]);
    expect(result.customItems).toEqual([]);
  });

  // ─── Metadata Preservation ───────────────────────────────────────────────────
  // WHY: Merges often strip extra fields. Verify that metadata (coordinates,
  // timestamps, tags) survives the merge intact.

  test('preserves metadata (lat/lng) through merge', () => {
    const local = {
      items: [],
      blocked: [],
      customItems: [
        { name: 'Geo Spot', address: '123 St', id: 'c1', lat: 38.9, lng: -77.0 },
      ],
    };
    const remote = { items: [], blocked: [], customItems: [] };
    const result = mergeData(local, remote);
    expect(result.customItems[0].lat).toBe(38.9);
    expect(result.customItems[0].lng).toBe(-77.0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Duplicate Detection (Pre-Add)
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: Before adding a new item, check if it already exists. This prevents
// duplicates at the source instead of cleaning them up after the fact.

describe('findDuplicate', () => {
  // ADAPT: Replace with your item shape
  const existingItems = [
    { name: "Mom's House", address: '123 Main St', id: 'c1' },
    { name: 'Office', address: '456 Work Ave', id: 'c2' },
    { name: 'No Address', address: '', id: 'c3' },
  ];

  test('returns null when no duplicate', () => {
    expect(findDuplicate('New Place', '789 New St', existingItems)).toBeNull();
  });

  test('detects duplicate name (case-insensitive)', () => {
    const result = findDuplicate("MOM'S HOUSE", '999 Other St', existingItems);
    expect(result).not.toBeNull();
    expect(result.reason).toBe('name');
    expect(result.match).toBe("Mom's House");
  });

  test('detects duplicate name with extra whitespace', () => {
    const result = findDuplicate("  Mom's House  ", '999 Other St', existingItems);
    expect(result).not.toBeNull();
    expect(result.reason).toBe('name');
  });

  test('detects duplicate address (case-insensitive)', () => {
    const result = findDuplicate('Different Name', '123 MAIN ST', existingItems);
    expect(result).not.toBeNull();
    expect(result.reason).toBe('address');
  });

  // WHY: Empty address should never trigger address-based dedup
  test('skips address check when address is empty', () => {
    const result = findDuplicate('Totally New', '', existingItems);
    expect(result).toBeNull();
  });

  // WHY: When both name and address match different items, name should win
  // because it's more likely intentional
  test('name match takes priority over address match', () => {
    const result = findDuplicate("Mom's House", '456 Work Ave', existingItems);
    expect(result.reason).toBe('name');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Add With Dedup Gate
// ═══════════════════════════════════════════════════════════════════════════════
// WHY: The add function should check for duplicates AND validate input before
// modifying state. Test the full flow: validation → dedup → state update.

describe('addItem', () => {
  test('adds a new item successfully', () => {
    const setItems = jest.fn();
    const result = addItem('New Spot', '123 Test St', {
      currentItems: [],
      setItems,
    });
    expect(result.ok).toBe(true);
    expect(setItems).toHaveBeenCalledTimes(1);
    const added = setItems.mock.calls[0][0][0];
    expect(added.name).toBe('New Spot');
    expect(added.address).toBe('123 Test St');
  });

  // WHY: Empty/whitespace-only names are invalid but easy to submit
  test('rejects empty name', () => {
    const result = addItem('   ', '', {
      currentItems: [],
      setItems: jest.fn(),
    });
    expect(result.ok).toBe(false);
  });

  test('rejects duplicate name', () => {
    const existing = [{ name: 'Test Place', address: '123 St', id: 'c1' }];
    const result = addItem('test place', '999 Other', {
      currentItems: existing,
      setItems: jest.fn(),
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('name');
  });

  test('rejects duplicate address', () => {
    const existing = [{ name: 'Place A', address: '123 Main St', id: 'c1' }];
    const result = addItem('Different Name', '123 main st', {
      currentItems: existing,
      setItems: jest.fn(),
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('address');
  });

  // WHY: Two items with empty addresses are NOT duplicates
  test('allows empty address without address dedup', () => {
    const existing = [{ name: 'Place A', address: '', id: 'c1' }];
    const result = addItem('Place B', '', {
      currentItems: existing,
      setItems: jest.fn(),
    });
    expect(result.ok).toBe(true);
  });

  // WHY: Metadata passed during creation must survive to the stored object
  test('preserves metadata when provided', () => {
    const setItems = jest.fn();
    addItem('Geo Spot', '123 St', {
      lat: 38.9,
      lng: -77.0,
      currentItems: [],
      setItems,
    });
    const added = setItems.mock.calls[0][0][0];
    expect(added.lat).toBe(38.9);
    expect(added.lng).toBe(-77.0);
  });
});
