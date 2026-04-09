/**
 * ATDD Tests: Story 5.3 - Track Metrics Over Time (YOLO Approach)
 *
 * TDD RED PHASE: These tests WILL FAIL until implementation is complete.
 * They define the expected behavior for metric updates and state integration.
 *
 * Test Pyramid Level: Integration Tests (API-level, state management)
 * Coverage: Story 5.3 Tasks 2, 4 - State integration and stats display
 *
 * Acceptance Criteria Coverage:
 *   AC1: Track improvements_applied metric (state integration)
 *   AC2: Calculate and track corrections_reduction percentage (state integration)
 *   AC3: Track approval_rate percentage (state integration)
 *   AC4: Calculate metrics from results.jsonl historical data
 *   AC6: Update metrics after each analysis session
 *   AC7: Display metrics via --stats command
 *   AC8: Handle edge cases in metric calculation (integration level)
 *   AC9: Validate metric value ranges (state validation)
 *
 * @module integration/story-5-3-metrics-tracking
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  initializeState,
  updateMetrics,
  displayStats,
  readState,
  writeState,
} from '../../src/state-management';
import type { StateData } from '../../src/state-management';

describe('Story 5.3: Track Metrics Over Time - Integration Tests (TDD Red Phase)', () => {
  const testDir = path.join(__dirname, '..', '..', 'data-test-metrics-integration');

  beforeEach(async () => {
    // Setup clean test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    await initializeState(testDir);
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // Helper: Read state.json
  function readStateFile(): StateData {
    const statePath = path.join(testDir, 'state.json');
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  }

  // Helper: Create results.jsonl with test data
  function createResultsJsonl(entries: any[]): void {
    const resultsPath = path.join(testDir, 'results.jsonl');
    const content = entries.map(entry => JSON.stringify(entry)).join('\n');
    fs.writeFileSync(resultsPath, content + '\n', { mode: 0o600 });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // AC1, AC2, AC3, AC4, AC6: Update metrics in state.json
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC1, AC2, AC3, AC4, AC6: Update metrics in state.json', () => {
    test('should update all metrics in state.json after analysis session', async () => {
      // Given: results.jsonl with session data
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 2, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 3, rejected: 1, patterns_found: [] },
        { timestamp: '2026-04-03T10:00:00Z', patterns: 3, approved: 2, rejected: 3, patterns_found: [] },
      ]);

      // When: Updating metrics
      await updateMetrics(testDir);

      // Then: state.json should contain all metrics
      const state = readStateFile();
      expect(state.improvements_applied).toBe(10); // 5 + 3 + 2
      expect(state.corrections_reduction).toBeGreaterThanOrEqual(0);
      expect(state.corrections_reduction).toBeLessThanOrEqual(1);
      expect(state.approval_rate).toBeCloseTo(61.54, 1); // (10 / (16)) * 100
    });

    test('should update improvements_applied by recalculating from results.jsonl', async () => {
      // Given: state.json with existing improvements_applied
      const statePath = path.join(testDir, 'state.json');
      const state = readStateFile();
      state.improvements_applied = 100; // Old value (should be overwritten)
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });

      // And: results.jsonl with different count
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 2, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 3, rejected: 1, patterns_found: [] },
      ]);

      // When: Updating metrics
      await updateMetrics(testDir);

      // Then: improvements_applied should be recalculated (not incremented)
      const updatedState = readStateFile();
      expect(updatedState.improvements_applied).toBe(8); // 5 + 3 (not 100 + 8)
    });

    test('should update corrections_reduction in state.json as ratio 0-1', async () => {
      // Given: results.jsonl with 6 sessions (50% reduction)
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 0, rejected: 4, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 0, rejected: 4, patterns_found: [] },
        { timestamp: '2026-04-03T10:00:00Z', patterns: 3, approved: 0, rejected: 4, patterns_found: [] },
        { timestamp: '2026-04-04T10:00:00Z', patterns: 3, approved: 0, rejected: 2, patterns_found: [] },
        { timestamp: '2026-04-05T10:00:00Z', patterns: 3, approved: 0, rejected: 2, patterns_found: [] },
        { timestamp: '2026-04-06T10:00:00Z', patterns: 3, approved: 0, rejected: 2, patterns_found: [] },
      ]);

      // When: Updating metrics
      await updateMetrics(testDir);

      // Then: corrections_reduction should be 0.5 (ratio), not 50 (percentage)
      const state = readStateFile();
      expect(state.corrections_reduction).toBe(0.5);
      expect(state.corrections_reduction).not.toBe(50);
    });

    test('should update approval_rate in state.json as percentage 0-100', async () => {
      // Given: results.jsonl with 75% approval
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 3, rejected: 1, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 3, rejected: 1, patterns_found: [] },
      ]);

      // When: Updating metrics
      await updateMetrics(testDir);

      // Then: approval_rate should be 75.0 (percentage)
      const state = readStateFile();
      expect(state.approval_rate).toBe(75.0);
    });

    test('should set approval_rate to null when no suggestions', async () => {
      // Given: Empty results.jsonl
      createResultsJsonl([]);

      // When: Updating metrics
      await updateMetrics(testDir);

      // Then: approval_rate should be null
      const state = readStateFile();
      expect(state.approval_rate).toBeNull();
    });

    test('should set corrections_reduction to 0 when insufficient data (< 3 sessions)', async () => {
      // Given: results.jsonl with only 2 sessions
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 2, rejected: 3, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 2, rejected: 3, patterns_found: [] },
      ]);

      // When: Updating metrics
      await updateMetrics(testDir);

      // Then: corrections_reduction should be 0 (NOT null - validation requires number)
      const state = readStateFile();
      expect(state.corrections_reduction).toBe(0);
      expect(typeof state.corrections_reduction).toBe('number');
    });

    test('should preserve existing state fields when updating metrics', async () => {
      // Given: state.json with custom fields
      const statePath = path.join(testDir, 'state.json');
      const state = readStateFile();
      state.platform = 'cursor';
      state.patterns_found = ['existing-pattern'];
      (state as any).custom_field = 'should-preserve';
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });

      // And: results.jsonl with session data
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 2, rejected: 1, patterns_found: [] },
      ]);

      // When: Updating metrics
      await updateMetrics(testDir);

      // Then: Existing fields should be preserved
      const updatedState = readStateFile();
      expect(updatedState.platform).toBe('cursor');
      expect(updatedState.patterns_found).toEqual(['existing-pattern']);
      expect((updatedState as any).custom_field).toBe('should-preserve');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC6: Atomic state update with error handling
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC6: Atomic state update with error handling', () => {
    test('should update state.json atomically (temp file → rename pattern)', async () => {
      // Given: results.jsonl with session data
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 2, patterns_found: [] },
      ]);

      // When: Updating metrics
      await updateMetrics(testDir);

      // Then: No temp files should remain
      const files = fs.readdirSync(testDir);
      const tempFiles = files.filter(f => f.endsWith('.tmp') || f.endsWith('.bak'));
      expect(tempFiles.length).toBe(0);

      // And: state.json should be valid
      const state = readStateFile();
      expect(state.improvements_applied).toBe(5);
    });

    test('should preserve original state if update fails', async () => {
      // Given: state.json with initial data
      const statePath = path.join(testDir, 'state.json');
      const originalState = readStateFile();
      originalState.improvements_applied = 42;
      fs.writeFileSync(statePath, JSON.stringify(originalState, null, 2), { mode: 0o600 });

      // And: Invalid results.jsonl (all corrupted entries)
      const resultsPath = path.join(testDir, 'results.jsonl');
      fs.writeFileSync(resultsPath, '{invalid}\n{corrupted}\n', { mode: 0o600 });

      // When: Updating metrics (should handle gracefully)
      try {
        await updateMetrics(testDir);
      } catch (error) {
        // Expected to handle error
      }

      // Then: Original state should be preserved
      const preservedState = readStateFile();
      expect(preservedState.improvements_applied).toBe(42);
    });

    test('should complete metric update within 1 second (NFR3)', async () => {
      // Given: results.jsonl with 100 sessions
      const entries = [];
      for (let i = 0; i < 100; i++) {
        entries.push({
          timestamp: `2026-04-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
          patterns: 3,
          approved: Math.floor(Math.random() * 5),
          rejected: Math.floor(Math.random() * 5),
          patterns_found: [],
        });
      }
      createResultsJsonl(entries);

      // When: Updating metrics
      const startTime = performance.now();
      await updateMetrics(testDir);
      const elapsed = performance.now() - startTime;

      // Then: Should complete within 1 second
      expect(elapsed).toBeLessThan(1000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC7: Display metrics via --stats command
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC7: Display metrics via --stats command', () => {
    let consoleOutput: string[];

    beforeEach(() => {
      // Capture console output
      consoleOutput = [];
      jest.spyOn(console, 'log').mockImplementation((message: string) => {
        consoleOutput.push(message);
      });
    });

    afterEach(() => {
      // Restore console
      jest.restoreAllMocks();
    });

    test('should display all metrics in human-readable format', async () => {
      // Given: state.json with metrics
      const statePath = path.join(testDir, 'state.json');
      const state = readStateFile();
      state.improvements_applied = 42;
      state.corrections_reduction = 0.5;
      state.approval_rate = 75.0;
      state.total_sessions = 10;
      state.patterns_found = ['pattern-1', 'pattern-2', 'pattern-3'];
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });

      // When: Displaying stats
      await displayStats(testDir);

      // Then: Should display all metrics
      const output = consoleOutput.join('\n');
      expect(output).toContain('Total improvements applied');
      expect(output).toContain('42');
      expect(output).toContain('Corrections reduction');
      expect(output).toContain('50%'); // Display as percentage (0.5 * 100)
      expect(output).toContain('Approval rate');
      expect(output).toContain('75%');
      expect(output).toContain('Total analysis sessions');
      expect(output).toContain('10');
      expect(output).toContain('Patterns discovered');
      expect(output).toContain('3');
    });

    test('should display "Insufficient data" for corrections_reduction when < 3 sessions', async () => {
      // Given: state.json with corrections_reduction = 0 and total_sessions < 3
      const statePath = path.join(testDir, 'state.json');
      const state = readStateFile();
      state.corrections_reduction = 0;
      state.total_sessions = 2;
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });

      // When: Displaying stats
      await displayStats(testDir);

      // Then: Should display "Insufficient data"
      const output = consoleOutput.join('\n');
      expect(output).toContain('Insufficient data');
      expect(output).toContain('need 3+ sessions');
    });

    test('should display actual percentage for corrections_reduction when sessions >= 3', async () => {
      // Given: state.json with corrections_reduction = 0.5 and total_sessions >= 3
      const statePath = path.join(testDir, 'state.json');
      const state = readStateFile();
      state.corrections_reduction = 0.5;
      state.total_sessions = 10;
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });

      // When: Displaying stats
      await displayStats(testDir);

      // Then: Should display "50.0%" (not "Insufficient data")
      const output = consoleOutput.join('\n');
      expect(output).toContain('50.0%');
      expect(output).not.toContain('Insufficient data');
    });

    test('should handle null approval_rate gracefully', async () => {
      // Given: state.json with null approval_rate
      const statePath = path.join(testDir, 'state.json');
      const state = readStateFile();
      state.approval_rate = null;
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });

      // When: Displaying stats
      await displayStats(testDir);

      // Then: Should display "0%" or "No data"
      const output = consoleOutput.join('\n');
      expect(output).toContain('Approval rate');
    });

    test('should format output for console (markdown)', async () => {
      // Given: state.json with metrics
      const statePath = path.join(testDir, 'state.json');
      const state = readStateFile();
      state.improvements_applied = 42;
      state.corrections_reduction = 0.5;
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });

      // When: Displaying stats
      await displayStats(testDir);

      // Then: Should use markdown formatting
      const output = consoleOutput.join('\n');
      expect(output).toMatch(/#{1,3}\s*\*\*.*\*\*/); // Markdown headers with bold
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC8, AC9: Edge cases and validation (integration level)
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC8, AC9: Edge cases and validation (integration level)', () => {
    test('should handle first run (no results.jsonl)', async () => {
      // Given: No results.jsonl file

      // When: Updating metrics
      await updateMetrics(testDir);

      // Then: Should set default values
      const state = readStateFile();
      expect(state.improvements_applied).toBe(0);
      expect(state.corrections_reduction).toBe(0);
      expect(state.approval_rate).toBeNull();
    });

    test('should handle corrupted results.jsonl entries', async () => {
      // Given: results.jsonl with corrupted entries
      const resultsPath = path.join(testDir, 'results.jsonl');
      const content = [
        JSON.stringify({ timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 2, patterns_found: [] }),
        '{invalid json}',
        JSON.stringify({ timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 3, rejected: 1, patterns_found: [] }),
      ].join('\n') + '\n';
      fs.writeFileSync(resultsPath, content, { mode: 0o600 });

      // When: Updating metrics
      await updateMetrics(testDir);

      // Then: Should skip corrupted entries and calculate from valid ones
      const state = readStateFile();
      expect(state.improvements_applied).toBe(8); // 5 + 3
    });

    test('should validate metric ranges after calculation', async () => {
      // Given: results.jsonl that would produce invalid metrics
      // This is handled by the metric calculation functions themselves
      // which should clamp values to valid ranges

      // When: Updating metrics
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 2, patterns_found: [] },
      ]);
      await updateMetrics(testDir);

      // Then: Metrics should be within valid ranges
      const state = readStateFile();
      expect(state.improvements_applied).toBeGreaterThanOrEqual(0);
      expect(state.corrections_reduction).toBeGreaterThanOrEqual(0);
      expect(state.corrections_reduction).toBeLessThanOrEqual(1);
      if (state.approval_rate !== null) {
        expect(state.approval_rate).toBeGreaterThanOrEqual(0);
        expect(state.approval_rate).toBeLessThanOrEqual(100);
      }
    });

    test('should add new StateData fields to allowedFields in validateStateData()', async () => {
      // Given: state.json with new Story 5-3 fields
      const statePath = path.join(testDir, 'state.json');
      const state = readStateFile();
      state.approval_rate = 75.0;
      state.total_sessions = 10;
      state.approval_threshold = 75.0;
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });

      // When: Reading state (which validates)
      const validatedState = await readState(statePath);

      // Then: Should accept new fields without warnings
      expect(validatedState.approval_rate).toBe(75.0);
      expect(validatedState.total_sessions).toBe(10);
      expect(validatedState.approval_threshold).toBe(75.0);
    });

    test('should reject invalid approval_rate (> 100)', async () => {
      // Given: state.json with invalid approval_rate
      const statePath = path.join(testDir, 'state.json');
      const state = readStateFile();
      state.approval_rate = 150.0; // Invalid (> 100)
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });

      // When: Reading state (which validates)
      // Then: Should reject or clamp to valid range
      try {
        const validatedState = await readState(statePath);
        // If validation passes, value should be clamped
        if (validatedState.approval_rate !== null) {
          expect(validatedState.approval_rate).toBeLessThanOrEqual(100);
        }
      } catch (error) {
        // Or validation should throw error
        expect(error).toBeDefined();
      }
    });

    test('should reject invalid total_sessions (negative)', async () => {
      // Given: state.json with invalid total_sessions
      const statePath = path.join(testDir, 'state.json');
      const state = readStateFile();
      state.total_sessions = -1; // Invalid (negative)
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });

      // When: Reading state (which validates)
      // Then: Should reject or set to safe default
      try {
        const validatedState = await readState(statePath);
        // If validation passes, value should be non-negative
        expect(validatedState.total_sessions).toBeGreaterThanOrEqual(0);
      } catch (error) {
        // Or validation should throw error
        expect(error).toBeDefined();
      }
    });

    test('should REJECT null for corrections_reduction (validation requires number)', async () => {
      // Given: state.json with null corrections_reduction
      const statePath = path.join(testDir, 'state.json');
      const state = readStateFile();
      (state as any).corrections_reduction = null; // INVALID - must be number 0-1
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });

      // When: Reading state (which validates)
      // Then: Should reject null for corrections_reduction
      try {
        const validatedState = await readState(statePath);
        // If validation passes, value should be a number
        expect(typeof validatedState.corrections_reduction).toBe('number');
        expect(validatedState.corrections_reduction).not.toBeNull();
      } catch (error) {
        // Or validation should throw error
        expect(error).toBeDefined();
      }
    });

    test('should accept valid approval_threshold (0-100)', async () => {
      // Given: state.json with valid approval_threshold
      const statePath = path.join(testDir, 'state.json');
      const state = readStateFile();
      state.approval_threshold = 75.0;
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });

      // When: Reading state (which validates)
      const validatedState = await readState(statePath);

      // Then: Should accept valid threshold
      expect(validatedState.approval_threshold).toBe(75.0);
    });

    test('should reject invalid approval_threshold (> 100)', async () => {
      // Given: state.json with invalid approval_threshold
      const statePath = path.join(testDir, 'state.json');
      const state = readStateFile();
      state.approval_threshold = 150.0; // Invalid (> 100)
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });

      // When: Reading state (which validates)
      // Then: Should reject or clamp to valid range
      try {
        const validatedState = await readState(statePath);
        // If validation passes, value should be clamped
        if (validatedState.approval_threshold !== undefined) {
          expect(validatedState.approval_threshold).toBeLessThanOrEqual(100);
        }
      } catch (error) {
        // Or validation should throw error
        expect(error).toBeDefined();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Integration: Metric update workflow
  // ═══════════════════════════════════════════════════════════════════════

  describe('Integration: Metric update workflow', () => {
    test('should integrate with persistAnalysisResults() from Story 5-1', async () => {
      // Given: Analysis session completed
      const { persistAnalysisResults } = require('../../src/state-management');
      const sessionResult = {
        patterns: [
          {
            pattern_text: 'test-pattern',
            count: 3,
            category: 'code_style' as const,
            examples: [],
            suggested_rule: 'Test rule',
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            content_types: ['typescript'],
            session_count: 1,
            total_frequency: 3,
            is_new: true,
            frequency_change: 3,
          },
        ],
        approvedCount: 2,
        rejectedCount: 1,
        totalAnalyzed: 3,
      };

      // When: Persisting analysis results and updating metrics
      await persistAnalysisResults(testDir, sessionResult);
      await updateMetrics(testDir);

      // Then: Metrics should reflect new session
      const state = readStateFile();
      expect(state.improvements_applied).toBeGreaterThan(0);
      expect(state.total_sessions).toBeGreaterThan(0);
    });

    test('should calculate metrics from complete results.jsonl history', async () => {
      // Given: Multiple analysis sessions
      const { appendResult } = require('../../src/state-management');
      await appendResult(testDir, { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 2 });
      await appendResult(testDir, { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 3, rejected: 1 });
      await appendResult(testDir, { timestamp: '2026-04-03T10:00:00Z', patterns: 3, approved: 2, rejected: 3 });

      // When: Updating metrics
      await updateMetrics(testDir);

      // Then: Should calculate from all sessions
      const state = readStateFile();
      expect(state.improvements_applied).toBe(10); // 5 + 3 + 2
      expect(state.total_sessions).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Business Logic: Data integrity
  // ═══════════════════════════════════════════════════════════════════════

  describe('Business Logic: Data integrity', () => {
    test('should maintain data consistency across multiple updates', async () => {
      // Given: Initial metrics
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 2, patterns_found: [] },
      ]);
      await updateMetrics(testDir);
      const state1 = readStateFile();
      const initialImprovements = state1.improvements_applied;

      // When: Adding more sessions and updating again
      const { appendResult } = require('../../src/state-management');
      await appendResult(testDir, { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 3, rejected: 1 });
      await updateMetrics(testDir);

      // Then: Metrics should be recalculated correctly
      const state2 = readStateFile();
      expect(state2.improvements_applied).toBe(initialImprovements + 3);
    });

    test('should handle concurrent metric updates safely', async () => {
      // Given: results.jsonl with session data
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 2, patterns_found: [] },
      ]);

      // When: Updating metrics concurrently
      await Promise.all([
        updateMetrics(testDir),
        updateMetrics(testDir),
        updateMetrics(testDir),
      ]);

      // Then: State should be consistent (last write wins)
      const state = readStateFile();
      expect(state.improvements_applied).toBe(5);
      expect(typeof state.corrections_reduction).toBe('number');
    });

    test('should preserve _schema_note field in state.json', async () => {
      // Given: Initial state with _schema_note
      const statePath = path.join(testDir, 'state.json');
      const state = readStateFile();
      expect(state._schema_note).toBeTruthy();

      // When: Updating metrics
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 2, patterns_found: [] },
      ]);
      await updateMetrics(testDir);

      // Then: _schema_note should be preserved
      const updatedState = readStateFile();
      expect(updatedState._schema_note).toBeTruthy();
    });
  });
});
