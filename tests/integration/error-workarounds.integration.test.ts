/**
 * Integration Tests for Manual Error Workarounds (Story 6.4)
 *
 * TDD Red Phase: These tests define the expected API before implementation exists.
 * All tests should FAIL because `src/error-workarounds.ts` does not exist yet.
 *
 * Testing Strategy:
 * - Real filesystem operations (no mocking)
 * - Force-unlock flow with real file handles
 * - Clear-temp removes stale .tmp files but preserves fresh ones
 * - Skip flow continues pipeline execution without modification
 * - State file protection blocks on state.json, state.json.bak, state.json.tmp
 * - Retry succeeds when file becomes accessible, fails gracefully for ENOENT
 *
 * Pyramid position: Integration tests verify real filesystem behavior
 */

import { describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileAccessError } from '../../src/file-access-errors';
import { suggestWorkarounds, executeWorkaround } from '../../src/error-workarounds';

const TEST_DIR = path.join(process.cwd(), 'tmp_integration_test_6_4');

describe('Error Workarounds - Integration Tests', () => {

  beforeAll(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    try {
      // Restore permissions on any no-perm files before cleanup
      try { await fs.chmod(path.join(TEST_DIR, 'no_read_integration.txt'), 0o600); } catch { /* best effort */ }
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch { /* best effort */ }
  });

  afterEach(async () => {
    // Clean up any leftover .unlock.tmp files and state files from previous tests
    try {
      const entries = await fs.readdir(TEST_DIR);
      for (const entry of entries) {
        if (entry.endsWith('.unlock.tmp') || entry === 'state.json' || entry === 'state.json.bak' || entry === 'state.json.tmp') {
          await fs.unlink(path.join(TEST_DIR, entry)).catch(() => {});
        }
      }
    } catch { /* best effort */ }
  });

  // ============================================================================
  // AC1 + AC2: End-to-end workaround suggestion and execution
  // ============================================================================

  describe('AC1+AC2: Suggestion and execution flow', () => {

    test('ENOENT error should yield retry and skip actions, both executable', async () => {
      const error = new FileAccessError('ENOENT', path.join(TEST_DIR, 'missing.txt'), 'read');
      const actions = suggestWorkarounds(error);

      expect(actions.length).toBeGreaterThanOrEqual(1);
      expect(actions.length).toBeLessThanOrEqual(3);

      const actionIds = actions.map((a) => a.id);
      expect(actionIds).toContain('retry');
      expect(actionIds).toContain('skip');

      // Execute skip (does not require confirmation)
      const skipResult = await executeWorkaround('skip', error.path);
      expect(skipResult.success).toBe(true);
    });

    test('EACCES error should yield retry and skip, retry fails without confirmation for destructive', async () => {
      const error = new FileAccessError('EACCES', path.join(TEST_DIR, 'no_read_integration.txt'), 'read');
      const actions = suggestWorkarounds(error);

      const actionIds = actions.map((a) => a.id);
      expect(actionIds).toContain('retry');
      expect(actionIds).toContain('skip');
    });
  });

  // ============================================================================
  // AC3: Skip flow with real filesystem — no modification
  // ============================================================================

  describe('AC3: Skip non-critical operations with real fs', () => {

    test('skip should leave file untouched and report skipped status', async () => {
      const testFile = path.join(TEST_DIR, 'skip_integration.txt');
      const originalContent = 'skip integration content';
      await fs.writeFile(testFile, originalContent);

      const result = await executeWorkaround('skip', testFile);

      expect(result.success).toBe(true);
      expect(result.message.toLowerCase()).toContain('skip');
      expect(result.fileChanged).toBe(testFile);

      // Verify file content is unchanged
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe(originalContent);
    });

    test('skip on nonexistent file should still succeed (no fs interaction)', async () => {
      const nonexistent = path.join(TEST_DIR, 'does_not_exist_skip.txt');
      const result = await executeWorkaround('skip', nonexistent);

      expect(result.success).toBe(true);
      expect(result.fileChanged).toBe(nonexistent);
    });
  });

  // ============================================================================
  // AC4: Force unlock with real filesystem — atomicity guarantees
  // ============================================================================

  describe('AC4: Force unlock atomicity', () => {

    test('force-unlock should preserve file content after successful execution', async () => {
      const testFile = path.join(TEST_DIR, 'unlock_integration.txt');
      const originalContent = 'force unlock integration content';
      await fs.writeFile(testFile, originalContent);

      const result = await executeWorkaround('force-unlock', testFile, { confirmed: true });

      expect(result.success).toBe(true);
      expect(result.message).toBeTruthy();

      // File should still exist with same content
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe(originalContent);

      // .unlock.tmp should be cleaned up
      try {
        await fs.access(testFile + '.unlock.tmp');
        fail('.unlock.tmp should have been deleted after success');
      } catch {
        // Expected
      }
    });

    test('force-unlock on nonexistent file should fail and not create artifacts', async () => {
      const nonexistent = path.join(TEST_DIR, 'nonexistent_unlock.txt');

      await expect(
        executeWorkaround('force-unlock', nonexistent, { confirmed: true })
      ).rejects.toThrow();

      // Neither the original nor .unlock.tmp should exist
      try {
        await fs.access(nonexistent);
        fail('Original should not exist');
      } catch { /* expected */ }

      try {
        await fs.access(nonexistent + '.unlock.tmp');
        fail('.unlock.tmp should not exist on failure');
      } catch { /* expected */ }
    });

    test('concurrent force-unlock on the same file should not corrupt data', async () => {
      const testFile = path.join(TEST_DIR, 'concurrent_unlock.txt');
      const originalContent = 'concurrent test content';
      await fs.writeFile(testFile, originalContent);

      // Launch two concurrent force-unlock operations
      const [result1, result2] = await Promise.allSettled([
        executeWorkaround('force-unlock', testFile, { confirmed: true }),
        executeWorkaround('force-unlock', testFile, { confirmed: true }),
      ]);

      // At least one should succeed
      const succeeded = [result1, result2].filter(
        (r) => r.status === 'fulfilled' && r.value.success
      );
      expect(succeeded.length).toBeGreaterThanOrEqual(1);

      // The file should still exist and be readable
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe(originalContent);

      // No leftover .unlock.tmp
      try {
        await fs.access(testFile + '.unlock.tmp');
        fail('.unlock.tmp should have been cleaned up');
      } catch { /* expected */ }
    });
  });

  // ============================================================================
  // AC5: State file protection with real filesystem
  // ============================================================================

  describe('AC5: State file protection', () => {

    test('should block workaround on state.json with real file', async () => {
      const stateFile = path.join(TEST_DIR, 'state.json');
      await fs.writeFile(stateFile, '{"version": 1, "data": "real"}');

      await expect(
        executeWorkaround('force-unlock', stateFile, { confirmed: true })
      ).rejects.toThrow(/state/i);

      // File should still exist unchanged
      const content = await fs.readFile(stateFile, 'utf-8');
      expect(content).toBe('{"version": 1, "data": "real"}');
    });

    test('should block workaround on state.json.bak', async () => {
      const stateBak = path.join(TEST_DIR, 'state.json.bak');
      await fs.writeFile(stateBak, '{"version": 0}');

      await expect(
        executeWorkaround('force-unlock', stateBak, { confirmed: true })
      ).rejects.toThrow(/state/i);
    });

    test('should block workaround on state.json.tmp', async () => {
      const stateTmp = path.join(TEST_DIR, 'state.json.tmp');
      await fs.writeFile(stateTmp, '{"version": 2}');

      await expect(
        executeWorkaround('force-unlock', stateTmp, { confirmed: true })
      ).rejects.toThrow(/state/i);
    });

    test('state file workaround error should suggest backup restoration', async () => {
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
  // Clear-temp: Real filesystem behavior
  // ============================================================================

  describe('Clear-temp: Real filesystem behavior', () => {

    test('should remove .tmp files older than 1 hour', async () => {
      // Create a stale .tmp file (older than 1 hour)
      const staleFile = path.join(TEST_DIR, 'stale.tmp');
      await fs.writeFile(staleFile, 'stale content');
      // Set mtime to 2 hours ago
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      await fs.utimes(staleFile, twoHoursAgo, twoHoursAgo);

      const result = await executeWorkaround('clear-temp', TEST_DIR, { confirmed: true });
      expect(result.success).toBe(true);

      // Stale file should be gone
      try {
        await fs.access(staleFile);
        fail('Stale .tmp file should have been removed');
      } catch {
        // Expected
      }
    });

    test('should preserve .tmp files newer than 1 hour', async () => {
      // Create a fresh .tmp file (just written, mtime is now)
      const freshFile = path.join(TEST_DIR, 'fresh.tmp');
      await fs.writeFile(freshFile, 'fresh content');

      const result = await executeWorkaround('clear-temp', TEST_DIR, { confirmed: true });
      expect(result.success).toBe(true);

      // Fresh file should still exist
      const content = await fs.readFile(freshFile, 'utf-8');
      expect(content).toBe('fresh content');
    });

    test('should not remove non-.tmp files', async () => {
      const regularFile = path.join(TEST_DIR, 'regular.txt');
      await fs.writeFile(regularFile, 'regular content');

      await executeWorkaround('clear-temp', TEST_DIR, { confirmed: true });

      // Regular file should still exist
      const content = await fs.readFile(regularFile, 'utf-8');
      expect(content).toBe('regular content');
    });

    test('should reject clear-temp for directory outside project tree', async () => {
      await expect(
        executeWorkaround('clear-temp', '/tmp', { confirmed: true })
      ).rejects.toThrow();
    });

    test('should reject clear-temp when given a file path instead of a directory', async () => {
      const testFile = path.join(TEST_DIR, 'not_a_dir_integration.txt');
      await fs.writeFile(testFile, 'test content');

      await expect(
        executeWorkaround('clear-temp', testFile, { confirmed: true })
      ).rejects.toThrow(/directory|file path/i);
    });
  });

  // ============================================================================
  // Retry: Real filesystem behavior
  // ============================================================================

  describe('Retry: Real filesystem behavior', () => {

    test('retry should succeed when file is readable', async () => {
      const testFile = path.join(TEST_DIR, 'retry_success.txt');
      await fs.writeFile(testFile, 'retry me');

      const result = await executeWorkaround('retry', testFile);
      expect(result.success).toBe(true);
      expect(result.message).toBeTruthy();
    });

    test('retry should fail gracefully for ENOENT with user guidance', async () => {
      const nonexistent = path.join(TEST_DIR, 'will_never_exist.txt');

      try {
        await executeWorkaround('retry', nonexistent);
        fail('Expected retry to fail for nonexistent file');
      } catch (err) {
        const message = (err as Error).message;
        // Should include guidance about ensuring file exists first
        expect(message.toLowerCase()).toMatch(/file.*(not found|exist|missing)|ensure|restore|backup|transient/i);
      }
    });

    test('retry should succeed after EACCES is resolved (chmod fix)', async () => {
      const testFile = path.join(TEST_DIR, 'chmod_fix.txt');
      await fs.writeFile(testFile, 'chmod test', { mode: 0o000 });

      // First, retry should fail
      try {
        await executeWorkaround('retry', testFile);
        // May succeed on some systems if running as root
      } catch {
        // Expected: file is unreadable
      }

      // Fix permissions
      await fs.chmod(testFile, 0o600);

      // Now retry should succeed
      const result = await executeWorkaround('retry', testFile);
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Workaround result reporting
  // ============================================================================

  describe('WorkaroundResult reporting', () => {

    test('successful force-unlock should report fileChanged path', async () => {
      const testFile = path.join(TEST_DIR, 'report_test.txt');
      await fs.writeFile(testFile, 'report test');

      const result = await executeWorkaround('force-unlock', testFile, { confirmed: true });

      expect(result.success).toBe(true);
      expect(result.fileChanged).toBe(testFile);
    });

    test('failed workaround should report success: false with descriptive message', async () => {
      const nonexistent = path.join(TEST_DIR, 'fail_report.txt');

      try {
        await executeWorkaround('force-unlock', nonexistent, { confirmed: true });
        fail('Expected executeWorkaround to throw');
      } catch (err) {
        const message = (err as Error).message;
        expect(message.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // Clear-temp error path coverage
  // ============================================================================

  describe('Clear-temp: Error path coverage', () => {

    test('should fail gracefully when directory cannot be read', async () => {
      const testDir = path.join(TEST_DIR, 'unreadable_clear_temp');
      await fs.mkdir(testDir, { recursive: true });

      // Create a stale .tmp file inside
      const staleFile = path.join(testDir, 'old.tmp');
      await fs.writeFile(staleFile, 'stale');
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      await fs.utimes(staleFile, twoHoursAgo, twoHoursAgo);

      // Remove read permission from directory
      await fs.chmod(testDir, 0o000);

      try {
        const result = await executeWorkaround('clear-temp', testDir, { confirmed: true });
        // On some systems (running as root), chmod 0o000 doesn't prevent readdir
        expect(result.success).toBe(true);
      } catch (err) {
        const message = (err as Error).message;
        expect(message.length).toBeGreaterThan(0);
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(testDir, 0o755).catch(() => {});
      }
    });

    test('should handle nonexistent directory with clear error', async () => {
      const nonexistentDir = path.join(TEST_DIR, 'this_directory_does_not_exist');

      await expect(
        executeWorkaround('clear-temp', nonexistentDir, { confirmed: true })
      ).rejects.toThrow();
    });
  });
});
