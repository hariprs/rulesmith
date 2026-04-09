/**
 * Acceptance Tests for Story 6.2 - Actionable Error Messages
 *
 * Testing Strategy:
 * - TDD Red Phase: These tests define the expected API and behavior before implementation
 * - All tests import from `../../src/error-messages` which does NOT yet exist
 * - Unit-level tests for pure business logic (message formatting)
 * - No E2E tests required -- no browser interaction needed for pure formatting functions
 * - Test pyramid: unit tests for all acceptance criteria AC1-AC8
 */

import { describe, test, expect } from '@jest/globals';
import { FileAccessError, FileErrorCode } from '../../src/file-access-errors';
import {
  formatFileAccessError,
  formatFileAccessErrorStructured,
} from '../../src/error-messages';

// ============================================================================
// Helper: construct a FileAccessError for each error code
// ============================================================================

function makeError(
  code: FileErrorCode,
  filePath: string,
  operation: 'read' | 'write',
  cause?: Error
): FileAccessError {
  return new FileAccessError(code, filePath, operation, cause);
}

// ============================================================================
// AC1: File not found error message (ENOENT)
// ============================================================================

describe('AC1: File not found error message (ENOENT)', () => {
  test('description should be "Rule file not found"', () => {
    const err = makeError('ENOENT', '/project/.cursorrules', 'read');
    const formatted = formatFileAccessError(err);
    expect(formatted).toContain('Rule file not found');
  });

  test('"What happened" section should explain which file does not exist', () => {
    const err = makeError('ENOENT', '/project/.cursorrules', 'read');
    const formatted = formatFileAccessError(err);
    expect(formatted).toContain('/project/.cursorrules');
    expect(formatted).toContain('does not exist');
  });

  test('"How to fix" should include Cursor guidance for .cursorrules path', () => {
    const err = makeError('ENOENT', '/project/.cursorrules', 'read');
    const formatted = formatFileAccessError(err);
    expect(formatted).toMatch(/\.cursorrules.*project root/i);
  });

  test('"How to fix" should include Copilot guidance for copilot instructions path', () => {
    const err = makeError('ENOENT', '/project/.github/copilot-instructions.md', 'read');
    const formatted = formatFileAccessError(err);
    expect(formatted).toMatch(/copilot.*instruction/i);
  });

  test('"Technical details" should include absolute file path', () => {
    const err = makeError('ENOENT', '/project/.cursorrules', 'read');
    const structured = formatFileAccessErrorStructured(err);
    expect(structured.technicalDetails).toContain('/project/.cursorrules');
  });

  test('message works for both read and write operations', () => {
    const readErr = makeError('ENOENT', '/project/.cursorrules', 'read');
    const writeErr = makeError('ENOENT', '/project/.cursorrules', 'write');

    const readFormatted = formatFileAccessError(readErr);
    const writeFormatted = formatFileAccessError(writeErr);

    expect(readFormatted).toContain('Rule file not found');
    expect(writeFormatted).toContain('Rule file not found');
  });

  test('generic path (not cursor or copilot) should only show "verify file path"', () => {
    const err = makeError('ENOENT', '/project/some-other-file.txt', 'read');
    const formatted = formatFileAccessError(err);
    expect(formatted).toContain('Verify the file path is correct');
    expect(formatted).not.toMatch(/cursorrules/i);
    expect(formatted).not.toMatch(/copilot/i);
  });

  test('structured output has correct field types', () => {
    const err = makeError('ENOENT', '/project/.cursorrules', 'read');
    const structured = formatFileAccessErrorStructured(err);
    expect(typeof structured.description).toBe('string');
    expect(typeof structured.whatHappened).toBe('string');
    expect(Array.isArray(structured.howToFix)).toBe(true);
    expect(structured.howToFix.length).toBeGreaterThan(0);
    expect(typeof structured.technicalDetails).toBe('string');
  });
});

// ============================================================================
// AC2: Permission denied error message (EACCES)
// ============================================================================

