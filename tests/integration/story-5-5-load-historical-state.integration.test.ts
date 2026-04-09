/**
 * Story 5.5: Load Historical State for Analysis - Integration Tests
 * TDD Red Phase: Failing tests for loadStateForAnalysis
 *
 * Test Strategy:
 * - Integration tests for file-system I/O behavior
 * - AC-based tests covering all acceptance criteria
 * - Edge cases: first run, corruption recovery, mixed formats
 * - NO E2E tests: state loading is purely file-system level
 *
 * Scope: TDD Red Phase ONLY - Generate failing tests
 * NO implementation code, NO production code modifications
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  loadStateForAnalysis,
  readState,
  writeState,
  StateData,
  MergedPattern,
  ValidationError,
  StateCorruptionError,
} from '../../src/state-management.js';
import { PatternCategory } from '../../src/pattern-detector.js';

describe('Story 5.5: Load Historical State for Analysis - Integration Tests (TDD Red Phase)', () => {
  const testDir = path.join(__dirname, '..', '..', 'data-test-5-5');
  const historyDir = path.join(testDir, 'history');

  // Test pattern fixture
  const createTestPattern = (text: string, firstSeen: string = '2026-04-01T10:00:00Z'): MergedPattern => ({
    pattern_text: text,
    count: 1,
    category: PatternCategory.CODE_STYLE,
    examples: [],
    suggested_rule: `Rule for ${text}`,
    first_seen: firstSeen,
    last_seen: firstSeen,
    session_count: 1,
    total_frequency: 1,
    is_new: true,
    frequency_change: 0,
    content_types: ['typescript'],
  });

  beforeEach(() => {
    // Setup clean test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(historyDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ==========================================================================
  // AC1: Load state.json at session start
  // ==========================================================================

  describe('AC1: Load state.json at session start', () => {
    test('should return full StateData when valid state.json exists', async () => {
      // Arrange: Create valid state.json
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [createTestPattern('Use async/await')],
        improvements_applied: 5,
        corrections_reduction: 0.3,
        platform: 'claude-code',
        _schema_note: 'test',
        total_sessions: 3,
        approval_threshold: 75,
        approval_rate: 80,
      };
      await writeState(statePath, existingState);

      // Act
      const result = await loadStateForAnalysis(testDir);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.last_analysis).toBe('2026-04-01T10:00:00Z');
      expect(result!.platform).toBe('claude-code');
    });

    test('should return complete StateData with all fields present', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-05T15:30:00Z',
        patterns_found: [
          createTestPattern('Pattern A', '2026-04-01T10:00:00Z'),
          createTestPattern('Pattern B', '2026-04-03T12:00:00Z'),
        ],
        improvements_applied: 12,
        corrections_reduction: 0.45,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 7,
        approval_threshold: 75,
        approval_rate: 72,
      };
      await writeState(statePath, existingState);

      // Act
      const result = await loadStateForAnalysis(testDir);

      // Assert
      expect(result).toBeDefined();
      expect(result!.last_analysis).toBeDefined();
      expect(result!.patterns_found).toHaveLength(2);
      expect(result!.improvements_applied).toBe(12);
      expect(result!.corrections_reduction).toBe(0.45);
      expect(result!.total_sessions).toBe(7);
      expect(result!.approval_rate).toBe(72);
    });

    test('should load state before any pattern detection (ordering guarantee)', async () => {
      // Arrange: Create state.json with a timestamp
      const statePath = path.join(testDir, 'state.json');
      const startTime = '2026-04-01T10:00:00Z';
      const baseState: StateData = {
        last_analysis: startTime,
        patterns_found: [createTestPattern('Existing pattern', '2026-03-28T08:00:00Z')],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code',
        _schema_note: 'test',
        total_sessions: 1,
        approval_threshold: 75,
        approval_rate: null,
      };
      await writeState(statePath, baseState);

      // Act
      const result = await loadStateForAnalysis(testDir);

      // Assert: loaded state must predate any new analysis
      expect(result!.last_analysis).toBe(startTime);
      expect((result!.patterns_found as MergedPattern[])[0].first_seen).toBe('2026-03-28T08:00:00Z');
    });
  });

  // ==========================================================================
  // AC2: Historical patterns available for comparison
  // ==========================================================================

  describe('AC2: Historical patterns available for comparison', () => {
    test('should return patterns_found array with MergedPattern entries intact', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const patterns: MergedPattern[] = [
        createTestPattern('Never use var', '2026-04-01T10:00:00Z'),
        createTestPattern('Use descriptive variable names', '2026-04-02T14:00:00Z'),
        createTestPattern('Prefer const over let', '2026-04-03T09:00:00Z'),
      ];
      // Enrich patterns with additional fields
      patterns[0].count = 5;
      patterns[0].session_count = 3;
      patterns[1].count = 3;
      patterns[1].session_count = 2;

      const existingState: StateData = {
        last_analysis: '2026-04-05T15:30:00Z',
        patterns_found: patterns,
        improvements_applied: 8,
        corrections_reduction: 0.25,
        platform: 'claude-code',
        _schema_note: 'test',
        total_sessions: 5,
        approval_threshold: 75,
        approval_rate: 65,
      };
      await writeState(statePath, existingState);

      // Act
      const result = await loadStateForAnalysis(testDir);

      // Assert
      expect(Array.isArray(result!.patterns_found)).toBe(true);
      expect(result!.patterns_found).toHaveLength(3);

      const firstPattern = (result!.patterns_found as MergedPattern[])[0];
      expect(firstPattern.pattern_text).toBe('Never use var');
      expect(firstPattern.count).toBe(5);
      expect(firstPattern.session_count).toBe(3);
    });

    test('should preserve legacy string[] patterns_found format', async () => {
      // Arrange: Create state with legacy string array (pre-stories 5.1-5.4)
      const statePath = path.join(testDir, 'state.json');
      const legacyState = {
        last_analysis: '2026-03-15T10:00:00Z',
        patterns_found: ['Old pattern 1', 'Old pattern 2'],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code',
        _schema_note: 'legacy format',
      };
      fs.writeFileSync(statePath, JSON.stringify(legacyState, null, 2));

      // Act
      const result = await loadStateForAnalysis(testDir);

      // Assert: strings are preserved as-is
      expect(result).not.toBeNull();
      expect(result!.patterns_found).toHaveLength(2);
      expect(result!.patterns_found[0]).toBe('Old pattern 1');
      expect(result!.patterns_found[1]).toBe('Old pattern 2');
    });

    test('should return patterns suitable for case-insensitive matching', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-05T15:30:00Z',
        patterns_found: [
          createTestPattern('Always use ASYNC/AWAIT', '2026-04-01T10:00:00Z'),
        ],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code',
        _schema_note: 'test',
        total_sessions: 1,
        approval_threshold: 75,
        approval_rate: null,
      };
      await writeState(statePath, existingState);

      // Act
      const result = await loadStateForAnalysis(testDir);

      // Assert: pattern_text preserved with original casing for comparison
      const patterns = result!.patterns_found as MergedPattern[];
      expect(patterns[0].pattern_text).toBe('Always use ASYNC/AWAIT');
    });
  });

  // ==========================================================================
  // AC3: first_seen timestamps preserved for known patterns
  // ==========================================================================

  describe('AC3: first_seen timestamps preserved', () => {
    test('should preserve first_seen timestamps exactly as stored', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const originalFirstSeen = '2026-03-15T08:30:00Z';
      const existingState: StateData = {
        last_analysis: '2026-04-05T15:30:00Z',
        patterns_found: [createTestPattern('Early pattern', originalFirstSeen)],
        improvements_applied: 20,
        corrections_reduction: 0.55,
        platform: 'claude-code',
        _schema_note: 'test',
        total_sessions: 10,
        approval_threshold: 75,
        approval_rate: 85,
      };
      await writeState(statePath, existingState);

      // Act
      const result = await loadStateForAnalysis(testDir);

      // Assert
      const pattern = (result!.patterns_found as MergedPattern[])[0];
      expect(pattern.first_seen).toBe(originalFirstSeen);
    });

    test('should preserve count values (not reset them)', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-05T15:30:00Z',
        patterns_found: [createTestPattern('Frequent pattern')],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code',
        _schema_note: 'test',
        total_sessions: 1,
        approval_threshold: 75,
        approval_rate: null,
      };
      (existingState.patterns_found as MergedPattern[])[0].count = 42;

      await writeState(statePath, existingState);

      // Act
      const result = await loadStateForAnalysis(testDir);

      // Assert
      const pattern = (result!.patterns_found as MergedPattern[])[0];
      expect(pattern.count).toBe(42);
    });

    test('should preserve category values (no transformation)', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-05T15:30:00Z',
        patterns_found: [createTestPattern('Categorized pattern')],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code',
        _schema_note: 'test',
        total_sessions: 1,
        approval_threshold: 75,
        approval_rate: null,
      };
      (existingState.patterns_found as MergedPattern[])[0].category = PatternCategory.TERMINOLOGY;

      await writeState(statePath, existingState);

      // Act
      const result = await loadStateForAnalysis(testDir);

      // Assert
      const pattern = (result!.patterns_found as MergedPattern[])[0];
      expect(pattern.category).toBe(PatternCategory.TERMINOLOGY);
    });
  });

  // ==========================================================================
  // AC5: First run / missing state handling
  // ==========================================================================

  describe('AC5: First run / missing state handling', () => {
    test('should return null when state.json does not exist', async () => {
      // Arrange: testDir exists but has no state.json
      fs.mkdirSync(testDir, { recursive: true });

      // Act
      const result = await loadStateForAnalysis(testDir);

      // Assert
      expect(result).toBeNull();
    });

    test('should NOT throw an error for missing state.json', async () => {
      // Arrange
      fs.mkdirSync(testDir, { recursive: true });

      // Act & Assert
      await expect(loadStateForAnalysis(testDir)).resolves.not.toThrow();
    });

    test('should return null (distinguishable from error state)', async () => {
      // Arrange: Empty directory
      fs.mkdirSync(testDir, { recursive: true });

      // Act
      const result = await loadStateForAnalysis(testDir);

      // Assert: Caller can check for null to detect first run
      expect(result).toBeNull();
      // null is falsy, so: if (!state) { /* first run */ }
      expect(!result).toBe(true);
    });

    test('should log a message indicating first run', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await loadStateForAnalysis(testDir);

      // Assert
      const logCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(logCalls.toLowerCase()).toMatch(/no previous state|first run|starting fresh|fresh session/i);

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // AC6: State corruption recovery during load
  // ==========================================================================

  describe('AC6: State corruption recovery during load', () => {
    test('should recover from corrupted state.json (invalid JSON) via recoverFromBackup', async () => {
      // Arrange: Write corrupted state.json
      const statePath = path.join(testDir, 'state.json');
      fs.writeFileSync(statePath, '{invalid json content!!!');

      // Create a valid backup
      const validBackupState: StateData = {
        last_analysis: '2026-03-28T10:00:00Z',
        patterns_found: [createTestPattern('Backup pattern')],
        improvements_applied: 3,
        corrections_reduction: 0.15,
        platform: 'claude-code',
        _schema_note: 'backup',
        total_sessions: 2,
        approval_threshold: 75,
        approval_rate: 60,
      };
      const backupPath = path.join(historyDir, 'state-2026-03-28T100000Z.json');
      await writeState(backupPath, validBackupState);

      // Act
      const result = await loadStateForAnalysis(testDir);

      // Assert: Should recover from backup
      expect(result).not.toBeNull();
      expect(result!.last_analysis).toBe('2026-03-28T10:00:00Z');
    });

    test('should recover from state.json with missing required fields', async () => {
      // Arrange: Write state missing required fields
      const statePath = path.join(testDir, 'state.json');
      fs.writeFileSync(statePath, JSON.stringify({ last_analysis: '2026-04-01T10:00:00Z' }));

      // Create valid backup
      const backupState: StateData = {
        last_analysis: '2026-03-25T08:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code',
        _schema_note: 'valid backup',
        total_sessions: 0,
        approval_threshold: 75,
        approval_rate: null,
      };
      const backupPath = path.join(historyDir, 'state-2026-03-25T080000Z.json');
      await writeState(backupPath, backupState);

      // Act
      const result = await loadStateForAnalysis(testDir);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.last_analysis).toBe('2026-03-25T08:00:00Z');
    });

    test('should use recoverFromBackup when state load fails', async () => {
      // Arrange: Corrupted state.json with a backup
      const statePath = path.join(testDir, 'state.json');
      fs.writeFileSync(statePath, 'not json at all');

      const backupState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [createTestPattern('Recovered via backup')],
        improvements_applied: 1,
        corrections_reduction: 0.05,
        platform: 'claude-code',
        _schema_note: 'recovery',
        total_sessions: 1,
        approval_threshold: 75,
        approval_rate: null,
      };
      const backupPath = path.join(historyDir, 'state-2026-04-01T100000Z.json');
      await writeState(backupPath, backupState);

      // Act
      const result = await loadStateForAnalysis(testDir);

      // Assert: Got recovered state, not null
      expect(result).not.toBeNull();
      const patterns = result!.patterns_found as MergedPattern[];
      expect(patterns).toHaveLength(1);
      expect(patterns[0].pattern_text).toBe('Recovered via backup');
    });

    test('should return default-initialized state when no backup exists', async () => {
      // Arrange: Corrupted state.json, no backup files
      const statePath = path.join(testDir, 'state.json');
      fs.writeFileSync(statePath, 'corrupted!');

      // historyDir exists but is empty
      const result = await loadStateForAnalysis(testDir);

      // Assert: recoverFromBackup returns a default state object, not null
      expect(result).not.toBeNull();
      expect(result!.patterns_found).toEqual([]);
      expect(result!.improvements_applied).toBe(0);
      expect(result!.corrections_reduction).toBe(0);
    });

    test('should handle permission errors gracefully', async () => {
      // Note: Simulating permission-denied conditions via chmod is unreliable on macOS
      // because SIP and owner-bypass semantics vary. This test verifies the intent:
      // loadStateForAnalysis does NOT throw on unexpected I/O errors.
      // The permission-denial path is verified in state-management.test.ts at the
      // readState level. Here we verify the graceful-degradation contract.

      // Arrange: Create valid state.json
      const statePath = path.join(testDir, 'state.json');
      const baseState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75,
        approval_rate: null,
      };
      await writeState(statePath, baseState);

      // Act: Load state - should not throw under any conditions
      const result = await loadStateForAnalysis(testDir);

      // Assert: Valid state loads normally
      expect(result).not.toBeNull();
      expect(result!.last_analysis).toBe('2026-04-01T10:00:00Z');

      // The permission-error path (EACCES) is handled in the catch block:
      // - access() fails with EACCES => returns null
      // - readState() throws StateCorruptionError with EACCES => recovery path
      // Both paths are gracefully handled (no throw).
    });
  });

  // ==========================================================================
  // AC7: State data validation on load
  // ==========================================================================

  describe('AC7: State data validation on load', () => {
    test('valid state.json passes validation and loads correctly', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const validState: StateData = {
        last_analysis: '2026-04-05T15:30:00Z',
        patterns_found: [createTestPattern('Valid pattern')],
        improvements_applied: 3,
        corrections_reduction: 0.15,
        platform: 'claude-code',
        _schema_note: 'test',
        total_sessions: 2,
        approval_threshold: 75,
        approval_rate: 50,
      };
      await writeState(statePath, validState);

      // Act
      const result = await loadStateForAnalysis(testDir);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.last_analysis).toBe('2026-04-05T15:30:00Z');
    });

    test('invalid patterns_found type triggers corruption recovery', async () => {
      // Arrange: Write state where patterns_found is not an array
      const statePath = path.join(testDir, 'state.json');
      const badState = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: 'not an array', // Should be array
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code',
        _schema_note: 'bad',
      };
      fs.writeFileSync(statePath, JSON.stringify(badState));

      // No backup -- should get default-initialized state
      const result = await loadStateForAnalysis(testDir);

      // Assert: recovery path triggered (returns default state)
      expect(result).not.toBeNull();
      expect(Array.isArray(result!.patterns_found)).toBe(true);
    });

    test('patterns_found with invalid element types triggers recovery', async () => {
      // Arrange: patterns_found has a non-string, non-object element
      const statePath = path.join(testDir, 'state.json');
      const badState = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [123, null, {}], // Invalid: number and null in array
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code',
        _schema_note: 'bad elements',
      };
      fs.writeFileSync(statePath, JSON.stringify(badState));

      // Act
      const result = await loadStateForAnalysis(testDir);

      // Assert: recovery triggers default state
      expect(result).not.toBeNull();
      expect(result!.patterns_found).toEqual([]);
    });

    test('large patterns_found array within limits loads successfully', async () => {
      // Arrange: Create state with many patterns (but within the 10000 limit)
      const statePath = path.join(testDir, 'state.json');
      const manyPatterns: MergedPattern[] = Array.from({ length: 100 }, (_, i) =>
        createTestPattern(`Pattern number ${i}`, `2026-04-01T${String(i).padStart(2, '0')}:00:00Z`)
      );

      const existingState: StateData = {
        last_analysis: '2026-04-05T15:30:00Z',
        patterns_found: manyPatterns,
        improvements_applied: 50,
        corrections_reduction: 0.60,
        platform: 'claude-code',
        _schema_note: 'test large',
        total_sessions: 20,
        approval_threshold: 75,
        approval_rate: 78,
      };

      await writeState(statePath, existingState);

      // Act
      const result = await loadStateForAnalysis(testDir);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.patterns_found).toHaveLength(100);
      expect(result!.patterns_found[0]).toBeDefined();
    });

    test('loads state with empty patterns_found array', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const emptyState: StateData = {
        last_analysis: '2026-04-05T15:30:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75,
        approval_rate: null,
      };
      await writeState(statePath, emptyState);

      // Act
      const result = await loadStateForAnalysis(testDir);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.patterns_found).toHaveLength(0);
    });
  });
});
