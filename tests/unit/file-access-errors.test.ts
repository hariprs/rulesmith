/**
 * Unit Tests for File Access Error Detection (Story 6.1)
 *
 * Testing Strategy:
 * - TDD Red Phase: These tests define the expected API before implementation
 * - Classify error inputs directly (no fs mocking needed) for classification tests
 * - Use direct invocation of fs calls for success/error path tests (no mocking needed)
 * - Pyramid: Unit tests for classification logic, error types, and metadata
 */

import { describe, test, expect } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileAccessError, safeReadFile, safeWriteFile, checkFileAccessible, classifyFileSystemError } from '../../src/file-access-errors';

// ============================================================================
// AC5: Error objects carry diagnostic metadata
// ============================================================================

describe('FileAccessError - Diagnostic Metadata (AC5)', () => {

  test('should carry code, path, operation, and message', () => {
    const cause = new Error('simulated ENOENT');
    const err = new FileAccessError('ENOENT', '/test/.cursorrules', 'read', cause);

    expect(err.code).toBe('ENOENT');
    expect(err.path).toBe('/test/.cursorrules');
    expect(err.operation).toBe('read');
    expect(err.cause).toBe(cause);
    expect(err.message).toBeTruthy();
    expect(err.message.length).toBeGreaterThan(0);
  });

  test('should set name property to FileAccessError', () => {
    const err = new FileAccessError('ENOENT', '/test/file', 'read');
    expect(err.name).toBe('FileAccessError');
  });

  test('should be an instanceof Error', () => {
    const err = new FileAccessError('EACCES', '/test/file', 'write');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(FileAccessError);
  });

  test('should handle undefined cause', () => {
    const err = new FileAccessError('UNKNOWN', '/test/file', 'read');
    expect(err.cause).toBeUndefined();
    expect(err.code).toBe('UNKNOWN');
  });

  test('should cover all defined FileErrorCode values', () => {
    const codes = ['ENOENT', 'EACCES', 'EBUSY', 'ENOSPC', 'ENOTDIR', 'ENAMETOOLONG', 'UNKNOWN'] as const;
    codes.forEach(code => {
      const err = new FileAccessError(code, '/test/file', 'read');
      expect(err.code).toBe(code);
    });
  });

  test('ENOENT should produce human-readable message mentioning the path', () => {
    const err = new FileAccessError('ENOENT', '/some/path/file.txt', 'read');
    expect(err.message).toContain('/some/path/file.txt');
    expect(err.message.toLowerCase()).toContain('not found');
  });
});

// ============================================================================
// classifyFileSystemError - Error Classification
// ============================================================================

describe('classifyFileSystemError', () => {

  function makeError(code: string): NodeJS.ErrnoException {
    const err = new Error(`${code}: test error`) as NodeJS.ErrnoException;
    err.code = code;
    return err;
  }

  test('should classify ENOENT error as ENOENT code', () => {
    const result = classifyFileSystemError(makeError('ENOENT'), '/test/.cursorrules', 'read');
    expect(result).toBeInstanceOf(FileAccessError);
    expect(result.code).toBe('ENOENT');
    expect(result.path).toBe('/test/.cursorrules');
    expect(result.operation).toBe('read');
  });

  test('should classify EACCES error as EACCES code', () => {
    const result = classifyFileSystemError(makeError('EACCES'), '/test/.github/copilot-instructions.md', 'write');
    expect(result.code).toBe('EACCES');
    expect(result.operation).toBe('write');
  });

  test('should classify EBUSY error as EBUSY code', () => {
    const result = classifyFileSystemError(makeError('EBUSY'), '/test/.cursorrules', 'write');
    expect(result.code).toBe('EBUSY');
  });

  test('should classify ETXTBSY (Linux text-busy) as EBUSY code', () => {
    const result = classifyFileSystemError(makeError('ETXTBSY'), '/test/.cursorrules', 'read');
    expect(result.code).toBe('EBUSY');
  });

  test('should classify ENOSPC error as ENOSPC code', () => {
    const result = classifyFileSystemError(makeError('ENOSPC'), '/test/.cursorrules', 'write');
    expect(result.code).toBe('ENOSPC');
  });

  test('should classify ENOTDIR error as ENOTDIR code', () => {
    const result = classifyFileSystemError(makeError('ENOTDIR'), '/test/rule/path', 'read');
    expect(result.code).toBe('ENOTDIR');
  });

  test('should classify unrecognized codes as UNKNOWN', () => {
    const result = classifyFileSystemError(makeError('EIO'), '/test/file', 'read');
    expect(result.code).toBe('UNKNOWN');
  });

  test('should handle non-Error input (string) as UNKNOWN with message containing input', () => {
    const result = classifyFileSystemError('something went wrong', '/test/file', 'read');
    expect(result.code).toBe('UNKNOWN');
    expect(result.cause).toBeUndefined();
  });

  test('should handle non-Error input (null) as UNKNOWN', () => {
    const result = classifyFileSystemError(null, '/test/file', 'write');
    expect(result.code).toBe('UNKNOWN');
    expect(result.message).toBeTruthy();
  });

  test('should handle non-Error input (plain object without code)', () => {
    const result = classifyFileSystemError({ message: 'oops' }, '/test/file', 'read');
    expect(result.code).toBe('UNKNOWN');
  });

  test('should handle input that is an instance of Error but lacks .code', () => {
    const err = new Error('generic error without code');
    const result = classifyFileSystemError(err, '/test/file', 'read');
    expect(result.code).toBe('UNKNOWN');
    expect(result.cause).toBe(err);
  });
});

