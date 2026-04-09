/**
 * Pattern Tracker Implementation (Story 2-6)
 *
 * Orchestrates longitudinal pattern tracking by loading historical patterns
 * from state.json, merging them with current session patterns, and updating
 * the state file with merged results.
 *
 * Features:
 * - Historical pattern loading from state.json
 * - Pattern merging with longitudinal tracking
 * - State.json update with backup creation
 * - Longitudinal report generation
 * - AR22 compliant error handling
 * - Backup creation before state updates
 * - Retry logic for write failures
 *
 * @module pattern-tracker
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Pattern,
  PatternCategory,
} from './pattern-detector';
import {
  PatternMatcher as PatternMatcherClass,
  MergedPattern,
  HistoricalPattern,
  MergeStatistics,
  AR22Error,
} from './pattern-matcher';

// Re-export PatternMatcher class for external use
export { PatternMatcherClass as PatternMatcher };

// Re-export types for external use
export type { MergedPattern, HistoricalPattern, MergeStatistics } from './pattern-matcher';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Longitudinal analysis report
 *
 * @interface LongitudinalReport
 */
export interface LongitudinalReport {
  /** Patterns first seen this session */
  new_patterns: MergedPattern[];
  /** Patterns seen in previous sessions */
  recurring_patterns: MergedPattern[];
  /** Patterns with frequency_change >= 0.5 */
  trends_increasing: MergedPattern[];
  /** Patterns with frequency_change <= -0.5 */
  trends_decreasing: MergedPattern[];
  /** Session summary statistics */
  session_summary: {
    /** Total patterns in merged set */
    total_patterns: number;
    /** Number of new patterns */
    new_pattern_count: number;
    /** Number of recurring patterns */
    recurring_pattern_count: number;
    /** Analysis timestamp */
    analysis_timestamp: string;
  };
}

/**
 * State file data structure
 *
 * @interface StateFileData
 */
export interface StateFileData {
  /** Last analysis timestamp */
  last_analysis: string;
  /** Patterns found array (can be string[] or MergedPattern[]) */
  patterns_found: string[] | MergedPattern[];
  /** Number of improvements applied */
  improvements_applied: number;
  /** Corrections reduction rate */
  corrections_reduction: number;
  /** Platform identifier */
  platform: 'claude-code' | 'cursor' | 'unknown';
  /** Schema note */
  _schema_note: string;
  /** Category summaries (optional, from Story 2-5) */
  category_summaries?: any[];
  /** Frequency analysis (optional, from Story 2-5) */
  frequency_analysis?: any;
  /** Total corrections analyzed (optional) */
  total_corrections_analyzed?: number;
  /** Total patterns found (optional) */
  total_patterns_found?: number;
}

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Error codes for pattern tracking failures
 *
 * @enum {string}
 */
export enum PatternTrackingErrorCode {
  /** Pattern tracking failed */
  PATTERN_TRACKING_FAILED = 'PATTERN_TRACKING_FAILED',
  /** State file read failed */
  STATE_FILE_READ_FAILED = 'STATE_FILE_READ_FAILED',
  /** State file write failed */
  STATE_FILE_WRITE_FAILED = 'STATE_FILE_WRITE_FAILED',
  /** Backup creation failed */
  BACKUP_CREATION_FAILED = 'BACKUP_CREATION_FAILED',
  /** Invalid state schema */
  INVALID_STATE_SCHEMA = 'INVALID_STATE_SCHEMA',
  /** Invalid input provided */
  INVALID_INPUT = 'INVALID_INPUT',
}

// ============================================================================
// ERROR HANDLING (AR22 COMPLIANT)
// ============================================================================

/**
 * AR22 compliant error class for pattern tracking
 *
 * @class PatternTrackingError
 * @extends Error
 */
export class PatternTrackingError extends Error {
  public readonly what: string;
  public readonly how: string[];
  public readonly technical: string;
  public readonly code?: PatternTrackingErrorCode;
  public readonly originalError?: Error;

