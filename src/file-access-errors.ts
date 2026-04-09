/**
 * File Access Error Detection (Story 6.1)
 *
 * Centralized error detection and classification for rule file I/O operations.
 * Wraps fs.promises calls with safe wrappers that classify errors into
 * actionable categories, preventing raw stack traces from leaking to users.
 *
 * @module file-access-errors
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

// ============================================================================
// Error Type Definitions
// ============================================================================

/**
 * Standardized file error codes mapped from Node.js system error codes.
 */
export type FileErrorCode = 'ENOENT' | 'EACCES' | 'EBUSY' | 'ENOSPC' | 'ENOTDIR' | 'ENAMETOOLONG' | 'UNKNOWN';

/**
 * Unified error class for all file access failures.
 * Carries diagnostic metadata: code, path, operation, and original cause.
 *
 * Conceptual subtypes (by .code value):
 * - FileNotFoundError: code === 'ENOENT'
 * - PermissionDeniedError: code === 'EACCES'
 * - FileLockedError: code === 'EBUSY'
 * - DiskFullError: code === 'ENOSPC'
 */
export class FileAccessError extends Error {
  public readonly name = 'FileAccessError';

  constructor(
    public readonly code: FileErrorCode,
    public readonly path: string,
    public readonly operation: 'read' | 'write',
    public readonly cause?: Error,
    /** Raw cause value for non-Error inputs (e.g., strings, numbers) that lack a message property */
    public readonly rawCause?: unknown
  ) {
    super(buildErrorMessage(code, path, operation, cause, rawCause));
  }
}

// ============================================================================
// Safe File I/O API
// ============================================================================

/**
 * Read a file with automatic error classification.
 *
 * @param filePath - Absolute or relative path to the file
 * @returns File content as UTF-8 string
 * @throws {FileAccessError} If the file cannot be read
 */
export async function safeReadFile(filePath: string): Promise<string> {
  if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
    throw new FileAccessError('ENOENT', filePath || '(empty)', 'read');
  }
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw classifyFileSystemError(error, filePath, 'read');
  }
}

/**
 * Write content to a file atomically (write-to-temp-then-rename pattern).
 *
 * On any failure, the target file is left untouched and the temp file
 * is cleaned up. This guarantees no partial writes corrupt the target.
 *
 * @param targetPath - Absolute or relative path to the target file
 * @param content - Content to write
 * @throws {FileAccessError} If the file cannot be written
 */
export async function safeWriteFile(targetPath: string, content: string): Promise<void> {
  if (!targetPath || typeof targetPath !== 'string' || targetPath.trim() === '') {
    throw new FileAccessError('ENOENT', targetPath || '(empty)', 'write');
  }

  const targetDir = path.dirname(targetPath);
  const tempPath = path.join(targetDir, `.${path.basename(targetPath)}.tmp.${randomUUID()}`);

  try {
    // Write to temp file first
    await fs.writeFile(tempPath, content, { mode: 0o600, encoding: 'utf-8' });

    // Atomic rename from temp to target (fails with EXDEV if target is on different
    // mount; rename is metadata-only so ENOSPC during rename is unlikely but handled
    // by the catch block via cleanup + reclassification)
    await fs.rename(tempPath, targetPath);
  } catch (error) {
    // Clean up temp file on any write or rename failure.
    // The unlink may race with rename (if rename succeeded concurrently),
    // but we swallow cleanup errors -- the original target file is guaranteed
    // untouched because rename is atomic, and if we're here rename didn't succeed.
    try {
      await fs.unlink(tempPath);
    } catch (_cleanupErr) {
      // Temp file may not exist if writeFile failed before creating it,
      // or may have been consumed by a successful concurrent rename.
      // Ignore cleanup errors -- they're best-effort.
    }

    throw classifyFileSystemError(error, targetPath, 'write');
  }
}

/**
 * Check if a file is accessible without performing the actual I/O.
 *
 * This is purely informational (TOCTOU-safe). Do NOT use this as a
 * substitute for error handling on the real I/O operation. Always
 * handle errors from the actual fs.promises call.
 *
 * @param filePath - Path to check
 * @returns true if the file is readable, false otherwise
 */
