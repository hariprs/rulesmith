/**
 * Rule File Size Monitor (Story 6-5)
 *
 * Monitors rule file size and warns when it exceeds the threshold (500 lines).
 * Tracks line count in state.json for historical analysis.
 *
 * @module rule-file-size-monitor
 */

import * as fs from 'fs';
import * as path from 'path';
import { StateData } from './state-management';
import { AR22Error } from './command-variants';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Threshold for rule file line count (AR16)
 * Warning is shown when file exceeds this limit
 */
export const RULE_FILE_SIZE_THRESHOLD = 500;

/**
 * Maximum file size in bytes (10MB)
 * Prevents memory issues with extremely large files
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Result of file size check operation
 */
export interface FileSizeCheckResult {
  /** Current line count of the file */
  lineCount: number;
  /** Whether the file exceeds the threshold */
  exceedsThreshold: boolean;
  /** Whether a warning should be displayed */
  shouldWarn: boolean;
  /** Warning message (if any) */
  warning: string | null;
}

/**
 * Result of size warning generation
 */
export interface SizeWarningResult {
  /** The warning message */
  warning: string;
  /** Current line count */
  lineCount: number;
  /** Suggested actions to resolve */
  suggestedActions: string[];
}

// ============================================================================
// LINE COUNTING
// ============================================================================

/**
 * Count the number of lines in a file
 *
 * @param filePath - Absolute path to the file to count lines in
 * @returns Number of lines in the file (0 for empty files)
 * @throws AR22Error if file is not found, inaccessible, or path is invalid
 *
 * @example
 * ```typescript
 * const lineCount = countFileLines('/path/to/rules.md');
 * console.log(`File has ${lineCount} lines`);
 * ```
 */
export function countFileLines(filePath: string): number {
  // Validate path
  validateFilePath(filePath);

  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new AR22Error('Rule file not found', {
        what: `The rule file at path "${filePath}" does not exist or cannot be located.`,
        how: [
          'Verify the file path is correct',
          'Check if the platform configuration is accurate',
          'Ensure you have permission to access the directory'
        ],
        technical: `File not found: ${filePath}`
      });
    }

    // Check file size before reading
    const stats = fs.statSync(filePath);
    if (stats.size > MAX_FILE_SIZE_BYTES) {
      throw new AR22Error('Rule file exceeds maximum size', {
        what: `The rule file exceeds the maximum allowed size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB. This may indicate file corruption or an unusual configuration.`,
        how: [
          'Manually inspect the file to determine if it should be this large',
          'Consider consolidating or reducing the rule content',
          'If the file is legitimate, you may proceed with caution'
        ],
        technical: `File size: ${stats.size} bytes (${(stats.size / (1024 * 1024)).toFixed(2)}MB), max: ${MAX_FILE_SIZE_BYTES} bytes`
      });
    }

    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Handle empty file
    if (content.length === 0) {
      return 0;
    }

    // Count lines by splitting on newline characters
    // Normalize all line endings to LF: CRLF -> LF, then bare CR -> LF
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedContent.split('\n');
    
    // If file ends with newline, the last element is empty string (not a real line)
    // So we subtract 1 to get the actual line count
    if (normalizedContent.endsWith('\n')) {
      return lines.length - 1;
    }
    
    return lines.length;
  } catch (error) {
    if (error instanceof AR22Error) {
      throw error;
    }
    
    // Handle other errors (permission, etc.)
    if (error instanceof Error) {
      throw new AR22Error('Failed to read rule file', {
        what: `An error occurred while reading the rule file: ${error.message}`,
        how: [
          'Check file permissions',
          'Verify the file is accessible',
          'Ensure the file is not locked by another process'
        ],
        technical: `Error: ${error.message}, Path: ${filePath}`
      });
    }
    
    throw new AR22Error('Unknown error reading rule file', {
      what: 'An unexpected error occurred while reading the rule file.',
      how: [
        'Check the file path and permissions',
        'Try again or contact support if the issue persists'
      ],
      technical: `Path: ${filePath}`
    });
  }
}

// ============================================================================
// FILE SIZE CHECK
// ============================================================================

/**
 * Check if a rule file exceeds the size threshold
 *
 * @param filePath - Absolute path to the rule file
 * @returns FileSizeCheckResult with line count and warning status
 * @throws AR22Error if file is not found or inaccessible
 *
 * @example
 * ```typescript
 * const result = checkFileSize('/path/to/rules.md');
 * if (result.shouldWarn) {
 *   console.log(result.warning);
 * }
 * ```
 */
export function checkFileSize(filePath: string): FileSizeCheckResult {
  const lineCount = countFileLines(filePath);
  const exceedsThreshold = lineCount >= RULE_FILE_SIZE_THRESHOLD;
  const shouldWarn = exceedsThreshold;
  
  let warning: string | null = null;
  if (shouldWarn) {
    warning = generateSizeWarning(lineCount);
  }
  
  return {
    lineCount,
    exceedsThreshold,
    shouldWarn,
    warning
  };
}

// ============================================================================
// WARNING MESSAGE GENERATION
// ============================================================================

/**
 * Generate a size warning message in AR22 format
 *
 * @param lineCount - Current line count of the rule file
 * @returns Formatted warning message
 *
 * @example
 * ```typescript
 * const warning = generateSizeWarning(550);
 * console.log(warning);
 * ```
 */