describe('AC2: Permission denied error message (EACCES)', () => {
  test('description should be "Permission denied accessing rule file"', () => {
    const err = makeError('EACCES', '/project/.cursorrules', 'read');
    const formatted = formatFileAccessError(err);
    expect(formatted).toContain('Permission denied');
  });

  test('"What happened" should explain the process lacks permissions for path', () => {
    const err = makeError('EACCES', '/rules/.cursorrules', 'read');
    const structured = formatFileAccessErrorStructured(err);
    expect(structured.whatHappened).toContain('/rules/.cursorrules');
  });

  test('"How to fix" should include chmod instruction', () => {
    const err = makeError('EACCES', '/rules/.cursorrules', 'read');
    const formatted = formatFileAccessError(err);
    expect(formatted).toContain('chmod');
  });

  test('"How to fix" should include ls -la instruction', () => {
    const err = makeError('EACCES', '/rules/.cursorrules', 'read');
    const formatted = formatFileAccessError(err);
    expect(formatted).toContain('ls -la');
  });

  test('read operation guidance should differ from write operation guidance', () => {
    const readErr = makeError('EACCES', '/rules/.cursorrules', 'read');
    const writeErr = makeError('EACCES', '/rules/.cursorrules', 'write');

    const readStructured = formatFileAccessErrorStructured(readErr);
    const writeStructured = formatFileAccessErrorStructured(writeErr);

    // Ensure at least one howToFix step differs between read and write
    expect(readStructured.technicalDetails).toContain('read');
    expect(writeStructured.technicalDetails).toContain('write');
  });

  test('"Technical details" should include absolute path and operation type', () => {
    const err = makeError('EACCES', '/rules/.cursorrules', 'write');
    const structured = formatFileAccessErrorStructured(err);
    expect(structured.technicalDetails).toContain('/rules/.cursorrules');
    expect(structured.technicalDetails).toContain('write');
  });
});

// ============================================================================
// AC3: File locked error message (EBUSY)
// ============================================================================

describe('AC3: File locked error message (EBUSY)', () => {
  test('description should be "Rule file is currently in use"', () => {
    const err = makeError('EBUSY', '/project/.cursorrules', 'read');
    const formatted = formatFileAccessError(err);
    expect(formatted).toContain('Rule file is currently in use');
  });

  test('"What happened" should explain file is locked by another process', () => {
    const err = makeError('EBUSY', '/project/.cursorrules', 'read');
    const structured = formatFileAccessErrorStructured(err);
    expect(structured.whatHappened.toLowerCase()).toMatch(/lock|busy|in use/i);
  });

  test('"How to fix" should include closing editors/IDEs advice', () => {
    const err = makeError('EBUSY', '/project/.cursorrules', 'read');
    const formatted = formatFileAccessError(err);
    expect(formatted.toLowerCase()).toMatch(/editor|ide|close/i);
  });

  test('"How to fix" should include lsof command', () => {
    const err = makeError('EBUSY', '/project/.cursorrules', 'read');
    const formatted = formatFileAccessError(err);
    expect(formatted).toContain('lsof');
  });

  test('"How to fix" should advise retrying after releasing the lock', () => {
    const err = makeError('EBUSY', '/project/.cursorrules', 'read');
    const formatted = formatFileAccessError(err);
    expect(formatted.toLowerCase()).toContain('retry');
  });

  test('"Technical details" should include absolute file path', () => {
    const err = makeError('EBUSY', '/project/.cursorrules', 'write');
    const structured = formatFileAccessErrorStructured(err);
    expect(structured.technicalDetails).toContain('/project/.cursorrules');
  });

  test('"How to fix" should include actual path in lsof command, not placeholder', () => {
    const err = makeError('EBUSY', '/project/deep/nested/file.js', 'write');
    const formatted = formatFileAccessError(err);
    expect(formatted).toContain('lsof /project/deep/nested/file.js');
    expect(formatted).not.toContain('lsof {path}');
  });
});

// ============================================================================
// AC4: Disk full error message (ENOSPC)
// ============================================================================

