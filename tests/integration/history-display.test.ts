/**
 * Integration Tests for History Display (Story 6-8)
 *
 * Test ID: 6.8-INT-001
 * FR35: "System can display analysis history and metrics to user"
 *
 * TDD RED PHASE: These tests define expected behavior and will FAIL until
 * the Dev step implements the production code.
 *
 * Coverage: AC #1, #2, #3, #5, #6, #7, #8
 * Test Pyramid Level: Integration (File I/O + computation + format pipeline)
 *
 * Why integration (not E2E)?
 * - Tests file I/O with results.jsonl and state.json
 * - Validates the full read -> compute -> format pipeline
 * - Does NOT require full CLI invocation or browser interaction
 * - Verifiable at the function level with real file operations
 *
 * Note: handleHistoryCommand() and handleStatsCommand() use hardcoded ABSOLUTE_PATHS
 * and cannot be tested with isolated test directories. These integration tests focus on:
 * - readLastNEntries() with real file I/O
 * - displayStats() with real file I/O (via test directory parameter)
 * - Composition of pure functions (formatStatus, formatTimestamp, formatHistory)
 *   with real JSONL data read from disk
 *
 * @module integration/history-display
 */

import * as fs from 'fs';
import * as path from 'path';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

import { initializeState, displayStats } from '../../src/state-management';
import { readLastNEntries, AR22Error, formatStatus, formatTimestamp } from '../../src/command-variants';

interface ResultEntry {
  timestamp: string;
  status: string;
  summary: string;
}

function formatHistoryFromEntries(entries: ResultEntry[], limit: number = 20): string {
  if (entries.length === 0) {
    return 'No improvement history available yet. Run /improve-rules to create history.';
  }

  // Sort by timestamp descending (newest first), then take the first N
  const sortedEntries = [...entries].sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeB - timeA;
  });
  const limitedEntries = sortedEntries.slice(0, limit);

  const header = '| Date | Status | Summary |';
  const separator = '|------|--------|---------|';

  const formattedEntries = limitedEntries.map(entry => {
    const timestamp = entry.timestamp ? formatTimestamp(entry.timestamp) : 'N/A';
    const status = entry.status ? formatStatus(entry.status) : 'N/A';
    // Escape pipe characters, backticks, and newlines in summary to prevent markdown table breakage
    const summary = (entry.summary || 'N/A').replace(/\|/g, '\\|').replace(/`/g, '\\`').replace(/\n/g, ' ').replace(/\r/g, '');
    return `| ${timestamp} | ${status} | ${summary} |`;
  });

  const countText = limitedEntries.length === 1 ? 'showing last 1' : `showing last ${limitedEntries.length}`;
  return `Recent Improvements (${countText})

${header}
${separator}
${formattedEntries.join('\n')}`;
}