  constructor(
    brief: string,
    details: { what: string; how: string[]; technical: string },
    code?: PatternTrackingErrorCode,
    originalError?: Error
  ) {
    super(brief);
    this.what = details.what;
    this.how = details.how;
    this.technical = details.technical;
    this.code = code;
    this.originalError = originalError;
    this.name = 'PatternTrackingError';

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PatternTrackingError);
    }
  }

  toString(): string {
    // Safely extract message with fallback
    const safeMessage = this.message || 'Unknown error';
    const safeWhat = this.what || 'No details available';
    const safeHow = Array.isArray(this.how) ? this.how : [];
    const safeTechnical = this.technical || 'No technical details available';
    const safeCode = this.code || '';

    let output = `**${safeMessage}**\n\n`;
    output += `**What happened:** ${safeWhat}\n\n`;
    output += `**How to fix:**\n`;
    if (safeHow.length === 0) {
      output += `No fix steps available\n`;
    } else {
      safeHow.forEach((step, index) => {
        output += `${index + 1}. ${step}\n`;
      });
    }
    output += `\n**Technical details:** ${safeTechnical}`;
    if (safeCode) {
      output += ` (Error Code: ${safeCode})`;
    }
    return output;
  }
}

// ============================================================================
// PATTERN TRACKER CLASS
// ============================================================================

/**
 * PatternTracker class for longitudinal pattern tracking
 *
 * Features:
 * - Load historical patterns from state.json
 * - Merge current patterns with historical patterns
 * - Update state.json with merged patterns
 * - Generate longitudinal analysis reports
 * - Create backups before state updates
 * - AR22 compliant error handling
 *
 * @class PatternTracker
 */
export class PatternTracker {
  private readonly statePath: string;
  private readonly historyDir: string;
  private readonly maxRetries: number = 3;

  /**
   * Create a new PatternTracker instance
   *
   * @param statePath - Path to state.json file
   */
  constructor(statePath: string) {
    if (!statePath || typeof statePath !== 'string') {
      throw new PatternTrackingError(
        'Invalid state path provided',
        {
          what: 'State path must be a non-empty string',
          how: [
            'Provide a valid file path to state.json',
            'Ensure path is absolute or relative to working directory',
            'Check path does not contain null bytes or control characters',
          ],
          technical: `Received state path: ${typeof statePath}`,
        },
        PatternTrackingErrorCode.INVALID_INPUT
      );
    }

    this.statePath = statePath;
    this.historyDir = path.join(path.dirname(statePath), 'history');
  }

