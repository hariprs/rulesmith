/**
 * Approval Velocity Warning (Story 6-6)
 *
 * Monitors approval velocity during review sessions and warns when
 * the user is approving changes too quickly (average < 5 seconds per change).
 *
 * @module approval-velocity
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Threshold for approval velocity warning in seconds.
 * Warning is shown when average review time per change is below this value.
 */
export const APPROVAL_VELOCITY_THRESHOLD_SECONDS = 5;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Result of approval velocity check
 */
export interface ApprovalVelocityResult {
  /** Whether a warning should be displayed (average time < threshold) */
  shouldWarn: boolean;
  /** Average review time in seconds between consecutive approvals, or null if insufficient data */
  averageTime: number | null;
  /** Number of valid approval timestamps */
  changeCount: number;
  /** The threshold used for comparison (seconds) */
  threshold: number;
  /** Whether any negative time gaps were detected (clock adjustments), treated as 0s */
  hasNegativeDeltas: boolean;
}

/**
 * Transient confirmation state for velocity warning (NOT persisted to state.json)
 * Follows the ConsentState pattern from Story 4.5
 */
export interface VelocityConfirmationState {
  /** Whether the warning has been shown to the user */
  warningShown: boolean;
  /** Average review time that triggered the warning */
  averageTime: number;
  /** ISO 8601 timestamp when the confirmation prompt was shown */
  promptedAt: string;
}

/**
 * Session record for velocity metrics tracking (appended to results.jsonl)
 * Uses snake_case field names per AR19
 */
export interface VelocitySessionRecord {
  /** ISO 8601 UTC timestamp (AR20) */
  timestamp: string;
  /** Average review time in seconds, or null if insufficient data */
  average_review_time_seconds: number | null;
  /** Number of changes reviewed */
  changes_reviewed: number;
  /** Whether the velocity warning was triggered */
  warning_triggered: boolean;
  /** The threshold used (always 5) */
  threshold_seconds: number;
}

// ============================================================================
// TIMESTAMP PARSING AND FILTERING (AC5, AC6)
// ============================================================================

/**
 * Parse an array of timestamp strings into Date objects.
 * Filters out invalid timestamps and sorts chronologically.
 *
 * @param timestamps - Array of ISO 8601 timestamp strings
 * @returns Sorted array of valid Date objects
 *
 * @example
 * ```typescript
 * const dates = parseAndFilterTimestamps([
 *   '2026-04-08T10:30:00Z',
 *   'not-a-date',
 *   '2026-04-08T10:30:05Z'
 * ]);
 * // Returns 2 Date objects sorted chronologically
 * ```
 */
export function parseAndFilterTimestamps(timestamps: string[]): Date[] {
  const validDates: Date[] = [];

  // Guard against null/undefined/non-array input
  if (!Array.isArray(timestamps)) {
    return [];
  }

  // ISO 8601 regex pattern to strictly validate format before parsing
  // Matches: YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ss.sss+HH:MM or YYYY-MM-DDTHH:mm:ss.sss-HH:MM
  const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

  for (const ts of timestamps) {
    try {
      if (ts === null || ts === undefined || typeof ts !== 'string' || ts.trim().length === 0) {
        continue;
      }
      // Strict ISO 8601 format check - reject strings that JS Date loosely parses
      if (!iso8601Pattern.test(ts)) {
        continue;
      }
      const date = new Date(ts);
      // Double-check the date is valid
      if (!isNaN(date.getTime())) {
        validDates.push(date);
      }
    } catch {
      // Silently skip unparseable timestamps
      continue;
    }
  }

  // Sort chronologically (AC6)
  validDates.sort((a, b) => a.getTime() - b.getTime());

  return validDates;
}

// ============================================================================
// AVERAGE REVIEW TIME CALCULATION (AC1, AC4, AC6)
// ============================================================================

/**
 * Result from average review time calculation.
 * Exported so that consumers of calculateAverageReviewTime can type the return value.
 */
export interface AverageReviewTimeResult {
  /** Average time in seconds, or null if fewer than 2 timestamps */
  averageTime: number | null;
  /** Whether any negative time gaps were detected (clock adjustments) */
  hasNegativeDeltas: boolean;
}

