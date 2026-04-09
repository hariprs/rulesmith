/**
 * Manual Error Workarounds (Story 6.4)
 *
 * Provides workaround suggestion and execution for file access errors.
 * Maps detected error codes to actionable workarounds and executes them
 * with safety guards: confirmation gating, state file protection, and
 * atomic filesystem operations.
 *
 * @module error-workarounds
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { FileAccessError, safeReadFile } from './file-access-errors';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * A single workaround action that can be suggested to the user.
 */
export interface WorkaroundAction {
  id: string;
  label: string;
  description: string;
  requiresConfirmation: boolean;
}

/**
 * Result of executing a workaround action.
 */
export interface WorkaroundResult {
  success: boolean;
  message: string;
  fileChanged?: string;
}

// Re-export the ClassifiedFileAccessError alias for convenience
export type ClassifiedFileAccessError = FileAccessError;

// ============================================================================
// Constants
// ============================================================================

const STATE_FILE_BASENAMES = new Set<string>(['state.json', 'state.json.bak', 'state.json.tmp']);

const STALENESS_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour in milliseconds

const SKIP_DESCRIPTION = 'Skip this file and continue with remaining operations. The file will be marked as skipped in the summary.';

// ============================================================================
// Internal Error Classes
// ============================================================================

/**
 * Internal error used to signal state file protection violations
 * within the clear-temp flow. Not exported -- consumers check error
 * messages for the "state" keyword.
 */
class StateFileProtectionError extends Error {
  constructor(stateFileName: string) {
    super(
      `Cannot clear temp files in directory containing protected state file: "${stateFileName}". ` +
      `State files are protected. Please restore from backup instead (see state preservation recovery).`
    );
    this.name = 'StateFileProtectionError';
  }
}

// ============================================================================
// Workaround Suggestion (Pure Function)
// ============================================================================

/**
 * Suggests workaround actions based on the detected error code.
 *
 * Pure function -- no side effects. Maps error codes to 1-3 actionable
 * workaround suggestions with user-facing labels and descriptions.
 *
 * @param error - The classified file access error
 * @returns Array of 0-3 workaround actions relevant to the error type
 */
export function suggestWorkarounds(error: FileAccessError): WorkaroundAction[] {
  switch (error.code) {
    case 'ENOENT':
      return [
        {
          id: 'retry',
          label: 'Retry read',
          description: 'Re-attempt reading the file. Most effective if you have restored the file from backup or fixed the path since the error occurred.',
          requiresConfirmation: false,
        },
        {
          id: 'skip',
          label: 'Skip operation',
          description: SKIP_DESCRIPTION,
          requiresConfirmation: false,
        },
      ];

    case 'EACCES':
      return [
        {
          id: 'retry',
          label: 'Retry read',
          description: 'Re-attempt reading the file. Most effective if you have fixed file permissions since the error occurred.',
          requiresConfirmation: false,
        },
        {
          id: 'skip',
          label: 'Skip operation',
          description: SKIP_DESCRIPTION,
          requiresConfirmation: false,
        },
      ];

    case 'EBUSY':
      return [
        {
          id: 'retry',
          label: 'Retry after delay',
          description: 'Re-attempt reading the file. Most effective if the locking process has released the file.',
          requiresConfirmation: false,
        },
        {
          id: 'force-unlock',
          label: 'Force unlock',
          description: 'Force-release the locked file by copying and renaming it. WARNING: This is a destructive and irreversible operation.',
          requiresConfirmation: true,
        },
        {
          id: 'skip',
          label: 'Skip operation',
          description: SKIP_DESCRIPTION,
          requiresConfirmation: false,
        },
      ];

    case 'ENOSPC':
      return [
        {
          id: 'clear-temp',
          label: 'Clear temp files',
          description: 'Remove stale .tmp files (older than 1 hour) from the project directory to free up disk space.',
          requiresConfirmation: true,
        },
        {
          id: 'skip',
          label: 'Skip operation',
          description: SKIP_DESCRIPTION,
          requiresConfirmation: false,
        },
      ];

    default:
      // For unrecognized error codes (ENOTDIR, ENAMETOOLONG, UNKNOWN),
      // return a minimal skip action so the user is never left without options.
      return [
        {
          id: 'skip',
          label: 'Skip operation',
          description: SKIP_DESCRIPTION,
          requiresConfirmation: false,
        },
      ];
  }
}

// ============================================================================
// Workaround Execution (Impure -- performs file I/O)
// ============================================================================

/**
 * Executes a workaround action for the given file path.
 *
 * For `clear-temp`, the `filePath` parameter is interpreted as the directory
 * to scan for stale .tmp files.
 *
 * @param actionId - The workaround action to execute (retry, skip, force-unlock, clear-temp)
 * @param filePath - Target file path (or directory for clear-temp)
 * @param options - Optional configuration; `confirmed: true` required for destructive actions
 * @returns Promise resolving to a WorkaroundResult
 * @throws If confirmation is missing for destructive actions, state file is targeted,
 *         or the action fails
 */
