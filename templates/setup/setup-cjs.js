/**
 * Jest Setup — CommonJS (React Native, standard Node.js)
 *
 * This file runs before every test suite. Use it to mock platform-level
 * dependencies that would otherwise throw errors in a Node test environment.
 *
 * ADAPT: Replace these mocks with whatever platform modules your project uses.
 * Only mock modules that fail in Node — don't mock things just because you can.
 */

// ─── React Native Platform Mocks ─────────────────────────────────────────────
// WHY: React Native modules don't exist in Node.js. These provide just enough
// surface area to let your utility functions import without crashing.

jest.mock('react-native', () => ({
  Linking: { openURL: jest.fn() },
  Alert: { alert: jest.fn() },
  Platform: { OS: 'ios' }, // ADAPT: Change to 'android' if your defaults differ
}));

// ─── Storage Mocks ───────────────────────────────────────────────────────────
// WHY: AsyncStorage (or any local storage) needs to be mocked so tests don't
// hit actual device storage. Return promises to match the real API.

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// ─── Haptics / Native Feedback Mocks ─────────────────────────────────────────
// WHY: Haptic feedback modules crash in Node. Mock to silence them.

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {},
}));

// ─── Add Your Project's Platform Mocks Below ─────────────────────────────────
// Common ones to add:
// jest.mock('expo-location', () => ({ ... }));
// jest.mock('expo-camera', () => ({ ... }));
// jest.mock('@react-native-firebase/messaging', () => ({ ... }));
// jest.mock('react-native-purchases', () => ({ ... }));
