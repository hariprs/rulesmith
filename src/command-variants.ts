/**
 * Command Variants Implementation (Story 1-7)
 *
 * Implements --stats, --history, and --rollback command variants
 * following the test architecture principle: unit > integration > E2E
 *
 * This module provides the production implementation that the unit tests validate.
 */

import * as fs from 'fs';
import * as path from 'path';
import { displayStats } from './state-management';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CommandParseResult {
  action: 'stats' | 'history' | 'rollback' | 'both' | 'analyze' | 'consolidate';
  timestamp?: string;
  flags: {
    stats: boolean;
    history: boolean;
    rollback: boolean;
    consolidate: boolean;
  };
}

export interface CommandError {
  type: string;
  message: string;
  what: string;
  how: string[];
  technical: string;
}

export type Platform = 'claude-code' | 'cursor' | 'copilot';

export interface ResultEntry {
  timestamp: string;
  status: 'applied' | 'pending' | 'failed' | 'rollback';
  summary: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ABSOLUTE_PATHS = {
  BASE: '/Users/hpandura/Personal-Projects/Project-Self_Improvement/.claude/skills/rulesmith',
  STATE: '/Users/hpandura/Personal-Projects/Project-Self_Improvement/.claude/skills/rulesmith/data/state.json',
  RESULTS: '/Users/hpandura/Personal-Projects/Project-Self_Improvement/.claude/skills/rulesmith/data/results.jsonl',
  HISTORY_DIR: '/Users/hpandura/Personal-Projects/Project-Self_Improvement/.claude/skills/rulesmith/data/history',
} as const;

// ============================================================================
// ERROR HANDLING (AR22 COMPLIANT)
// ============================================================================

export class AR22Error extends Error {
  public readonly what: string;
  public readonly how: string[];
  public readonly technical: string;

  constructor(brief: string, details: { what: string; how: string[]; technical: string }) {
    super(brief);
    this.what = details.what;
    this.how = details.how;
    this.technical = details.technical;
    this.name = 'AR22Error';
  }

  toString(): string {
    return `⚠️ Error: ${this.message}\n\n**What happened:** ${this.what}\n\n**How to fix:**\n${this.how.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n**Technical details:** ${this.technical}`;
  }
}

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

export function detectPlatform(): Platform {
  if (process.env.CLAUDE_CODE === 'true') return 'claude-code';
  if (fs.existsSync(path.join(ABSOLUTE_PATHS.BASE, '../../.cursorrules'))) return 'cursor';
  if (fs.existsSync(path.join(ABSOLUTE_PATHS.BASE, '../../.github/copilot-instructions.md'))) return 'copilot';
  return 'claude-code';
}

export function getRulesFilePath(platform: Platform): string {
  const projectRoot = path.join(ABSOLUTE_PATHS.BASE, '../..');
  switch (platform) {
    case 'cursor': return path.join(projectRoot, '.cursorrules');
    case 'copilot': return path.join(projectRoot, '.github/copilot-instructions.md');
    case 'claude-code':
    default: return path.join(projectRoot, '.claude/custom-instructions.md');
  }
}

// ============================================================================
// COMMAND PARSING
// ============================================================================

export function parseCommand(input: string): CommandParseResult | CommandError {
  // Guard: Input sanitization - prevent command injection
  if (typeof input !== 'string') {
    return {
      type: 'INVALID_INPUT',
      message: 'Command input must be a string',
      what: 'Received non-string input',
      how: ['Provide command as a string', 'Use /improve-rules with valid flags'],
      technical: `Received type: ${typeof input}`
    };
  }

  const trimmedInput = input.trim();

  // Guard: Check for suspicious characters that might indicate injection attempts
  const dangerousChars = /[;&|`$()<>]/;
  if (dangerousChars.test(trimmedInput)) {
    return {
      type: 'INVALID_INPUT',
      message: 'Command contains dangerous characters',
      what: 'Input may contain shell command injection attempts',
      how: ['Remove special characters: ; & | ` $ ( ) < >', 'Use only alphanumeric characters and flags'],
      technical: `Input contains dangerous characters: ${trimmedInput}`
    };
  }

  if (trimmedInput === '') {
    return {
      type: 'EMPTY_INPUT',
      message: 'Empty command input',
      what: 'Command input cannot be empty',
      how: ['Provide a valid command', 'Use /improve-rules with valid flags'],
      technical: 'Input: empty string'
    };
  }

  const flags = {
    stats: trimmedInput.includes('--stats'),
    history: trimmedInput.includes('--history'),
    rollback: trimmedInput.includes('--rollback'),
    consolidate: trimmedInput.includes('--consolidate')
  };

  const timestampMatch = trimmedInput.match(/--to\s+(\S+)/);
  const timestamp = timestampMatch ? timestampMatch[1] : undefined;

  // Check for unknown flags
  const knownFlags = ['--stats', '--history', '--rollback', '--to', '--consolidate', '--force'];
  const allFlags = trimmedInput.match(/--\S+/g) || [];
  const unknownFlags = allFlags.filter(f => !knownFlags.includes(f));

  if (unknownFlags.length > 0) {
    return {
      type: 'UNKNOWN_FLAG',
      message: `Unknown flag(s): ${unknownFlags.join(', ')}`,
      what: `Command contains unknown flag(s): ${unknownFlags.join(', ')}`,
      how: [
        'Use valid flags: --stats, --history, --rollback',
        'Example: /improve-rules --stats',
        'Example: /improve-rules --rollback --to YYYY-MM-DDTHH:MM:SSZ'
      ],
      technical: `Unknown flags: ${unknownFlags.join(', ')}, Error: UNKNOWN_FLAG`
    };
  }