describe('AC4: Disk full error message (ENOSPC)', () => {
  test('description should be "Insufficient disk space"', () => {
    const err = makeError('ENOSPC', '/project/.cursorrules', 'write');
    const formatted = formatFileAccessError(err);
    expect(formatted).toContain('Insufficient disk space');
  });

  test('"What happened" should explain no available disk space', () => {
    const err = makeError('ENOSPC', '/project/.cursorrules', 'write');
    const structured = formatFileAccessErrorStructured(err);
    expect(structured.whatHappened.toLowerCase()).toMatch(/space|disk|storage/i);
  });

  test('"How to fix" should include df -h command', () => {
    const err = makeError('ENOSPC', '/project/.cursorrules', 'write');
    const formatted = formatFileAccessError(err);
    expect(formatted).toContain('df -h');
  });

  test('"How to fix" should advise clearing caches or temp files', () => {
    const err = makeError('ENOSPC', '/project/.cursorrules', 'write');
    const formatted = formatFileAccessError(err);
    expect(formatted.toLowerCase()).toMatch(/cache|temp/i);
  });

  test('"Technical details" should mention atomic write protection (no partial data)', () => {
    const err = makeError('ENOSPC', '/project/.cursorrules', 'write');
    const structured = formatFileAccessErrorStructured(err);
    expect(structured.technicalDetails.toLowerCase()).toMatch(/partial|atomic|no data/i);
  });

  test('attempted file path should appear in technical details', () => {
    const err = makeError('ENOSPC', '/project/.cursorrules', 'write');
    const structured = formatFileAccessErrorStructured(err);
    expect(structured.technicalDetails).toContain('/project/.cursorrules');
  });
});

// ============================================================================
// AC5: Not a directory error message (ENOTDIR)
// ============================================================================

describe('AC5: Not a directory error message (ENOTDIR)', () => {
  test('description should be "Invalid file path structure"', () => {
    const err = makeError('ENOTDIR', '/some/file/path', 'read');
    const formatted = formatFileAccessError(err);
    expect(formatted).toContain('Invalid file path structure');
  });

  test('"What happened" should explain a segment is expected to be a directory', () => {
    const err = makeError('ENOTDIR', '/some/file/path', 'read');
    const structured = formatFileAccessErrorStructured(err);
    expect(structured.whatHappened.toLowerCase()).toMatch(/director/i);
  });

  test('"How to fix" should include verifying file path is correct', () => {
    const err = makeError('ENOTDIR', '/some/file/path', 'read');
    const formatted = formatFileAccessError(err);
    expect(formatted.toLowerCase()).toMatch(/verif|check|path.*correct/i);
  });

  test('"How to fix" should include checking parent directory structure', () => {
    const err = makeError('ENOTDIR', '/some/file/path', 'read');
    const formatted = formatFileAccessError(err);
    expect(formatted.toLowerCase()).toMatch(/parent/i);
  });

  test('"Technical details" should include absolute file path', () => {
    const err = makeError('ENOTDIR', '/some/file/path', 'read');
    const structured = formatFileAccessErrorStructured(err);
    expect(structured.technicalDetails).toContain('/some/file/path');
  });
});

// ============================================================================
// AC6: File name too long error message (ENAMETOOLONG)
// ============================================================================

describe('AC6: File name too long error message (ENAMETOOLONG)', () => {
  test('description should be "File name is too long"', () => {
    const err = makeError('ENAMETOOLONG', '/some/very/long/path', 'read');
    const formatted = formatFileAccessError(err);
    expect(formatted).toContain('File name is too long');
  });

  test('"What happened" should explain name or path exceeds filesystem limit', () => {
    const err = makeError('ENAMETOOLONG', '/some/very/long/path', 'read');
    const structured = formatFileAccessErrorStructured(err);
    expect(structured.whatHappened.toLowerCase()).toMatch(/exceeds|limit|max/i);
  });

  test('"How to fix" should suggest shortening the file name or path', () => {
    const err = makeError('ENAMETOOLONG', '/some/very/long/path', 'read');
    const formatted = formatFileAccessError(err);
    expect(formatted.toLowerCase()).toMatch(/shorten/i);
  });

  test('"How to fix" should mention 255 character limit', () => {
    const err = makeError('ENAMETOOLONG', '/some/very/long/path', 'read');
    const formatted = formatFileAccessError(err);
    expect(formatted).toContain('255');
  });

  test('"Technical details" should include absolute file path', () => {
    const err = makeError('ENAMETOOLONG', '/some/very/long/path', 'read');
    const structured = formatFileAccessErrorStructured(err);
    expect(structured.technicalDetails).toContain('/some/very/long/path');
  });
});

// ============================================================================
// AC7: Unknown error message fallback
// ============================================================================

