/**
 * File Writer (Story 4.5)
 *
 * Handles atomic file modification with backup and rollback capabilities
 * for approved rule changes
 *
 * @module review/file-writer
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { RuleSuggestion } from '../rules/types';
import { Platform } from '../platform-detector';
import { FileModificationResult } from './types';
import { createBackup } from '../state-management';
import { suggestWorkarounds, WorkaroundAction } from '../error-workarounds';
import { classifyFileSystemError, FileAccessError } from '../file-access-errors';

// ============================================================================
// FILE WRITER
// ============================================================================

/**
 * File writer with atomic modification and rollback support
 *
 * @class FileWriter
 */
export class FileWriter {
  private readonly MAX_FILE_SIZE = 1024 * 1024; // 1MB max
  private readonly platform: Platform;
  private readonly historyDir: string;

  constructor(platform: Platform, historyDir?: string) {
    // Guard: Validate platform parameter
    if (!platform) {
      throw new Error('Platform cannot be null or undefined');
    }

    if (platform === Platform.UNKNOWN) {
      throw new Error('Cannot create FileWriter for unknown platform');
    }

    this.platform = platform;
    // Default to data/history if not provided
    this.historyDir = historyDir || path.join(process.cwd(), 'data', 'history');
  }

  /**
   * Write changes to file atomically
   *
   * @param filePath - Path to file to modify
   * @param changes - Array of rule changes to apply
   * @returns File modification result
   */
  async writeChanges(
    filePath: string,
    changes: RuleSuggestion[]
  ): Promise<FileModificationResult> {
    // Guard: Validate filePath parameter
    if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
      return {
        filePath: '',
        success: false,
        error: 'File path cannot be null, undefined, or empty',
      };
    }

    // Guard: Validate changes parameter
    if (!changes || !Array.isArray(changes)) {
      return {
        filePath: '',
        success: false,
        error: 'Changes must be a non-null array',
      };
    }

    // Guard: Validate changes array is not empty
    if (changes.length === 0) {
      return {
        filePath: '',
        success: false,
        error: 'Changes array cannot be empty',
      };
    }

    // Guard: Validate each change object
    for (let i = 0; i < changes.length; i++) {
      if (!changes[i]) {
        return {
          filePath: '',
          success: false,
          error: `Change at index ${i} is null or undefined`,
        };
      }
    }

    // CRITICAL: Validate and sanitize file path
    const sanitizedPath = this.sanitizeFilePath(filePath);

