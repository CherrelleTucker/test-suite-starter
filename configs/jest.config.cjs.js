/**
 * Jest Configuration — CommonJS Projects
 *
 * For: React Native, standard Node.js, any project using require()
 *
 * Usage: Copy this file to your project root as jest.config.js
 * Or copy the config object into your package.json under "jest": { ... }
 */

module.exports = {
  // ADAPT: Path to your global setup file (mocks platform modules)
  setupFiles: ['./__tests__/setup.js'],

  // Don't treat these as test files
  testPathIgnorePatterns: [
    '__tests__/setup.js',
    '__tests__/__mocks__/',
  ],

  // ADAPT: Allow these packages to be transformed by Jest's Babel pipeline.
  // React Native packages ship untranspiled ES modules that Jest can't parse
  // without transformation. Add any packages that cause "SyntaxError: Unexpected token"
  transformIgnorePatterns: [
    'node_modules/(?!(expo|react-native|@react-native|expo-haptics|expo-location|expo-linear-gradient|@expo-google-fonts|react-native-purchases)/)',
  ],

  // ADAPT: Map modules that need custom mocks at the module level
  moduleNameMapper: {
    // Example: Mock a native module that crashes in Node
    // 'expo-store-review': '<rootDir>/__tests__/__mocks__/expo-store-review.js',
  },

  // Coverage configuration (optional but recommended)
  collectCoverageFrom: [
    'utils/**/*.js',
    'hooks/**/*.js',
    'lib/**/*.js',
    '!**/__tests__/**',
    '!**/__mocks__/**',
  ],
};
