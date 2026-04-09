/**
 * State Preservation on Failure (Story 6.3)
 *
 * Provides backup-before-modify and recovery for state.json writes.
 * Wraps the existing state-management module with an additional safety layer:
 *
 * - Before any state mutation, validates the current state.json and
 *   creates a backup as state.json.bak (atomic rename pattern).
 * - On write failure, the previous state remains intact.
 * - On read, if state.json is corrupt, falls back to state.json.bak.
 * - Never overwrites a valid .bak with corrupt content.
 *
 * This module does NOT replace state-management.ts -- it adds a thin
 * protection layer around state.json specifically. Files managed
 * by StateManager (review/sessions/) are out of scope.
 *
 * @module state-preservation
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';

import { StateData } from './state-management';
import { FileAccessError, FileErrorCode, classifyFileSystemError } from './file-access-errors';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface StatePreservationResult {
  success: boolean;
  state: StateData | null;
  recovered: boolean;
  message: string;
  error?: FileAccessError;
}

// ============================================================================
// Required-field constants (shared between validation and recovery)
// ============================================================================

const REQUIRED_TOP_LEVEL_KEYS = [
  'last_analysis',
  'patterns_found',
  'improvements_applied',
  'corrections_reduction',
  'platform',
  '_schema_note',
];

// ============================================================================
// Public API
// ============================================================================

/**
 * Read state.json with automatic recovery from state.json.bak.
 *
 * Flow:
 * 1. Try to read and validate state.json.
 * 2. If state.json is unreadable or invalid, fall back to state.json.bak.
 * 3. If .bak is also bad, return null with an appropriate error.
 *
 * @param stateFilePath - Absolute or relative path to state.json
 * @returns Result with state (possibly recovered), success flag, and message
 */
export async function readStateWithRecovery(
  stateFilePath: string
): Promise<StatePreservationResult> {
  if (!stateFilePath || typeof stateFilePath !== 'string' || stateFilePath.trim() === '') {
    return {
      success: false,
      state: null,
      recovered: false,
      message: 'State path is empty or invalid.',
    };
  }

  // Step 1: try state.json
  const primaryResult = tryReadAndValidate(stateFilePath);
  if (primaryResult.valid && primaryResult.state) {
    return {
      success: true,
      state: primaryResult.state,
      recovered: false,
      message: 'State loaded from state.json.',
    };
  }

  // Step 2: fall back to .bak
  const bakPath = `${stateFilePath}.bak`;
  const bakResult = tryReadAndValidate(bakPath);
  if (bakResult.valid && bakResult.state) {
    return {
      success: true,
      state: bakResult.state,
      recovered: true,
      message: 'State recovered from backup. Your previous progress has been restored.',
    };
  }

  // Step 3: both failed -- provide a sanitized user-friendly message (no raw paths)
  const hasBackup = bakResult.errors.length > 0 && !bakResult.errors.every(e => e === 'File does not exist');
  const detail = hasBackup
    ? 'Both the state file and backup contain invalid data.'
    : 'The state file is invalid and no valid backup exists.';
  return {
    success: false,
    state: null,
    recovered: false,
    message: `State file and backup are both invalid: ${detail} A fresh analysis session will be started.`,
  };
}

/**
 * Write state with backup-before-modify and atomic rename.
 *
 * Flow:
 * 1. If state.json.bak already exists:
 *    - If state.json is ALSO valid, back it up (overwrite .bak).
 *    - If state.json is corrupt, DON'T overwrite .bak (it is the source of truth).
 * 2. If state.json.bak does NOT exist:
 *    - Create one from state.json if state.json exists and is valid.
 * 3. Write new state to state.json.tmp, then rename to state.json.
 * 4. Clean up .tmp on failure.
 * 5. On successful write, delete the .bak since the primary is now authoritative.
 *
 * @param stateFilePath - Absolute or relative path to state.json
 * @param newState - Valid StateData to persist
 * @returns Result indicating success or failure with details
 */