    // CRITICAL: Validate file doesn't exceed size limit
    try {
      const stats = await fs.stat(sanitizedPath);
      if (stats.size > this.MAX_FILE_SIZE) {
        return {
          filePath: sanitizedPath,
          success: false,
          error: `File exceeds maximum size of ${this.MAX_FILE_SIZE} bytes`,
        };
      }
    } catch (error) {
      // File doesn't exist yet, which is fine
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        return {
          filePath: sanitizedPath,
          success: false,
          error: `Failed to check file: ${(error as Error).message}`,
        };
      }
    }

    const backupPath = `/tmp/backup-${uuidv4()}-${path.basename(sanitizedPath)}`;
    let tempPath = '';
    let persistentBackupPath: string | null = null;

    try {
      // Step 0: Create persistent backup in data/history/ (Story 5.2)
      // This backup is kept for manual recovery, unlike the temp backup
      try {
        // Guard: Verify history directory is configured and accessible
        if (!this.historyDir) {
          throw new Error('History directory is not configured');
        }

        // Guard: Check if history directory is writable before attempting backup
        try {
          await fs.access(this.historyDir, fs.constants.W_OK);
        } catch (accessError) {
          throw new Error(`History directory is not writable: ${this.historyDir}`);
        }

        // Guard: Add timeout protection for backup creation (30 seconds max)
        const backupTimeoutMs = 30000;
        let timeoutTriggered = false;

        const backupPromise = createBackup(sanitizedPath, this.historyDir);
        const timeoutPromise = new Promise<string | null>((_, reject) => {
          setTimeout(() => {
            timeoutTriggered = true;
            reject(new Error('Backup creation timeout'));
          }, backupTimeoutMs);
        });

        try {
          persistentBackupPath = await Promise.race([backupPromise, timeoutPromise]);
        } catch (raceError) {
          // If timeout occurred, the backup may still be in progress
          // We cannot clean it up safely here as it may complete after timeout
          throw new Error(`Backup creation failed: ${raceError instanceof Error ? raceError.message : String(raceError)}`);
        }

        // If backup completed but timeout was about to trigger, we still have the backup
        // This is safe - the backup succeeded before timeout

        // Handle null return (missing source file) per AC8
        if (persistentBackupPath === null) {
          console.warn(`[WARNING] Source file does not exist, skipping backup (new file will be created): ${sanitizedPath}`);
        } else {
          console.log(`[INFO] Persistent backup created: ${persistentBackupPath}`);
        }
      } catch (backupError) {
        // If backup fails, abort the operation per Story 5.2 AC4
        const errorMsg = backupError instanceof Error ? backupError.message : String(backupError);
        console.error(`[ERROR] Backup creation failed: ${errorMsg}`);
        console.error('[ERROR] Aborting write operation - original file unchanged');

        // Guard: Provide actionable error messages based on error type
        // Check error codes for more reliable detection than string matching
        let actionableMessage = `Backup creation failed: ${errorMsg}. Original file unchanged.`;

        const lowerError = errorMsg.toLowerCase();
        if (lowerError.includes('enoent') || lowerError.includes('source file does not exist')) {
          actionableMessage += ' Ensure the source file exists and try again.';
        } else if (lowerError.includes('eacces') || lowerError.includes('eperm') || lowerError.includes('permission')) {
          actionableMessage += ' Check file and directory permissions.';
        } else if (lowerError.includes('enospc') || lowerError.includes('disk full') || lowerError.includes('space')) {
          actionableMessage += ' Free up disk space and try again.';
        } else if (lowerError.includes('timeout')) {
          actionableMessage += ' The operation took too long. Try again.';
        } else if (lowerError.includes('disk') || lowerError.includes('i/o')) {
          actionableMessage += ' Check disk health and available space.';
        }

        return {
          filePath: sanitizedPath,
          success: false,
          error: actionableMessage,
        };
      }

      // Guard: Only verify backup if it was created (not null)
      // Note: Verification happens inside createBackup() with checksum validation
      // Additional verification here would create a race condition window
      // The createBackup function already ensures atomic backup creation with integrity checks

      // Step 1: Create temp backup for rollback during write operation
      await fs.copyFile(sanitizedPath, backupPath);

      // Step 2: Read current file content
      const currentContent = await fs.readFile(sanitizedPath, 'utf-8');

      // Step 3: Apply changes with platform-specific formatting
      const updatedContent = this.applyChangesToContent(currentContent, changes);

      // Step 4: Write to temporary file
      tempPath = `/tmp/temp-${uuidv4()}-${path.basename(sanitizedPath)}`;
      await fs.writeFile(tempPath, updatedContent, 'utf-8');

      // Step 5: Atomic rename (overwrite original)
      await fs.rename(tempPath, sanitizedPath);

      // Step 6: Clean up temp backup (with error handling)
      try {
        await fs.unlink(backupPath);
      } catch (cleanupError) {
        // Log warning but don't fail the operation
        console.warn(`[WARNING] Failed to cleanup temp backup file: ${backupPath}`, cleanupError);
      }

      return {
        filePath: sanitizedPath,
        success: true,
        persistentBackupPath, // Include persistent backup path for reference (Story 5.2)
      };
    } catch (error) {
      // Guard: Clean up temp file if it exists and operation failed
      if (tempPath) {
        try {
          await fs.unlink(tempPath);
        } catch (tempCleanupError) {
          console.warn(`[WARNING] Failed to cleanup temp file: ${tempPath}`, tempCleanupError);
        }
      }

      // Classify the error and suggest workarounds (Story 6.4 integration)
      const classifiedError = classifyFileSystemError(error, sanitizedPath, 'write');
      const actions = suggestWorkarounds(classifiedError);

      return {
        filePath: sanitizedPath,
        success: false,
        error: classifiedError.message,
        backupPath, // Return backup path for rollback
        workaroundSuggestions: actions, // Workaround actions for caller to present (Story 6.4)
      };
    }
  }

  /**
   * Apply changes to file content with platform-specific formatting
   *
   * @private
   * @param content - Current file content
   * @param changes - Array of rule changes to apply
   * @returns Updated file content
   */
  private applyChangesToContent(content: string, changes: RuleSuggestion[]): string {
    // Guard: Validate content parameter
    if (typeof content !== 'string') {
      throw new Error('Content must be a string');
    }

    // Guard: Validate changes parameter
    if (!changes || changes.length === 0) {
      return content;
    }

    const lines: string[] = [];

    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];

      // Guard: Validate change object
      if (!change) {
        console.warn(`[WARNING] Skipping null/undefined change at index ${i}`);
        continue;
      }

      // CRITICAL: Use edited_rule if user modified it (Story 4.3)
      const ruleText = change.edited_rule || change.ruleText;

      // Guard: Validate rule text exists
      if (!ruleText || typeof ruleText !== 'string') {
        console.warn(`[WARNING] Skipping change at index ${i}: missing or invalid rule text`);
        continue;
      }

      // Guard: Validate explanation exists
      if (!change.explanation || typeof change.explanation !== 'string') {
        console.warn(`[WARNING] Skipping change at index ${i}: missing or invalid explanation`);
        continue;
      }

      // CRITICAL: Use platform-specific format (Story 3.3/3.4)
      const formattedRule =
        this.platform === Platform.CURSOR
          ? this.formatForCursor(ruleText, change) // Plain text with # comments
          : this.formatForCopilot(ruleText, change); // Markdown with ## headings

      lines.push(formattedRule);
    }

    // Guard: If no valid changes were processed, return original content
    if (lines.length === 0) {
      console.warn('[WARNING] No valid changes to apply, returning original content');
      return content;
    }

    return content + '\n' + lines.join('\n');
  }

  /**
   * Format rule for Cursor platform (Story 3.3)
   *
   * @private
   * @param rule - Rule text
   * @param change - Rule suggestion
   * @returns Formatted rule for Cursor
   */
  private formatForCursor(rule: string, change: RuleSuggestion): string {
    // Guard: Validate inputs (defense in depth)
    if (!rule || !change?.explanation) {
      throw new Error('Rule and explanation are required for formatting');
    }

    // Guard: Sanitize inputs to prevent injection attacks
    const sanitizedRule = rule.replace(/[\r\n]+/g, ' ').trim();
    const sanitizedExplanation = change.explanation.replace(/[\r\n]+/g, ' ').trim();

    return `# ${sanitizedExplanation}\n${sanitizedRule}`;
  }

  /**
   * Format rule for Copilot platform (Story 3.4)
   *
   * @private
   * @param rule - Rule text
   * @param change - Rule suggestion
   * @returns Formatted rule for Copilot
   */
  private formatForCopilot(rule: string, change: RuleSuggestion): string {
    // Guard: Validate inputs (defense in depth)
    if (!rule || !change?.explanation) {
      throw new Error('Rule and explanation are required for formatting');
    }

    // Guard: Sanitize inputs to prevent injection attacks
    const sanitizedRule = rule.replace(/[\r\n]+/g, ' ').trim();
    const sanitizedExplanation = change.explanation.replace(/[\r\n]+/g, ' ').trim();

    return `## ${sanitizedExplanation}\n- ${sanitizedRule}`;
  }

  /**
   * Sanitize file path to prevent security issues
   *
   * @private
   * @param inputPath - Input file path
   * @returns Sanitized absolute file path
   * @throws Error if path is invalid or not allowed
   */
  private sanitizeFilePath(inputPath: string): string {
    // Guard: Validate input path
    if (!inputPath || typeof inputPath !== 'string') {
      throw new Error('File path must be a non-empty string');
    }

    const resolved = path.resolve(inputPath);

    // Guard: Path traversal prevention
    if (resolved.includes('..')) {
      throw new Error('Path traversal detected');
    }

    // Guard: Absolute path check (must be within project)
    const cwd = process.cwd();
    if (!resolved.startsWith(cwd)) {
      throw new Error('File path must be within project directory');
    }

    // Guard: Only allow specific rule file locations
    const allowedPaths = [
      path.join(cwd, '.cursorrules'),
      path.join(cwd, '.github', 'copilot-instructions.md'),
    ];

    if (!allowedPaths.some((allowed) => resolved === allowed)) {
      throw new Error(`File path not in allowed list: ${resolved}`);
    }

    return resolved;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a file writer instance
 *
 * @param platform - Platform enum value
 * @param historyDir - Optional history directory for persistent backups
 * @returns FileWriter instance
 * @throws Error if platform is invalid
 */
export function createFileWriter(platform: Platform, historyDir?: string): FileWriter {
  // Guard: Validate platform parameter
  if (!platform) {
    throw new Error('Platform cannot be null or undefined');
  }

  if (platform === Platform.UNKNOWN) {
    throw new Error('Cannot create FileWriter for unknown platform');
  }

  return new FileWriter(platform, historyDir);
}
