/**
 * Jest Setup — ESM (Node 18+, Vercel serverless, Deno)
 *
 * ESM projects use `jest.unstable_mockModule()` instead of `jest.mock()`.
 * Mocks must be set up BEFORE the dynamic `await import()` of the module
 * under test.
 *
 * IMPORTANT: Run Jest with: node --experimental-vm-modules node_modules/.bin/jest
 *
 * This file shows the ESM mocking pattern. Unlike CJS setup files, ESM mocks
 * are typically done per-test-file (not in a global setup) because they must
 * precede the import.
 */

// ─── ESM Mock Pattern (use in individual test files) ─────────────────────────

import { jest } from '@jest/globals';

// Step 1: Mock dependencies BEFORE importing the module under test
jest.unstable_mockModule('ioredis', () => ({
  default: jest.fn(),
}));

jest.unstable_mockModule('../lib/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  forRequest: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Step 2: Dynamic import AFTER mocks are registered
// const { myFunction } = await import('../lib/my-module.js');

// Step 3: Write tests as normal
// describe('myFunction', () => { ... });