export function generateSizeWarning(lineCount: number): string {
  const warning = `⚠️ Rule file exceeds ${RULE_FILE_SIZE_THRESHOLD} lines. Performance may degrade.

**What happened:** Your rule file currently contains ${lineCount} lines, which exceeds the recommended limit of ${RULE_FILE_SIZE_THRESHOLD} lines. Large rule files can slow down the system and make rules harder to maintain.

**How to fix:**
1. Review your rules and identify redundant or outdated rules
2. Consolidate similar rules into more general guidelines
3. Remove rules that are no longer relevant or have been superseded
4. Consider organizing rules into categories for better maintainability

**Technical details:** Current line count: ${lineCount}, threshold: ${RULE_FILE_SIZE_THRESHOLD} lines, excess: ${lineCount - RULE_FILE_SIZE_THRESHOLD} lines`;
  
  return warning;
}

// ============================================================================
// STATE UPDATE
// ============================================================================

/**
 * Update state.json with the current rule file line count
 *
 * @param statePath - Absolute path to state.json file
 * @param lineCount - Current line count to record
 * @throws AR22Error if state file is not found, corrupted, or inaccessible
 *
 * @example
 * ```typescript
 * updateStateWithLineCount('/path/to/state.json', 450);
 * ```
 */
export function updateStateWithLineCount(
  statePath: string,
  lineCount: number | null
): void {
  // Validate path
  validateFilePath(statePath);

  try {
    // Check if state file exists
    if (!fs.existsSync(statePath)) {
      throw new AR22Error('State file not found', {
        what: `The state file at path "${statePath}" does not exist or cannot be located.`,
        how: [
          'Verify the state file path is correct',
          'Check if the skill has been properly initialized',
          'Run /improve-rules to reinitialize state if needed'
        ],
        technical: `State file not found: ${statePath}`
      });
    }

    // Read current state
    const stateContent = fs.readFileSync(statePath, 'utf-8');
    
    // Parse state JSON
    let stateData: StateData;
    try {
      stateData = JSON.parse(stateContent) as StateData;
    } catch (parseError) {
      throw new AR22Error('State file corruption detected', {
        what: `The state file at "${statePath}" contains invalid JSON and appears to be corrupted.`,
        how: [
          'Restore state.json from a backup in the history/ directory',
          'Run /improve-rules to reinitialize state (this will create a fresh state file)',
          'If you have recent backups, manually restore from the most recent valid backup'
        ],
        technical: `JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
      });
    }

    // Update line count
    stateData.rule_file_line_count = lineCount;

    // Write updated state
    fs.writeFileSync(statePath, JSON.stringify(stateData, null, 2), 'utf-8');
  } catch (error) {
    if (error instanceof AR22Error) {
      throw error;
    }
    
    if (error instanceof Error) {
      throw new AR22Error('Failed to update state with line count', {
        what: `An error occurred while updating state.json: ${error.message}`,
        how: [
          'Check state file permissions',
          'Verify there is sufficient disk space',
          'Ensure no other process is locking the state file'
        ],
        technical: `Error: ${error.message}, Path: ${statePath}`
      });
    }
    
    throw new AR22Error('Unknown error updating state', {
      what: 'An unexpected error occurred while updating state.json with line count.',
      how: [
        'Check the state file path and permissions',
        'Try again or contact support if the issue persists'
      ],
      technical: `Path: ${statePath}`
    });
  }
}

// ============================================================================
// INTEGRATION FUNCTION
// ============================================================================

/**
 * Check rule file size and warn if it exceeds threshold
 * This is the main integration function that combines all operations
 *
 * @param rulesFilePath - Absolute path to the rule file
 * @param stateFilePath - Absolute path to state.json
 * @returns FileSizeCheckResult with line count and warning status
 * @throws AR22Error if files are not found or inaccessible
 *
 * @example
 * ```typescript
 * const result = checkAndWarnRuleFileSize(rulesPath, statePath);
 * if (result.shouldWarn) {
 *   console.log(result.warning);
 * }
 * ```
 */
export function checkAndWarnRuleFileSize(
  rulesFilePath: string,
  stateFilePath: string
): FileSizeCheckResult {
  // Check file size
  const result = checkFileSize(rulesFilePath);
  
  // Update state with line count (best effort - don't fail on state errors)
  try {
    updateStateWithLineCount(stateFilePath, result.lineCount);
  } catch (error) {
    // Log but don't fail - state update errors are non-critical
    console.error(`Warning: Failed to update state with line count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return result;
}

// ============================================================================
// PATH VALIDATION
// ============================================================================

/**
 * Validate file path to prevent path traversal attacks
 *
 * @param filePath - File path to validate
 * @throws AR22Error if path is invalid or contains path traversal
 */
function validateFilePath(filePath: string): void {
  // Check for path traversal
  if (filePath.includes('..')) {
    throw new AR22Error('Invalid file path', {
      what: 'The file path contains ".." which is not allowed for security reasons.',
      how: [
        'Use an absolute file path without ".." segments',
        'Verify the path is correctly configured'
      ],
      technical: `Invalid path: ${filePath}`
    });
  }

  // Check for empty path
  if (!filePath || filePath.trim().length === 0) {
    throw new AR22Error('Invalid file path', {
      what: 'The file path is empty.',
      how: [
        'Provide a valid absolute file path',
        'Verify the path configuration is correct'
      ],
      technical: 'Empty file path provided'
    });
  }
}