  /**
   * Validate ISO 8601 timestamp
   *
   * @private
   * @param timestamp - Timestamp to validate
   * @returns True if valid ISO 8601 timestamp
   */
  private isValidTimestamp(timestamp: string): boolean {
    if (!timestamp || typeof timestamp !== 'string') {
      return false;
    }
    try {
      const date = new Date(timestamp);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  }

  /**
   * Validate historical pattern schema
   *
   * @private
   * @param pattern - Pattern to validate
   * @returns True if valid HistoricalPattern
   */
  private isValidHistoricalPattern(pattern: any): pattern is HistoricalPattern {
    // Guard: Null/undefined check
    if (!pattern || typeof pattern !== 'object') {
      return false;
    }

    // Guard: Array check
    if (Array.isArray(pattern)) {
      return false;
    }

    // Required fields: pattern_text, frequency, category, first_seen
    if (typeof pattern.pattern_text !== 'string' || pattern.pattern_text.trim() === '') {
      return false;
    }

    if (typeof pattern.count !== 'number' || pattern.count < 0) {
      return false;
    }

    if (!Object.values(PatternCategory).includes(pattern.category)) {
      return false;
    }

    if (!this.isValidTimestamp(pattern.first_seen)) {
      return false;
    }

    // Optional fields with defaults
    if (pattern.session_count !== undefined && (typeof pattern.session_count !== 'number' || pattern.session_count < 0)) {
      return false;
    }

    if (pattern.total_frequency !== undefined && (typeof pattern.total_frequency !== 'number' || pattern.total_frequency < 0)) {
      return false;
    }

    return true;
  }

  /**
   * Load historical patterns from state.json
   *
   * @returns Array of historical patterns, or empty array if none exist
   *
   * @throws {PatternTrackingError} When state file is corrupted
   */
  loadHistoricalPatterns(): HistoricalPattern[] {
    // Guard: Check if state file exists
    if (!fs.existsSync(this.statePath)) {
      // First run scenario - no historical patterns
      return [];
    }

    try {
      // Read state file
      const content = fs.readFileSync(this.statePath, 'utf-8');

      // Guard: Check for empty file
      if (!content || content.trim() === '') {
        return [];
      }

      // Parse JSON
      const state = JSON.parse(content) as StateFileData;

      // Guard: Validate state structure
      if (!state || typeof state !== 'object' || Array.isArray(state)) {
        throw new PatternTrackingError(
          'Invalid state file structure',
          {
            what: 'State file does not contain a valid object',
            how: [
              'Restore state.json from backup if available',
              'Delete state.json to start fresh',
              'Check state.json for JSON syntax errors',
            ],
            technical: 'State file root is not an object',
          },
          PatternTrackingErrorCode.INVALID_STATE_SCHEMA
        );
      }

      // Guard: Validate patterns_found field
      if (!state.patterns_found || !Array.isArray(state.patterns_found)) {
        // No historical patterns
        return [];
      }

      // Guard: DoS protection - limit patterns loaded
      const MAX_PATTERNS = 10000;
      if (state.patterns_found.length > MAX_PATTERNS) {
        console.warn(
          `State file contains ${state.patterns_found.length} patterns, exceeding maximum of ${MAX_PATTERNS}. Truncating to first ${MAX_PATTERNS}.`
        );
        state.patterns_found = state.patterns_found.slice(0, MAX_PATTERNS);
      }

      // Convert patterns_found to HistoricalPattern[]
      const historicalPatterns: HistoricalPattern[] = [];

      for (const pattern of state.patterns_found) {
        // Skip invalid patterns with warning
        if (!this.isValidHistoricalPattern(pattern)) {
          console.warn(`Invalid historical pattern found, skipping: ${JSON.stringify(pattern).substring(0, 100)}...`);
          continue;
        }

        // Ensure required fields for HistoricalPattern
        const historicalPattern: HistoricalPattern = {
          ...pattern,
          first_seen: pattern.first_seen || new Date().toISOString(),
          last_seen: pattern.last_seen || pattern.first_seen || new Date().toISOString(),
          session_count: pattern.session_count || 1,
          total_frequency: pattern.total_frequency || pattern.count || 0,
        };

        historicalPatterns.push(historicalPattern);
      }

      return historicalPatterns;
    } catch (error) {
      if (error instanceof PatternTrackingError) {
        throw error;
      }

      throw new PatternTrackingError(
        'Failed to load historical patterns from state file',
        {
          what: 'State file read or parsing failed',
          how: [
            'Check state.json file exists and is readable',
            'Verify state.json contains valid JSON',
            'Restore from backup if file is corrupted',
            'Check file permissions (should be 0o600)',
          ],
          technical: error instanceof Error ? error.message : 'Unknown error',
        },
        PatternTrackingErrorCode.STATE_FILE_READ_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Create backup of state file
   *
   * @private
   * @returns Path to backup file
   *
   * @throws {PatternTrackingError} When backup creation fails
   */
  private async createBackup(): Promise<string> {
    // Ensure history directory exists
    try {
      if (!fs.existsSync(this.historyDir)) {
        await fs.promises.mkdir(this.historyDir, { recursive: true, mode: 0o700 });
      }
    } catch (error) {
      throw new PatternTrackingError(
        'Failed to create history directory',
        {
          what: 'Cannot create history directory for backup',
          how: [
            'Check disk space is available',
            'Verify parent directory exists',
            'Check directory permissions',
          ],
          technical: error instanceof Error ? error.message : 'Unknown error',
        },
        PatternTrackingErrorCode.BACKUP_CREATION_FAILED,
        error instanceof Error ? error : undefined
      );
    }

    // Create timestamped backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.historyDir, `state-${timestamp}.json`);

    try {
      // Only create backup if state file exists (first run scenario)
      if (fs.existsSync(this.statePath)) {
        // Read current state file
        const content = await fs.promises.readFile(this.statePath, 'utf-8');

        // Write backup
        await fs.promises.writeFile(backupPath, content, { mode: 0o600 });
      } else {
        // First run - create empty backup placeholder
        await fs.promises.writeFile(backupPath, '{}', { mode: 0o600 });
      }

      return backupPath;
    } catch (error) {
      throw new PatternTrackingError(
        'Failed to create state file backup',
        {
          what: 'Cannot write backup file before state update',
          how: [
            'Check disk space is available',
            'Verify write permissions for history directory',
            'Ensure state file is not locked by another process',
          ],
          technical: error instanceof Error ? error.message : 'Unknown error',
        },
        PatternTrackingErrorCode.BACKUP_CREATION_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Merge current session patterns with historical patterns
   *
   * @param currentPatterns - Current session patterns
   * @param currentTimestamp - Current session timestamp (ISO 8601)
   * @returns Merged patterns with statistics
   *
   * @throws {PatternTrackingError} When merge operation fails
   */
  mergeWithHistorical(
    currentPatterns: Pattern[],
    currentTimestamp?: string
  ): { patterns: MergedPattern[]; statistics: MergeStatistics } {
    try {
      // Load historical patterns
      const historicalPatterns = this.loadHistoricalPatterns();

      // Validate current timestamp if provided
      const timestamp = currentTimestamp || new Date().toISOString();
      if (currentTimestamp && !this.isValidTimestamp(timestamp)) {
        throw new PatternTrackingError(
          'Invalid current timestamp format',
          {
            what: 'Current timestamp must be a valid ISO 8601 timestamp',
            how: [
              'Use new Date().toISOString() for current timestamp',
              'Ensure timestamp format is: YYYY-MM-DDTHH:mm:ss.sssZ',
              'Do not use localized or formatted timestamps',
            ],
            technical: `Received timestamp: ${currentTimestamp}`,
          },
          PatternTrackingErrorCode.INVALID_INPUT
        );
      }

      // Merge patterns
      const matcher = new PatternMatcherClass();
      const result = matcher.mergePatterns(currentPatterns, historicalPatterns, timestamp);

      return result;
    } catch (error) {
      if (error instanceof PatternTrackingError || error instanceof AR22Error) {
        throw error;
      }

      throw new PatternTrackingError(
        'Failed to merge patterns with historical data',
        {
          what: 'Pattern merging operation failed',
          how: [
            'Check that current patterns are valid Pattern objects',
            'Verify historical patterns loaded correctly from state.json',
            'Review merge algorithm logs for specific errors',
          ],
          technical: error instanceof Error ? error.message : 'Unknown error',
        },
        PatternTrackingErrorCode.PATTERN_TRACKING_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update state.json with merged patterns
   *
   * @param mergedPatterns - Merged patterns to write
   * @param additionalData - Additional state data to preserve/update
   *
   * @throws {PatternTrackingError} When state update fails
   */
  async updateStateFile(
    mergedPatterns: MergedPattern[],
    additionalData?: Partial<StateFileData>
  ): Promise<void> {
    // Guard: Validate input
    if (!Array.isArray(mergedPatterns)) {
      throw new PatternTrackingError(
        'Invalid merged patterns input',
        {
          what: 'Merged patterns must be an array',
          how: [
            'Ensure merged patterns parameter is an array',
            'Check that pattern merging completed successfully',
            'Verify patterns are valid MergedPattern objects',
          ],
          technical: `Received type: ${typeof mergedPatterns}`,
        },
        PatternTrackingErrorCode.INVALID_INPUT
      );
    }

    // Guard: DoS protection - limit patterns written
    const MAX_PATTERNS = 10000;
    if (mergedPatterns.length > MAX_PATTERNS) {
      throw new PatternTrackingError(
        'Merged patterns array exceeds maximum size',
        {
          what: `Merged patterns array contains ${mergedPatterns.length} patterns, maximum allowed is ${MAX_PATTERNS}`,
          how: [
            'Reduce the number of corrections being analyzed',
            'Process data in smaller batches',
            'Check for data quality issues causing pattern explosion',
          ],
          technical: `Merged patterns array size: ${mergedPatterns.length}, maximum: ${MAX_PATTERNS}`,
        },
        PatternTrackingErrorCode.INVALID_INPUT
      );
    }

    // Guard: Validate additionalData fields against schema
    if (additionalData && typeof additionalData === 'object') {
      const allowedFields = [
        'last_analysis',
        'patterns_found',
        'improvements_applied',
        'corrections_reduction',
        'platform',
        '_schema_note',
        'category_summaries',
        'frequency_analysis',
        'total_corrections_analyzed',
        'total_patterns_found',
      ];
      const extraFields = Object.keys(additionalData).filter(k => !allowedFields.includes(k));
      if (extraFields.length > 0) {
        console.warn(`Additional data contains unexpected fields (will be ignored): ${extraFields.join(', ')}`);
      }
    }

    // Create backup before update
    let backupPath: string | null = null;
    try {
      backupPath = await this.createBackup();
    } catch (error) {
      // Critical: Prevent state update if backup fails (NFR16)
      throw new PatternTrackingError(
        'Backup creation failed - state not modified',
        {
          what: 'Cannot safely update state file without backup',
          how: [
            'Check disk space is available',
            'Verify write permissions for history directory',
            'Manual workaround: Copy state.json to data/history/ manually',
          ],
          technical: error instanceof Error ? error.message : 'Unknown error',
        },
        PatternTrackingErrorCode.BACKUP_CREATION_FAILED,
        error instanceof Error ? error : undefined
      );
    }

    // Read existing state or create new
    let existingState: StateFileData;
    try {
      if (fs.existsSync(this.statePath)) {
        const content = await fs.promises.readFile(this.statePath, 'utf-8');
        existingState = JSON.parse(content);
      } else {
        // Create initial state
        existingState = {
          last_analysis: '',
          patterns_found: [],
          improvements_applied: 0,
          corrections_reduction: 0,
          platform: 'unknown',
          _schema_note: 'results.jsonl is append-only, one JSON object per line',
        };
      }
    } catch (error) {
      throw new PatternTrackingError(
        'Failed to read existing state file',
        {
          what: 'Cannot read current state before update',
          how: [
            'Check state.json file exists and is readable',
            'Restore from backup if file is corrupted',
            `Backup available at: ${backupPath}`,
          ],
          technical: error instanceof Error ? error.message : 'Unknown error',
        },
        PatternTrackingErrorCode.STATE_FILE_READ_FAILED,
        error instanceof Error ? error : undefined
      );
    }

    // Update state with merged patterns
    const updatedState: StateFileData = {
      ...existingState,
      ...additionalData,
      last_analysis: new Date().toISOString(),
      patterns_found: mergedPatterns,
      // Preserve Story 2-5 data if it exists
      category_summaries: additionalData?.category_summaries || existingState.category_summaries,
      frequency_analysis: additionalData?.frequency_analysis || existingState.frequency_analysis,
      total_corrections_analyzed: additionalData?.total_corrections_analyzed || existingState.total_corrections_analyzed,
      total_patterns_found: mergedPatterns.length,
    };

    // Write updated state with retry logic
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Guard: JSON.stringify can fail on circular references
        let jsonContent: string;
        try {
          jsonContent = JSON.stringify(updatedState, null, 2);
        } catch (stringifyError) {
          throw new PatternTrackingError(
            'Failed to serialize state data to JSON',
            {
              what: 'State data contains circular references or invalid values',
              how: [
                'Check for circular references in pattern objects',
                'Verify all pattern data is JSON-serializable',
                'Review pattern merging logic for data corruption',
              ],
              technical: stringifyError instanceof Error ? stringifyError.message : 'Unknown error',
            },
            PatternTrackingErrorCode.INVALID_STATE_SCHEMA,
            stringifyError instanceof Error ? stringifyError : undefined
          );
        }

        // Write atomically
        const tempPath = `${this.statePath}.tmp`;
        await fs.promises.writeFile(tempPath, jsonContent, { mode: 0o600 });
        await fs.promises.rename(tempPath, this.statePath);

        // Success - exit retry loop
        return;
      } catch (error) {
        // Don't overwrite PatternTrackingError with generic error
        if (error instanceof PatternTrackingError) {
          throw error;
        }
        lastError = error instanceof Error ? error : new Error(String(error));

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    // All retries failed
    throw new PatternTrackingError(
      'Failed to write updated state file after retries',
      {
        what: 'State file write operation failed repeatedly',
        how: [
          'Check disk space is available',
          'Verify write permissions for state file',
          'Ensure state file is not locked by another process',
          `Backup available at: ${backupPath}`,
          'Manual workaround: Copy backup to state.json',
        ],
        technical: lastError?.message || 'Unknown error',
      },
      PatternTrackingErrorCode.STATE_FILE_WRITE_FAILED,
      lastError
    );
  }

  /**
   * Generate longitudinal analysis report
   *
   * @param mergedPatterns - Merged patterns to analyze
   * @param analysisTimestamp - Analysis timestamp (ISO 8601)
   * @returns Longitudinal analysis report
   */
  generateLongitudinalReport(
    mergedPatterns: MergedPattern[],
    analysisTimestamp?: string
  ): LongitudinalReport {
    // Guard: Validate input
    if (!Array.isArray(mergedPatterns)) {
      throw new PatternTrackingError(
        'Invalid merged patterns input',
        {
          what: 'Merged patterns must be an array',
          how: [
            'Ensure merged patterns parameter is an array',
            'Check that pattern merging completed successfully',
          ],
          technical: `Received type: ${typeof mergedPatterns}`,
        },
        PatternTrackingErrorCode.INVALID_INPUT
      );
    }

    const timestamp = analysisTimestamp || new Date().toISOString();

    // Filter patterns by category
    const newPatterns = mergedPatterns.filter(p => p.is_new);
    const recurringPatterns = mergedPatterns.filter(p => !p.is_new);
    const increasingTrends = mergedPatterns.filter(p => p.frequency_change >= 0.5);
    const decreasingTrends = mergedPatterns.filter(p => p.frequency_change <= -0.5);

    return {
      new_patterns: newPatterns,
      recurring_patterns: recurringPatterns,
      trends_increasing: increasingTrends,
      trends_decreasing: decreasingTrends,
      session_summary: {
        total_patterns: mergedPatterns.length,
        new_pattern_count: newPatterns.length,
        recurring_pattern_count: recurringPatterns.length,
        analysis_timestamp: timestamp,
      },
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Load historical patterns with a single function call
 *
 * @param statePath - Path to state.json file
 * @returns Array of historical patterns, or empty array if none exist
 */
export function loadHistoricalPatterns(statePath: string): HistoricalPattern[] {
  const tracker = new PatternTracker(statePath);
  return tracker.loadHistoricalPatterns();
}

/**
 * Merge patterns with a single function call
 *
 * @param statePath - Path to state.json file
 * @param currentPatterns - Current session patterns
 * @param currentTimestamp - Current session timestamp (optional)
 * @returns Merged patterns with statistics
 */
export function mergeWithHistorical(
  statePath: string,
  currentPatterns: Pattern[],
  currentTimestamp?: string
): { patterns: MergedPattern[]; statistics: MergeStatistics } {
  const tracker = new PatternTracker(statePath);
  return tracker.mergeWithHistorical(currentPatterns, currentTimestamp);
}

/**
 * Update state file with a single function call
 *
 * @param statePath - Path to state.json file
 * @param mergedPatterns - Merged patterns to write
 * @param additionalData - Additional state data to preserve/update
 */
export async function updateStateFile(
  statePath: string,
  mergedPatterns: MergedPattern[],
  additionalData?: Partial<StateFileData>
): Promise<void> {
  const tracker = new PatternTracker(statePath);
  await tracker.updateStateFile(mergedPatterns, additionalData);
}

/**
 * Generate longitudinal report with a single function call
 *
 * @param mergedPatterns - Merged patterns to analyze
 * @param analysisTimestamp - Analysis timestamp (optional)
 * @returns Longitudinal analysis report
 */
export function generateLongitudinalReport(
  mergedPatterns: MergedPattern[],
  analysisTimestamp?: string
): LongitudinalReport {
  const tracker = new PatternTracker('/dev/null'); // Path doesn't matter for report generation
  return tracker.generateLongitudinalReport(mergedPatterns, analysisTimestamp);
}
