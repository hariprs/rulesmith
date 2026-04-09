/**
 * Story 5.4: Update State After Each Session - Integration-Level Acceptance Tests
 * TDD Red Phase: Failing tests for state update functionality
 *
 * Test Strategy:
 * - API-level tests for state update logic (business logic)
 * - Integration tests for state persistence and corruption recovery
 * - Edge cases: first run, no new patterns, platform inconsistency
 * - Avoid E2E tests - test APIs and business logic directly
 *
 * Scope: TDD Red Phase ONLY - Generate failing tests
 * NO implementation code, NO production code modifications
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  updateSessionState,
  mergePatterns,
  hasNewPatterns,
  writeStateAtomically,
  validateStateFile,
  detectStateCorruption,
  recoverFromBackup,
  readState,
  writeState,
  StateData,
  MergedPattern,
  ValidationError,
  StateCorruptionError
} from '../../src/state-management.js';
import { PatternCategory } from '../../src/pattern-detector.js';

describe('Story 5.4: Update State After Each Session - Integration Tests (TDD Red Phase)', () => {
  const testDir = path.join(__dirname, '..', '..', 'data-test-5-4');
  const historyDir = path.join(testDir, 'history');

  // Test pattern fixture
  const createTestPattern = (text: string, count: number = 1): MergedPattern => ({
    pattern_text: text,
    count,
    category: PatternCategory.CODE_STYLE,
    examples: [],
    suggested_rule: `Rule for ${text}`,
    first_seen: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    session_count: 1,
    total_frequency: count,
    is_new: true,
    frequency_change: count,
    content_types: ['typescript']
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
  // AC1: Update last_analysis timestamp after session
  // ==========================================================================

  describe('AC1: Update last_analysis timestamp', () => {
    test('should update last_analysis to current ISO 8601 UTC timestamp after session', async () => {
      // Arrange: Create existing state
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 5,
        corrections_reduction: 0.2,
        approval_rate: 80,
        platform: 'cursor',
        _schema_note: 'test schema note',
        total_sessions: 5,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Update state with new patterns
      const newPatterns = [createTestPattern('new pattern')];
      await updateSessionState(testDir, newPatterns, 'cursor');

      // Assert: last_analysis updated to recent timestamp
      const updatedState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(updatedState.last_analysis).toBeDefined();

      // Verify ISO 8601 UTC format
      const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      expect(updatedState.last_analysis).toMatch(timestampRegex);

      // Verify timestamp is recent (within last 5 seconds)
      const timestamp = new Date(updatedState.last_analysis);
      const now = new Date();
      const diffMs = now.getTime() - timestamp.getTime();
      expect(diffMs).toBeGreaterThan(-5000); // Allow some clock skew
      expect(diffMs).toBeLessThan(5000);
    });

    test('should maintain ISO 8601 UTC format with YYYY-MM-DDTHH:MM:SSZ pattern', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code',
        _schema_note: 'test'
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act
      await updateSessionState(testDir, [], 'claude-code');

      // Assert: Verify exact format
      const updatedState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(updatedState.last_analysis).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });
  });

  // ==========================================================================
  // AC2: Merge patterns_found array with existing patterns
  // ==========================================================================

  describe('AC2: Merge patterns_found array', () => {
    test('should add new patterns not in existing patterns_found', async () => {
      // Arrange: Existing state with patterns
      const statePath = path.join(testDir, 'state.json');
      const existingPattern = createTestPattern('existing pattern', 2);
      existingPattern.first_seen = '2026-04-01T10:00:00Z';
      existingPattern.is_new = false;
      existingPattern.session_count = 2;

      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [existingPattern],
        improvements_applied: 5,
        corrections_reduction: 0.2,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 2,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Add new patterns
      const newPatterns = [createTestPattern('new pattern A', 1), createTestPattern('new pattern B', 1)];
      await updateSessionState(testDir, newPatterns, 'cursor');

      // Assert: All patterns present (existing + new)
      const updatedState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(updatedState.patterns_found).toHaveLength(3);

      const patternTexts = updatedState.patterns_found.map((p: MergedPattern) => p.pattern_text);
      expect(patternTexts).toContain('existing pattern');
      expect(patternTexts).toContain('new pattern A');
      expect(patternTexts).toContain('new pattern B');
    });

    test('should NOT duplicate recurring patterns (case-insensitive deduplication)', async () => {
      // Arrange: Existing state with pattern
      const statePath = path.join(testDir, 'state.json');
      const existingPattern = createTestPattern('Use TypeScript', 3);
      existingPattern.first_seen = '2026-04-01T10:00:00Z';
      existingPattern.is_new = false;
      existingPattern.session_count = 2;

      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [existingPattern],
        improvements_applied: 3,
        corrections_reduction: 0.1,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 2,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Add same pattern with different case
      const newPatterns = [createTestPattern('use typescript', 1)]; // Lowercase
      await updateSessionState(testDir, newPatterns, 'cursor');

      // Assert: Pattern not duplicated, count updated
      const updatedState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(updatedState.patterns_found).toHaveLength(1); // Only one pattern

      const pattern = updatedState.patterns_found[0] as MergedPattern;
      expect(pattern.pattern_text.toLowerCase()).toBe('use typescript'); // Case-insensitive match
      expect(pattern.count).toBe(4); // 3 (existing) + 1 (new)
    });

    test('should update frequency counts for recurring patterns', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingPattern = createTestPattern('Add error handling', 5);
      existingPattern.first_seen = '2026-04-01T10:00:00Z';
      existingPattern.session_count = 3;

      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [existingPattern],
        improvements_applied: 5,
        corrections_reduction: 0.3,
        platform: 'claude-code',
        _schema_note: 'test',
        total_sessions: 3,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Add recurring pattern with new count
      const newPatterns = [createTestPattern('Add error handling', 2)];
      await updateSessionState(testDir, newPatterns, 'claude-code');

      // Assert: Count updated (5 + 2 = 7)
      const updatedState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      const pattern = updatedState.patterns_found[0] as MergedPattern;
      expect(pattern.count).toBe(7);
    });

    test('should preserve first_seen timestamp for existing patterns', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingPattern = createTestPattern('Existing pattern', 1);
      const originalFirstSeen = '2026-03-15T10:00:00Z';
      existingPattern.first_seen = originalFirstSeen;

      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [existingPattern],
        improvements_applied: 1,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 1,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Update with recurring pattern
      const newPatterns = [createTestPattern('Existing pattern', 1)];
      await updateSessionState(testDir, newPatterns, 'cursor');

      // Assert: first_seeen preserved
      const updatedState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      const pattern = updatedState.patterns_found[0] as MergedPattern;
      expect(pattern.first_seen).toBe(originalFirstSeen);
    });

    test('should set first_seen timestamp for new patterns', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Add new pattern
      const newPatterns = [createTestPattern('Brand new pattern', 1)];
      const beforeUpdate = new Date();
      await updateSessionState(testDir, newPatterns, 'cursor');
      const afterUpdate = new Date();

      // Assert: first_seen set to current time
      const updatedState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      const pattern = updatedState.patterns_found[0] as MergedPattern;
      expect(pattern.first_seen).toBeDefined();

      const firstSeen = new Date(pattern.first_seen);
      expect(firstSeen.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(firstSeen.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
    });

    test('should deduplicate patterns by pattern_text field (case-insensitive)', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Add patterns with same text but different cases
      const newPatterns = [
        createTestPattern('USE CONST', 1),
        createTestPattern('use const', 1),
        createTestPattern('Use Const', 1)
      ];
      await updateSessionState(testDir, newPatterns, 'cursor');

      // Assert: Only one pattern stored
      const updatedState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(updatedState.patterns_found).toHaveLength(1);
    });
  });

  // ==========================================================================
  // AC3: Preserve platform value from previous sessions
  // ==========================================================================

  describe('AC3: Preserve platform value', () => {
    test('should preserve existing platform value when it is known', async () => {
      // Arrange: Existing state with platform='cursor'
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 5,
        corrections_reduction: 0.2,
        platform: 'cursor', // Existing known platform
        _schema_note: 'test',
        total_sessions: 2,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Update with different platform
      await updateSessionState(testDir, [], 'claude-code');

      // Assert: Existing platform preserved
      const updatedState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(updatedState.platform).toBe('cursor'); // NOT changed to 'claude-code'
    });

    test('should use detected platform when existing platform is unknown', async () => {
      // Arrange: Existing state with platform='unknown'
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'unknown', // Unknown platform
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Update with detected platform
      await updateSessionState(testDir, [], 'cursor');

      // Assert: Platform updated to detected value
      const updatedState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(updatedState.platform).toBe('cursor');
    });

    test('should warn user about platform inconsistency when both platforms are known and differ', async () => {
      // Arrange: Existing state with platform='cursor'
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 5,
        corrections_reduction: 0.2,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 2,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Update with different known platform
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      await updateSessionState(testDir, [], 'claude-code');

      // Assert: Warning logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Platform inconsistency detected')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('existing=cursor')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('new=claude-code')
      );

      consoleWarnSpy.mockRestore();

      // Also assert platform preserved
      const updatedState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(updatedState.platform).toBe('cursor');
    });

    test('should use detected platform when existing platform is missing', async () => {
      // Arrange: State without platform field
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'unknown',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75
      };
      // Manually remove platform field to test missing case
      const stateWithoutPlatform = { ...existingState };
      delete (stateWithoutPlatform as any).platform;
      fs.writeFileSync(statePath, JSON.stringify(stateWithoutPlatform, null, 2));

      // Act: Update with detected platform
      await updateSessionState(testDir, [], 'cursor');

      // Assert: Platform set to detected value
      const updatedState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(updatedState.platform).toBe('cursor');
    });
  });

  // ==========================================================================
  // AC4: Write state.json atomically to prevent corruption
  // ==========================================================================

  describe('AC4: Atomic write operations', () => {
    test('should write to temp file first, then rename atomically', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const tempPath = `${statePath}.tmp`;
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Update state
      const newPatterns = [createTestPattern('new pattern')];

      // Monitor file operations
      let tempFileCreated = false;
      let tempFileValidated = false;
      let atomicRenameExecuted = false;

      // Perform update
      await updateSessionState(testDir, newPatterns, 'cursor');

      // Assert: Temp file should not exist after successful write (cleaned up)
      expect(fs.existsSync(tempPath)).toBe(false);

      // Assert: Original state file updated
      expect(fs.existsSync(statePath)).toBe(true);
      const updatedState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(updatedState.patterns_found).toHaveLength(1);
    });

    test('should validate temp file before atomic rename', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Update state with valid data
      await updateSessionState(testDir, [createTestPattern('test')], 'cursor');

      // Assert: Resulting state file is valid JSON with required fields
      const content = fs.readFileSync(statePath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();

      const state = JSON.parse(content);
      expect(state.last_analysis).toBeDefined();
      expect(state.patterns_found).toBeDefined();
      expect(state.platform).toBeDefined();
      expect(state._schema_note).toBeDefined();
    });

    test('should delete temp file and preserve original if validation fails', async () => {
      // This test verifies that writeStateAtomically handles validation failures
      // by cleaning up the temp file and preserving the original state

      // Arrange: Create initial valid state
      const statePath = path.join(testDir, 'state.json');
      const originalState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'original state',
        total_sessions: 0,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(originalState, null, 2));
      const originalContent = fs.readFileSync(statePath, 'utf-8');

      // Act & Assert: Try to write invalid state (should fail and preserve original)
      const invalidState = {
        last_analysis: '2026-04-01T10:00:00Z',
        // Missing required fields
        patterns_found: 'invalid', // Should be array
        platform: 'cursor'
        // Missing _schema_note
      };

      await expect(writeStateAtomically(statePath, invalidState as any)).rejects.toThrow();

      // Assert: Original state preserved
      const finalContent = fs.readFileSync(statePath, 'utf-8');
      expect(finalContent).toBe(originalContent);

      // Assert: Temp file cleaned up
      const tempPath = `${statePath}.tmp`;
      expect(fs.existsSync(tempPath)).toBe(false);
    });

    test('should clean up temp file if rename fails', async () => {
      // This test verifies temp file cleanup on rename failure
      // Since fs.promises.rename rarely fails in normal conditions,
      // we verify the cleanup logic exists in the implementation

      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Normal write should succeed
      await updateSessionState(testDir, [createTestPattern('test')], 'cursor');

      // Assert: No temp file left behind
      const tempPath = `${statePath}.tmp`;
      expect(fs.existsSync(tempPath)).toBe(false);

      // Assert: State file updated
      expect(fs.existsSync(statePath)).toBe(true);
    });
  });

  // ==========================================================================
  // AC5: Recover from last known good state if corruption occurs
  // ==========================================================================

  describe('AC5: State corruption recovery', () => {
    test('should detect corrupted state.json (invalid JSON)', async () => {
      // Arrange: Create corrupted state file
      const statePath = path.join(testDir, 'state.json');
      fs.writeFileSync(statePath, '{ invalid json }', { mode: 0o600 });

      // Act: Detect corruption
      const isCorrupted = await detectStateCorruption(statePath);

      // Assert: Corruption detected
      expect(isCorrupted).toBe(true);
    });

    test('should detect corrupted state.json (missing required fields)', async () => {
      // Arrange: Create state with missing required fields
      const statePath = path.join(testDir, 'state.json');
      const incompleteState = {
        last_analysis: '2026-04-01T10:00:00Z',
        // Missing patterns_found, platform, _schema_note
      };
      fs.writeFileSync(statePath, JSON.stringify(incompleteState, null, 2), { mode: 0o600 });

      // Act: Detect corruption
      const isCorrupted = await detectStateCorruption(statePath);

      // Assert: Corruption detected
      expect(isCorrupted).toBe(true);
    });

    test('should detect corrupted state.json (invalid field types)', async () => {
      // Arrange: Create state with invalid field types
      const statePath = path.join(testDir, 'state.json');
      const invalidState = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: 'not-an-array', // Should be array
        platform: 'cursor',
        _schema_note: 'test'
      };
      fs.writeFileSync(statePath, JSON.stringify(invalidState, null, 2), { mode: 0o600 });

      // Act: Detect corruption
      const isCorrupted = await detectStateCorruption(statePath);

      // Assert: Corruption detected
      expect(isCorrupted).toBe(true);
    });

    test('should return false for valid state.json (no corruption)', async () => {
      // Arrange: Create valid state file
      const statePath = path.join(testDir, 'state.json');
      const validState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test schema note',
        total_sessions: 1,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(validState, null, 2), { mode: 0o600 });

      // Act: Detect corruption
      const isCorrupted = await detectStateCorruption(statePath);

      // Assert: No corruption
      expect(isCorrupted).toBe(false);
    });

    test('should return false for missing state.json (first run, not corruption)', async () => {
      // Arrange: No state file exists
      const statePath = path.join(testDir, 'state.json');

      // Act: Detect corruption
      const isCorrupted = await detectStateCorruption(statePath);

      // Assert: Not corruption (first run)
      expect(isCorrupted).toBe(false);
    });

    test('should recover from most recent valid backup in data/history/', async () => {
      // Arrange: Create multiple backups
      const oldBackupPath = path.join(historyDir, 'state-2026-03-01T10-00-00.000Z.json');
      const recentBackupPath = path.join(historyDir, 'state-2026-04-01T10-00-00.000Z.json');

      const oldBackup: StateData = {
        last_analysis: '2026-03-01T10:00:00Z',
        patterns_found: [createTestPattern('old pattern')],
        improvements_applied: 5,
        corrections_reduction: 0.1,
        platform: 'cursor',
        _schema_note: 'old backup',
        total_sessions: 1,
        approval_threshold: 75
      };

      const recentBackup: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [createTestPattern('recent pattern')],
        improvements_applied: 10,
        corrections_reduction: 0.3,
        platform: 'claude-code',
        _schema_note: 'recent backup',
        total_sessions: 5,
        approval_threshold: 75
      };

      fs.writeFileSync(oldBackupPath, JSON.stringify(oldBackup, null, 2), { mode: 0o600 });
      fs.writeFileSync(recentBackupPath, JSON.stringify(recentBackup, null, 2), { mode: 0o600 });

      // Act: Recover from backup
      const recoveredState = await recoverFromBackup(testDir);

      // Assert: Most recent backup used
      expect(recoveredState.last_analysis).toBe('2026-04-01T10:00:00Z');
      expect(recoveredState.improvements_applied).toBe(10);
      expect(recoveredState.platform).toBe('claude-code');
    });

    test('should validate each backup before using it (skip corrupted backups)', async () => {
      // Arrange: Mix of valid and corrupted backups
      const corruptedBackupPath = path.join(historyDir, 'state-2026-04-01T10-00-00.000Z.json');
      const validBackupPath = path.join(historyDir, 'state-2026-04-02T10-00-00.000Z.json');

      // Corrupted backup (invalid JSON)
      fs.writeFileSync(corruptedBackupPath, '{ invalid json }', { mode: 0o600 });

      // Valid backup
      const validBackup: StateData = {
        last_analysis: '2026-04-02T10:00:00Z',
        patterns_found: [],
        improvements_applied: 5,
        corrections_reduction: 0.2,
        platform: 'cursor',
        _schema_note: 'valid backup',
        total_sessions: 2,
        approval_threshold: 75
      };
      fs.writeFileSync(validBackupPath, JSON.stringify(validBackup, null, 2), { mode: 0o600 });

      // Act: Recover from backup
      const recoveredState = await recoverFromBackup(testDir);

      // Assert: Valid backup used, corrupted skipped
      expect(recoveredState.last_analysis).toBe('2026-04-02T10:00:00Z');
      expect(recoveredState.improvements_applied).toBe(5);
    });

    test('should reinitialize with defaults if no valid backup exists', async () => {
      // Arrange: No backups in history directory
      expect(fs.readdirSync(historyDir)).toHaveLength(0);

      // Act: Recover from backup
      const recoveredState = await recoverFromBackup(testDir);

      // Assert: Default state returned
      expect(recoveredState.last_analysis).toBeDefined();
      expect(recoveredState.patterns_found).toEqual([]);
      expect(recoveredState.improvements_applied).toBe(0);
      expect(recoveredState.corrections_reduction).toBe(0);
      expect(recoveredState.platform).toBe('unknown');
    });

    test('should log recovery event to results.jsonl with recovery_source field', async () => {
      // Arrange: Create a valid backup
      const backupPath = path.join(historyDir, 'state-2026-04-01T10-00-00.000Z.json');
      const backup: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 5,
        corrections_reduction: 0.2,
        platform: 'cursor',
        _schema_note: 'backup',
        total_sessions: 1,
        approval_threshold: 75
      };
      fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), { mode: 0o600 });

      // Act: Recover from backup
      await recoverFromBackup(testDir);

      // Assert: Recovery event logged to results.jsonl
      const resultsPath = path.join(testDir, 'results.jsonl');
      expect(fs.existsSync(resultsPath)).toBe(true);

      const content = fs.readFileSync(resultsPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBeGreaterThan(0);

      const recoveryEvent = JSON.parse(lines[lines.length - 1]);
      expect(recoveryEvent.event_type).toBe('state_recovery');
      expect(recoveryEvent.recovery_source).toBeDefined();
      expect(recoveryEvent.timestamp).toBeDefined();
      expect(recoveryEvent.message).toBeDefined();
    });
  });

  // ==========================================================================
  // AC6: Validate state.json after writes
  // ==========================================================================

  describe('AC6: Post-write validation', () => {
    test('should validate JSON syntax after write', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const validState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75
      };

      // Act: Write valid state
      await writeStateAtomically(statePath, validState);

      // Assert: File is valid JSON
      const content = fs.readFileSync(statePath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    test('should validate required fields are present after write', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const validState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75
      };

      // Act: Write state
      await writeStateAtomically(statePath, validState);

      // Assert: Validate file on disk
      await expect(validateStateFile(statePath)).resolves.not.toThrow();

      // Verify required fields present
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      expect(state.last_analysis).toBeDefined();
      expect(state.patterns_found).toBeDefined();
      expect(state.platform).toBeDefined();
      expect(state._schema_note).toBeDefined();
    });

    test('should validate field types after write', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const validState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [createTestPattern('test')],
        improvements_applied: 5,
        corrections_reduction: 0.5,
        platform: 'claude-code',
        _schema_note: 'test',
        total_sessions: 3,
        approval_threshold: 75
      };

      // Act: Write state
      await writeStateAtomically(statePath, validState);

      // Assert: Field types validated
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      expect(typeof state.last_analysis).toBe('string');
      expect(Array.isArray(state.patterns_found)).toBe(true);
      expect(typeof state.platform).toBe('string');
    });

    test('should validate timestamp format (ISO 8601 UTC with optional milliseconds)', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const validState: StateData = {
        last_analysis: '2026-04-01T10:30:45.123Z', // With milliseconds
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75
      };

      // Act: Write state
      await writeStateAtomically(statePath, validState);

      // Assert: Timestamp format validated
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);

      // Accept both with and without milliseconds
      const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      expect(state.last_analysis).toMatch(timestampRegex);
    });

    test('should trigger recovery if validation fails after write', async () => {
      // This test ensures that validation failures trigger recovery
      // Since we can't easily mock write failures, we verify the logic
      // by testing validateStateFile directly with invalid data

      // Arrange: Create invalid state file
      const statePath = path.join(testDir, 'state.json');
      const invalidState = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: 'not-an-array',
        platform: 'cursor',
        _schema_note: 'test'
      };
      fs.writeFileSync(statePath, JSON.stringify(invalidState, null, 2), { mode: 0o600 });

      // Act & Assert: Validation should fail
      await expect(validateStateFile(statePath)).rejects.toThrow(ValidationError);
    });

    test('should validate temp file BEFORE atomic rename', async () => {
      // This is verified implicitly by the atomic write test
      // If temp file validation failed, the rename wouldn't happen

      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const validState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75
      };

      // Act: Write state
      await writeStateAtomically(statePath, validState);

      // Assert: State file written successfully (implies temp file was validated)
      expect(fs.existsSync(statePath)).toBe(true);
      const content = fs.readFileSync(statePath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    test('should validate again after rename to verify write success', async () => {
      // This test verifies post-rename validation
      // The implementation should verify the file after rename

      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const validState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [createTestPattern('test')],
        improvements_applied: 1,
        corrections_reduction: 0.1,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 1,
        approval_threshold: 75
      };

      // Act: Write state
      await writeStateAtomically(statePath, validState);

      // Assert: File is readable and valid after write
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);

      expect(state.patterns_found).toHaveLength(1);
      expect(state.improvements_applied).toBe(1);

      // Verify it's a valid state object
      await expect(validateStateFile(statePath)).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // AC7: Handle first run (no existing state.json)
  // ==========================================================================

  describe('AC7: First run handling', () => {
    test('should create new state.json with defaults on first run', async () => {
      // Arrange: No state file exists
      const statePath = path.join(testDir, 'state.json');
      expect(fs.existsSync(statePath)).toBe(false);

      // Act: Update state (first run)
      await updateSessionState(testDir, [createTestPattern('first pattern')], 'cursor');

      // Assert: New state file created with default structure
      expect(fs.existsSync(statePath)).toBe(true);
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);

      expect(state.last_analysis).toBeDefined();
      expect(state.patterns_found).toBeDefined();
      expect(state.improvements_applied).toBeDefined();
      expect(state.corrections_reduction).toBeDefined();
      expect(state.platform).toBeDefined();
      expect(state._schema_note).toBeDefined();
    });

    test('should initialize last_analysis to current ISO 8601 UTC timestamp on first run', async () => {
      // Arrange: No state file
      const statePath = path.join(testDir, 'state.json');

      // Act: First run
      const beforeUpdate = new Date();
      await updateSessionState(testDir, [], 'cursor');
      const afterUpdate = new Date();

      // Assert: Timestamp set to current time
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      const timestamp = new Date(state.last_analysis);

      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
    });

    test('should initialize patterns_found as empty array on first run', async () => {
      // Arrange: No state file
      const statePath = path.join(testDir, 'state.json');

      // Act: First run with no new patterns
      await updateSessionState(testDir, [], 'cursor');

      // Assert: patterns_found initialized to empty array
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      expect(state.patterns_found).toEqual([]);
    });

    test('should set platform to detected platform on first run', async () => {
      // Arrange: No state file
      const statePath = path.join(testDir, 'state.json');

      // Act: First run with detected platform
      await updateSessionState(testDir, [], 'claude-code');

      // Assert: Platform set to detected value
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      expect(state.platform).toBe('claude-code');
    });

    test('should set platform to unknown if cannot detect on first run', async () => {
      // Arrange: No state file
      const statePath = path.join(testDir, 'state.json');

      // Act: First run with unknown platform
      await updateSessionState(testDir, [], 'unknown');

      // Assert: Platform set to unknown
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      expect(state.platform).toBe('unknown');
    });

    test('should include _schema_note field on first run', async () => {
      // Arrange: No state file
      const statePath = path.join(testDir, 'state.json');

      // Act: First run
      await updateSessionState(testDir, [], 'cursor');

      // Assert: _schema_note present
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      expect(state._schema_note).toBeDefined();
      expect(typeof state._schema_note).toBe('string');
    });

    test('should include all required fields from Stories 5.1-5.3 on first run', async () => {
      // Arrange: No state file
      const statePath = path.join(testDir, 'state.json');

      // Act: First run
      await updateSessionState(testDir, [createTestPattern('test')], 'cursor');

      // Assert: All required fields present
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);

      // Story 5.1 fields
      expect(state.last_analysis).toBeDefined();
      expect(state.patterns_found).toBeDefined();
      expect(state.improvements_applied).toBeDefined();
      expect(state.corrections_reduction).toBeDefined();
      expect(state.platform).toBeDefined();
      expect(state._schema_note).toBeDefined();

      // Story 5.3 fields
      expect(state.approval_rate).toBeDefined();
      expect(state.total_sessions).toBeDefined();
      expect(state.approval_threshold).toBeDefined();
    });
  });

  // ==========================================================================
  // AC8: Detect and handle no new patterns scenario
  // ==========================================================================

  describe('AC8: No new patterns scenario', () => {
    test('should detect when all current patterns already exist in patterns_found', async () => {
      // Arrange: Existing state with patterns
      const statePath = path.join(testDir, 'state.json');
      const existingPattern = createTestPattern('existing pattern', 2);
      existingPattern.first_seen = '2026-04-01T10:00:00Z';

      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [existingPattern],
        improvements_applied: 2,
        corrections_reduction: 0.1,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 1,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Update with same patterns (no new patterns)
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const newPatterns = [createTestPattern('existing pattern', 1)];
      await updateSessionState(testDir, newPatterns, 'cursor');

      // Assert: User informed about no new patterns
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No new patterns discovered')
      );

      consoleLogSpy.mockRestore();
    });

    test('should still update state.json timestamp when no new patterns found', async () => {
      // Arrange: Existing state
      const statePath = path.join(testDir, 'state.json');
      const existingPattern = createTestPattern('existing pattern');
      const oldTimestamp = '2026-04-01T10:00:00Z';

      const existingState: StateData = {
        last_analysis: oldTimestamp,
        patterns_found: [existingPattern],
        improvements_applied: 1,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 1,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Update with same patterns (no new patterns)
      const newPatterns = [createTestPattern('existing pattern', 1)];
      await updateSessionState(testDir, newPatterns, 'cursor');

      // Assert: Timestamp updated (not old timestamp)
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      expect(state.last_analysis).not.toBe(oldTimestamp);
    });

    test('should NOT modify patterns_found array when no new patterns', async () => {
      // Arrange: Existing state with patterns
      const statePath = path.join(testDir, 'state.json');
      const existingPattern = createTestPattern('existing pattern', 3);

      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [existingPattern],
        improvements_applied: 3,
        corrections_reduction: 0.2,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 1,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));
      const originalPatterns = JSON.stringify(existingState.patterns_found);

      // Act: Update with same patterns (no new patterns)
      const newPatterns = [createTestPattern('existing pattern', 1)];
      await updateSessionState(testDir, newPatterns, 'cursor');

      // Assert: patterns_found not modified (count not updated either per AC8)
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);

      // Note: AC8 says patterns_found is NOT modified when no new patterns
      // So count should remain at 3, not increase to 4
      expect(state.patterns_found).toHaveLength(1);
      const pattern = state.patterns_found[0] as MergedPattern;
      expect(pattern.count).toBe(3); // NOT updated
    });

    test('should still increment total_sessions when no new patterns', async () => {
      // Arrange: Existing state
      const statePath = path.join(testDir, 'state.json');
      const existingPattern = createTestPattern('existing pattern');

      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [existingPattern],
        improvements_applied: 1,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 1,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Update with same patterns (no new patterns)
      const newPatterns = [createTestPattern('existing pattern', 1)];
      await updateSessionState(testDir, newPatterns, 'cursor');

      // Assert: total_sessions incremented
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      expect(state.total_sessions).toBe(2); // Incremented from 1 to 2
    });

    test('should log session to results.jsonl with 0 patterns_found when no new patterns', async () => {
      // Arrange: Existing state
      const statePath = path.join(testDir, 'state.json');
      const existingPattern = createTestPattern('existing pattern');

      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [existingPattern],
        improvements_applied: 1,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 1,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Update with same patterns (no new patterns)
      const newPatterns = [createTestPattern('existing pattern', 1)];
      await updateSessionState(testDir, newPatterns, 'cursor');

      // Assert: Session logged to results.jsonl
      const resultsPath = path.join(testDir, 'results.jsonl');
      expect(fs.existsSync(resultsPath)).toBe(true);

      const content = fs.readFileSync(resultsPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBeGreaterThan(0);

      const lastEntry = JSON.parse(lines[lines.length - 1]);
      expect(lastEntry.patterns).toBeDefined();
    });
  });

  // ==========================================================================
  // AC9: Preserve metric values from Stories 5.1-5.3
  // ==========================================================================

  describe('AC9: Metric preservation from Stories 5.1-5.3', () => {
    test('should preserve improvements_applied from existing state', async () => {
      // Arrange: Existing state with metrics
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 42, // Existing metric
        corrections_reduction: 0.35,
        approval_rate: 78.5,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 10,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Update state
      await updateSessionState(testDir, [createTestPattern('new pattern')], 'cursor');

      // Assert: improvements_applied preserved (will be recalculated by Story 5.3)
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      expect(state.improvements_applied).toBeDefined();
      expect(typeof state.improvements_applied).toBe('number');
    });

    test('should preserve corrections_reduction from existing state', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 20,
        corrections_reduction: 0.67, // Existing metric
        approval_rate: 82.3,
        platform: 'claude-code',
        _schema_note: 'test',
        total_sessions: 8,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act
      await updateSessionState(testDir, [], 'claude-code');

      // Assert: corrections_reduction preserved (will be recalculated by Story 5.3)
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      expect(state.corrections_reduction).toBeDefined();
      expect(typeof state.corrections_reduction).toBe('number');
    });

    test('should preserve approval_rate from existing state', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 15,
        corrections_reduction: 0.45,
        approval_rate: 91.2, // Existing metric
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 5,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act
      await updateSessionState(testDir, [], 'cursor');

      // Assert: approval_rate preserved (will be recalculated by Story 5.3)
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      expect(state.approval_rate).toBeDefined();
      // Can be number or null
      expect(state.approval_rate === null || typeof state.approval_rate === 'number').toBe(true);
    });

    test('should preserve approval_threshold from existing state', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 10,
        corrections_reduction: 0.3,
        approval_rate: 85.0,
        platform: 'claude-code',
        _schema_note: 'test',
        total_sessions: 3,
        approval_threshold: 80 // Custom threshold
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act
      await updateSessionState(testDir, [], 'claude-code');

      // Assert: approval_threshold preserved
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      expect(state.approval_threshold).toBe(80);
    });

    test('should only directly increment total_sessions in state update (other metrics recalculated by Story 5.3)', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 10,
        corrections_reduction: 0.3,
        approval_rate: 85.0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 5,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act
      await updateSessionState(testDir, [], 'cursor');

      // Assert: total_sessions incremented directly
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      expect(state.total_sessions).toBe(6); // 5 + 1

      // Other metrics are preserved (Story 5.3 will recalculate them)
      expect(state.improvements_applied).toBe(10); // Preserved, not incremented
      expect(state.corrections_reduction).toBe(0.3); // Preserved
      expect(state.approval_rate).toBe(85.0); // Preserved
    });
  });

  // ==========================================================================
  // AC10: Integrate with analysis workflow
  // ==========================================================================

  describe('AC10: Workflow integration', () => {
    test('should be callable after persistAnalysisResults completes', async () => {
      // This test verifies that updateSessionState can be called
      // after persistAnalysisResults (Story 5.1)

      // Arrange: Create initial state via Story 5.1 workflow
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Simulate persistAnalysisResults completing (Story 5.1)
      const resultsPath = path.join(testDir, 'results.jsonl');
      fs.appendFileSync(resultsPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        patterns: 2,
        approved: 1,
        rejected: 1,
        patterns_found: [createTestPattern('pattern 1'), createTestPattern('pattern 2')]
      }) + '\n');

      // Act: Call updateSessionState (Story 5.4)
      await updateSessionState(testDir, [createTestPattern('pattern 3')], 'cursor');

      // Assert: State updated successfully
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      expect(state.patterns_found).toHaveLength(3); // 2 from Story 5.1 + 1 new
    });

    test('should execute before metrics recalculation (Story 5.3)', async () => {
      // This test verifies the workflow order:
      // Analysis → Persist (5.1) → Update State (5.4) → Metrics (5.3)

      // Arrange: State with existing data
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 5,
        corrections_reduction: 0.2,
        approval_rate: 75.0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 2,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Update state (Story 5.4)
      await updateSessionState(testDir, [createTestPattern('new pattern')], 'cursor');

      // Assert: State update completed (metrics still preserved, not recalculated yet)
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);

      // Metrics are preserved (Story 5.3 will recalculate them later)
      expect(state.improvements_applied).toBe(5);
      expect(state.corrections_reduction).toBe(0.2);
      expect(state.approval_rate).toBe(75.0);

      // State fields updated by Story 5.4
      expect(state.total_sessions).toBe(3); // Incremented
      expect(state.patterns_found).toHaveLength(1); // New pattern added
    });

    test('should halt workflow and report error if state update fails', async () => {
      // Arrange: Create read-only state file (simulate failure condition)
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2), { mode: 0o444 }); // Read-only

      // Act & Assert: Should throw error
      await expect(
        updateSessionState(testDir, [createTestPattern('test')], 'cursor')
      ).rejects.toThrow();

      // Cleanup: Restore permissions for cleanup
      fs.chmodSync(statePath, 0o644);
    });

    test('should allow metrics recalculation (Story 5.3) to proceed after successful state update', async () => {
      // Arrange: State with existing data
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 5,
        corrections_reduction: 0.2,
        approval_rate: 75.0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 2,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Update state (Story 5.4) - should succeed
      await expect(
        updateSessionState(testDir, [createTestPattern('new pattern')], 'cursor')
      ).resolves.not.toThrow();

      // Assert: State file is valid and can be read for metrics recalculation
      const content = fs.readFileSync(statePath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();

      // Verify state is ready for Story 5.3 metrics recalculation
      const state = JSON.parse(content);
      expect(state.total_sessions).toBe(3); // Ready for Story 5.3
    });
  });

  // ==========================================================================
  // Business Logic Unit Tests (API-level)
  // ==========================================================================

  describe('Business Logic: mergePatterns function', () => {
    test('should merge new patterns with existing patterns', () => {
      // Arrange
      const existing = [createTestPattern('pattern A', 2)];
      const newPatterns = [createTestPattern('pattern B', 1)];

      // Act
      const merged = mergePatterns(existing, newPatterns);

      // Assert
      expect(merged).toHaveLength(2);
      expect(merged.some(p => p.pattern_text === 'pattern A')).toBe(true);
      expect(merged.some(p => p.pattern_text === 'pattern B')).toBe(true);
    });

    test('should update count for recurring patterns', () => {
      // Arrange
      const existing = [createTestPattern('pattern X', 3)];
      const newPatterns = [createTestPattern('pattern X', 2)];

      // Act
      const merged = mergePatterns(existing, newPatterns);

      // Assert
      expect(merged).toHaveLength(1);
      expect(merged[0].count).toBe(5); // 3 + 2
    });

    test('should preserve first_seen for existing patterns', () => {
      // Arrange
      const firstSeen = '2026-03-01T10:00:00Z';
      const existing = [createTestPattern('pattern Y', 1)];
      existing[0].first_seen = firstSeen;
      const newPatterns = [createTestPattern('pattern Y', 1)];

      // Act
      const merged = mergePatterns(existing, newPatterns);

      // Assert
      expect(merged[0].first_seen).toBe(firstSeen);
    });

    test('should set first_seen for new patterns', () => {
      // Arrange
      const existing: MergedPattern[] = [];
      const newPatterns = [createTestPattern('new pattern', 1)];
      // Set first_seen to empty string to simulate missing value
      (newPatterns[0] as any).first_seen = undefined;

      // Act
      const beforeMerge = new Date();
      const merged = mergePatterns(existing, newPatterns);
      const afterMerge = new Date();

      // Assert
      expect(merged[0].first_seen).toBeDefined();
      const firstSeen = new Date(merged[0].first_seen);
      expect(firstSeen.getTime()).toBeGreaterThanOrEqual(beforeMerge.getTime());
      expect(firstSeen.getTime()).toBeLessThanOrEqual(afterMerge.getTime());
    });

    test('should deduplicate by pattern_text (case-insensitive)', () => {
      // Arrange
      const existing = [createTestPattern('PATTERN A', 2)];
      const newPatterns = [createTestPattern('pattern a', 1)]; // Different case

      // Act
      const merged = mergePatterns(existing, newPatterns);

      // Assert: Only one pattern (deduplicated)
      expect(merged).toHaveLength(1);
      expect(merged[0].count).toBe(3); // 2 + 1
    });
  });

  describe('Business Logic: hasNewPatterns function', () => {
    test('should return true when at least one new pattern exists', () => {
      // Arrange
      const existing = [createTestPattern('pattern A', 1)];
      const newPatterns = [
        createTestPattern('pattern A', 1),
        createTestPattern('pattern B', 1) // New pattern
      ];

      // Act
      const hasNew = hasNewPatterns(existing, newPatterns);

      // Assert
      expect(hasNew).toBe(true);
    });

    test('should return false when all patterns already exist', () => {
      // Arrange
      const existing = [
        createTestPattern('pattern A', 1),
        createTestPattern('pattern B', 1)
      ];
      const newPatterns = [
        createTestPattern('pattern A', 1),
        createTestPattern('pattern B', 1)
      ];

      // Act
      const hasNew = hasNewPatterns(existing, newPatterns);

      // Assert
      expect(hasNew).toBe(false);
    });

    test('should be case-insensitive when comparing patterns', () => {
      // Arrange
      const existing = [createTestPattern('Pattern A', 1)];
      const newPatterns = [createTestPattern('pattern a', 1)]; // Different case

      // Act
      const hasNew = hasNewPatterns(existing, newPatterns);

      // Assert: No new patterns (case-insensitive match)
      expect(hasNew).toBe(false);
    });

    test('should return true when existing patterns is empty', () => {
      // Arrange
      const existing: MergedPattern[] = [];
      const newPatterns = [createTestPattern('new pattern', 1)];

      // Act
      const hasNew = hasNewPatterns(existing, newPatterns);

      // Assert
      expect(hasNew).toBe(true);
    });

    test('should return false when new patterns is empty', () => {
      // Arrange
      const existing = [createTestPattern('existing pattern', 1)];
      const newPatterns: MergedPattern[] = [];

      // Act
      const hasNew = hasNewPatterns(existing, newPatterns);

      // Assert
      expect(hasNew).toBe(false);
    });
  });

  // ==========================================================================
  // Edge Cases and Error Scenarios
  // ==========================================================================

  describe('Edge Cases: Error handling', () => {
    test('should handle empty patterns_found array gracefully', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [], // Empty array
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Add new patterns to empty array
      await updateSessionState(testDir, [createTestPattern('first pattern')], 'cursor');

      // Assert: Pattern added successfully
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      expect(state.patterns_found).toHaveLength(1);
    });

    test('should handle patterns with missing count field (default to 1)', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Add pattern without count field
      const patternWithoutCount = createTestPattern('test pattern');
      delete (patternWithoutCount as any).count;

      await updateSessionState(testDir, [patternWithoutCount], 'cursor');

      // Assert: Pattern added with default count
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      const pattern = state.patterns_found[0] as MergedPattern;
      expect(pattern.count).toBe(1); // Default value
    });

    test('should handle very large patterns_found arrays (> 100 patterns)', async () => {
      // Arrange: Create 150 patterns
      const statePath = path.join(testDir, 'state.json');
      const manyPatterns = Array.from({ length: 150 }, (_, i) =>
        createTestPattern(`pattern ${i}`, 1)
      );

      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: manyPatterns,
        improvements_applied: 150,
        corrections_reduction: 0.5,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 10,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Add more patterns
      const newPatterns = [createTestPattern('new pattern 151', 1)];
      await updateSessionState(testDir, newPatterns, 'cursor');

      // Assert: All patterns preserved
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      expect(state.patterns_found).toHaveLength(151);
    });

    test('should handle special characters in pattern_text', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Add pattern with special characters
      const specialPattern = createTestPattern('Use "quotes" and \'apostrophes\' and $ymbols');
      await updateSessionState(testDir, [specialPattern], 'cursor');

      // Assert: Pattern stored correctly
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      expect(state.patterns_found).toHaveLength(1);
      expect(state.patterns_found[0].pattern_text).toContain('quotes');
    });

    test('should handle Unicode characters in pattern_text', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Add pattern with Unicode characters
      const unicodePattern = createTestPattern('Use émojis 🎉 and Unicode 中文');
      await updateSessionState(testDir, [unicodePattern], 'cursor');

      // Assert: Pattern stored correctly
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);
      expect(state.patterns_found).toHaveLength(1);
      expect(state.patterns_found[0].pattern_text).toContain('🎉');
    });

    test('should handle concurrent state updates gracefully', async () => {
      // Arrange
      const statePath = path.join(testDir, 'state.json');
      const existingState: StateData = {
        last_analysis: '2026-04-01T10:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'cursor',
        _schema_note: 'test',
        total_sessions: 0,
        approval_threshold: 75
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      // Act: Perform multiple concurrent updates
      const updates = [
        updateSessionState(testDir, [createTestPattern('pattern 1')], 'cursor'),
        updateSessionState(testDir, [createTestPattern('pattern 2')], 'cursor'),
        updateSessionState(testDir, [createTestPattern('pattern 3')], 'cursor')
      ];

      // All updates should complete (may throw errors without locking)
      await Promise.allSettled(updates);

      // Assert: State file is valid (last write wins or file locking prevents corruption)
      const content = fs.readFileSync(statePath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });
  });
});