  // Validate flag combinations
  if (flags.rollback) {
    if (!timestamp) {
      return {
        type: 'MISSING_PARAMETER',
        message: 'Missing timestamp parameter',
        what: '--rollback flag requires --to {timestamp} parameter',
        how: [
          'Use format: /improve-rules --rollback --to YYYY-MM-DDTHH:MM:SSZ',
          'Example: /improve-rules --rollback --to 2026-03-16T14:30:00Z'
        ],
        technical: 'Flag combination: --rollback without --to, Error: MISSING_PARAMETER'
      };
    }
    if (flags.stats || flags.history) {
      return {
        type: 'INVALID_COMBINATION',
        message: 'Invalid flag combination',
        what: '--rollback cannot be combined with other flags',
        how: [
          'Use --rollback --to {timestamp} alone',
          'Run /improve-rules --stats or /improve-rules --history separately'
        ],
        technical: `Flags: --rollback with ${flags.stats ? '--stats' : ''}${flags.history ? '--history' : ''}`
      };
    }
    return { action: 'rollback', timestamp, flags };
  }

  if (timestamp && !flags.rollback) {
    return {
      type: 'INVALID_COMBINATION',
      message: 'Invalid flag combination',
      what: '--to parameter requires --rollback flag',
      how: [
        'Use format: /improve-rules --rollback --to {timestamp}',
        'Or remove --to parameter if not rolling back'
      ],
      technical: 'Flag combination: --to without --rollback, Error: INVALID_COMBINATION'
    };
  }

  if (flags.stats && flags.history) {
    return { action: 'both', flags };
  }

  if (flags.stats) return { action: 'stats', flags };
  if (flags.history) return { action: 'history', flags };
  if (flags.consolidate) return { action: 'consolidate', flags };

  return { action: 'analyze', flags };
}

// ============================================================================
// CONSOLIDATION APPROVAL COMMAND PARSING (Story 6.10)
// ============================================================================

export interface ApprovalCommandParseResult {
  action: 'approve' | 'reject' | 'edit' | 'approve_all' | 'reject_all';
  numbers: number[];
  approveAll?: boolean;
  rejectAll?: boolean;
  valid: boolean;
  error?: string;
}

export function parseApprovalCommand(input: string, maxNumber: number = 1000): ApprovalCommandParseResult {
  // Guard: Validate maxNumber is positive
  if (maxNumber <= 0) {
    throw new Error('maxNumber must be positive');
  }

  const trimmed = input.trim().toLowerCase();

  // Parse "approve all" command
  if (trimmed === 'approve all') {
    return { action: 'approve', numbers: [], approveAll: true, valid: true };
  }

  // Parse "reject all" command
  if (trimmed === 'reject all') {
    return { action: 'reject', numbers: [], rejectAll: true, valid: true };
  }

  // Parse action type
  let action: 'approve' | 'reject' | 'edit' | 'approve_all' | 'reject_all';
  if (trimmed.startsWith('approve ')) {
    action = 'approve';
  } else if (trimmed.startsWith('reject ')) {
    action = 'reject';
  } else if (trimmed.startsWith('edit ')) {
    action = 'edit';
  } else {
    return {
      action: 'approve',
      numbers: [],
      valid: false,
      error: 'Invalid command. Examples: "approve 1, 3, 5", "reject 2, 4", "edit 3", "approve all"'
    };
  }

  // Extract numbers part
  const numbersPart = trimmed.slice(action.length).trim();

  // Parse numbers (support comma-separated, space-separated, and ranges)
  const numbers: number[] = [];
  const parts = numbersPart.split(/[,\s]+/).filter(p => p.length > 0);

  for (const part of parts) {
    if (part.includes('-')) {
      // Guard: Validate range format
      if (!part.match(/^\d+-\d+$/)) {
        return {
          action,
          numbers: [],
          valid: false,
          error: `Invalid range format: ${part}. Use format like "1-5"`
        };
      }

      // Parse range (e.g., "1-5")
      const [start, end] = part.split('-').map(n => parseInt(n, 10));
      if (isNaN(start) || isNaN(end)) {
        return {
          action,
          numbers: [],
          valid: false,
          error: `Invalid range: ${part}. Use format like "1-5"`
        };
      }

      // Guard: Validate range bounds (positive and start <= end)
      if (start < 1 || end < 1 || start > end) {
        return {
          action,
          numbers: [],
          valid: false,
          error: `Invalid range: ${part}. Must be 1 <= start <= end`
        };
      }

      for (let i = start; i <= end; i++) {
        numbers.push(i);
      }
    } else {
      const num = parseInt(part, 10);
      if (isNaN(num)) {
        return {
          action,
          numbers: [],
          valid: false,
          error: `Invalid number: ${part}. Use numeric values only.`
        };
      }
      numbers.push(num);
    }
  }

  // Validate numbers are within range
  const outOfRange = numbers.filter(n => n < 1 || n > maxNumber);
  if (outOfRange.length > 0) {
    return {
      action,
      numbers: [],
      valid: false,
      error: `Numbers out of range (1-${maxNumber}): ${outOfRange.join(', ')}`
    };
  }

  // Guard: Check for duplicate numbers
  const uniqueNumbers = [...new Set(numbers)];
  if (uniqueNumbers.length !== numbers.length) {
    return {
      action,
      numbers: [],
      valid: false,
      error: 'Duplicate numbers detected. Each rule can only be specified once.'
    };
  }

  // Guard: Limit batch size to prevent DoS
  const MAX_APPROVAL_BATCH = 100;
  if (numbers.length > MAX_APPROVAL_BATCH) {
    return {
      action,
      numbers: [],
      valid: false,
      error: `Cannot approve more than ${MAX_APPROVAL_BATCH} rules at once. Use "approve all" for bulk operations.`
    };
  }

  return { action, numbers: uniqueNumbers, valid: true };
}