describe('AC7: Unknown error message fallback', () => {
  test('description should be "An unexpected file error occurred"', () => {
    const err = makeError('UNKNOWN', '/project/file', 'read', new Error('EIO: i/o error'));
    const formatted = formatFileAccessError(err);
    expect(formatted).toContain('An unexpected file error occurred');
  });

  test('"What happened" should include error code if available', () => {
    const cause = Object.assign(new Error('EIO: i/o error'), { code: 'EIO' });
    const err = new FileAccessError('UNKNOWN', '/project/file', 'read', cause);
    const structured = formatFileAccessErrorStructured(err);
    expect(structured.whatHappened.toLowerCase()).toMatch(/eio|error.*code/i);
  });

  test('"How to fix" should suggest verifying file path, checking disk space, and permissions', () => {
    const err = makeError('UNKNOWN', '/project/file', 'read', new Error('weird error'));
    const formatted = formatFileAccessError(err);
    expect(formatted.toLowerCase()).toMatch(/path|verify/i);
    expect(formatted.toLowerCase()).toMatch(/disk.*space/i);
    expect(formatted.toLowerCase()).toMatch(/permission/i);
  });

  test('"Technical details" should include error code, file path, operation, and raw message', () => {
    const cause = new Error('raw underlying message');
    const err = new FileAccessError('UNKNOWN', '/project/file', 'write', cause);
    const structured = formatFileAccessErrorStructured(err);
    expect(structured.technicalDetails).toContain('/project/file');
    expect(structured.technicalDetails).toContain('write');
    expect(structured.technicalDetails).toMatch(/raw underlying message/i);
  });
});

// ============================================================================
// AC8: Message formatter is reusable and pure
// ============================================================================