/**
 * Calculate the average review time in seconds between consecutive timestamps.
 * Timestamps should already be sorted (caller responsibility or via checkApprovalVelocity).
 *
 * @param validTimestamps - Sorted array of valid Date objects
 * @returns AverageReviewTimeResult with average time and negative delta flag, or null average if fewer than 2 timestamps
 *
 * @example
 * ```typescript
 * const timestamps = [
 *   new Date('2026-04-08T10:30:00Z'),
 *   new Date('2026-04-08T10:30:03Z'),
 *   new Date('2026-04-08T10:30:05Z')
 * ];
 * const result = calculateAverageReviewTime(timestamps); // Returns { averageTime: 2.5, hasNegativeDeltas: false }
 * ```
 */
export function calculateAverageReviewTime(validTimestamps: Date[]): AverageReviewTimeResult {
  // Guard against null/undefined/non-array input
  if (!Array.isArray(validTimestamps) || validTimestamps.length < 2) {
    return { averageTime: null, hasNegativeDeltas: false };
  }

  // Guard against non-Date elements
  for (const ts of validTimestamps) {
    if (!(ts instanceof Date) || isNaN(ts.getTime())) {
      return { averageTime: null, hasNegativeDeltas: false };
    }
  }

  // Ensure sorted (defensive — caller should already sort)
  const sorted = [...validTimestamps].sort((a, b) => a.getTime() - b.getTime());

  let totalDeltaMs = 0;
  let hasNegativeDeltas = false;
  for (let i = 1; i < sorted.length; i++) {
    const deltaMs = sorted[i].getTime() - sorted[i - 1].getTime();
    if (deltaMs < 0) {
      hasNegativeDeltas = true;
    }
    // Negative deltas (clock adjustments) treated as 0
    totalDeltaMs += Math.max(0, deltaMs);
  }

  const totalDeltaSeconds = totalDeltaMs / 1000;
  const numDeltas = sorted.length - 1;

  return { averageTime: totalDeltaSeconds / numDeltas, hasNegativeDeltas };
}

// ============================================================================
// APPROVAL VELOCITY CHECK (AC1, AC4, AC5, AC6)
// ============================================================================

/**
 * Check approval velocity from an array of review timestamps.
 * Orchestrates parsing, filtering, sorting, and calculation.
 *
 * @param reviewTimestamps - Array of ISO 8601 timestamp strings (may contain invalid entries)
 * @param thresholdSeconds - The threshold in seconds for warning (default: 5)
 * @returns ApprovalVelocityResult with warning status and metrics
 *
 * @example
 * ```typescript
 * const result = checkApprovalVelocity([
 *   '2026-04-08T10:30:00Z',
 *   '2026-04-08T10:30:03Z',
 *   '2026-04-08T10:30:05Z',
 *   '2026-04-08T10:30:07Z'
 * ], 5);
 * // Returns { shouldWarn: true, averageTime: 2.333, changeCount: 4, threshold: 5, hasNegativeDeltas: false }
 * ```
 */
export function checkApprovalVelocity(
  reviewTimestamps: string[],
  thresholdSeconds: number
): ApprovalVelocityResult {
  // Guard against invalid threshold (negative, zero, NaN, Infinity)
  // Validate threshold BEFORE using it in any return value
  let effectiveThreshold: number;
  if (typeof thresholdSeconds !== 'number' || !Number.isFinite(thresholdSeconds) || thresholdSeconds <= 0) {
    effectiveThreshold = APPROVAL_VELOCITY_THRESHOLD_SECONDS;
  } else {
    effectiveThreshold = thresholdSeconds;
  }

  // Guard against null/undefined/non-array input
  if (!Array.isArray(reviewTimestamps)) {
    return {
      shouldWarn: false,
      averageTime: null,
      changeCount: 0,
      threshold: effectiveThreshold,
      hasNegativeDeltas: false,
    };
  }

  // Parse and filter timestamps (handles AC5: invalid/missing, AC6: sorting)
  const validDates = parseAndFilterTimestamps(reviewTimestamps);
  const changeCount = validDates.length;

  // Insufficient data (AC4)
  if (changeCount < 2) {
    return {
      shouldWarn: false,
      averageTime: null,
      changeCount,
      threshold: effectiveThreshold,
      hasNegativeDeltas: false,
    };
  }

  // Calculate average review time
  const avgResult = calculateAverageReviewTime(validDates);

  // Should warn if average is strictly less than threshold
  const shouldWarn = avgResult.averageTime !== null && avgResult.averageTime < effectiveThreshold;

  return {
    shouldWarn,
    averageTime: avgResult.averageTime,
    changeCount,
    threshold: effectiveThreshold,
    hasNegativeDeltas: avgResult.hasNegativeDeltas,
  };
}