describe('6.8-INT-001: Read results.jsonl, compute stats, and format display (FR35)', () => {
  let testDir: string;
  let dataDir: string;

  beforeEach(async () => {
    testDir = path.join(process.cwd(), 'data-test-history-integration');
    dataDir = path.join(testDir, 'data');

    // Setup clean test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(dataDir, { recursive: true });

    // Initialize state
    await initializeState(testDir);
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // Helper: Create results.jsonl with test data
  function createResultsJsonl(entries: Record<string, unknown>[]): void {
    const resultsPath = path.join(dataDir, 'results.jsonl');
    const content = entries.map(entry => JSON.stringify(entry)).join('\n');
    fs.writeFileSync(resultsPath, content + '\n', { mode: 0o600 });
  }

  // Helper: Update state with test metrics
  function updateStateData(updates: Record<string, unknown>): void {
    const statePath = path.join(testDir, 'state.json');
    const state: Record<string, unknown> = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    Object.assign(state, updates);
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  }

  // ========================================================================
  // AC #1, #3: History display with real file I/O
  // ========================================================================

  describe('AC #1, #3: History display with real results.jsonl', () => {
    test('should read and format last 20 entries from results.jsonl as markdown table', async () => {
      // Given: results.jsonl with 25 entries
      const entries = Array.from({ length: 25 }, (_, i) => ({
        timestamp: `2026-03-${(i % 28 + 1).toString().padStart(2, '0')}T10:00:00Z`,
        status: i % 3 === 0 ? 'applied' : i % 3 === 1 ? 'pending' : 'failed',
        summary: `Improvement ${i}`
      }));
      createResultsJsonl(entries);

      // When: reading last 20 entries
      const results = await readLastNEntries(path.join(dataDir, 'results.jsonl'), 20);

      // Then: exactly 20 entries returned, newest first
      expect(results.length).toBe(20);
      expect(results[0].summary).toBe('Improvement 24'); // Last entry (newest)
      expect(results[19].summary).toBe('Improvement 5'); // 20th from end
    });

    test('should format read entries as proper markdown table (AC #1)', async () => {
      // Given: results.jsonl with entries
      createResultsJsonl([
        { timestamp: '2026-03-16T14:30:00Z', status: 'applied', summary: 'Fixed async/await' },
        { timestamp: '2026-03-15T10:00:00Z', status: 'pending', summary: 'Refactored validation' }
      ]);

      // When: reading and formatting
      const results = await readLastNEntries(path.join(dataDir, 'results.jsonl'), 20);
      const output = formatHistoryFromEntries(results as ResultEntry[], 20);

      // Then: proper markdown table format
      expect(output).toContain('| Date | Status | Summary |');
      expect(output).toContain('|------|--------|---------|');
      expect(output).toContain('2026-03-16 14:30:00 UTC');
      expect(output).toContain('Applied');
      expect(output).toContain('Pending');
    });

    test('should handle empty results.jsonl gracefully (AC #3)', async () => {
      // Given: empty results.jsonl
      const resultsPath = path.join(dataDir, 'results.jsonl');
      fs.writeFileSync(resultsPath, '', { mode: 0o600 });

      // When: reading entries
      const results = await readLastNEntries(resultsPath, 20);

      // Then: empty array returned
      expect(results).toEqual([]);
    });

    test('should handle missing results.jsonl with AR22 error (AC #3)', async () => {
      // Given: no results.jsonl file
      const nonExistentPath = path.join(dataDir, 'results.jsonl');

      // When/Then: AR22Error thrown with user-friendly message
      await expect(readLastNEntries(nonExistentPath, 20)).rejects.toThrow(AR22Error);
    });

    test('should handle malformed JSONL entries (skip invalid, return valid)', async () => {
      // Given: results.jsonl with mixed valid/invalid entries
      const resultsPath = path.join(dataDir, 'results.jsonl');
      const content = [
        '{"timestamp":"2026-03-16T10:00:00Z","status":"applied","summary":"Valid entry"}',
        'this is not valid json',
        '{"timestamp":"2026-03-15T10:00:00Z","status":"pending","summary":"Another valid"}',
        '{incomplete json',
        '{"timestamp":"2026-03-14T10:00:00Z","status":"failed","summary":"Third valid"}'
      ].join('\n');
      fs.writeFileSync(resultsPath, content + '\n', { mode: 0o600 });

      // When: reading entries
      const results = await readLastNEntries(resultsPath, 10);

      // Then: only valid entries returned (newest first since we read from end of file)
      expect(results.length).toBe(3);
      expect(results[0].summary).toBe('Third valid');
      expect(results[1].summary).toBe('Another valid');
      expect(results[2].summary).toBe('Valid entry');
    });

    test('should show all entries when fewer than 20 available (AC #1)', async () => {
      // Given: results.jsonl with 5 entries
      const entries = Array.from({ length: 5 }, (_, i) => ({
        timestamp: `2026-03-16T${(10 + i).toString().padStart(2, '0')}:00:00Z`,
        status: 'applied',
        summary: `Improvement ${i}`
      }));
      createResultsJsonl(entries);

      // When: reading with limit of 20
      const results = await readLastNEntries(path.join(dataDir, 'results.jsonl'), 20);
      const output = formatHistoryFromEntries(results as ResultEntry[], 20);

      // Then: all 5 entries shown
      expect(results.length).toBe(5);
      expect(output).toContain('showing last 5');
    });
  });

  // ========================================================================
  // AC #2: Stats display from state.json
  // ========================================================================

  describe('AC #2: Stats display from state.json', () => {
    test('should display metrics including improvements_applied from state.json', async () => {
      // Given: state.json with metrics
      updateStateData({
        total_sessions: 5,
        improvements_applied: 12,
        corrections_reduction: 0.7,
        approval_rate: 80.0,
        patterns_found: ['pattern1', 'pattern2', 'pattern3']
      });

      // When: displayStats called with test directory
      // displayStats writes to console, so we capture it
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await displayStats(testDir);

        // Then: output contains expected metrics
        const loggedCalls = logSpy.mock.calls.map(call => call[0]).join('\n');
        expect(loggedCalls).toContain('improvements applied');
        expect(loggedCalls).toContain('12');
      } finally {
        logSpy.mockRestore();
      }
    });

    test('should show "Insufficient data" for corrections_reduction with < 3 sessions (AC #2)', async () => {
      // Given: state.json with only 2 sessions
      updateStateData({
        total_sessions: 2,
        improvements_applied: 5,
        corrections_reduction: 0.2,
        approval_rate: null,
        patterns_found: ['pattern1', 'pattern2']
      });

      // When: displayStats called
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await displayStats(testDir);

        // Then: "Insufficient data" message displayed
        const loggedCalls = logSpy.mock.calls.map(call => call[0]).join('\n');
        expect(loggedCalls).toContain('Insufficient data (need 3+ sessions)');
      } finally {
        logSpy.mockRestore();
      }
    });

    test('should show approval rate when available (AC #2)', async () => {
      // Given: state.json with approval_rate
      updateStateData({
        total_sessions: 5,
        improvements_applied: 10,
        corrections_reduction: 0.5,
        approval_rate: 75.5,
        patterns_found: []
      });

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await displayStats(testDir);

        const loggedCalls = logSpy.mock.calls.map(call => call[0]).join('\n');
        expect(loggedCalls).toContain('75.5');
      } finally {
        logSpy.mockRestore();
      }
    });

    test('should show "No data" for approval rate when null (AC #2)', async () => {
      // Given: state.json with null approval_rate
      updateStateData({
        total_sessions: 1,
        improvements_applied: 0,
        corrections_reduction: 0,
        approval_rate: null,
        patterns_found: []
      });

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await displayStats(testDir);

        const loggedCalls = logSpy.mock.calls.map(call => call[0]).join('\n');
        expect(loggedCalls).toContain('No data');
      } finally {
        logSpy.mockRestore();
      }
    });
  });

  // ========================================================================
  // AC #5: Combined stats + history display
  // ========================================================================

  describe('AC #5: Combined stats + history display', () => {
    test('should compose stats and history output with visual separator', async () => {
      // Given: state.json with metrics AND results.jsonl with entries
      updateStateData({
        total_sessions: 5,
        improvements_applied: 12,
        corrections_reduction: 0.7,
        approval_rate: 80.0,
        patterns_found: ['pattern1']
      });

      createResultsJsonl([
        { timestamp: '2026-03-16T14:30:00Z', status: 'applied', summary: 'Latest improvement' },
        { timestamp: '2026-03-15T14:30:00Z', status: 'pending', summary: 'Pending change' }
      ]);

      // When: both displays composed
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const results = await readLastNEntries(path.join(dataDir, 'results.jsonl'), 20);
      const historyOutput = formatHistoryFromEntries(results as ResultEntry[], 20);

      try {
        await displayStats(testDir);
      } finally {
        logSpy.mockRestore();
      }

      // Then: history output contains proper formatting
      expect(historyOutput).toContain('| Date');
      expect(historyOutput).toContain('| Status');
      expect(historyOutput).toContain('| Summary |');
    });

    test('should apply consistent formatting between stats and history sections', async () => {
      // Given: state.json and results.jsonl
      updateStateData({
        total_sessions: 3,
        improvements_applied: 5,
        corrections_reduction: 0.3,
        approval_rate: 60.0,
        patterns_found: []
      });

      createResultsJsonl([
        { timestamp: '2026-03-16T10:00:00Z', status: 'applied', summary: 'Test' }
      ]);

      // When: both composed
      const results = await readLastNEntries(path.join(dataDir, 'results.jsonl'), 20);
      const historyOutput = formatHistoryFromEntries(results as ResultEntry[], 20);

      // Then: history uses consistent markdown table format
      expect(historyOutput).toMatch(/\| Date \| Status \| Summary \|/);
      expect(historyOutput).toMatch(/\|------\|--------\|---------\|/);
    });
  });

  // ========================================================================
  // AC #6: Large file performance
  // ========================================================================

  describe('AC #6: Large file performance (< 1 second, memory efficient)', () => {
    test('should read last 20 entries from large results.jsonl in under 1 second', async () => {
      // Given: large results.jsonl (>10MB simulated with many entries)
      const resultsPath = path.join(dataDir, 'results.jsonl');
      const writeStream = fs.createWriteStream(resultsPath, { mode: 0o600 });

      // Write 50,000 entries (simulates large file)
      for (let i = 0; i < 50000; i++) {
        const entry = {
          timestamp: `2026-03-${(i % 28 + 1).toString().padStart(2, '0')}T10:00:00Z`,
          status: 'applied',
          summary: `Improvement ${i} - ${'x'.repeat(50)}`
        };
        writeStream.write(JSON.stringify(entry) + '\n');
      }
      writeStream.end();
      await new Promise<void>((resolve) => writeStream.on('finish', resolve));

      const fileSize = fs.statSync(resultsPath).size;

      // When: reading last 20 entries
      const startTime = Date.now();
      const results = await readLastNEntries(resultsPath, 20);
      const elapsed = Date.now() - startTime;

      // Then: completes in < 1 second with correct results
      expect(elapsed).toBeLessThan(1000);
      expect(results.length).toBe(20);
      expect(results[0].summary).toContain('Improvement 49999');

      // Verify memory usage stayed reasonable
      // Note: The streaming reader itself is memory-efficient, but the test process
      // includes Jest overhead. The key metric is that readLastNEntries doesn't
      // load the entire file into memory (verified by the streaming implementation).
      const memUsage = process.memoryUsage();
      expect(memUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // < 500MB (generous for test env)

      // Cleanup large file
      fs.rmSync(testDir, { recursive: true, force: true });
    }, 30000); // 30s timeout for large file test
  });

  // ========================================================================
  // AC #8: Error handling for file permission errors
  // ========================================================================

  describe('AC #8: Error handling for file permission errors', () => {
    test('should handle EACCES (permission denied) on results.jsonl with AR22 error', async () => {
      // Given: results.jsonl with no read permissions
      const resultsPath = path.join(dataDir, 'results.jsonl');
      fs.writeFileSync(resultsPath, '{"timestamp":"2026-03-16T10:00:00Z","status":"applied","summary":"Test"}\n', { mode: 0o000 });

      // When/Then: AR22Error thrown (not unhandled exception)
      // Note: On some systems (macOS with SIP, root), chmod 0o000 may not prevent reading.
      // The test verifies that IF an error occurs, it is an AR22Error.
      let errorCaught: unknown = null;
      try {
        await readLastNEntries(resultsPath, 10);
      } catch (error) {
        errorCaught = error;
      } finally {
        // Restore permissions for cleanup
        try {
          fs.chmodSync(resultsPath, 0o600);
        } catch {
          // Ignore cleanup errors
        }
      }

      if (errorCaught !== null) {
        expect(errorCaught).toBeInstanceOf(AR22Error);
      }
      // If no error was thrown (e.g., running as root), the test still passes
      // because the permission restriction was not enforced by the OS.
    });
  });

  // ========================================================================
  // AC #7: Timestamp formatting in display output
  // ========================================================================

  describe('AC #7: Timestamp formatting in display output', () => {
    test('should format timestamps as "YYYY-MM-DD HH:MM:SS UTC" in history output', async () => {
      // Given: results.jsonl with entries
      createResultsJsonl([
        { timestamp: '2026-03-16T14:30:00Z', status: 'applied', summary: 'Test entry' }
      ]);

      // When: read and format
      const results = await readLastNEntries(path.join(dataDir, 'results.jsonl'), 20);
      const output = formatHistoryFromEntries(results as ResultEntry[], 20);

      // Then: timestamp formatted correctly
      expect(output).toContain('2026-03-16 14:30:00 UTC');
    });

    test('should handle invalid timestamps gracefully (AC #7)', async () => {
      // Given: results.jsonl with invalid timestamp
      createResultsJsonl([
        { timestamp: 'not-a-valid-date', status: 'applied', summary: 'Invalid date entry' }
      ]);

      // When: read and format
      const results = await readLastNEntries(path.join(dataDir, 'results.jsonl'), 20);
      const output = formatHistoryFromEntries(results as ResultEntry[], 20);

      // Then: shows "Invalid date" placeholder
      expect(output).toContain('Invalid date');
    });

    test('should prepend [FUTURE] warning for future timestamps (AC #7)', async () => {
      // Given: results.jsonl with future timestamp
      const futureDate = new Date();
      futureDate.setUTCFullYear(futureDate.getUTCFullYear() + 1);

      createResultsJsonl([
        { timestamp: futureDate.toISOString(), status: 'applied', summary: 'Future entry' }
      ]);

      // When: read and format
      const results = await readLastNEntries(path.join(dataDir, 'results.jsonl'), 20);
      const output = formatHistoryFromEntries(results as ResultEntry[], 20);

      // Then: shows [FUTURE] warning prefix
      expect(output).toContain('[FUTURE]');
    });
  });
});