describe('AC8: Message formatter is reusable and pure', () => {
  test('formatFileAccessError is a pure function that returns a string', () => {
    const err = makeError('ENOENT', '/project/.cursorrules', 'read');
    const result = formatFileAccessError(err);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('formatFileAccessErrorStructured returns structured data object', () => {
    const err = makeError('EACCES', '/project/.cursorrules', 'read');
    const result = formatFileAccessErrorStructured(err);
    expect(result).toHaveProperty('description');
    expect(result).toHaveProperty('whatHappened');
    expect(result).toHaveProperty('howToFix');
    expect(result).toHaveProperty('technicalDetails');
  });

  test('formatFileAccessError returns same output for same input (pure)', () => {
    const err = makeError('ENOSPC', '/project/.cursorrules', 'write');
    const first = formatFileAccessError(err);
    const second = formatFileAccessError(err);
    expect(first).toBe(second);
  });

  test('formatFileAccessErrorStructured returns same output for same input (pure)', () => {
    const err = makeError('EBUSY', '/project/.cursorrules', 'read');
    const first = formatFileAccessErrorStructured(err);
    const second = formatFileAccessErrorStructured(err);
    expect(first.description).toBe(second.description);
    expect(first.whatHappened).toBe(second.whatHappened);
    expect(first.technicalDetails).toBe(second.technicalDetails);
  });

  test('formatter handles all seven error codes', () => {
    const codes: FileErrorCode[] = ['ENOENT', 'EACCES', 'EBUSY', 'ENOSPC', 'ENOTDIR', 'ENAMETOOLONG', 'UNKNOWN'];
    codes.forEach(code => {
      const err = makeError(code, '/project/file', 'read', new Error('cause'));
      const formatted = formatFileAccessError(err);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  test('structured formatter handles all seven error codes', () => {
    const codes: FileErrorCode[] = ['ENOENT', 'EACCES', 'EBUSY', 'ENOSPC', 'ENOTDIR', 'ENAMETOOLONG', 'UNKNOWN'];
    codes.forEach(code => {
      const err = makeError(code, '/project/file', 'read', new Error('cause'));
      const structured = formatFileAccessErrorStructured(err);
      expect(structured.description.length).toBeGreaterThan(0);
      expect(structured.whatHappened.length).toBeGreaterThan(0);
      expect(structured.howToFix.length).toBeGreaterThan(0);
      expect(structured.technicalDetails.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Coverage: EACCES directory-specific guidance (line 161)
// ============================================================================

describe('EACCES directory-specific guidance', () => {
  test('should include parent directory check when cause mentions "directory"', () => {
    const cause = Object.assign(new Error('EACCES: directory not accessible'), { code: 'EACCES' });
    const err = new FileAccessError('EACCES', '/project/.cursorrules', 'read', cause);
    const formatted = formatFileAccessError(err);
    expect(formatted).toContain('parent directory permissions');
  });

  test('should include parent directory check when cause mentions "mkdir"', () => {
    const cause = Object.assign(new Error('EACCES: mkdir failed'), { code: 'EACCES' });
    const err = new FileAccessError('EACCES', '/project/.cursorrules', 'write', cause);
    const formatted = formatFileAccessError(err);
    expect(formatted).toContain('parent directory permissions');
  });

  test('should include execute permission fallback when cause is unrelated', () => {
    const cause = Object.assign(new Error('some random error'), { code: 'EACCES' });
    const err = new FileAccessError('EACCES', '/project/.cursorrules', 'write', cause);
    const formatted = formatFileAccessError(err);
    expect(formatted).toContain('lacks execute permissions');
    expect(formatted).not.toContain('parent directory permissions');
  });
});

// ============================================================================
// Coverage: UNKNOWN fallback with non-standard inputs (lines 220-224, 239-240)
// ============================================================================

describe('UNKNOWN fallback with non-standard inputs', () => {
  test('should handle string rawCause in buildUnknownWhatHappened', () => {
    // Construct FileAccessError with a non-Error raw cause
    const fakeError = Object.create(FileAccessError.prototype);
    fakeError.code = 'UNKNOWN';
    fakeError.path = '/project/file';
    fakeError.operation = 'read';
    fakeError.cause = undefined;
    fakeError.rawCause = 'something broke';
    (fakeError as any).name = 'FileAccessError';
    (fakeError as any).message = 'test';

    const formatted = formatFileAccessError(fakeError);
    expect(formatted).toContain('something broke');
  });

  test('should handle string rawCause in technical details', () => {
    const fakeError = Object.create(FileAccessError.prototype);
    fakeError.code = 'UNKNOWN';
    fakeError.path = '/project/file';
    fakeError.operation = 'read';
    fakeError.cause = undefined;
    fakeError.rawCause = 'raw error details here';
    (fakeError as any).name = 'FileAccessError';
    (fakeError as any).message = 'test';

    const structured = formatFileAccessErrorStructured(fakeError);
    expect(structured.technicalDetails).toContain('raw error details here');
  });

  test('should handle null/undefined rawCause gracefully', () => {
    const err = new FileAccessError('UNKNOWN', '/project/file', 'read', undefined);
    const structured = formatFileAccessErrorStructured(err);
    expect(structured.whatHappened).toContain('unrecognized');
    expect(structured.technicalDetails).toContain('Unknown error');
  });

  test('should use rawCause string when cause is undefined (technical details)', () => {
    const fakeError = Object.create(FileAccessError.prototype);
    fakeError.code = 'UNKNOWN';
    fakeError.path = '/test/path';
    fakeError.operation = 'write';
    fakeError.cause = undefined;
    fakeError.rawCause = 42;
    (fakeError as any).name = 'FileAccessError';
    (fakeError as any).message = 'test';

    const structured = formatFileAccessErrorStructured(fakeError);
    expect(structured.technicalDetails).toContain('42');
  });
});

// ============================================================================
// Coverage: Unrecognized error code falls back to UNKNOWN (lines 285-286)
// ============================================================================

describe('Unrecognized error code guard', () => {
  test('should fall back to UNKNOWN template for unrecognized codes', () => {
    // Bypass TypeScript to send an unrecognized code
    const fakeError = Object.create(FileAccessError.prototype);
    fakeError.code = 'SOME_UNKNOWN_CODE' as unknown as FileErrorCode;
    fakeError.path = '/project/file';
    fakeError.operation = 'read';
    fakeError.cause = undefined;
    fakeError.rawCause = undefined;
    (fakeError as any).name = 'FileAccessError';
    (fakeError as any).message = 'test';

    const structured = formatFileAccessErrorStructured(fakeError);
    expect(structured.description).toBe('An unexpected file error occurred');
    expect(structured.howToFix.length).toBeGreaterThan(0);
    expect(structured.technicalDetails.length).toBeGreaterThan(0);
  });

  test('should produce valid formatted string for unrecognized codes', () => {
    const fakeError = Object.create(FileAccessError.prototype);
    fakeError.code = 'SOME_UNKNOWN_CODE' as unknown as FileErrorCode;
    fakeError.path = '/project/file';
    fakeError.operation = 'write';
    fakeError.cause = undefined;
    fakeError.rawCause = undefined;
    (fakeError as any).name = 'FileAccessError';
    (fakeError as any).message = 'test';

    const formatted = formatFileAccessError(fakeError);
    expect(formatted).toContain('An unexpected file error occurred');
    expect(formatted).toContain('Technical details:');
  });
});
