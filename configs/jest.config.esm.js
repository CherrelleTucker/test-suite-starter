/**
 * Jest Configuration — ESM Projects
 *
 * For: Node 18+, Vercel serverless, Deno, any project using import/export
 *
 * Usage:
 * 1. Copy this file to your project root as jest.config.js
 * 2. Add this test script to package.json:
 *    "test": "node --experimental-vm-modules node_modules/.bin/jest"
 *
 * Key difference from CJS: No transforms needed (Node runs ESM natively).
 * Mocking uses jest.unstable_mockModule() instead of jest.mock().
 */

export default {
  // ESM projects typically don't need a global setup file because
  // jest.unstable_mockModule() must be called per-test-file before imports.
  // If you have common mocks, put them in a shared helper that each test imports.

  // Don't treat these as test files
  testPathIgnorePatterns: [
    '__tests__/setup.js',
    '__tests__/__mocks__/',
  ],

  // No transforms — Node.js handles ESM natively
  transform: {},

  // Coverage configuration (optional but recommended)
  collectCoverageFrom: [
    'lib/**/*.js',
    'utils/**/*.js',
    'api/**/*.js',
    '!**/__tests__/**',
    '!**/__mocks__/**',
  ],
};
