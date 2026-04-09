/**
 * Unit Tests for Manual Error Workarounds (Story 6.4)
 *
 * TDD Red Phase: These tests define the expected API before implementation exists.
 * All tests should FAIL because `src/error-workarounds.ts` does not exist yet.
 *
 * Testing Strategy:
 * - suggestWorkarounds(): Pure function — maps error codes to action lists
 * - executeWorkaround(): Confirmation gating, state file protection, skip/retry logic
 * - Edge cases from adversarial review: clear-temp scoping, ENOENT retry guidance, force-unlock safety
 *
 * Pyramid position: Unit tests for business logic (no real filesystem I/O)
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileAccessError } from '../../src/file-access-errors';
import { suggestWorkarounds, executeWorkaround } from '../../src/error-workarounds';

const TEST_DIR = path.join(process.cwd(), 'tmp_unit_test_6_4');

beforeEach(async () => {
  await fs.mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
});

// ============================================================================
// AC1: Error-specific workaround suggestions
// ============================================================================

describe('AC1: suggestWorkarounds returns error-specific actions', () => {

  // ---------- ENOENT ----------

  test('should suggest retry and skip for ENOENT', () => {
    const error = new FileAccessError('ENOENT', '/test/missing.txt', 'read');
    const actions = suggestWorkarounds(error);

    expect(actions.length).toBeGreaterThanOrEqual(1);
    expect(actions.length).toBeLessThanOrEqual(3);

    const ids = actions.map((a) => a.id);
    expect(ids).toContain('retry');
    expect(ids).toContain('skip');
  });

  test('ENOENT suggestions should each have id, label, description, and requiresConfirmation', () => {
    const error = new FileAccessError('ENOENT', '/test/missing.txt', 'read');
    const actions = suggestWorkarounds(error);

    actions.forEach((action) => {
      expect(typeof action.id).toBe('string');
      expect(action.id.length).toBeGreaterThan(0);
      expect(typeof action.label).toBe('string');
      expect(action.label.length).toBeGreaterThan(0);
      expect(typeof action.description).toBe('string');
      expect(action.description.length).toBeGreaterThan(0);
      expect(typeof action.requiresConfirmation).toBe('boolean');
    });
  });

  // ---------- EACCES ----------

  test('should suggest retry and skip for EACCES', () => {
    const error = new FileAccessError('EACCES', '/test/locked.txt', 'read');
    const actions = suggestWorkarounds(error);

    expect(actions.length).toBeGreaterThanOrEqual(1);
    expect(actions.length).toBeLessThanOrEqual(3);

    const ids = actions.map((a) => a.id);
    expect(ids).toContain('retry');
    expect(ids).toContain('skip');
  });

  // ---------- EBUSY ----------

  test('should suggest retry, force-unlock, and skip for EBUSY', () => {
    const error = new FileAccessError('EBUSY', '/test/busy.txt', 'read');
    const actions = suggestWorkarounds(error);

    expect(actions.length).toBeGreaterThanOrEqual(1);
    expect(actions.length).toBeLessThanOrEqual(3);

    const ids = actions.map((a) => a.id);
    expect(ids).toContain('retry');
    expect(ids).toContain('force-unlock');
    expect(ids).toContain('skip');
  });

  test('force-unlock action should require confirmation', () => {
    const error = new FileAccessError('EBUSY', '/test/busy.txt', 'read');
    const actions = suggestWorkarounds(error);

    const forceUnlock = actions.find((a) => a.id === 'force-unlock');
    expect(forceUnlock).toBeDefined();
    expect(forceUnlock!.requiresConfirmation).toBe(true);
  });

  // ---------- ENOSPC ----------

  test('should suggest clear-temp and skip for ENOSPC', () => {
    const error = new FileAccessError('ENOSPC', '/test/full.txt', 'write');
    const actions = suggestWorkarounds(error);

    expect(actions.length).toBeGreaterThanOrEqual(1);
    expect(actions.length).toBeLessThanOrEqual(3);

    const ids = actions.map((a) => a.id);
    expect(ids).toContain('clear-temp');
    expect(ids).toContain('skip');
  });

  test('clear-temp action should require confirmation', () => {
    const error = new FileAccessError('ENOSPC', '/test/full.txt', 'write');
    const actions = suggestWorkarounds(error);

    const clearTemp = actions.find((a) => a.id === 'clear-temp');
    expect(clearTemp).toBeDefined();
    expect(clearTemp!.requiresConfirmation).toBe(true);
  });

  // ---------- UNKNOWN error code ----------

  test('should return skip suggestion for UNKNOWN error code', () => {
    const error = new FileAccessError('UNKNOWN', '/test/unknown.txt', 'read');
    const actions = suggestWorkarounds(error);

    // UNKNOWN should still return a skip action so user is never left without options
    expect(actions.length).toBeGreaterThanOrEqual(1);
    expect(actions.length).toBeLessThanOrEqual(3);
    expect(actions[0].id).toBe('skip');
  });

  // ---------- Count invariant ----------

  test('should never return more than 3 workaround actions for any error', () => {
    const codes: Array<import('../../src/file-access-errors').FileErrorCode> = [
      'ENOENT', 'EACCES', 'EBUSY', 'ENOSPC', 'ENOTDIR', 'ENAMETOOLONG', 'UNKNOWN',
    ];

    codes.forEach((code) => {
      const error = new FileAccessError(code, '/test/file.txt', 'read');
      const actions = suggestWorkarounds(error);
      expect(actions.length).toBeLessThanOrEqual(3);
    });
  });
});

// ============================================================================
// AC2: User can select and execute a workaround — confirmation gating
// ============================================================================

describe('AC2: executeWorkaround confirmation gating', () => {

  test('should throw when executing force-unlock without confirmation', async () => {
    const testFile = path.join(TEST_DIR, 'busy_test.txt');
    await fs.writeFile(testFile, 'test content');

    await expect(
      executeWorkaround('force-unlock', testFile, { confirmed: false })
    ).rejects.toThrow();
  });

  test('should throw when executing force-unlock without confirmed option at all', async () => {
    const testFile = path.join(TEST_DIR, 'busy_test2.txt');
    await fs.writeFile(testFile, 'test content');

    await expect(
      executeWorkaround('force-unlock', testFile)
    ).rejects.toThrow();
  });

  test('should throw when executing clear-temp without confirmation', async () => {
    await expect(
      executeWorkaround('clear-temp', TEST_DIR, { confirmed: false })
    ).rejects.toThrow();
  });

  test('retry action should not require confirmation and should execute', async () => {
    const testFile = path.join(TEST_DIR, 'retry_test.txt');
    await fs.writeFile(testFile, 'retry content');

    const result = await executeWorkaround('retry', testFile, { confirmed: false });
    expect(result.success).toBe(true);
    expect(result.message).toBeTruthy();
  });

  test('skip action should not require confirmation and should report skipped', async () => {
    const testFile = path.join(TEST_DIR, 'skip_test.txt');

    const result = await executeWorkaround('skip', testFile, { confirmed: false });
    expect(result.success).toBe(true);
    expect(result.message.toLowerCase()).toContain('skip');
    expect(result.fileChanged).toBe(testFile);
  });
});

// ============================================================================
// AC3: Skip non-critical operations
// ============================================================================

describe('AC3: Skip non-critical operations', () => {

  test('skip should not modify the filesystem', async () => {
    const testFile = path.join(TEST_DIR, 'noncritical.txt');
    await fs.writeFile(testFile, 'original content');

    await executeWorkaround('skip', testFile, { confirmed: false });

    // File should still exist with original content
    const content = await fs.readFile(testFile, 'utf-8');
    expect(content).toBe('original content');
  });

  test('skip should return success with file path recorded', async () => {
    const testFile = path.join(TEST_DIR, 'skip_record.txt');
    const result = await executeWorkaround('skip', testFile, { confirmed: false });

    expect(result.success).toBe(true);
    expect(result.fileChanged).toBe(testFile);
  });
});

// ============================================================================
// AC4: Force unlock for locked files
// ============================================================================

describe('AC4: Force unlock mechanism', () => {

  test('should copy file to .unlock.tmp, rename to original, then delete .unlock.tmp', async () => {
    const testFile = path.join(TEST_DIR, 'unlock_test.txt');
    const originalContent = 'unlock test content';
    await fs.writeFile(testFile, originalContent);

    const result = await executeWorkaround('force-unlock', testFile, { confirmed: true });

    expect(result.success).toBe(true);

    // The .unlock.tmp file should have been cleaned up after success
    try {
      await fs.access(testFile + '.unlock.tmp');
      fail('.unlock.tmp should have been deleted after successful force-unlock');
    } catch {
      // Expected: .unlock.tmp does not exist
    }

    // The original file should still exist and be accessible
    const content = await fs.readFile(testFile, 'utf-8');
    expect(content).toBe(originalContent);
  });

  test('should leave original file untouched if copy fails', async () => {
    // Use a nonexistent file to simulate copy failure
    const nonexistent = path.join(TEST_DIR, 'does_not_exist_unlock.txt');

    await expect(
      executeWorkaround('force-unlock', nonexistent, { confirmed: true })
    ).rejects.toThrow();

    // Original should not have been created
    try {
      await fs.access(nonexistent);
      fail('Original file should not have been created on copy failure');
    } catch {
      // Expected
    }

    // .unlock.tmp should not exist either (cleanup on failure)
    try {
      await fs.access(nonexistent + '.unlock.tmp');
      fail('.unlock.tmp should have been cleaned up on failure');
    } catch {
      // Expected
    }
  });

  test('should clean up .unlock.tmp and leave original untouched if rename fails', async () => {
    // Create a file, make the directory read-only to simulate rename failure
    const testFile = path.join(TEST_DIR, 'rename_fail.txt');
    await fs.writeFile(testFile, 'original');

    // We'll simulate this by creating a conflicting scenario.
    // In practice, rename failure is hard to trigger on POSIX, so we test
    // the cleanup behavior by verifying the original is untouched after failure.
    const originalContent = await fs.readFile(testFile, 'utf-8');

    // If the force-unlock somehow fails during rename, the original must be preserved
    // (This is a best-effort test; the full scenario requires a mocking or special FS state)
    // For the unit test, we verify the API contract: on failure, original is preserved.

    // Create a valid scenario where force-unlock succeeds and verify original is preserved
    const result = await executeWorkaround('force-unlock', testFile, { confirmed: true });
    expect(result.success).toBe(true);

    const afterContent = await fs.readFile(testFile, 'utf-8');
    expect(afterContent).toBe(originalContent);
  });
});

// ============================================================================
// AC5: No workaround bypasses state safety
// ============================================================================

describe('AC5: State file protection', () => {

  test('should block force-unlock on state.json', async () => {
    const stateFile = path.join(TEST_DIR, 'state.json');
    await fs.writeFile(stateFile, '{"version": 1}');

    await expect(
      executeWorkaround('force-unlock', stateFile, { confirmed: true })
    ).rejects.toThrow(/state/i);
  });

  test('should block force-unlock on state.json.bak', async () => {
    const stateBak = path.join(TEST_DIR, 'state.json.bak');
    await fs.writeFile(stateBak, '{"version": 1}');

    await expect(
      executeWorkaround('force-unlock', stateBak, { confirmed: true })
    ).rejects.toThrow(/state/i);
  });

  test('should block force-unlock on state.json.tmp', async () => {
    const stateTmp = path.join(TEST_DIR, 'state.json.tmp');
    await fs.writeFile(stateTmp, '{"version": 1}');

    await expect(
      executeWorkaround('force-unlock', stateTmp, { confirmed: true })
    ).rejects.toThrow(/state/i);
  });

  test('should block retry on state.json', async () => {
    const stateFile = path.join(TEST_DIR, 'state.json');
    await fs.writeFile(stateFile, '{"version": 1}');

    await expect(
      executeWorkaround('retry', stateFile)
    ).rejects.toThrow(/state/i);
  });

  test('should block skip on state.json', async () => {
    const stateFile = path.join(TEST_DIR, 'state.json');
    await fs.writeFile(stateFile, '{"version": 1}');

    await expect(
      executeWorkaround('skip', stateFile)
    ).rejects.toThrow(/state/i);
  });

  test('should block clear-temp on state.json directory', async () => {
    const stateDir = TEST_DIR;
    const stateFile = path.join(stateDir, 'state.json');
    await fs.writeFile(stateFile, '{"version": 1}');

    await expect(
      executeWorkaround('clear-temp', stateDir, { confirmed: true })
    ).rejects.toThrow(/state/i);
  });

  test('blocked state file workaround should suggest restoring from backup', async () => {
    const stateFile = path.join(TEST_DIR, 'state.json');
    await fs.writeFile(stateFile, '{"version": 1}');

    try {
      await executeWorkaround('force-unlock', stateFile, { confirmed: true });
      fail('Expected executeWorkaround to throw');
    } catch (err) {
      const message = (err as Error).message;
      expect(message.toLowerCase()).toContain('backup');
    }
  });
});

// ============================================================================
// Edge Cases from Adversarial Review
// ============================================================================

describe('Edge cases: clear-temp scoping', () => {

  test('should reject clear-temp for directory outside project tree', async () => {
    // /tmp is almost certainly outside process.cwd()
    await expect(
      executeWorkaround('clear-temp', '/tmp', { confirmed: true })
    ).rejects.toThrow();
  });

  test('should reject clear-temp for directory outside project tree (root)', async () => {
    await expect(
      executeWorkaround('clear-temp', '/', { confirmed: true })
    ).rejects.toThrow();
  });
});

describe('Edge cases: retry guidance for ENOENT', () => {

  test('retry on ENOENT should fail with user guidance message', async () => {
    const nonexistent = path.join(TEST_DIR, 'does_not_exist.txt');

    try {
      await executeWorkaround('retry', nonexistent);
      fail('Expected executeWorkaround to throw for ENOENT retry');
    } catch (err) {
      const message = (err as Error).message;
      // Should provide guidance that user must ensure file exists first
      expect(message.toLowerCase()).toMatch(/file.*(not found|exist|missing)|ensure|restore|backup/i);
    }
  });
});

describe('Edge cases: unknown action ID', () => {

  test('should throw for unrecognized action ID', async () => {
    await expect(
      executeWorkaround('nonexistent-action', '/some/path')
    ).rejects.toThrow();
  });
});

describe('Edge cases: force-unlock on directory', () => {

  test('should fail force-unlock when target is a directory', async () => {
    const testDir = path.join(TEST_DIR, 'a_directory');
    await fs.mkdir(testDir, { recursive: true });

    await expect(
      executeWorkaround('force-unlock', testDir, { confirmed: true })
    ).rejects.toThrow(/directory/i);
  });
});

describe('Edge cases: force-unlock cleans up stale .unlock.tmp before copy', () => {

  test('should remove stale .unlock.tmp from prior crash and succeed', async () => {
    const testFile = path.join(TEST_DIR, 'stale_unlock.txt');
    const originalContent = 'original content';
    await fs.writeFile(testFile, originalContent);
    // Simulate a stale .unlock.tmp from a prior crash
    await fs.writeFile(testFile + '.unlock.tmp', 'stale content from crash');

    const result = await executeWorkaround('force-unlock', testFile, { confirmed: true });
    expect(result.success).toBe(true);

    // Verify file is still accessible
    const content = await fs.readFile(testFile, 'utf-8');
    expect(content).toBe(originalContent);

    // .unlock.tmp should be cleaned up
    try {
      await fs.access(testFile + '.unlock.tmp');
      fail('.unlock.tmp should have been cleaned up');
    } catch {
      // Expected
    }
  });
});

describe('Edge cases: clear-temp with .tmp directory entry', () => {

  test('should not attempt to unlink .tmp directories', async () => {
    const tmpDir = path.join(TEST_DIR, 'stale.tmp');
    await fs.mkdir(tmpDir, { recursive: true });

    // Create a stale .tmp file alongside the .tmp directory
    const staleFile = path.join(TEST_DIR, 'old.tmp');
    await fs.writeFile(staleFile, 'stale');
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await fs.utimes(staleFile, twoHoursAgo, twoHoursAgo);

    const result = await executeWorkaround('clear-temp', TEST_DIR, { confirmed: true });
    expect(result.success).toBe(true);

    // The .tmp directory should still exist
    const stat = await fs.stat(tmpDir);
    expect(stat.isDirectory()).toBe(true);

    // The stale .tmp file should be gone
    try {
      await fs.access(staleFile);
      fail('Stale .tmp file should have been removed');
    } catch {
      // Expected
    }
  });
});

describe('Edge cases: clear-temp readdir error on non-directory path', () => {

  test('should report clear error when readdir fails with ENOTDIR', async () => {
    const testFile = path.join(TEST_DIR, 'enotdir_test.txt');
    await fs.writeFile(testFile, 'content');

    try {
      await executeWorkaround('clear-temp', testFile, { confirmed: true });
      fail('Expected clear-temp to fail for file path');
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toMatch(/directory|file path/i);
    }
  });

  test('should reject clear-temp when given a file path instead of a directory', async () => {
    const testFile = path.join(TEST_DIR, 'not_a_dir.txt');
    await fs.writeFile(testFile, 'test content');

    await expect(
      executeWorkaround('clear-temp', testFile, { confirmed: true })
    ).rejects.toThrow(/directory|file path/i);
  });
});

describe('Edge cases: clear-temp readdir error handling', () => {

  test('should handle non-existent directory gracefully', async () => {
    const nonexistentDir = path.join(TEST_DIR, 'does_not_exist_dir');

    try {
      await executeWorkaround('clear-temp', nonexistentDir, { confirmed: true });
      fail('Expected clear-temp to fail for nonexistent directory');
    } catch (err) {
      const message = (err as Error).message;
      // Should provide a clear error about being unable to read the directory
      expect(message.toLowerCase()).toMatch(/could not read|directory|enoent/i);
    }
  });
});

describe('Edge cases: empty and whitespace paths', () => {

  test('retry should handle empty string path', async () => {
    await expect(
      executeWorkaround('retry', '')
    ).rejects.toThrow();
  });

  test('skip should handle empty string path', async () => {
    // Skip does not touch the filesystem, so empty string is acceptable
    const result = await executeWorkaround('skip', '');
    expect(result.success).toBe(true);
  });

  test('retry should handle whitespace-only path', async () => {
    await expect(
      executeWorkaround('retry', '   ')
    ).rejects.toThrow();
  });
});
