/**
 * Jest Configuration for Project Self-Improvement
 *
 * Testing Pyramid Strategy (Story 1-6):
 * - Unit Tests (70%): Fast, isolated tests for individual functions
 * - Integration Tests (20%): Component interactions
 * - E2E Tests (10%): Critical user journeys only
 *
 * EPIC 2 RETRO ACTION ITEM: Fixed ES module support
 * - Added preset to handle ES modules properly
 * - Configured extensions and module name mapper
 * - Fixed import statement errors (164 tests failing → 0)
 */

export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.test.ts',
    '**/src/__tests__/**/*.test.js',
    '**/src/__tests__/**/*.test.ts'
  ],

  // Exclude test artifacts directory
  testPathIgnorePatterns: [
    '/node_modules/',
    '/_bmad-output/'
  ],

  // Transform ES modules from node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)'
  ],

  // Transform configuration for TS with ES modules
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },

  // Coverage configuration
  collectCoverageFrom: [
    '.claude/skills/rulesmith/**/*',
    'src/**/*',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/src/__tests__/**',
    '!**/*.test.ts',
    '!**/*.test.js',
    '!**/*.d.ts'
  ],

  // Coverage thresholds aligned with test pyramid
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>/src'],

  // Timeout for tests (E2E tests may need more time)
  testTimeout: 10000,

  // Verbose output for better debugging
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Reset modules for isolation
  resetModules: true,

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],

  // Parallel execution (can be disabled for debugging)
  maxWorkers: '50%'
};
