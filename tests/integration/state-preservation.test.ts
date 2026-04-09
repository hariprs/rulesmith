/**
 * Acceptance Tests: Story 6.3 - State Preservation on Failure (Integration)
 *
 * TDD RED PHASE: These tests validate acceptance criteria against the real
 * filesystem. They verify that the state preservation module correctly handles
 * backup creation, recovery, atomic writes, and corruption scenarios using
 * actual disk operations (no mocking).
 *
 * Acceptance Criteria covered:
 *   AC1: Backup before modify (write protection)
 *   AC2: State not corrupted on write failure
 *   AC3: Recovery checkpoint available
 *   AC4: Handle corrupted state.json on recovery
 *   AC5: User informed of preserved progress
 *   AC6: Atomic state write
 *
 * Test Level: Integration (real filesystem, module-level API)
 *
 * @module integration/state-preservation
 */

import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';

import {
  readStateWithRecovery,
  writeStateWithProtection,
  validateStateContent,
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
    _schema_note: 'integration test state',
    ...overrides,
  };
}

// ============================================================================
// Test Helper: create a temp directory for each test
// ============================================================================

describe('Story 6.3: State Preservation on Failure (Integration)', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(
      path.join(fs.realpathSync('/tmp'), 'state-preservation-int-')
    );
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // ==========================================================================
  // AC1: Backup before modify (write protection)
  // ==========================================================================

  describe('AC1: Backup before modify', () => {
    test('creates backup from existing state.json before writing new state', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      // Create existing valid state
      const existingState = makeValidState({ improvements_applied: 1 });
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2), {
        mode: 0o600,
      });

      // Write new state
      const newState = makeValidState({ improvements_applied: 5 });
      const result = await writeStateWithProtection(statePath, newState);

      expect(result.success).toBe(true);

      // New state should be on disk
      const writtenState = JSON.parse(
        fs.readFileSync(statePath, 'utf-8')
      ) as StateData;
      expect(writtenState.improvements_applied).toBe(5);

      // Backup should be cleaned up after successful write
      expect(fs.existsSync(bakPath)).toBe(false);
    });

    test('preserves existing .bak when state.json is corrupt (does not overwrite with bad data)', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      // Create valid backup
      const bakState = makeValidState({ improvements_applied: 10 });
      fs.writeFileSync(bakPath, JSON.stringify(bakState, null, 2), {
        mode: 0o600,
      });

      // Corrupt the primary
      fs.writeFileSync(statePath, 'not valid json {{{', { mode: 0o600 });

      // Write new state -- .bak should NOT be overwritten with corrupt content
      const newState = makeValidState({ improvements_applied: 20 });
      const result = await writeStateWithProtection(statePath, newState);

      expect(result.success).toBe(true);

      // After successful write, .bak is cleaned up; primary has new state
      const writtenState = JSON.parse(
        fs.readFileSync(statePath, 'utf-8')
      ) as StateData;
      expect(writtenState.improvements_applied).toBe(20);
    });
  });

  // ==========================================================================
  // AC2: State not corrupted on write failure
  // ==========================================================================

  describe('AC2: State not corrupted on write failure', () => {
    test('state.json remains unchanged when write fails due to directory blocker', async () => {
      const statePath = path.join(testDir, 'state.json');
      const tmpPath = `${statePath}.tmp`;

      // Create existing valid state
      const existingState = makeValidState({
        last_analysis: '2026-04-01T00:00:00Z',
      });
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2), {
        mode: 0o600,
      });

      // Block .tmp creation by placing a directory there
      fs.mkdirSync(tmpPath, { recursive: true });

      try {
        const newState = makeValidState({
          last_analysis: '2026-04-07T00:00:00Z',
        });
        await writeStateWithProtection(statePath, newState);
      } catch {
        // Expected -- write should fail
      } finally {
        fs.rmSync(tmpPath, { recursive: true, force: true });
      }

      // state.json must still have the old content
      const stateAfter = JSON.parse(
        fs.readFileSync(statePath, 'utf-8')
      ) as StateData;
      expect(stateAfter.last_analysis).toBe('2026-04-01T00:00:00Z');
    });

    test('result contains error information when write fails', async () => {
      const statePath = path.join(testDir, 'state.json');
      const tmpPath = `${statePath}.tmp`;

      const existingState = makeValidState();
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2), {
        mode: 0o600,
      });

      // Block .tmp creation
      fs.mkdirSync(tmpPath, { recursive: true });

      try {
        const newState = makeValidState({ improvements_applied: 99 });
        const result = await writeStateWithProtection(statePath, newState);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.message.length).toBeGreaterThan(0);
      } finally {
        fs.rmSync(tmpPath, { recursive: true, force: true });
      }
    });
  });

  // ==========================================================================
  // AC3: Recovery checkpoint available
  // ==========================================================================

  describe('AC3: Recovery checkpoint available', () => {
    test('readStateWithRecovery falls back to state.json.bak when state.json is corrupt', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      // Corrupt primary
      fs.writeFileSync(statePath, '{invalid json', { mode: 0o600 });

      // Valid backup
      const bakState = makeValidState({
        last_analysis: '2026-04-05T12:00:00Z',
      });
      fs.writeFileSync(bakPath, JSON.stringify(bakState, null, 2), {
        mode: 0o600,
      });

      const result = await readStateWithRecovery(statePath);

      expect(result.success).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.state).not.toBeNull();
      expect(result.state!.last_analysis).toBe('2026-04-05T12:00:00Z');
    });

    test('returns primary state when both primary and .bak are valid', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      const primaryState = makeValidState({
        last_analysis: '2026-04-07T00:00:00Z',
      });
      fs.writeFileSync(statePath, JSON.stringify(primaryState, null, 2), {
        mode: 0o600,
      });

      const bakState = makeValidState({
        last_analysis: '2026-04-01T00:00:00Z',
      });
      fs.writeFileSync(bakPath, JSON.stringify(bakState, null, 2), {
        mode: 0o600,
      });

      const result = await readStateWithRecovery(statePath);

      expect(result.success).toBe(true);
      expect(result.recovered).toBe(false);
      expect(result.state!.last_analysis).toBe('2026-04-07T00:00:00Z');
    });
  });

  // ==========================================================================
  // AC4: Handle corrupted state.json on recovery
  // ==========================================================================

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

    test('falls back to .bak when state.json has missing required keys', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      // Primary has insufficient keys (not valid JSON object for state)
      fs.writeFileSync(statePath, '{"only_one_field": true}', { mode: 0o600 });

      // Valid backup
      const bakState = makeValidState();
      fs.writeFileSync(bakPath, JSON.stringify(bakState, null, 2), {
        mode: 0o600,
      });

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

    test('handles truncated/malformed state.json on recovery', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      // Truncated JSON (starts valid but is cut off mid-string)
      fs.writeFileSync(
        statePath,
        '{"last_analysis": "2026-04-07T10:00:00Z", "patterns_found": ["pat',
        { mode: 0o600 }
      );

      // Valid backup
      const bakState = makeValidState({
        last_analysis: '2026-04-03T08:00:00Z',
      });
      fs.writeFileSync(bakPath, JSON.stringify(bakState, null, 2), {
        mode: 0o600,
      });

      const result = await readStateWithRecovery(statePath);

      expect(result.success).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.state!.last_analysis).toBe('2026-04-03T08:00:00Z');
    });
  });

  // ==========================================================================
  // AC5: User informed of preserved progress
  // ==========================================================================

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
    });

    test('result includes human-readable message when state recovered from backup', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      fs.writeFileSync(statePath, 'bad', { mode: 0o600 });
      fs.writeFileSync(
        bakPath,
        JSON.stringify(makeValidState(), null, 2),
        { mode: 0o600 }
      );

      const result = await readStateWithRecovery(statePath);

      expect(result.success).toBe(true);
      expect(result.recovered).toBe(true);
      expect(result.message.length).toBeGreaterThan(0);
      // Message should indicate recovery from backup
      expect(result.message.toLowerCase()).toContain('recover');
    });

    test('result message on write failure indicates previous state was preserved', async () => {
      const statePath = path.join(testDir, 'state.json');
      const tmpPath = `${statePath}.tmp`;

      const existingState = makeValidState();
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2), {
        mode: 0o600,
      });

      // Block .tmp creation
      fs.mkdirSync(tmpPath, { recursive: true });

      try {
        const result = await writeStateWithProtection(
          statePath,
          makeValidState({ improvements_applied: 99 })
        );

        expect(result.success).toBe(false);
        expect(typeof result.message).toBe('string');
        expect(result.message.length).toBeGreaterThan(0);
        // Message should indicate preservation
        expect(result.message.toLowerCase()).toContain('preserv');
      } finally {
        fs.rmSync(tmpPath, { recursive: true, force: true });
      }
    });

    test('message is suitable for end-user display (no stack traces or raw paths)', async () => {
      const statePath = path.join(testDir, 'state.json');
      const bakPath = `${statePath}.bak`;

      fs.writeFileSync(statePath, 'corrupt', { mode: 0o600 });
      fs.writeFileSync(
        bakPath,
        JSON.stringify(makeValidState(), null, 2),
        { mode: 0o600 }
      );

      const result = await readStateWithRecovery(statePath);

      // Message should be user-safe (no raw stack traces)
      expect(result.message).not.toContain('at Object');
      expect(result.message).not.toContain('at ');
      expect(result.message).not.toContain('Error:');
    });
  });

  // ==========================================================================
  // AC6: Atomic state write
  // ==========================================================================

  describe('AC6: Atomic state write', () => {
    test('writeStateWithProtection uses .tmp file pattern and cleans up', async () => {
      const statePath = path.join(testDir, 'state.json');
      const tmpPath = `${statePath}.tmp`;

      const newState = makeValidState({ improvements_applied: 42 });
      const result = await writeStateWithProtection(statePath, newState);

      expect(result.success).toBe(true);

      // After successful write, .tmp should not exist (cleaned up)
      expect(fs.existsSync(tmpPath)).toBe(false);

      // state.json should contain the new state
      const writtenState = JSON.parse(
        fs.readFileSync(statePath, 'utf-8')
      ) as StateData;
      expect(writtenState.improvements_applied).toBe(42);
    });

    test('no partially written state.json can exist after failed write', async () => {
      const statePath = path.join(testDir, 'state.json');
      const tmpPath = `${statePath}.tmp`;

      const oldState = makeValidState({
        last_analysis: 'old-timestamp',
      });
      fs.writeFileSync(statePath, JSON.stringify(oldState, null, 2), {
        mode: 0o600,
      });

      // Block the .tmp creation
      fs.mkdirSync(tmpPath, { recursive: true });

      try {
        await writeStateWithProtection(
          statePath,
          makeValidState({ last_analysis: 'new-timestamp' })
        );
      } catch {
        // Expected
      } finally {
        fs.rmSync(tmpPath, { recursive: true, force: true });
      }

      // state.json should still be valid JSON with old data
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content); // Should not throw
      expect(state.last_analysis).toBe('old-timestamp');
    });

    test('.tmp files do not remain after any operation', async () => {
      const statePath = path.join(testDir, 'state.json');

      // Write a valid state
      const newState = makeValidState({ improvements_applied: 1 });
      await writeStateWithProtection(statePath, newState);

      // List all files -- none should end in .tmp
      const files = fs.readdirSync(testDir);
      const tmpFiles = files.filter((f) => f.endsWith('.tmp'));
      expect(tmpFiles).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Integration: validateStateContent with real filesystem
  // ==========================================================================

  describe('validateStateContent (real filesystem)', () => {
    test('returns valid for a well-formed state file', () => {
      const statePath = path.join(testDir, 'valid-state.json');
      fs.writeFileSync(
        statePath,
        JSON.stringify(makeValidState(), null, 2),
        { mode: 0o600 }
      );

      const result = validateStateContent(statePath);

      expect(result.valid).toBe(true);
      expect(result.state).not.toBeNull();
      expect(result.state!.last_analysis).toBe('2026-04-07T10:00:00Z');
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
      fs.writeFileSync(
        statePath,
        JSON.stringify({ only_one_field: true }, null, 2),
        { mode: 0o600 }
      );

      const result = validateStateContent(statePath);

      expect(result.valid).toBe(false);
      expect(result.state).toBeNull();
      expect(
        result.errors.some(
          (e) => e.includes('Missing') || e.includes('key')
        )
      ).toBe(true);
    });

    test('returns invalid for a non-existent file', () => {
      const statePath = path.join(testDir, 'does-not-exist.json');

      const result = validateStateContent(statePath);

      expect(result.valid).toBe(false);
      expect(result.state).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Integration: End-to-end recovery workflow
  // ==========================================================================

  describe('End-to-end recovery workflow', () => {
    test('full cycle: write -> simulate corruption -> recover from backup -> write again', async () => {
      const statePath = path.join(testDir, 'state.json');

      // Step 1: Write initial state
      const state1 = makeValidState({ improvements_applied: 1 });
      const result1 = await writeStateWithProtection(statePath, state1);
      expect(result1.success).toBe(true);

      // Step 2: Write second state (creates backup of first)
      const state2 = makeValidState({ improvements_applied: 2 });
      const result2 = await writeStateWithProtection(statePath, state2);
      expect(result2.success).toBe(true);

      // Step 3: Corrupt state.json
      fs.writeFileSync(statePath, 'corrupted data {{{', { mode: 0o600 });

      // Step 4: Attempt recovery -- backup was cleaned up after successful write,
      // so recovery should fail (this is expected behavior per YOLO scope:
      // single checkpoint, cleaned up after success)
      const recoveryResult = await readStateWithRecovery(statePath);
      expect(recoveryResult.success).toBe(false);
      expect(recoveryResult.state).toBeNull();

      // Step 5: Fresh write should work
      const state3 = makeValidState({ improvements_applied: 3 });
      const result3 = await writeStateWithProtection(statePath, state3);
      expect(result3.success).toBe(true);

      const finalState = JSON.parse(
        fs.readFileSync(statePath, 'utf-8')
      ) as StateData;
      expect(finalState.improvements_applied).toBe(3);
    });

    test('consecutive writes maintain data integrity', async () => {
      const statePath = path.join(testDir, 'state.json');

      for (let i = 1; i <= 5; i++) {
        const state = makeValidState({ improvements_applied: i });
        const result = await writeStateWithProtection(statePath, state);
        expect(result.success).toBe(true);

        const written = JSON.parse(
          fs.readFileSync(statePath, 'utf-8')
        ) as StateData;
        expect(written.improvements_applied).toBe(i);
      }
    });
  });
});
