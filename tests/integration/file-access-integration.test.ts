/**
 * Integration Tests for File Access Error Detection (Story 6.1)
 *
 * Testing Strategy:
 * - Real filesystem operations (no mocking) to verify end-to-end behavior
 * - Permission manipulation via chmod to simulate EACCES
 * - Missing file scenarios for ENOENT
 * - No-write-on-read-failure guarantee verification
 * - Atomic write pattern validation for safeWriteFile
 *
 * Pyramid position: Integration tests bridge unit classification logic
 * with real filesystem behavior. E2E not needed for file I/O scenarios.
 */

import { describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import {
  FileAccessError,
  safeReadFile,
  safeWriteFile,
  checkFileAccessible,
} from '../../src/file-access-errors';

// Use a dedicated temp directory for integration test artifacts
const TEST_DIR = path.join(process.cwd(), 'tmp_integration_test_6_1');
const READABLE_FILE = path.join(TEST_DIR, 'readable.txt');
const NO_READ_FILE = path.join(TEST_DIR, 'no_read.txt');
const WRITE_TARGET = path.join(TEST_DIR, 'write_target.txt');
const WRITE_TARGET_WITH_INITIAL = path.join(TEST_DIR, 'write_target_with_initial.txt');

describe('File Access Error Detection - Integration Tests', () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    await fs.writeFile(READABLE_FILE, 'test content', { mode: 0o400 });   // read-only
    await fs.writeFile(NO_READ_FILE, 'locked content', { mode: 0o000 });   // no permissions
    await fs.writeFile(WRITE_TARGET_WITH_INITIAL, 'original', { mode: 0o600 });
  });

  afterAll(async () => {
    // Restore permissions so cleanup can succeed
    try { await fs.chmod(NO_READ_FILE, 0o600); } catch { /* best effort */ }
    try { await fs.rm(TEST_DIR, { recursive: true, force: true }); } catch { /* best effort */ }
  });

  afterEach(async () => {
    // Clean up any temp files left by atomic write tests
    try {
      const entries = await fs.readdir(TEST_DIR);
      for (const entry of entries) {
        if (entry.startsWith('.') && entry.includes('.tmp.')) {
          await fs.unlink(path.join(TEST_DIR, entry)).catch(() => {});
        }
      }
    } catch { /* best effort */ }
    // Restore write_target_with_initial.txt if it was corrupted
    try {
      const content = await fs.readFile(WRITE_TARGET_WITH_INITIAL, 'utf-8');
      if (content !== 'original') {
        await fs.writeFile(WRITE_TARGET_WITH_INITIAL, 'original', { mode: 0o600 });
      }
    } catch { /* best effort */ }
  });

  // ============================================================================
  // AC1: Detect file not found (ENOENT) - real fs
  // ============================================================================
  describe('AC1: ENOENT with real filesystem', () => {
    test('safeReadFile should throw FileAccessError with ENOENT for nonexistent file', async () => {
      const nonexistent = path.join(TEST_DIR, 'this_file_does_not_exist.txt');
      try {
        await safeReadFile(nonexistent);
        fail('Expected safeReadFile to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(FileAccessError);
        expect((err as FileAccessError).code).toBe('ENOENT');
        expect((err as FileAccessError).path).toBe(nonexistent);
        expect((err as FileAccessError).operation).toBe('read');
      }
    });

    test('safeWriteFile should throw FileAccessError for nonexistent parent directory', async () => {
      const badPath = path.join(TEST_DIR, 'nonexistent_subdir', 'file.txt');
      try {
        await safeWriteFile(badPath, 'content');
        fail('Expected safeWriteFile to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(FileAccessError);
        expect((err as FileAccessError).path).toBe(badPath);
        expect((err as FileAccessError).operation).toBe('write');
        // Verify target file was NOT created
        try {
          await fs.access(badPath);
          fail('Target file should not exist after failed write');
        } catch { /* expected */ }
      }
    });
  });

  // ============================================================================
  // AC2: Detect permission denied (EACCES) - real fs
  // ============================================================================
  describe('AC2: EACCES with real filesystem', () => {
    test('safeReadFile should throw FileAccessError with EACCES for unreadable file', async () => {
      try {
        await safeReadFile(NO_READ_FILE);
        fail('Expected safeReadFile to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(FileAccessError);
        expect((err as FileAccessError).code).toBe('EACCES');
        expect((err as FileAccessError).path).toBe(NO_READ_FILE);
        expect((err as FileAccessError).operation).toBe('read');
      }
    });

    test('safeWriteFile should throw FileAccessError with EACCES for unwritable directory', async () => {
      const readonlyDir = path.join(TEST_DIR, 'readonly_dir');
      await fs.mkdir(readonlyDir, { mode: 0o400, recursive: true });
      const targetInReadonlyDir = path.join(readonlyDir, 'file.txt');

      try {
        await safeWriteFile(targetInReadonlyDir, 'content');
        fail('Expected safeWriteFile to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(FileAccessError);
        expect((err as FileAccessError).code).toBe('EACCES');
        expect((err as FileAccessError).path).toBe(targetInReadonlyDir);
        expect((err as FileAccessError).operation).toBe('write');
        // Verify target file was NOT created
        try {
          await fs.access(targetInReadonlyDir);
          // Cleanup: restore dir perms before removing
          await fs.chmod(readonlyDir, 0o700);
          fail('Target file should not exist in readonly dir');
        } catch (_e) {
          // expected -- file should not exist
        }
        // Cleanup
        await fs.chmod(readonlyDir, 0o700).catch(() => {});
        await fs.rm(readonlyDir, { recursive: true, force: true }).catch(() => {});
      }
    });
  });

  // ============================================================================
  // AC4: No modifications on read failure (no-write-on-read-failure guarantee)
  // ============================================================================
  describe('AC4: No write operations after read failure', () => {
    test('when safeReadFile fails, subsequent write should not have occurred', async () => {
      // This test verifies that the safe wrappers throw errors on read failure
      // rather than silently passing through and enabling downstream writes
      const nonexistent = path.join(TEST_DIR, 'missing.txt');

      // Attempt to read nonexistent file
      try {
        await safeReadFile(nonexistent);
        fail('Expected safeReadFile to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(FileAccessError);
        expect((err as FileAccessError).code).toBe('ENOENT');
      }

      // Verify that no file was created as a side effect of the failed read
      try {
        await fs.access(nonexistent);
        fail('File should not have been created by failed read');
      } catch {
        // expected -- no file created
      }
    });

    test('safeWriteFile uses atomic pattern: original file untouched on write failure', async () => {
      const initialContent = await fs.readFile(WRITE_TARGET_WITH_INITIAL, 'utf-8');
      expect(initialContent).toBe('original');

      // Attempt to write to a directory that doesn't exist
      const badTarget = path.join(TEST_DIR, 'nonexistent_dir_42', 'file.txt');
      try {
        await safeWriteFile(badTarget, 'new content');
        fail('Expected safeWriteFile to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(FileAccessError);
      }

      // The initial file should be untouched (no-write-on-failure)
      const afterContent = await fs.readFile(WRITE_TARGET_WITH_INITIAL, 'utf-8');
      expect(afterContent).toBe('original');
    });
  });

  // ============================================================================
  // AC6: Atomic write pattern for safeWriteFile (ENOSPC simulation)
  // ============================================================================
  describe('AC6: Atomic write with temp file cleanup', () => {
    test('should clean up temp file when write fails during rename', async () => {
      // Write a file, then make the parent readonly to cause rename failure
      await fs.writeFile(WRITE_TARGET, 'initial', { mode: 0o600 });
      await fs.chmod(path.dirname(WRITE_TARGET), 0o400);

      try {
        await safeWriteFile(WRITE_TARGET, 'new content');
      } catch {
        // Error expected (rename will fail in readonly dir on some systems)
      }

      // Restore dir permissions for further tests
      await fs.chmod(TEST_DIR, 0o700);

      // Verify: temp files should have been cleaned up
      const entries = await fs.readdir(TEST_DIR);
      const tempFiles = entries.filter(
        (e) => e.startsWith('.') && e.includes('.tmp.') && e.includes('write_target.txt')
      );
      expect(tempFiles.length).toBe(0);
    });

    test('successful write should leave target file with correct content', async () => {
      const testFile = path.join(TEST_DIR, 'atomic_success_test.txt');
      await safeWriteFile(testFile, 'atomic content');
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe('atomic content');
      await fs.unlink(testFile);
    });
  });

  // ============================================================================
  // checkFileAccessible - informational check behavior
  // ============================================================================
  describe('checkFileAccessible - informational behavior', () => {
    test('should return true for readable file', async () => {
      const result = await checkFileAccessible(READABLE_FILE);
      expect(result).toBe(true);
    });

    test('should return false for nonexistent file', async () => {
      const result = await checkFileAccessible(path.join(TEST_DIR, 'missing_integration.txt'));
      expect(result).toBe(false);
    });

    test('should return false for unreadable file (never throws)', async () => {
      await expect(checkFileAccessible(NO_READ_FILE)).resolves.toBe(false);
    });
  });

  // ============================================================================
  // Integration with existing file-writer.ts patterns
  // ============================================================================
  describe('Integration: Safe I/O compatibility', () => {
    test('safeReadFile returns same content as fs.readFile for valid file', async () => {
      const testContent = 'integration test content';
      const testFile = path.join(TEST_DIR, 'compat_test.txt');
      await fs.writeFile(testFile, testContent, { mode: 0o600 });

      const safeContent = await safeReadFile(testFile);
      expect(safeContent).toBe(testContent);
    });

    test('safeWriteFile produces same readable file as fs.writeFile', async () => {
      const testContent = 'write compatibility test';
      const safeFile = path.join(TEST_DIR, 'safe_compat.txt');
      const directFile = path.join(TEST_DIR, 'direct_compat.txt');

      await safeWriteFile(safeFile, testContent);
      await fs.writeFile(directFile, testContent, { mode: 0o600 });

      const safeResult = await fs.readFile(safeFile, 'utf-8');
      const directResult = await fs.readFile(directFile, 'utf-8');

      expect(safeResult).toBe(directResult);
      expect(safeResult).toBe(testContent);
    });
  });
});