// ============================================================================
// VELOCITY WARNING MESSAGE GENERATION (AC1 — AR22 format)
// ============================================================================

/**
 * Generate an AR22-compliant warning message for fast approval velocity.
 *
 * @param averageTime - Average review time in seconds
 * @param threshold - The threshold in seconds
 * @param hasNegativeDeltas - Whether negative time gaps were detected (optional)
 * @returns Formatted warning message with all four AR22 sections
 *
 * @example
 * ```typescript
 * const warning = generateVelocityWarning(3.2, 5);
 * // Returns formatted warning with warning icon and AR22 sections
 * ```
 */
export function generateVelocityWarning(averageTime: number, threshold: number, hasNegativeDeltas?: boolean): string {
  // Guard against NaN/Infinity/negative values
  if (!Number.isFinite(averageTime) || averageTime < 0) {
    averageTime = 0;
  }
  if (!Number.isFinite(threshold) || threshold <= 0) {
    threshold = APPROVAL_VELOCITY_THRESHOLD_SECONDS;
  }

  let technicalDetails = `Average: ${averageTime}s per change, threshold: ${threshold}s`;
  if (hasNegativeDeltas) {
    technicalDetails += '. Note: 1 or more negative time gaps detected (likely clock adjustment), treated as 0s';
  }

  const warning = `\u26A0\uFE0F Please review carefully. Average review time suggests insufficient consideration.

**What happened:** Your average review time is ${averageTime}s per change, which is below the recommended threshold of ${threshold}s. This may indicate that changes are being approved without adequate review.

**How to fix:**
1. Take time to carefully review each proposed change before approving
2. Consider the impact and implications of each modification
3. Return to review mode to re-examine changes if needed
4. Only confirm approval once you are confident all changes are correct

**Technical details:** ${technicalDetails}`;

  return warning;
}

// ============================================================================
// VELOCITY METRICS RECORDING (AC3)
// ============================================================================

/**
 * Internal diagnostic record for when velocity check is skipped due to
 * all-invalid timestamps. Not exported — used internally by checkApprovalVelocityWithDiagnostics.
 */
interface VelocityCheckSkippedRecord {
  action: 'velocity_check_skipped';
  reason: 'no_valid_timestamps';
  timestamp: string;
}

/**
 * Append approval velocity metrics to results.jsonl.
 * Uses append mode (fs.appendFileSync) for efficient O(1) append without
 * reading the entire file. Best-effort logging: never throws, never blocks approval flow.
 *
 * @param resultsPath - Absolute path to results.jsonl
 * @param sessionData - Velocity session record with snake_case fields (AR19)
 *
 * @example
 * ```typescript
 * recordApprovalVelocity('/path/to/results.jsonl', {
 *   timestamp: '2026-04-08T10:30:00Z',
 *   average_review_time_seconds: 3.2,
 *   changes_reviewed: 4,
 *   warning_triggered: true,
 *   threshold_seconds: 5,
 * });
 * ```
 */
export function recordApprovalVelocity(
  resultsPath: string,
  sessionData: VelocitySessionRecord
): void {
  // Guard against empty/null path
  if (!resultsPath || typeof resultsPath !== 'string' || resultsPath.trim().length === 0) {
    // eslint-disable-next-line no-console
    console.error('Warning: Invalid results path provided, skipping velocity metrics recording');
    return;
  }

  try {
    const resultsDir = path.dirname(resultsPath);

    // Ensure directory exists
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const line = JSON.stringify(sessionData) + '\n';

    // Use appendFileSync for efficient O(1) append without reading entire file
    // This avoids the race condition of read-then-rename pattern
    fs.appendFileSync(resultsPath, line, { mode: 0o600, encoding: 'utf-8' });
  } catch {
    // Best-effort logging: swallow errors, never block approval flow (AC3)
    // eslint-disable-next-line no-console
    console.error('Warning: Failed to record approval velocity metrics (best-effort logging)');
  }
}