export async function writeStateWithProtection(
  stateFilePath: string,
  newState: StateData
): Promise<StatePreservationResult> {
  if (!stateFilePath || typeof stateFilePath !== 'string' || stateFilePath.trim() === '') {
    return {
      success: false,
      state: null,
      recovered: false,
      message: 'State path is empty or invalid.',
    };
  }

  // Guard against null, undefined, or non-object newState (prevents silent data corruption)
  if (newState === null || newState === undefined || typeof newState !== 'object' || Array.isArray(newState)) {
    return {
      success: false,
      state: null,
      recovered: false,
      message: 'New state must be a non-null object.',
    };
  }

  // Pre-validate serializability: catch circular refs and BigInt before any file mutation
  let content: string;
  try {
    content = JSON.stringify(newState, null, 2);
  } catch (err: any) {
    return {
      success: false,
      state: null,
      recovered: false,
      message: `State data cannot be serialized: ${err?.message ?? 'Unknown serialization error'}.`,
    };
  }

  // Pre-validate required keys: prevent writing corrupt state to disk
  const missingKeys = REQUIRED_TOP_LEVEL_KEYS.filter(
    (key) => !(key in (newState as unknown as Record<string, unknown>))
  );
  if (missingKeys.length > 0) {
    return {
      success: false,
      state: null,
      recovered: false,
      message: `New state is missing required keys: ${missingKeys.join(', ')}.`,
    };
  }

  const bakPath = `${stateFilePath}.bak`;
  const tmpPath = `${stateFilePath}.tmp`;
  const bakTmpPath = `${stateFilePath}.bak.tmp`;

  // Step 1: Manage backup (protect the last known good state)
  const bakExists = fileExistsSync(bakPath);
  const primaryResult = tryReadAndValidate(stateFilePath);

  if (bakExists) {
    // .bak exists: only overwrite it if the primary is ALSO valid (rolling the backup forward)
    if (primaryResult.valid && primaryResult.state) {
      try {
        await writeAtomic(bakPath, JSON.stringify(primaryResult.state, null, 2), bakTmpPath);
      } catch {
        // Backup creation failed -- abort the entire write to protect data
        return {
          success: false,
          state: primaryResult.state,
          recovered: false,
          message: 'Cannot create backup of current state; write aborted to protect existing data.',
        };
      }
    }
    // If primary is corrupt, leave .bak untouched (it IS the last good state).
  } else {
    // No .bak: create one from valid primary if it exists
    if (primaryResult.valid && primaryResult.state) {
      try {
        await writeAtomic(bakPath, JSON.stringify(primaryResult.state, null, 2), bakTmpPath);
      } catch {
        return {
          success: false,
          state: primaryResult.state,
          recovered: false,
          message: 'Cannot create backup of current state; write aborted to protect existing data.',
        };
      }
    }
    // If primary doesn't exist or is corrupt and no .bak exists, proceed without backup --
    // first write will become the new baseline.
  }

  // Step 2: Write new state atomically (content pre-serialized above)
  try {
    await writeAtomic(stateFilePath, content, tmpPath);
  } catch (error) {
    // Clean up .tmp if it somehow survived writeAtomic
    await safeUnlink(tmpPath);
    const fae = error instanceof FileAccessError ? error : undefined;
    const userMessage = buildUserFriendlyWriteFailureMessage(fae);
    return {
      success: false,
      state: primaryResult.state ?? (bakExists ? tryReadAndValidate(bakPath).state : null),
      recovered: false,
      message: userMessage,
      error: fae,
    };
  }

  // Step 3: Success -- remove backup since primary is now authoritative
  await safeUnlink(bakPath);
  await safeUnlink(tmpPath);

  return {
    success: true,
    state: newState,
    recovered: false,
    message: 'State written successfully. Previous backup cleared.',
  };
}

/**
 * Validate that a state file contains parseable JSON with required top-level keys.
 *
 * Returns a result object instead of throwing (unlike validateStateFile in
 * state-management.ts). This makes it suitable for recovery flows where
 * the caller wants error details, not exceptions.
 *
 * @param stateFilePath - Path to the file to validate
 * @returns Object with valid flag, parsed state (if valid), and any error strings
 */
