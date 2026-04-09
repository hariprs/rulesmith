/**
 * Test Setup File for Project-Self_Improvement
 *
 * This file runs before all test suites.
 * Use it for global test configuration and utilities.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Configure console output during tests
const originalError = console.error;
console.error = (...args) => {
  // Filter out expected warnings during tests
  const msg = args[0];
  if (typeof msg === 'string') {
    // Suppress specific warnings that are expected during testing
    if (msg.includes('deprecated') || msg.includes('warn')) {
      return;
    }
  }
  originalError.call(console, ...args);
};

// Global test utilities
global.testUtils = {
  /**
   * Generate a random test directory path
   */
  getTestDir: (name) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `/tmp/test-${name}-${timestamp}-${random}`;
  },

  /**
   * Wait for a specified duration (ms)
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Cleanup on exit
process.on('exit', () => {
  console.log('\n✅ Test run completed');
});