// ============================================================================
// Integration-style tests: actual filesystem calls
// These use real fs operations to test end-to-end behavior.
// E2E tests with mocking are deferred to the integration test file.
// ============================================================================

describe('safeReadFile - real fs calls', () => {

  test('should return file content on success', async () => {
    const result = await safeReadFile('/Users/hpandura/Personal-Projects/Project-Self_Improvement/package.json');
    const parsed = JSON.parse(result);
    expect(parsed.name).toBeTruthy();
  });

  test('should throw FileAccessError with ENOENT for missing file', async () => {
    try {
      await safeReadFile('/nonexistent/path/.cursorrules');
      fail('Expected safeReadFile to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(FileAccessError);
      expect((err as FileAccessError).code).toBe('ENOENT');
      expect((err as FileAccessError).path).toBe('/nonexistent/path/.cursorrules');
      expect((err as FileAccessError).operation).toBe('read');
    }
  });

  test('should throw FileAccessError with ENOENT for empty string path', async () => {
    try {
      await safeReadFile('');
      fail('Expected safeReadFile to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(FileAccessError);
      expect((err as FileAccessError).code).toBe('ENOENT');
      expect((err as FileAccessError).operation).toBe('read');
    }
  });
});

describe('safeWriteFile - real fs calls', () => {

  const tempDir = path.join(process.cwd(), 'tmp_file_access_test');
  const tempFile = path.join(tempDir, 'test_write.txt');

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (_e) {
      // cleanup best-effort
    }
  });

  test('should write content successfully', async () => {
    await fs.mkdir(tempDir, { recursive: true });
    await safeWriteFile(tempFile, 'hello world');
    const content = await fs.readFile(tempFile, 'utf-8');
    expect(content).toBe('hello world');
  });

  test('should not attempt write if parent directory does not exist - target file is not written', async () => {
    const missingDir = path.join(tempDir, 'nonexistent_subdir');
    const targetFile = path.join(missingDir, 'file.txt');

    try {
      await safeWriteFile(targetFile, 'content');
      fail('Expected safeWriteFile to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(FileAccessError);
      // Target file should not exist (atomic write to temp file + rename, not direct write)
      try {
        await fs.access(targetFile);
        fail('Target file should not exist after failed write');
      } catch (_e) {
        // Expected -- file should not exist
      }
    }
  });
});

describe('checkFileAccessible - real fs calls', () => {

  test('should return true for an existing readable file', async () => {
    const result = await checkFileAccessible('/Users/hpandura/Personal-Projects/Project-Self_Improvement/package.json');
    expect(result).toBe(true);
  });

  test('should return false for a non-existent file', async () => {
    const result = await checkFileAccessible('/nonexistent/file');
    expect(result).toBe(false);
  });

  test('should never throw -- returns false on any error', async () => {
    await expect(checkFileAccessible('/nonexistent/file')).resolves.toBe(false);
  });
});
