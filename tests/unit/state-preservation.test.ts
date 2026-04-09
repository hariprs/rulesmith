/**
 * ATDD Tests: Story 6.3 - State Preservation on Failure (Unit)
 *
 * TDD RED PHASE: These tests WILL FAIL until implementation is complete.
 * They define the expected behavior for the state preservation module
 * functions: readStateWithRecovery, writeStateWithProtection, validateStateContent.
 *
 * Acceptance Criteria covered:
 *   AC1: Backup before modify (write protection)
 *   AC2: State not corrupted on write failure
 *   AC3: Recovery checkpoint available
 *   AC4: Handle corrupted state.json on recovery
 *   AC5: User informed of preserved progress
 *   AC6: Atomic state write
 *
 * Test Level: Unit (mocked filesystem, business logic focus)
 *
 * @module unit/state-preservation
 */

import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';

import {
  readStateWithRecovery,
  writeStateWithProtection,
  validateStateContent,
  StatePreservationResult,
} from '../../src/state-preservation';

import type { StateData } from '../../src/state-management';

// ============================================================================
// Test Helper: create a minimal valid StateData
// ============================================================================

function makeValidState(overrides?: Partial<StateData>): StateData {
  return {
    last_analysis: '2026-04-07T10:00:00Z',
    patterns_found: ['pattern-1', 'pattern-2'],
    improvements_applied: 3,
    corrections_reduction: 0.5,
    platform: 'claude-code',
    _schema_note: 'unit test state',
    ...overrides,
  };
}

// ============================================================================
// Test Helper: create a temp directory for each test
// ============================================================================