// ============================================================================
// TIMESTAMP VALIDATION
// ============================================================================

export function validateTimestamp(timestamp: string): boolean {
  // Guard: Strict ISO 8601 UTC format validation (no milliseconds, no timezone offsets)
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  if (!isoRegex.test(timestamp)) {
    throw new AR22Error('Invalid timestamp format', {
      what: `The provided timestamp "${timestamp}" does not match the required ISO 8601 UTC format`,
      how: [
        'Use format: YYYY-MM-DDTHH:MM:SSZ (example: 2026-03-16T14:30:00Z)',
        'Do not include milliseconds (.SSS)',
        'Do not use timezone offsets (+HH:MM)',
        'Run /improve-rules --history to see available timestamps',
        'Copy timestamp from history output'
      ],
      technical: `Provided: "${timestamp}", Required: YYYY-MM-DDTHH:MM:SSZ, Regex: ^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$`
    });
  }

  // Guard: Check for path traversal and null bytes
  const dangerousPatterns = ['..', '/', '\\', '\0', '\x00'];
  for (const pattern of dangerousPatterns) {
    if (timestamp.includes(pattern)) {
      throw new AR22Error('Invalid timestamp characters detected', {
        what: 'Timestamp contains path traversal or invalid characters',
        how: [
          'Use only valid ISO 8601 UTC format: YYYY-MM-DDTHH:MM:SSZ',
          'Do not modify timestamps from history output'
        ],
        technical: `Timestamp contains invalid character: ${pattern === '\0' ? '\\0' : pattern}`
      });
    }
  }

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    throw new AR22Error('Invalid date value', {
      what: `Timestamp "${timestamp}" is not a valid date`,
      how: [
        'Check timestamp format: YYYY-MM-DDTHH:MM:SSZ',
        'Ensure date components are valid (month 01-12, day 01-31, etc.)'
      ],
      technical: `Date parsing failed for: "${timestamp}"`
    });
  }

  const now = new Date();
  if (date > now) {
    throw new AR22Error('Timestamp cannot be in the future', {
      what: `Timestamp "${timestamp}" is later than current time`,
      how: [
        'Use a timestamp from the past',
        'Run /improve-rules --history to see available timestamps'
      ],
      technical: `Provided: ${timestamp}, Current: ${now.toISOString()}`
    });
  }

  const sixMonthsAgo = new Date(now.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));
  if (date < sixMonthsAgo) {
    console.warn(`Warning: Timestamp is more than 6 months old (${timestamp})`);
  }

  return true;
}

// ============================================================================
// FILE I/O WITH RETRY LOGIC
// ============================================================================