export async function executeWorkaround(
  actionId: string,
  filePath: string,
  options?: { confirmed?: boolean }
): Promise<WorkaroundResult> {
  // Route to the appropriate action handler
  switch (actionId) {
    case 'retry':
      return executeRetry(filePath);
    case 'skip':
      return executeSkip(filePath);
    case 'force-unlock':
      return executeForceUnlock(filePath, options?.confirmed ?? false);
    case 'clear-temp':
      return executeClearTemp(filePath, options?.confirmed ?? false);
    default:
      throw new Error(`Unknown workaround action: "${actionId}". Valid actions are: retry, skip, force-unlock, clear-temp.`);
  }
}

// ============================================================================
// State File Protection
// ============================================================================

/**
 * Checks if a path targets a protected state file.
 *
 * @param filePath - The file path to check
 * @throws Error if the path matches a protected state file basename
 */
function assertNotStateFile(filePath: string): void {
  const basename = path.basename(filePath);
  if (STATE_FILE_BASENAMES.has(basename)) {
    throw new Error(
      `Cannot perform workaround on protected state file: "${basename}". ` +
      `State files are protected. Please restore from backup instead (see state preservation recovery).`
    );
  }
}

// ============================================================================
// Project Tree Validation
// ============================================================================

/**
 * Checks if a directory is within the project tree (process.cwd() subdirectory).
 *
 * Resolves symlinks via fs.realpath to prevent path traversal through
 * symbolic links.
 *
 * @param dirPath - The directory path to check
 * @returns true if the directory is within the project tree
 */
async function isWithinProjectTree(dirPath: string): Promise<boolean> {
  const projectRoot = process.cwd();
  const resolvedDir = await fs.realpath(dirPath).catch(() => path.resolve(dirPath));
  const resolvedRoot = path.resolve(projectRoot);
  return resolvedDir === resolvedRoot || resolvedDir.startsWith(resolvedRoot + path.sep);
}

// ============================================================================
// Action: Retry
// ============================================================================

async function executeRetry(filePath: string): Promise<WorkaroundResult> {
  // State file protection applies to all actions
  assertNotStateFile(filePath);

  try {
    await safeReadFile(filePath);
    return {
      success: true,
      message: `File "${filePath}" is now accessible. Retry succeeded.`,
    };
  } catch (error) {
    // For ENOENT, provide specific user guidance
    if (error instanceof FileAccessError && error.code === 'ENOENT') {
      throw new Error(
        `File not found: "${filePath}". The file does not exist. ` +
        `Please ensure the file exists first (e.g., restore from backup, fix the path) before retrying. ` +
        `This is not a transient error -- manual intervention is required.`
      );
    }
    // For other errors (EACCES, EBUSY), re-throw with context
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Retry failed for "${filePath}": ${message}. ` +
      `This may be a transient error. Please resolve the underlying issue (e.g., fix permissions, close the locking process) and try again.`
    );
  }
}

// ============================================================================
// Action: Skip
// ============================================================================

async function executeSkip(filePath: string): Promise<WorkaroundResult> {
  // State file protection applies to all actions
  assertNotStateFile(filePath);

  // Skip does not modify the filesystem
  return {
    success: true,
    message: `Operation skipped for file: "${filePath}". The file has been recorded as skipped in the summary.`,
    fileChanged: filePath,
  };
}

// ============================================================================
// Action: Force-Unlock (safe copy-rename pattern)
// ============================================================================

async function executeForceUnlock(
  filePath: string,
  confirmed: boolean
): Promise<WorkaroundResult> {
  // Confirmation gating
  if (!confirmed) {
    throw new Error(
      `Force-unlock is a destructive operation and requires explicit confirmation. ` +
      `Please confirm by passing { confirmed: true } to proceed.`
    );
  }

  // State file protection
  assertNotStateFile(filePath);

  // Guard: reject directory targets
  let isDirectoryTarget = false;
  try {
    const stat = await fs.stat(filePath);
    isDirectoryTarget = stat.isDirectory();
  } catch {
    // stat failed (e.g., ENOENT, EACCES on parent) -- let copyFile fail naturally
    // downstream with a clear "could not copy" message.
  }

  if (isDirectoryTarget) {
    throw new Error(
      `Force-unlock requires a file path but received a directory: "${filePath}". ` +
      `Force-unlock only works on files, not directories.`
    );
  }

  const unlockTempPath = filePath + '.unlock.tmp';

  // Clean up any stale .unlock.tmp from a prior crashed attempt
  try {
    await fs.unlink(unlockTempPath);
  } catch {
    // Best-effort: may not exist, or may be locked -- copyFile will overwrite if accessible
  }

  try {
    // Step 1: Copy the file to a temporary location
    await fs.copyFile(filePath, unlockTempPath);
  } catch (error) {
    // Copy failed -- no changes were made to the original
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Force-unlock failed: could not copy "${filePath}" to temporary location. ` +
      `Original file is untouched. Reason: ${message}`
    );
  }

  try {
    // Step 2: Atomic rename from temp to original (overwrites the original)
    await fs.rename(unlockTempPath, filePath);
  } catch (renameError) {
    // Rename failed -- clean up the temp file and leave original untouched
    try {
      await fs.unlink(unlockTempPath);
    } catch (_cleanupErr) {
      // Best-effort cleanup; temp file may not exist
    }
    const message = renameError instanceof Error ? renameError.message : String(renameError);
    throw new Error(
      `Force-unlock failed: could not rename temporary file back to "${filePath}". ` +
      `Original file is untouched. Reason: ${message}`
    );
  }

  // Step 3: Rename succeeded -- the .unlock.tmp has been consumed by the rename
  // (fs.rename atomically replaces the destination, so the temp no longer exists as a separate file)
  // No cleanup needed -- the rename consumed the temp file.
  return {
    success: true,
    message: `File "${filePath}" has been force-unlocked successfully. The file is now accessible.`,
    fileChanged: filePath,
  };
}