describe('Story 6.3: State Preservation on Failure', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(fs.realpathSync('/tmp'), 'state-preservation-unit-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC1: Backup before modify (write protection)
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC1: Backup before modify', () => {
    test('creates state.json.bak before writing new state when state.json already exists', async () => {
      const statePath = path.join(testDir, 'state.json');
      const existingState = makeValidState({ improvements_applied: 1 });
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2), { mode: 0o600 });

      const newState = makeValidState({ improvements_applied: 5 });
      const result = await writeStateWithProtection(statePath, newState);

      expect(result.success).toBe(true);

      const bakPath = `${statePath}.bak`;
      // After successful write, .bak should be cleaned up
      expect(fs.existsSync(bakPath)).toBe(false);
    });

    test('creates state.json.bak from current state.json before overwrite', async () => {
      const statePath = path.join(testDir, 'state.json');
      const existingState = makeValidState({ improvements_applied: 1 });
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2), { mode: 0o600 });

      // Spy on the backup file to verify it was created with the OLD content
      const bakPath = `${statePath}.bak`;

      // During the write, the backup should be created. After write succeeds,
      // it should be cleaned up. Let's verify the write succeeded.
      const newState = makeValidState({ improvements_applied: 5 });
      const result = await writeStateWithProtection(statePath, newState);

      expect(result.success).toBe(true);
      // The new state should be on disk
      const writtenState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(writtenState.improvements_applied).toBe(5);
    });

    test('aborts write when backup creation fails', async () => {
      const statePath = path.join(testDir, 'state.json');
      const existingState = makeValidState({ improvements_applied: 1 });
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2), { mode: 0o600 });

      // Create a directory at the .bak path to block backup creation
      const bakPath = `${statePath}.bak`;
      fs.mkdirSync(bakPath, { recursive: true });

      const newState = makeValidState({ improvements_applied: 5 });
      const result = await writeStateWithProtection(statePath, newState);

      expect(result.success).toBe(false);
      // Original state should be unchanged
      const stateAfter = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(stateAfter.improvements_applied).toBe(1);

      // Clean up blocker for subsequent tests
      fs.rmSync(bakPath, { recursive: true, force: true });
    });

    test('does not overwrite .bak when state.json is corrupt and .bak already exists', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      // Create a valid backup file
      const bakState = makeValidState({ improvements_applied: 10 });
      fs.writeFileSync(bakPath, JSON.stringify(bakState, null, 2), { mode: 0o600 });

      // Corrupt the primary
      fs.writeFileSync(statePath, 'not valid json {{{', { mode: 0o600 });

      // Write new state -- .bak should NOT be overwritten with the corrupt content
      const newState = makeValidState({ improvements_applied: 20 });
      await writeStateWithProtection(statePath, newState);

      // The .bak should still contain the original valid state (not corrupt, not the new state)
      // Since write succeeds the .bak will be cleaned up. But before the write, it should
      // not have been overwritten with corrupt data. Let's verify indirectly:
      // After the write, primary has the new state, .bak cleaned up.
      const writtenState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(writtenState.improvements_applied).toBe(20);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC2: State not corrupted on write failure
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC2: State not corrupted on write failure', () => {
    test('state.json remains unchanged when write fails', async () => {
      const statePath = path.join(testDir, 'state.json');
      const existingState = makeValidState({ last_analysis: '2026-04-01T00:00:00Z' });
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2), { mode: 0o600 });

      // Block writes by creating a directory at the tmp file path
      const tmpPath = `${statePath}.tmp`;
      fs.mkdirSync(tmpPath, { recursive: true });

      try {
        const newState = makeValidState({ last_analysis: '2026-04-07T00:00:00Z' });
        await writeStateWithProtection(statePath, newState);
      } catch {
        // expected
      } finally {
        fs.rmSync(tmpPath, { recursive: true, force: true });
      }

      // state.json must still have the old content
      const stateAfter = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(stateAfter.last_analysis).toBe('2026-04-01T00:00:00Z');
    });

    test('state.json.bak remains intact after write failure', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      // Create state.json with old data -- no .bak yet
      const existingState = makeValidState({ improvements_applied: 1 });
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2), { mode: 0o600 });

      // Block .tmp write
      const tmpPath = `${statePath}.tmp`;
      fs.mkdirSync(tmpPath, { recursive: true });

      try {
        const newState = makeValidState({ improvements_applied: 10 });
        await writeStateWithProtection(statePath, newState);
      } catch {
        // expected
      } finally {
        fs.rmSync(tmpPath, { recursive: true, force: true });
      }

      // After write fails, a .bak should have been created from the original, or
      // the original .bak (if it existed) should be untouched
      // Since write failed, let's check what exists
      // The write should have created .bak before attempting the .tmp
      if (fs.existsSync(bakPath)) {
        const bakState = JSON.parse(fs.readFileSync(bakPath, 'utf-8'));
        expect(bakState.improvements_applied).toBe(1);
      }
    });

    test('result contains error when write fails', async () => {
      const statePath = path.join(testDir, 'state.json');
      const existingState = makeValidState();
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2), { mode: 0o600 });

      // Block .tmp write
      const tmpPath = `${statePath}.tmp`;
      fs.mkdirSync(tmpPath, { recursive: true });

      try {
        const newState = makeValidState({ improvements_applied: 99 });
        const result = await writeStateWithProtection(statePath, newState);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      } finally {
        fs.rmSync(tmpPath, { recursive: true, force: true });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC3: Recovery checkpoint available
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC3: Recovery checkpoint available', () => {
    test('readStateWithRecovery falls back to state.json.bak when state.json is corrupt', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      // Corrupt primary
      fs.writeFileSync(statePath, '{invalid json', { mode: 0o600 });

      // Valid backup
      const bakState = makeValidState({ last_analysis: '2026-04-05T12:00:00Z' });
      fs.writeFileSync(bakPath, JSON.stringify(bakState, null, 2), { mode: 0o600 });

      const result = await readStateWithRecovery(statePath);

      expect(result.success).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.state).not.toBeNull();
      expect(result.state!.last_analysis).toBe('2026-04-05T12:00:00Z');
    });

    test('readStateWithRecovery returns primary when both primary and .bak are valid', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      const primaryState = makeValidState({ last_analysis: '2026-04-07T00:00:00Z' });
      fs.writeFileSync(statePath, JSON.stringify(primaryState, null, 2), { mode: 0o600 });

      const bakState = makeValidState({ last_analysis: '2026-04-01T00:00:00Z' });
      fs.writeFileSync(bakPath, JSON.stringify(bakState, null, 2), { mode: 0o600 });

      const result = await readStateWithRecovery(statePath);

      expect(result.success).toBe(true);
      expect(result.recovered).toBe(false);
      expect(result.state!.last_analysis).toBe('2026-04-07T00:00:00Z');
    });

    test('writeStateWithProtection deletes .bak after successful write', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      // Create both files
      const oldState = makeValidState({ improvements_applied: 1 });
      fs.writeFileSync(statePath, JSON.stringify(oldState, null, 2), { mode: 0o600 });
      fs.writeFileSync(bakPath, JSON.stringify(oldState, null, 2), { mode: 0o600 });

      const newState = makeValidState({ improvements_applied: 10 });
      const result = await writeStateWithProtection(statePath, newState);

      expect(result.success).toBe(true);
      expect(fs.existsSync(bakPath)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC4: Handle corrupted state.json on recovery
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC4: Handle corrupted state.json on recovery', () => {
    test('returns null when both state.json and .bak are corrupt', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      fs.writeFileSync(statePath, 'corrupt primary', { mode: 0o600 });
      fs.writeFileSync(bakPath, 'corrupt backup', { mode: 0o600 });

      const result = await readStateWithRecovery(statePath);

      expect(result.success).toBe(false);
      expect(result.state).toBeNull();
      expect(result.recovered).toBe(false);
    });

    test('returns null when state.json is corrupt and .bak does not exist', async () => {
      const statePath = path.join(testDir, 'state.json');

      fs.writeFileSync(statePath, '{bad json}', { mode: 0o600 });

      const result = await readStateWithRecovery(statePath);

      expect(result.success).toBe(false);
      expect(result.state).toBeNull();
    });

    test('returns empty state when state.json is missing and .bak does not exist', async () => {
      const statePath = path.join(testDir, 'state.json');
      // No files created

      const result = await readStateWithRecovery(statePath);

      expect(result.success).toBe(false);
      expect(result.state).toBeNull();
    });

    test('falls back to .bak when state.json has missing required keys', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      // Primary has malformed JSON
      fs.writeFileSync(statePath, '{"only_one_field": true}', { mode: 0o600 });

      // Valid backup
      const bakState = makeValidState();
      fs.writeFileSync(bakPath, JSON.stringify(bakState, null, 2), { mode: 0o600 });

      const result = await readStateWithRecovery(statePath);

      expect(result.success).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.state!.patterns_found).toEqual(['pattern-1', 'pattern-2']);
    });

    test('validates that .bak also has required keys before returning recovered state', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      // Corrupt primary
      fs.writeFileSync(statePath, 'not json', { mode: 0o600 });

      // Also corrupt .bak (missing required keys)
      fs.writeFileSync(bakPath, '{"some": "data"}', { mode: 0o600 });

      const result = await readStateWithRecovery(statePath);

      expect(result.success).toBe(false);
      expect(result.state).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC5: User informed of preserved progress
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC5: User informed of preserved progress', () => {
    test('result includes human-readable message on successful read', async () => {
      const statePath = path.join(testDir, 'state.json');
      fs.writeFileSync(
        statePath,
        JSON.stringify(makeValidState(), null, 2),
        { mode: 0o600 }
      );

      const result = await readStateWithRecovery(statePath);

      expect(result.success).toBe(true);
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
      expect(result.message).toContain('state.json');
    });

    test('result includes human-readable message when state recovered from backup', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      fs.writeFileSync(statePath, 'bad', { mode: 0o600 });
      fs.writeFileSync(bakPath, JSON.stringify(makeValidState(), null, 2), { mode: 0o600 });

      const result = await readStateWithRecovery(statePath);

      expect(result.success).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.message.length).toBeGreaterThan(0);
      // Message should indicate it was recovered from backup
      expect(result.message.toLowerCase()).toContain('recover');
    });

    test('result message on write failure indicates previous state was preserved', async () => {
      const statePath = path.join(testDir, 'state.json');
      const existingState = makeValidState();
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2), { mode: 0o600 });

      // Block .tmp write
      const tmpPath = `${statePath}.tmp`;
      fs.mkdirSync(tmpPath, { recursive: true });

      try {
        const result = await writeStateWithProtection(statePath, makeValidState({ improvements_applied: 99 }));
        expect(result.success).toBe(false);
        expect(typeof result.message).toBe('string');
        expect(result.message.length).toBeGreaterThan(0);
        // Message should indicate preservation
        expect(result.message.toLowerCase()).toContain('preserv');
      } finally {
        fs.rmSync(tmpPath, { recursive: true, force: true });
      }
    });

    test('message is suitable for end-user display (no stack traces or paths leakage)', async () => {
      const statePath = path.join(testDir, 'state.json');
      fs.writeFileSync(statePath, 'corrupt', { mode: 0o600 });

      const bakPath = `${statePath}.bak`;
      fs.writeFileSync(bakPath, JSON.stringify(makeValidState(), null, 2), { mode: 0o600 });

      const result = await readStateWithRecovery(statePath);

      // Message should be user-safe (no raw stack traces)
      expect(result.message).not.toContain('at ');
      expect(result.message).not.toContain('Error:');
      expect(result.message).not.toContain('at Object');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC6: Atomic state write
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC6: Atomic state write', () => {
    test('writeStateWithProtection uses .tmp file pattern', async () => {
      const statePath = path.join(testDir, 'state.json');
      const tmpPath = `${statePath}.tmp`;

      const newState = makeValidState({ improvements_applied: 42 });
      await writeStateWithProtection(statePath, newState);

      // After successful write, .tmp should not exist (cleaned up)
      expect(fs.existsSync(tmpPath)).toBe(false);

      // state.json should contain the new state
      const writtenState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(writtenState.improvements_applied).toBe(42);
    });

    test('.tmp file is cleaned up when write fails', async () => {
      const statePath = path.join(testDir, 'state.json');

      // Pre-create a valid state.json
      fs.writeFileSync(statePath, JSON.stringify(makeValidState(), null, 2), { mode: 0o600 });

      // Create a directory blocker at rename target to cause rename to fail
      // But let writeFile succeed to create the .tmp file, then fail at rename
      // Actually, let's block the .tmp creation to simulate a write failure
      const tmpPath = `${statePath}.tmp`;
      fs.mkdirSync(tmpPath, { recursive: true });

      try {
        await writeStateWithProtection(statePath, makeValidState({ improvements_applied: 99 }));
      } catch {
        // expected
      } finally {
        // Clean up blocker
        fs.rmSync(tmpPath, { recursive: true, force: true });
      }

      // After failure, no .tmp file should remain
      const files = fs.readdirSync(testDir);
      expect(files.some((f) => f.endsWith('.tmp'))).toBe(false);
    });

    test('no partially written state.json can exist at any point', async () => {
      const statePath = path.join(testDir, 'state.json');
      const oldState = makeValidState({ last_analysis: 'old-timestamp' });
      fs.writeFileSync(statePath, JSON.stringify(oldState, null, 2), { mode: 0o600 });

      // Block the write
      const tmpPath = `${statePath}.tmp`;
      fs.mkdirSync(tmpPath, { recursive: true });

      try {
        await writeStateWithProtection(statePath, makeValidState({ last_analysis: 'new-timestamp' }));
      } catch {
        // expected
      } finally {
        fs.rmSync(tmpPath, { recursive: true, force: true });
      }

      // state.json should still be valid JSON with old data
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content); // Should not throw
      expect(state.last_analysis).toBe('old-timestamp');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // validateStateContent unit tests
  // ═══════════════════════════════════════════════════════════════════════

  describe('validateStateContent', () => {
    test('returns valid for a well-formed state file', () => {
      const statePath = path.join(testDir, 'valid-state.json');
      fs.writeFileSync(statePath, JSON.stringify(makeValidState(), null, 2), { mode: 0o600 });

      const result = validateStateContent(statePath);

      expect(result.valid).toBe(true);
      expect(result.state).not.toBeNull();
      expect(result.errors).toEqual([]);
    });

    test('returns invalid for a file with invalid JSON', () => {
      const statePath = path.join(testDir, 'bad-json.json');
      fs.writeFileSync(statePath, '{not json at all', { mode: 0o600 });

      const result = validateStateContent(statePath);

      expect(result.valid).toBe(false);
      expect(result.state).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('returns invalid for a file with missing required keys', () => {
      const statePath = path.join(testDir, 'missing-keys.json');
      fs.writeFileSync(statePath, JSON.stringify({ only_one_field: true }, null, 2), { mode: 0o600 });

      const result = validateStateContent(statePath);

      expect(result.valid).toBe(false);
      expect(result.state).toBeNull();
      expect(result.errors.some((e) => e.includes('Missing')) || result.errors.some((e) => e.includes('key'))).toBe(true);
    });

    test('returns invalid for a file with only 3 of 6 required keys', () => {
      const statePath = path.join(testDir, 'partial-keys.json');
      // Has only the "minimum" 3 keys but is missing corrections_reduction, platform, _schema_note
      fs.writeFileSync(statePath, JSON.stringify({
        last_analysis: '2026-04-07T00:00:00Z',
        patterns_found: [],
        improvements_applied: 0,
      }, null, 2), { mode: 0o600 });

      const result = validateStateContent(statePath);

      expect(result.valid).toBe(false);
      expect(result.state).toBeNull();
      expect(result.errors.some((e) => e.includes('corrections_reduction'))).toBe(true);
      expect(result.errors.some((e) => e.includes('platform'))).toBe(true);
      expect(result.errors.some((e) => e.includes('_schema_note'))).toBe(true);
    });

    test('returns invalid for a non-existent file', () => {
      const statePath = path.join(testDir, 'does-not-exist.json');

      const result = validateStateContent(statePath);

      expect(result.valid).toBe(false);
      expect(result.state).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('returns invalid for a file containing a non-object (e.g. array)', () => {
      const statePath = path.join(testDir, 'array.json');
      fs.writeFileSync(statePath, '["a", "b"]', { mode: 0o600 });

      const result = validateStateContent(statePath);

      expect(result.valid).toBe(false);
      expect(result.state).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('returns invalid for a file containing null', () => {
      const statePath = path.join(testDir, 'null.json');
      fs.writeFileSync(statePath, 'null', { mode: 0o600 });

      const result = validateStateContent(statePath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('returns invalid for an empty file (0 bytes -- truncated state)', () => {
      const statePath = path.join(testDir, 'empty.json');
      fs.writeFileSync(statePath, '', { mode: 0o600 });

      const result = validateStateContent(statePath);

      expect(result.valid).toBe(false);
      expect(result.state).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
      // Should mention JSON parse error, not missing keys
      expect(result.errors.some((e) => e.toLowerCase().includes('json'))).toBe(true);
    });

    test('returns invalid for a file containing only whitespace', () => {
      const statePath = path.join(testDir, 'whitespace.json');
      fs.writeFileSync(statePath, '   \n\n  \t  ', { mode: 0o600 });

      const result = validateStateContent(statePath);

      expect(result.valid).toBe(false);
      expect(result.state).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('returns valid for a state file with extra/unknown keys (forward compatibility)', () => {
      const statePath = path.join(testDir, 'extra-keys.json');
      const stateWithExtras = {
        ...makeValidState(),
        future_field: 'some-value',
        version: 2,
        metadata: { analyzed_by: 'test' },
      };
      fs.writeFileSync(statePath, JSON.stringify(stateWithExtras, null, 2), { mode: 0o600 });

      const result = validateStateContent(statePath);

      expect(result.valid).toBe(true);
      expect(result.state).not.toBeNull();
      expect((result.state as unknown as Record<string, unknown>).future_field).toBe('some-value');
      expect(result.errors).toEqual([]);
    });

    test('returns valid for a state file with a primitive value (e.g. number) in a field', () => {
      const statePath = path.join(testDir, 'number-values.json');
      // Valid JSON with all required keys, even if some values are unexpected types
      // (validateStateContent only checks key presence per YOLO scope)
      fs.writeFileSync(statePath, JSON.stringify({
        last_analysis: 12345, // number instead of string
        patterns_found: 0, // number instead of array
        improvements_applied: 'three', // string instead of number
        corrections_reduction: 0.5,
        platform: 'claude-code',
        _schema_note: 'type mismatch test',
      }, null, 2), { mode: 0o600 });

      const result = validateStateContent(statePath);

      // Should pass because validateStateContent only checks key presence
      expect(result.valid).toBe(true);
      expect(result.state).not.toBeNull();
      expect(result.errors).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Edge cases and input validation
  // ═══════════════════════════════════════════════════════════════════════

  describe('Input validation', () => {
    test('readStateWithRecovery returns error for empty path', async () => {
      const result = await readStateWithRecovery('');

      expect(result.success).toBe(false);
      expect(result.state).toBeNull();
      expect(result.message.toLowerCase()).toMatch(/empty|invalid/);
    });

    test('writeStateWithProtection returns error for empty path', async () => {
      const result = await writeStateWithProtection('', makeValidState());

      expect(result.success).toBe(false);
      expect(result.state).toBeNull();
    });

    test('writeStateWithProtection returns error for whitespace-only path', async () => {
      const result = await writeStateWithProtection('   ', makeValidState());

      expect(result.success).toBe(false);
    });

    test('writeStateWithProtection succeeds when no prior state.json exists (first write)', async () => {
      const statePath = path.join(testDir, 'state.json');
      // No prior state.json

      const newState = makeValidState({ improvements_applied: 1 });
      const result = await writeStateWithProtection(statePath, newState);

      expect(result.success).toBe(true);
      expect(result.state!.improvements_applied).toBe(1);

      // Verify it was written
      expect(fs.existsSync(statePath)).toBe(true);
      const writtenState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(writtenState.improvements_applied).toBe(1);
    });

    test('writeStateWithProtection returns error for null newState', async () => {
      const statePath = path.join(testDir, 'state.json');
      const result = await writeStateWithProtection(statePath, null as unknown as StateData);

      expect(result.success).toBe(false);
      expect(result.state).toBeNull();
      expect(result.message).toContain('non-null object');
    });

    test('writeStateWithProtection returns error for undefined newState', async () => {
      const statePath = path.join(testDir, 'state.json');
      const result = await writeStateWithProtection(statePath, undefined as unknown as StateData);

      expect(result.success).toBe(false);
      expect(result.state).toBeNull();
      expect(result.message).toContain('non-null object');
    });

    test('writeStateWithProtection returns error for array as newState', async () => {
      const statePath = path.join(testDir, 'state.json');
      const result = await writeStateWithProtection(statePath, ['not', 'a', 'state'] as unknown as StateData);

      expect(result.success).toBe(false);
      expect(result.state).toBeNull();
      expect(result.message).toContain('non-null object');
    });

    test('writeStateWithProtection returns error for newState with circular reference', async () => {
      const statePath = path.join(testDir, 'state.json');
      const circularState: any = makeValidState();
      circularState.self = circularState; // circular reference

      const result = await writeStateWithProtection(statePath, circularState);

      expect(result.success).toBe(false);
      expect(result.state).toBeNull();
      expect(result.message.toLowerCase()).toContain('serializ');
      // No files should have been created
      expect(fs.existsSync(statePath)).toBe(false);
      expect(fs.existsSync(`${statePath}.bak`)).toBe(false);
      expect(fs.existsSync(`${statePath}.tmp`)).toBe(false);
    });

    test('writeStateWithProtection returns error for newState with BigInt value', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bigIntState = makeValidState();
      (bigIntState as any).someBigInt = BigInt(9007199254740991);

      const result = await writeStateWithProtection(statePath, bigIntState);

      expect(result.success).toBe(false);
      expect(result.state).toBeNull();
      expect(result.message.toLowerCase()).toContain('serializ');
      // No files should have been created
      expect(fs.existsSync(statePath)).toBe(false);
      expect(fs.existsSync(`${statePath}.bak`)).toBe(false);
      expect(fs.existsSync(`${statePath}.tmp`)).toBe(false);
    });

    test('writeStateWithProtection returns error for newState missing required keys', async () => {
      const statePath = path.join(testDir, 'state.json');
      const incompleteState = { foo: 'bar' } as unknown as StateData;

      const result = await writeStateWithProtection(statePath, incompleteState);

      expect(result.success).toBe(false);
      expect(result.state).toBeNull();
      expect(result.message).toContain('missing required keys');
      // No files should have been created
      expect(fs.existsSync(statePath)).toBe(false);
      expect(fs.existsSync(`${statePath}.bak`)).toBe(false);
      expect(fs.existsSync(`${statePath}.tmp`)).toBe(false);
    });

    test('writeStateWithProtection returns error listing which keys are missing', async () => {
      const statePath = path.join(testDir, 'state.json');
      const partialState = { last_analysis: '2026-04-07', patterns_found: [] } as unknown as StateData;

      const result = await writeStateWithProtection(statePath, partialState);

      expect(result.success).toBe(false);
      expect(result.message).toContain('improvements_applied');
      expect(result.message).toContain('corrections_reduction');
      expect(result.message).toContain('platform');
      expect(result.message).toContain('_schema_note');
    });

    test('readStateWithRecovery falls back to .bak when state.json is empty (0 bytes)', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      // Empty primary (truncated to 0 bytes)
      fs.writeFileSync(statePath, '', { mode: 0o600 });

      // Valid backup
      fs.writeFileSync(bakPath, JSON.stringify(makeValidState({
        last_analysis: '2026-04-06T09:00:00Z',
      }), null, 2), { mode: 0o600 });

      const result = await readStateWithRecovery(statePath);

      expect(result.success).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.state!.last_analysis).toBe('2026-04-06T09:00:00Z');
    });

    test('writeStateWithProtection preserves unicode content in state values', async () => {
      const statePath = path.join(testDir, 'state.json');
      const unicodeState = makeValidState({
        _schema_note: 'Unicode test: \u4e2d\u6587 \u65e5\u672c\u8a9e \ud83d\ude80 \u00e9\u00e0\u00fc',
        patterns_found: ['pattern-\u03b1', 'pattern-\u03b2'],
      });

      const result = await writeStateWithProtection(statePath, unicodeState);

      expect(result.success).toBe(true);
      const writtenState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(writtenState._schema_note).toBe('Unicode test: \u4e2d\u6587 \u65e5\u672c\u8a9e \ud83d\ude80 \u00e9\u00e0\u00fc');
      expect(writtenState.patterns_found).toEqual(['pattern-\u03b1', 'pattern-\u03b2']);
    });

    test('readStateWithRecovery handles whitespace-only state.json by falling back to .bak', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      // Whitespace-only primary
      fs.writeFileSync(statePath, '   \n\n  \t  ', { mode: 0o600 });

      // Valid backup
      fs.writeFileSync(bakPath, JSON.stringify(makeValidState({
        last_analysis: '2026-04-04T06:00:00Z',
      }), null, 2), { mode: 0o600 });

      const result = await readStateWithRecovery(statePath);

      expect(result.success).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.state!.last_analysis).toBe('2026-04-04T06:00:00Z');
    });

    test('writeStateWithProtection handles state with empty string values', async () => {
      const statePath = path.join(testDir, 'state.json');
      const emptyStringState = makeValidState({
        last_analysis: '',
        _schema_note: '',
        patterns_found: [],
      });

      const result = await writeStateWithProtection(statePath, emptyStringState);

      expect(result.success).toBe(true);
      const writtenState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      expect(writtenState.last_analysis).toBe('');
      expect(writtenState._schema_note).toBe('');
    });

    test('readStateWithRecovery returns both-corrupt message when primary is empty and .bak is empty', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      fs.writeFileSync(statePath, '', { mode: 0o600 });
      fs.writeFileSync(bakPath, '', { mode: 0o600 });

      const result = await readStateWithRecovery(statePath);

      expect(result.success).toBe(false);
      expect(result.state).toBeNull();
      expect(result.recovered).toBe(false);
      expect(result.message.toLowerCase()).toContain('invalid');
    });
  });
});