export function validateStateContent(
  stateFilePath: string
): { valid: boolean; state: StateData | null; errors: string[] } {
  const errors: string[] = [];

  // 1. Read file content
  let content: string;
  try {
    content = fsSync.readFileSync(stateFilePath, 'utf-8');
  } catch (err: any) {
    errors.push(`File not readable: ${err?.message ?? String(err)}`);
    return { valid: false, state: null, errors };
  }

  // 2. Parse JSON
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (err: any) {
    errors.push(`Invalid JSON: ${err?.message ?? String(err)}`);
    return { valid: false, state: null, errors };
  }

  // 3. Check type
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    errors.push('State must be a non-null object');
    return { valid: false, state: null, errors };
  }

  // 4. Check required top-level keys
  for (const key of REQUIRED_TOP_LEVEL_KEYS) {
    if (!(key in (parsed as Record<string, unknown>))) {
      errors.push(`Missing required key: ${key}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, state: null, errors };
  }

  return { valid: true, state: parsed as StateData, errors: [] };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Build a user-friendly write failure message that does not expose raw file paths
 * or technical error details (AC5: suitable for end-user display).
 */
function buildUserFriendlyWriteFailureMessage(fae?: FileAccessError): string {
  if (!fae) {
    return 'State write failed: an unknown error occurred. Your previous state is preserved.';
  }
  const context = buildWriteFailureContext(fae.code);
  return `State write failed: ${context}. Your previous state is preserved.`;
}

/**
 * Map a FileErrorCode to a brief user-friendly context string.
 */
function buildWriteFailureContext(code: FileErrorCode): string {
  switch (code) {
    case 'ENOSPC':
      return 'disk is full';
    case 'EACCES':
      return 'permission denied';
    case 'EBUSY':
      return 'file is locked or in use';
    case 'ENOENT':
      return 'file or directory not found';
    case 'ENOTDIR':
      return 'invalid file path';
    case 'ENAMETOOLONG':
      return 'file path is too long';
    default:
      return 'an unexpected error occurred';
  }
}

/**
 * Synchronous file existence check (for pre-flight decisions).
 */
function fileExistsSync(filePath: string): boolean {
  try {
    return fsSync.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Best-effort unlink -- swallows errors (cleanup should never fail an operation).
 */
async function safeUnlink(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // File may not exist or we lack permission -- no action needed.
  }
}

/**
 * Atomic write: write to a .tmp file then rename to the target.
 * Cleans up the .tmp on failure.
 *
 * @param targetPath - Final file path
 * @param content - Content to write
 * @param tmpPath - Temporary file path
 */
async function writeAtomic(targetPath: string, content: string, tmpPath: string): Promise<void> {
  try {
    await fs.writeFile(tmpPath, content, { mode: 0o600, encoding: 'utf-8' });
    await fs.rename(tmpPath, targetPath);
  } catch (error) {
    // Handle EXDEV (cross-device rename): fall back to copy-to-temp-on-target-then-rename
    // This preserves atomicity by ensuring the final rename is on the target filesystem.
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'EXDEV') {
      const exdevTmpPath = `${targetPath}.exdev`;
      try {
        await fs.copyFile(tmpPath, exdevTmpPath);
        // copyFile does NOT preserve source permissions -- explicitly set 0o600
        // to match the security requirement (owner read/write only)
        await fs.chmod(exdevTmpPath, 0o600);
        await fs.rename(exdevTmpPath, targetPath);
        try {
          await fs.unlink(tmpPath);
        } catch {
          // Best effort cleanup of original tmp
        }
        return;
      } catch (copyError) {
        // Copy or rename failed -- clean up both temp files and throw
        try {
          await fs.unlink(exdevTmpPath);
        } catch {
          // Best effort
        }
        try {
          await fs.unlink(tmpPath);
        } catch {
          // Best effort
        }
        throw classifyFileSystemError(copyError, targetPath, 'write');
      }
    }

    // Clean up .tmp for non-EXDEV errors
    try {
      await fs.unlink(tmpPath);
    } catch {
      // Best effort -- .tmp may not exist if writeFile failed immediately.
    }
    // Re-throw with proper error classification (preserves ENOSPC, EACCES, EBUSY, etc.)
    throw classifyFileSystemError(error, targetPath, 'write');
  }
}

/**
 * Combined read + validate: returns validation result in one call.
 */
function tryReadAndValidate(
  filePath: string
): { valid: boolean; state: StateData | null; errors: string[] } {
  if (!fileExistsSync(filePath)) {
    return { valid: false, state: null, errors: ['File does not exist'] };
  }
  return validateStateContent(filePath);
}