// ============================================================================
// Action: Clear Temp Files
// ============================================================================

async function executeClearTemp(
  dirPath: string,
  confirmed: boolean
): Promise<WorkaroundResult> {
  // Confirmation gating
  if (!confirmed) {
    throw new Error(
      `Clear-temp will remove stale temporary files and requires explicit confirmation. ` +
      `Please confirm by passing { confirmed: true } to proceed.`
    );
  }

  // State file protection: check if the directory path itself is a state file
  // (e.g., someone passes "state.json" as the directory path)
  assertNotStateFile(dirPath);

  // State file protection: check if any state file exists in the target directory
  // This prevents clearing temps from a directory that contains protected state files
  for (const stateBasename of Array.from(STATE_FILE_BASENAMES)) {
    const statePath = path.join(dirPath, stateBasename);
    try {
      await fs.access(statePath);
      // State file exists in this directory -- block the action
      throw new StateFileProtectionError(stateBasename);
    } catch (error) {
      if (error instanceof StateFileProtectionError) {
        throw error;
      }
      // Use duck-typing to extract error code (avoids instanceof issues across module boundaries)
      const errObj = error as Record<string, unknown>;
      const errCode = (errObj !== null && typeof errObj === 'object' && typeof errObj.code === 'string')
        ? errObj.code
        : undefined;
      if (errCode === 'ENOENT') {
        // State file does not exist -- continue to next basename
        continue;
      }
      // Non-ENOENT errors on access check (e.g., EACCES on directory) --
      // we cannot determine if the state file exists, so fail safely
      throw new Error(
        `Cannot safely check for state file "${stateBasename}" in directory "${dirPath}": ` +
        `${error instanceof Error ? error.message : String(error)}. ` +
        `Cannot proceed with clear-temp.`
      );
    }
  }

  // Project tree validation
  if (!await isWithinProjectTree(dirPath)) {
    throw new Error(
      `Clear-temp is restricted to the project directory tree. ` +
      `"${dirPath}" is outside the project root ("${process.cwd()}"). ` +
      `This is a safety measure to prevent deleting temp files from unrelated processes.`
    );
  }

  const resolvedDir = path.resolve(dirPath);

  // Read directory contents
  let entries: string[];
  try {
    entries = await fs.readdir(resolvedDir);
  } catch (error) {
    const errno = error instanceof Error && 'code' in error ? (error as NodeJS.ErrnoException).code : undefined;
    if (errno === 'ENOTDIR') {
      throw new Error(`Clear-temp requires a directory path but received a file path: "${resolvedDir}". Please pass the directory to scan, not a file.`);
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read directory "${resolvedDir}": ${message}`);
  }

  const now = Date.now();
  let removedCount = 0;

  for (const entry of entries) {
    if (!entry.endsWith('.tmp')) {
      continue; // Only scan .tmp files
    }

    const fullPath = path.join(resolvedDir, entry);

    try {
      const stat = await fs.stat(fullPath);

      // Skip directories
      if (stat.isDirectory()) {
        continue;
      }

      // Check mtime-based staleness
      const mtimeMs = stat.mtimeMs;
      const ageMs = now - mtimeMs;

      if (ageMs > STALENESS_THRESHOLD_MS) {
        // File is older than 1 hour -- remove it
        await fs.unlink(fullPath);
        removedCount++;
      }
    } catch (_error) {
      // Best-effort: skip files we can't stat or unlink
    }
  }

  return {
    success: true,
    message: `Cleared ${removedCount} stale .tmp file(s) from "${resolvedDir}". Files older than 1 hour were removed.`,
    fileChanged: resolvedDir,
  };
}