async function readFileWithRetry(filePath: string, retries: number = 3): Promise<string> {
  let fd: fs.promises.FileHandle | null = null;
  let currentFd: fs.promises.FileHandle | null = null; // Helper variable for type inference

  try {
    for (let i = 0; i < retries; i++) {
      try {
        // Guard: Use FileHandle for better resource management
        fd = await fs.promises.open(filePath, 'r');
        currentFd = fd;

        const stats = await fd.stat();
        const mode = (stats.mode & parseInt('777', 8)).toString(8);

        if (mode !== '600' && mode !== '644') {
          console.warn(`Warning: File permissions are ${mode}, recommended 0600`);
        }

        const content = await fd.readFile('utf-8');

        // Guard: Ensure file descriptor is closed before returning
        await fd.close();
        fd = null;
        currentFd = null;

        return content;
      } catch (error: any) {
        // Guard: Clean up file descriptor on error
        if (fd !== null) {
          try {
            await fd.close();
          } catch (closeError) {
            console.warn(`Warning: Failed to close file descriptor: ${closeError}`);
          }
          fd = null;
        }

        if ((error.code === 'EBUSY' || error.code === 'ELOCK') && i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  } finally {
    // Guard: Final cleanup - ensure fd is closed
    if (currentFd !== null) {
      try {
        await currentFd.close();
      } catch (closeError) {
        console.warn(`Warning: Failed to close file descriptor in finally: ${closeError}`);
      }
    }
  }
}

// ============================================================================
// STATE SCHEMA VALIDATION
// ============================================================================

function validateStateSchema(state: any): string[] {
  const errors: string[] = [];
  const requiredFields = {
    last_analysis: 'string',
    patterns_found: 'array',
    improvements_applied: 'number',
    corrections_reduction: 'number',
    platform: 'string'
  };

  for (const [field, expectedType] of Object.entries(requiredFields)) {
    if (!(field in state)) {
      errors.push(`Missing field: ${field}`);
    } else {
      const actualType = Array.isArray(state[field]) ? 'array' : typeof state[field];
      if (actualType !== expectedType) {
        errors.push(`Field ${field}: expected ${expectedType}, got ${actualType}`);
      }
    }
  }

  return errors;
}

// ============================================================================
// MEMORY-EFFICIENT JSONL REVERSE READER
// ============================================================================

export async function readLastNEntries(filePath: string, n: number = 10): Promise<ResultEntry[]> {
  const entries: ResultEntry[] = [];
  let skipped = 0;
  let fd: fs.promises.FileHandle | null = null;

  try {
    fd = await fs.promises.open(filePath, 'r');
    const stats = await fd.stat();
    let position = stats.size;

    // Guard: Dynamic buffer sizing based on file size
    const maxLineLength = 100000; // Assume max line length of 100KB
    const bufferSize = Math.min(65536, maxLineLength); // Use 64KB buffer or max line length
    const buffer = Buffer.alloc(bufferSize);
    let lineBuffer = '';

    while (position > 0 && entries.length < n) {
      const readSize = Math.min(buffer.length, position);
      position -= readSize;

      const { bytesRead } = await fd.read(buffer, 0, readSize, position);

      for (let i = bytesRead - 1; i >= 0; i--) {
        if (buffer[i] === 0x0A) {
          const line = lineBuffer;
          lineBuffer = '';

          if (line.trim()) {
            try {
              // Guard: Validate JSON structure before parsing
              if (!line.trim().startsWith('{') || !line.trim().endsWith('}')) {
                skipped++;
                continue;
              }

              const entry = JSON.parse(line) as ResultEntry;

              // Guard: Validate entry structure
              if (!entry.timestamp || typeof entry.timestamp !== 'string') {
                skipped++;
                continue;
              }

              entries.push(entry);
              // Guard: Stop reading once we have enough entries
              if (entries.length >= n) {
                break;
              }
            } catch {
              skipped++;
            }
          }
        } else {
          lineBuffer = String.fromCharCode(buffer[i]) + lineBuffer;
        }

        // Guard: Prevent buffer overflow on very long lines
        if (lineBuffer.length > maxLineLength) {
          console.warn(`Warning: Skipping line longer than ${maxLineLength} characters`);
          lineBuffer = '';
          skipped++;
        }
      }

      // Guard: Check if we have enough entries after processing this buffer chunk
      if (entries.length >= n) {
        break;
      }
    }

    if (lineBuffer.trim() && entries.length < n) {
      try {
        const entry = JSON.parse(lineBuffer) as ResultEntry;
        entries.push(entry);
      } catch {
        skipped++;
      }
    }

    await fd.close();
    fd = null;

    if (skipped > 0) {
      console.warn(`⚠️ Warning: Skipped ${skipped} malformed entries`);
    }

    return entries;
  } catch (error: any) {
    // Guard: Clean up file descriptor on error
    if (fd) {
      try {
        await fd.close();
      } catch (closeError) {
        console.warn(`Warning: Failed to close file descriptor: ${closeError}`);
      }
      fd = null;
    }

    if (error.code === 'ENOENT') {
      throw new AR22Error('History file not found', {
        what: 'results.jsonl does not exist at expected location',
        how: [
          'Run /improve-rules to create initial history file',
          `Verify file exists at: ${ABSOLUTE_PATHS.RESULTS}`
        ],
        technical: `Expected path: ${ABSOLUTE_PATHS.RESULTS}, Error: FILE_NOT_FOUND`
      });
    }
    if (error.code === 'EACCES') {
      throw new AR22Error('Permission denied reading history file', {
        what: 'Cannot read results.jsonl due to insufficient file permissions',
        how: [
          `Check file permissions: ls -la ${ABSOLUTE_PATHS.RESULTS}`,
          'Fix permissions: chmod 600 results.jsonl',
          'Ensure the file is owned by your user account'
        ],
        technical: `Expected path: ${ABSOLUTE_PATHS.RESULTS}, Error: EACCES, Code: ${error.code}`
      });
    }
    throw error;
  }
}

// ============================================================================
// DISPLAY FORMATTING HELPERS
// ============================================================================

/** Story 6-8 (AC #4): Human-readable status formatting with edge case guards */
export function formatStatus(status: string): string {
  // Guard: Non-string or empty input
  if (typeof status !== 'string' || status.trim() === '') {
    return 'Unknown';
  }
  const statusMap: Record<string, string> = {
    'applied': 'Applied',
    'pending': 'Pending',
    'failed': 'Failed'
  };
  return statusMap[status] || 'Unknown';
}

/** Story 6-8 (AC #7): Format timestamp with edge case guards */
export function formatTimestamp(isoTimestamp: string): string {
  // Guard: Non-string input
  if (typeof isoTimestamp !== 'string' || isoTimestamp.trim() === '') {
    return 'Invalid date';
  }

  const date = new Date(isoTimestamp);
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  // Check for future timestamps (1-minute tolerance for clock skew)
  const now = new Date();
  const prefix = date.getTime() > now.getTime() + 60000 ? '[FUTURE] ' : '';

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${prefix}${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

/**
 * Handles the --stats command by displaying metrics from state.json
 * Note: This function now delegates to displayStats() which outputs directly to console.
 * The return value is kept for backwards compatibility but returns empty string.
 * @returns Empty string (output is written directly to console)
 * @throws {AR22Error} if stats display fails
 */
export async function handleStatsCommand(): Promise<string> {
  try {
    // Use the displayStats function from state-management.ts (Story 5-3)
    // which displays all metrics including the new Story 5-3 fields.
    // Capture console.log output so the combined (both) case can include it.
    const dataDir = path.dirname(ABSOLUTE_PATHS.STATE);
    let capturedOutput = '';
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      capturedOutput += args.map((a: any) => (typeof a === 'string' ? a : String(a))).join(' ') + '\n';
      originalLog.apply(console, args);
    };

    try {
      await displayStats(dataDir);
    } finally {
      console.log = originalLog;
    }

    return capturedOutput.trim();
  } catch (error) {
    if (error instanceof AR22Error) throw error;

    const err = error as any;
    if (err.code === 'ENOENT') {
      throw new AR22Error('State file not found', {
        what: 'state.json does not exist at expected location',
        how: [
          'Run /improve-rules to create initial state file',
          `Verify file exists at: ${ABSOLUTE_PATHS.STATE}`,
          'Check file permissions (should be 0600)'
        ],
        technical: `Expected path: ${ABSOLUTE_PATHS.STATE}, Error: FILE_NOT_FOUND`
      });
    }

    throw new AR22Error('Failed to display statistics', {
      what: 'An unexpected error occurred while displaying stats',
      how: [
        'Check file permissions and disk space',
        'Verify file is not corrupted',
        'Try re-running /improve-rules'
      ],
      technical: `Error: ${err.code || 'UNKNOWN'}, Message: ${err.message}`
    });
  }
}

export async function handleHistoryCommand(): Promise<string> {
  try {
    const entries = await readLastNEntries(ABSOLUTE_PATHS.RESULTS, 20);

    if (entries.length === 0) {
      return `📋 Recent Improvements

No improvement history available yet. Run /improve-rules to create history.`;
    }

    // Build proper markdown table with header and separator rows
    const header = '| Date | Status | Summary |';
    const separator = '|------|--------|---------|';

    const formattedEntries = entries.map(entry => {
      const timestamp = formatTimestamp(entry.timestamp);
      const status = formatStatus(entry.status);
      // Escape pipe characters, backticks, and newlines in summary to prevent markdown table breakage
      const summary = (entry.summary || 'No description').replace(/\|/g, '\\|').replace(/`/g, '\\`').replace(/\n/g, ' ').replace(/\r/g, '');
      return `| ${timestamp} | ${status} | ${summary} |`;
    });

    const countText = entries.length === 1 ? 'showing last 1' : `showing last ${entries.length}`;
    return `📋 Recent Improvements (${countText})

${header}
${separator}
${formattedEntries.join('\n')}`;
  } catch (error) {
    if (error instanceof AR22Error) throw error;

    const err = error as any;
    throw new AR22Error('Failed to read history file', {
      what: 'An unexpected error occurred while reading results.jsonl',
      how: [
        'Check file permissions and disk space',
        'Verify file is not corrupted',
        'Try re-running /improve-rules'
      ],
      technical: `Error: ${err.code || 'UNKNOWN'}, Message: ${err.message}`
    });
  }
}

// ============================================================================
// BACKUP TIMESTAMP HELPERS (Story 6-9)
// ============================================================================

/** Converts user-input timestamp (colons) to filesystem filename (hyphens) */
export function backupTimestampToFilename(timestamp: string): string {
  return `${timestamp.replace(/:/g, '-')}.md`;
}

/** Converts filesystem filename (hyphens) back to user-input timestamp (colons) */
export function filenameToBackupTimestamp(filename: string): string {
  const tsMatch = filename.match(/(\d{4}-\d{2}-\d{2}T[\d-]+Z)/);
  if (!tsMatch) return filename.replace(/\.md$/, '');
  return tsMatch[1].replace(/-/g, (match, offset, str) => {
    const tIndex = str.indexOf('T');
    if (offset > tIndex) return ':';
    return match;
  });
}

/** Formats a timestamp for human-readable display */
export function formatBackupTimestamp(timestamp: string): string {
  return timestamp.replace('T', ' ').replace('Z', ' UTC');
}

/** Lists available backups sorted newest first, limited to specified count */
export function listAvailableBackups(
  files: string[],
  limit: number = 5
): Array<{ filename: string; timestamp: string; display: string }> {
  const mdFiles = files.filter(f => f.endsWith('.md'));
  const withTimestamps = mdFiles.map(f => ({
    filename: f,
    timestamp: filenameToBackupTimestamp(f),
  }));
  // Filter out entries with invalid timestamps (e.g., non-backup .md files)
  const validTimestamps = withTimestamps.filter(entry => {
    const date = new Date(entry.timestamp);
    return !isNaN(date.getTime());
  });
  const sorted = validTimestamps.sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA;
  });
  return sorted.slice(0, limit).map(entry => ({
    ...entry,
    display: formatBackupTimestamp(entry.timestamp),
  }));
}

/** Generates AR22 error for invalid/missing timestamp with available backups list */
export function generateBackupNotFoundError(
  requestedTimestamp: string,
  availableBackups: Array<{ filename: string; timestamp: string; display: string }>,
  totalCount: number,
  historyDir: string
): AR22Error {
  const availableList = availableBackups.slice(0, 5).map(b => `  - ${b.display}`).join('\n');
  return new AR22Error('Backup file not found', {
    what: `No backup exists for timestamp "${requestedTimestamp}"`,
    how: [
      'Run /improve-rules --history to see all available timestamps',
      'Use a timestamp from the list below',
      'Verify timestamp format: YYYY-MM-DDTHH:MM:SSZ',
    ],
    technical: `Requested: ${requestedTimestamp}\nAvailable: ${totalCount} backups, showing newest 5:\n${availableList}\nHistory directory: ${historyDir}`,
  });
}

// ============================================================================
// AUTOMATED RESTORE FROM BACKUP (Story 6-9)
// ============================================================================

/**
 * Appends an entry to results.jsonl.
 */
async function appendToResults(entry: { timestamp: string; status: string; summary: string }): Promise<void> {
  const resultsPath = ABSOLUTE_PATHS.RESULTS;
  const line = JSON.stringify(entry) + '\n';
  try {
    await fs.promises.appendFile(resultsPath, line, { mode: 0o600 });
  } catch {
    // Best-effort: logging is non-critical
  }
}

/**
 * Executes an automated restore from a timestamped backup.
 *
 * @param timestamp - User-provided ISO 8601 UTC timestamp (e.g., "2026-03-16T14:30:00Z")
 * @param historyDir - Override for ABSOLUTE_PATHS.HISTORY_DIR (used by tests with temp dirs)
 * @param rulesFilePath - Override for detected platform rules file path (used by tests)
 * @returns Object with success status, message, and optional pre-restore backup path
 * @throws {AR22Error} on any failure path
 */
export async function executeAutomatedRestore(
  timestamp: string,
  historyDir?: string,
  rulesFilePath?: string,
): Promise<{ success: boolean; message: string; preRestoreBackupPath?: string }> {
  const effectiveHistoryDir = historyDir || ABSOLUTE_PATHS.HISTORY_DIR;
  const effectiveRulesPath = rulesFilePath || getRulesFilePath(detectPlatform());

  // Step 1: Validate timestamp format (AC #7)
  validateTimestamp(timestamp);

  // Step 2: Convert timestamp to filesystem filename and verify backup exists
  const backupFilename = backupTimestampToFilename(timestamp);
  const backupFilePath = path.join(effectiveHistoryDir, backupFilename);

  // Defense-in-depth: ensure resolved backup path stays within history directory
  const resolvedBackupPath = path.resolve(backupFilePath);
  const resolvedHistoryDir = path.resolve(effectiveHistoryDir);
  if (!resolvedBackupPath.startsWith(resolvedHistoryDir + path.sep)) {
    throw new AR22Error('Backup file path escapes history directory', {
      what: 'Resolved backup file path is outside the expected history directory',
      how: [
        'Use only valid timestamps from /improve-rules --history output',
        'Do not manipulate timestamp parameters',
      ],
      technical: `Resolved path: ${resolvedBackupPath}, Expected prefix: ${resolvedHistoryDir}${path.sep}`,
    });
  }

  // Check history directory exists and is accessible for reading (AC #4)
  try {
    await fs.promises.access(effectiveHistoryDir, fs.constants.R_OK);
  } catch (err: any) {
    if (err.code === 'ENOENT' || err.code === 'EACCES') {
      throw new AR22Error('History directory not accessible', {
        what: err.code === 'ENOENT'
          ? 'The history directory does not exist'
          : 'The history directory is not readable',
        how: [
          'Run /improve-rules to create initial backups',
          err.code === 'ENOENT'
            ? `Create directory: mkdir -p ${effectiveHistoryDir}`
            : `Check permissions: chmod 700 ${effectiveHistoryDir}`,
          `Verify directory exists at: ${effectiveHistoryDir}`,
        ],
        technical: `Path: ${effectiveHistoryDir}, Error: ${err.code || 'UNKNOWN'}`,
      });
    }
    throw err;
  }

  // Check history directory is writable (needed for pre-restore backup, AC #2)
  try {
    await fs.promises.access(effectiveHistoryDir, fs.constants.W_OK);
  } catch (err: any) {
    if (err.code === 'EACCES') {
      throw new AR22Error('History directory is not writable', {
        what: 'Cannot write to history directory — pre-restore backup creation will fail',
        how: [
          `Check permissions: ls -la ${effectiveHistoryDir}`,
          `Fix: chmod 700 ${effectiveHistoryDir}`,
          `Verify directory exists at: ${effectiveHistoryDir}`,
        ],
        technical: `Path: ${effectiveHistoryDir}, Error: ${err.code || 'UNKNOWN'}`,
      });
    }
    throw err;
  }

  // List directory to check backup existence and gather available backups
  let dirFiles: string[];
  try {
    dirFiles = await fs.promises.readdir(effectiveHistoryDir);
  } catch (err: any) {
    throw new AR22Error('Failed to read history directory', {
      what: 'Could not list files in the history directory',
      how: [
        'Check directory permissions',
        `Verify directory exists at: ${effectiveHistoryDir}`,
      ],
      technical: `Path: ${effectiveHistoryDir}, Error: ${err.code || 'UNKNOWN'}`,
    });
  }

  const mdFiles = dirFiles.filter(f => f.endsWith('.md'));
  if (!mdFiles.includes(backupFilename)) {
    const availableBackups = listAvailableBackups(dirFiles, 5);
    const totalCount = mdFiles.length;
    throw generateBackupNotFoundError(timestamp, availableBackups, totalCount, effectiveHistoryDir);
  }

  // Step 3: Read backup content into memory, validate non-empty (AC #6)
  let backupContent: string;
  try {
    // Guard: Verify backup path is not a symlink (security check — preserved from original code)
    const lstats = await fs.promises.lstat(backupFilePath);
    if (lstats.isSymbolicLink()) {
      throw new AR22Error('Backup file is a symbolic link', {
        what: 'Backup file appears to be a symbolic link, which may indicate a security issue',
        how: [
          'Do not use symbolic links for backup files',
          'Restore from a regular file backup',
          'Run /improve-rules --history to see available timestamps',
        ],
        technical: `Path: ${backupFilePath} is a symlink`,
      });
    }

    if (lstats.size === 0) {
      throw new AR22Error('Backup file is empty', {
        what: `Backup file exists but contains no data: ${backupFilePath}`,
        how: [
          'Verify backup integrity — file may be corrupted',
          'Choose a different timestamp from history',
          'Run /improve-rules --history to see available backups',
        ],
        technical: `Path: ${backupFilePath}, Size: 0 bytes`,
      });
    }
    backupContent = await fs.promises.readFile(backupFilePath, 'utf-8');
  } catch (err: any) {
    if (err instanceof AR22Error) throw err;
    throw new AR22Error('Failed to read backup file', {
      what: `Could not read backup file: ${err.message}`,
      how: [
        'Verify file permissions',
        'Check file is not corrupted',
        `File path: ${backupFilePath}`,
      ],
      technical: `Path: ${backupFilePath}, Error: ${err.code || 'UNKNOWN'}, Message: ${err.message}`,
    });
  }

  // Step 4: Detect redundant restore (AC #9)
  let currentContent: string | null = null;
  let currentFileExists = false;
  try {
    currentContent = await fs.promises.readFile(effectiveRulesPath, 'utf-8');
    currentFileExists = true;
  } catch {
    currentFileExists = false;
  }

  if (currentFileExists && currentContent === backupContent) {
    return {
      success: true,
      message: `Current rules already match the requested backup (${timestamp}) — no changes needed`,
    };
  }

  // Step 5: Create pre-restore safety backup (AC #2)
  let preRestoreBackupPath: string | undefined;
  if (currentFileExists) {
    // Strip milliseconds for clean filename (ISO 8601 without fractional seconds)
    const preRestoreTimestamp = new Date().toISOString().replace(/\.\d{3}/, '').replace(/:/g, '-');
    let preRestoreFilename = `pre-restore-${preRestoreTimestamp}.md`;
    let preRestorePath = path.join(effectiveHistoryDir, preRestoreFilename);

    let retries = 0;
    const maxRetries = 5;
    while (retries < maxRetries) {
      try {
        await fs.promises.copyFile(
          effectiveRulesPath,
          preRestorePath,
          fs.constants.COPYFILE_EXCL,
        );

        // Verify pre-restore backup integrity after copy — check both size and content
        const preRestoreStats = await fs.promises.stat(preRestorePath);
        if (preRestoreStats.size === 0) {
          throw new Error('Pre-restore backup created with zero size');
        }
        const originalContent = await fs.promises.readFile(effectiveRulesPath, 'utf-8');
        const preRestoreContent = await fs.promises.readFile(preRestorePath, 'utf-8');
        if (preRestoreContent !== originalContent) {
          throw new Error('Pre-restore backup content does not match source file');
        }

        preRestoreBackupPath = preRestorePath;
        break;
      } catch (err: any) {
        if (err.code === 'EEXIST') {
          retries++;
          const randomSuffix = Math.random().toString(36).slice(2, 8);
          preRestoreFilename = `pre-restore-${preRestoreTimestamp}-${retries}-${randomSuffix}.md`;
          preRestorePath = path.join(effectiveHistoryDir, preRestoreFilename);
          continue;
        }
        let howToFix = 'Pre-restore backup failed — rollback aborted to prevent data loss';
        let howSteps: string[] = [
          'Check history directory permissions and disk space',
          `History directory: ${effectiveHistoryDir}`,
        ];
        let techDetails = `Error: ${err.code || 'UNKNOWN'}, Path: ${effectiveHistoryDir}, Message: ${err.message}`;

        if (err.code === 'EACCES') {
          howToFix = 'History directory is not writable — check permissions';
          howSteps = [
            `Check permissions: ls -la ${effectiveHistoryDir}`,
            `Fix: chmod 700 ${effectiveHistoryDir}`,
          ];
        } else if (err.code === 'EROFS') {
          howToFix = 'Filesystem is read-only — cannot create backup';
          howSteps = ['Check mount status and remount as read-write if needed'];
        } else if (err.code === 'ENOSPC') {
          howToFix = 'Insufficient disk space for backup';
          howSteps = ['Free disk space or remove old backups'];
        }

        throw new AR22Error(howToFix, {
          what: 'Failed to create pre-restore safety backup',
          how: howSteps,
          technical: techDetails,
        });
      }
    }

    if (!preRestoreBackupPath) {
      throw new AR22Error('Pre-restore backup creation exhausted retries', {
        what: 'Could not create a unique pre-restore backup filename after 5 retries',
        how: [
          'Check for concurrent rollback attempts',
          `History directory: ${effectiveHistoryDir}`,
        ],
        technical: `Path: ${effectiveHistoryDir}, Retries: ${maxRetries}`,
      });
    }
  }

  // Step 6: Atomic write — backup content -> temp file -> rename to rules file (AC #1, #5)
  const targetDir = path.dirname(effectiveRulesPath);
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const tmpPath = path.join(targetDir, `.restore-tmp-${randomSuffix}.md`);

  // Determine target permissions: match original file if it exists, otherwise 0o600 (AC #5)
  let targetMode = 0o600;
  if (currentFileExists) {
    try {
      const origStats = await fs.promises.stat(effectiveRulesPath);
      targetMode = origStats.mode & 0o777;
    } catch {
      targetMode = 0o600;
    }
  }

  try {
    try {
      await fs.promises.access(targetDir, fs.constants.W_OK);
    } catch {
      await fs.promises.mkdir(targetDir, { recursive: true });
    }

    // Check if rules file is a symlink
    let isSymlink = false;
    try {
      const lstats = await fs.promises.lstat(effectiveRulesPath);
      isSymlink = lstats.isSymbolicLink();
    } catch {
      // File does not exist
    }

    if (isSymlink) {
      console.warn(`[WARN] Rules file is a symlink: ${effectiveRulesPath} — proceeding with caution`);
    }

    // Write content to temp file, then set permissions explicitly (mode option is masked by umask)
    await fs.promises.writeFile(tmpPath, backupContent);
    await fs.promises.chmod(tmpPath, targetMode);
    await fs.promises.rename(tmpPath, effectiveRulesPath);
  } catch (err: any) {
    try {
      await fs.promises.unlink(tmpPath);
    } catch {
      // ignore
    }

    let howToFix = 'Failed to write restored rules file';
    let howSteps: string[] = [
      'Check disk space and directory permissions',
      `Target path: ${effectiveRulesPath}`,
    ];
    let techDetails = `Error: ${err.code || 'UNKNOWN'}, Message: ${err.message}`;

    if (err.code === 'EACCES') {
      howToFix = 'Permission denied writing rules file';
      howSteps = [
        `Check permissions: ls -la ${effectiveRulesPath}`,
        `Fix: chmod 600 ${effectiveRulesPath}`,
      ];
    } else if (err.code === 'ENOSPC') {
      howToFix = 'Insufficient disk space to write rules file';
      howSteps = ['Free disk space and retry'];
    }

    throw new AR22Error(howToFix, {
      what: 'Failed to write restored rules file',
      how: howSteps,
      technical: techDetails,
    });
  }

  // Step 7: Verify restoration integrity (AC #1)
  try {
    const restoredContent = await fs.promises.readFile(effectiveRulesPath, 'utf-8');
    if (restoredContent !== backupContent) {
      throw new AR22Error('Restoration verification failed', {
        what: 'Restored file content does not match backup source',
        how: [
          'The pre-restore backup (if created) preserves your previous state',
          `Pre-restore backup: ${preRestoreBackupPath || 'not created'}`,
          'Try restoring again or choose a different backup',
        ],
        technical: `Expected size: ${backupContent.length} bytes, Got: ${restoredContent.length} bytes`,
      });
    }
  } catch (err: any) {
    if (err instanceof AR22Error) throw err;
    throw new AR22Error('Failed to verify restoration', {
      what: `Could not read back restored file: ${err.message}`,
      how: [
        'Check file permissions',
        `File path: ${effectiveRulesPath}`,
      ],
      technical: `Error: ${err.code || 'UNKNOWN'}`,
    });
  }

  // Step 8: Log rollback to results.jsonl (AC #8)
  try {
    await appendToResults({
      timestamp: new Date().toISOString(),
      status: 'rollback',
      summary: `Restored from backup ${timestamp}`,
    });
  } catch (err: any) {
    console.warn(`[WARN] Could not log rollback to results.jsonl: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Build success message
  const messageParts = [
    `Restored rules from backup at ${timestamp}`,
    `Backup file: ${backupFilePath}`,
    `Rules file: ${effectiveRulesPath}`,
  ];

  if (preRestoreBackupPath) {
    messageParts.push(`Pre-restore backup: ${preRestoreBackupPath}`);
  } else {
    messageParts.push('[WARN] No current rules file found, skipping pre-restore backup');
  }

  messageParts.push('Run /improve-rules --stats to confirm');

  return {
    success: true,
    message: messageParts.join('\n'),
    preRestoreBackupPath,
  };
}

export async function handleRollbackCommand(timestamp: string): Promise<string> {
  try {
    const result = await executeAutomatedRestore(timestamp);
    return result.message;
  } catch (error) {
    if (error instanceof AR22Error) throw error;
    const err = error as any;
    throw new AR22Error('Rollback failed', {
      what: 'An unexpected error occurred during rollback',
      how: [
        'Check history directory exists and is accessible',
        'Verify timestamp format is correct',
        'Run /improve-rules --history to see available backups',
      ],
      technical: `Error: ${err.code || 'UNKNOWN'}, Message: ${err.message}, Timestamp: ${timestamp}`,
    });
  }
}

// ============================================================================
// MAIN COMMAND HANDLER
// ============================================================================

export async function handleCommand(input: string): Promise<string> {
  try {
    const { action, timestamp } = parseCommand(input) as CommandParseResult;

    let result: string;
    switch (action) {
      case 'stats':
        result = await handleStatsCommand();
        break;
      case 'history':
        result = await handleHistoryCommand();
        break;
      case 'rollback':
        if (!timestamp) {
          throw new AR22Error('Missing timestamp', {
            what: 'Rollback command requires a timestamp',
            how: [
              'Use format: /improve-rules --rollback --to YYYY-MM-DDTHH:MM:SSZ',
              'Run /improve-rules --history to see available timestamps'
            ],
            technical: 'Action: rollback, Timestamp: undefined'
          });
        }
        result = await handleRollbackCommand(timestamp);
        break;
      case 'both':
        const statsResult = await handleStatsCommand();
        const historyResult = await handleHistoryCommand();
        result = `${statsResult}\n\n${'='.repeat(60)}\n\n${historyResult}`;
        break;
      default:
        throw new AR22Error('Unknown action', {
          what: 'Command parsing resulted in unrecognized action',
          how: [
            'Use /improve-rules --stats for statistics',
            'Use /improve-rules --history for improvement history',
            'Use /improve-rules --rollback --to {timestamp} for rollback guidance'
          ],
          technical: `Action: ${action}, Input: ${input}`
        });
    }

    return result;
  } catch (error) {
    if (error instanceof AR22Error) {
      return error.toString();
    }
    const err = error as Error;
    return new AR22Error('Command execution failed', {
      what: err.message,
      how: ['Check input and try again'],
      technical: `Error: ${err.message}`
    }).toString();
  }
}