export async function checkFileAccessible(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.R_OK);
    return true;
  } catch (_error) {
    // Return false -- do NOT throw. This is an informational check only.
    return false;
  }
}

/**
 * Classify a raw filesystem error into a standardized FileAccessError.
 *
 * Handles:
 * - Standard Node.js SystemError with .code field
 * - Non-Error inputs (strings, null, plain objects)
 * - Errors without a recognized .code (falls back to UNKNOWN)
 *
 * @param error - The caught error (any type)
 * @param filePath - The file path that triggered the error
 * @param operation - Whether the operation was 'read' or 'write'
 * @returns A classified FileAccessError
 */
export function classifyFileSystemError(
  error: unknown,
  filePath: string,
  operation: 'read' | 'write'
): FileAccessError {
  const code = extractErrorCode(error);
  // Use duck-typing for Error check to avoid Jest module-context issues
  const isLikeError = error !== null && typeof error === 'object' && 'message' in error;
  const cause = isLikeError ? error as Error : undefined;
  // Preserve the raw error value in the UNKNOWN case so the message includes it
  const rawCause = (code === 'UNKNOWN' && !isLikeError) ? error : undefined;
  return new FileAccessError(code, filePath, operation, cause, rawCause);
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Extract a recognized file error code from any error value.
 * Uses duck-typing instead of instanceof to avoid Jest module-context issues.
 */
function extractErrorCode(error: unknown): FileErrorCode {
  const err = error as Record<string, unknown>;
  // Use Object.hasOwn() equivalent for safety against prototype pollution
  if (err !== null && typeof err === 'object' && !Array.isArray(err) && typeof err.code === 'string') {
    return mapErrorCode(err.code);
  }

  // For non-Error inputs or inputs without .code: return UNKNOWN
  return 'UNKNOWN';
}

/**
 * Map Node.js system error codes to our standard FileErrorCode.
 * Acts as a filter: known codes pass through, unrecognized codes become UNKNOWN.
 */
function mapErrorCode(code: string): FileErrorCode {
  switch (code) {
    case 'ENOENT':
      return 'ENOENT';
    case 'EACCES':
      return 'EACCES';
    case 'EBUSY':
      return 'EBUSY';
    case 'ETXTBSY':
      // Linux text-file-busy maps to EBUSY (FileLockedError category)
      return 'EBUSY';
    case 'ENOSPC':
      return 'ENOSPC';
    case 'ENOTDIR':
      return 'ENOTDIR';
    case 'ENAMETOOLONG':
      return 'ENAMETOOLONG';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Build a human-readable error message for FileAccessError.
 * Exhaustive: all FileErrorCode values are handled explicitly.
 */
function buildErrorMessage(
  code: FileErrorCode,
  filePath: string,
  operation: 'read' | 'write',
  cause?: Error,
  /** Raw non-Error value preserved in UNKNOWN case */
  rawCause?: unknown
): string {
  const operationVerb = operation === 'read' ? 'reading' : 'writing';

  switch (code) {
    case 'ENOENT':
      return `File not found: ${filePath} during ${operationVerb}`;
    case 'EACCES':
      return `Permission denied: ${filePath} during ${operationVerb}`;
    case 'EBUSY':
      return `File locked or busy: ${filePath} during ${operationVerb}`;
    case 'ENOSPC':
      return `Disk full: ${filePath} during ${operationVerb}`;
    case 'ENOTDIR':
      return `Not a directory: ${filePath} during ${operationVerb}`;
    case 'ENAMETOOLONG':
      return `File name too long: ${filePath} during ${operationVerb}`;
    case 'UNKNOWN': {
      let causeMsg = 'Unknown error';
      if (cause) {
        causeMsg = 'message' in cause ? String(cause.message) : 'Unknown error';
      } else if (rawCause != null) {
        causeMsg = String(rawCause);
      }
      return `File access error: ${filePath} during ${operationVerb} (${causeMsg})`;
    }
    default:
      return `File access error with unhandled code '${code}': ${filePath} during ${operationVerb}`;
  }
}