/**
 * Record a diagnostic entry when velocity check is skipped due to all-invalid timestamps (AC5).
 * This is called internally when parseAndFilterTimestamps returns zero valid dates.
 *
 * @param resultsPath - Absolute path to results.jsonl
 */
function recordVelocityCheckSkipped(resultsPath: string): void {
  if (!resultsPath || typeof resultsPath !== 'string' || resultsPath.trim().length === 0) {
    return;
  }

  const diagnosticRecord: VelocityCheckSkippedRecord = {
    action: 'velocity_check_skipped',
    reason: 'no_valid_timestamps',
    timestamp: new Date().toISOString(),
  };

  try {
    const resultsDir = path.dirname(resultsPath);
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    const line = JSON.stringify(diagnosticRecord) + '\n';
    fs.appendFileSync(resultsPath, line, { mode: 0o600, encoding: 'utf-8' });
  } catch {
    // Best-effort: swallow errors silently for diagnostic entries
  }
}

/**
 * Check approval velocity and record diagnostic entry if all timestamps are invalid (AC5).
 * This is the recommended entry point that handles the full AC5 requirement.
 *
 * @param reviewTimestamps - Array of ISO 8601 timestamp strings (may contain invalid entries)
 * @param thresholdSeconds - The threshold in seconds for warning (default: 5)
 * @param resultsPath - Path to results.jsonl for diagnostic recording (optional — if omitted, no diagnostic entry is written)
 * @returns ApprovalVelocityResult with warning status and metrics
 */
export function checkApprovalVelocityWithDiagnostics(
  reviewTimestamps: string[],
  thresholdSeconds: number,
  resultsPath?: string
): ApprovalVelocityResult {
  const result = checkApprovalVelocity(reviewTimestamps, thresholdSeconds);

  // AC5: if all timestamps were invalid (changeCount === 0 and input was non-empty array),
  // record a diagnostic entry. Use result.changeCount to avoid re-parsing.
  if (!Array.isArray(reviewTimestamps) || reviewTimestamps.length === 0) {
    return result;
  }

  if (result.changeCount === 0 && resultsPath) {
    recordVelocityCheckSkipped(resultsPath);
  }

  return result;
}

// ============================================================================
// VELOCITY CONFIRMATION PROMPT (AC2)
// ============================================================================

/**
 * Request user confirmation after velocity warning is displayed.
 * Presents a blocking prompt with warning message and two options:
 *   (a) confirm they have reviewed carefully and proceed (returns true)
 *   (b) return to review mode to re-examine changes (returns false)
 *
 * Note: In a CLI context, this presents an interactive blocking prompt.
 * When running in test/headless mode (no TTY), defaults to true (proceed).
 *
 * @param averageTime - The average review time that triggered the warning (optional, defaults to 0)
 * @returns Promise<boolean> — true if user confirms to proceed, false if returning to review
 */
export async function requestVelocityConfirmation(averageTime?: number): Promise<boolean> {
  // Guard against invalid averageTime
  const safeAverageTime = (averageTime !== undefined && Number.isFinite(averageTime) && averageTime >= 0) ? averageTime : 0;

  // In test/headless mode (no TTY), default to proceed
  // In interactive CLI mode, this would present a blocking prompt
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    // Headless/test mode: default to proceed (non-blocking)
    return true;
  }

  // Interactive mode: present blocking prompt
  // This uses readline for synchronous CLI input
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const warning = generateVelocityWarning(safeAverageTime, APPROVAL_VELOCITY_THRESHOLD_SECONDS);
  // eslint-disable-next-line no-console
  console.log(warning);
  // eslint-disable-next-line no-console
  console.log('\nChoose an option:');
  // eslint-disable-next-line no-console
  console.log('  [1] I have reviewed carefully — proceed with changes');
  // eslint-disable-next-line no-console
  console.log('  [2] Return to review mode to re-examine changes');

  return new Promise<boolean>((resolve) => {
    rl.question('\nEnter your choice (1 or 2): ', (answer) => {
      rl.close();
      resolve(answer.trim() === '1');
    });

    // Handle readline errors to prevent hanging Promise (HIGH: unhandled error path)
    rl.on('error', () => {
      rl.close();
      // Default to proceed if prompt fails
      resolve(true);
    });
  });
}
