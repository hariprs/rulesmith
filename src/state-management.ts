import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import { PatternCategory } from './pattern-detector';

// ============================================================================
// CONSTANTS
// ============================================================================

const ABSOLUTE_PATHS = {
  BASE: '/Users/hpandura/Personal-Projects/Project-Self_Improvement/.claude/skills/rulesmith',
  STATE: '/Users/hpandura/Personal-Projects/Project-Self_Improvement/.claude/skills/rulesmith/data/state.json',
  RESULTS: '/Users/hpandura/Personal-Projects/Project-Self_Improvement/.claude/skills/rulesmith/data/results.jsonl',
  HISTORY_DIR: '/Users/hpandura/Personal-Projects/Project-Self_Improvement/.claude/skills/rulesmith/data/history',
} as const;

/**
 * Generate ISO 8601 UTC timestamp without milliseconds
 * Format: YYYY-MM-DDTHH:MM:SSZ
 *
 * @returns ISO 8601 UTC timestamp string
 */
function generateTimestamp(): string {
  const now = new Date();
  // Format: YYYY-MM-DDTHH:MM:SSZ (no milliseconds)
  return now.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Generate ISO 8601 UTC timestamp with milliseconds
 * Format: YYYY-MM-DDTHH:MM:SS.sssZ
 * Used for first_seen timestamps that require millisecond precision
 *
 * @returns ISO 8601 UTC timestamp string with milliseconds
 */
function generateTimestampWithMillis(): string {
  const now = new Date();
  // Format: YYYY-MM-DDTHH:MM:SS.sssZ (with milliseconds)
  return now.toISOString();
}

/**
 * Pattern example with context from original correction
 */
export interface PatternExample {
  original_suggestion: string;
  user_correction: string;
  context: string;
  timestamp: string;
  content_type: string;
}

/**
 * Base pattern interface
 */
export interface BasePattern {
  pattern_text: string;
  count: number;
  category: PatternCategory;
  examples: PatternExample[];
  suggested_rule: string;
  first_seen: string;
  last_seen: string;
  content_types: string[];
}

/**
 * Merged pattern with longitudinal tracking fields (Story 2-6)
 */
export interface MergedPattern extends BasePattern {
  first_seen: string;
  last_seen: string;
  session_count: number;
  total_frequency: number;
  is_new: boolean;
  frequency_change: number;
}

export interface StateData {
  last_analysis: string;
  patterns_found: string[] | MergedPattern[];
  improvements_applied: number;
  corrections_reduction: number;
  platform: 'claude-code' | 'cursor' | 'unknown';
  _schema_note: string;
  category_summaries?: any[];
  frequency_analysis?: any;
  total_corrections_analyzed?: number;
  total_patterns_found?: number;
  // Story 5-3: Metrics tracking
  approval_rate?: number | null; // Percentage (0-100), nullable
  total_sessions?: number; // Count of analysis sessions, non-negative integer
  approval_threshold?: number; // Percentage (0-100), default 75
  // Story 6-5: Rule file size monitoring
  rule_file_line_count?: number | null; // Current line count of rule file, nullable
}

/**
 * Validation error for invalid input parameters
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * State corruption error for when state files are invalid
 */
export class StateCorruptionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'StateCorruptionError';
  }
}

/**
 * Validates that a directory path is safe to use
 * @throws {ValidationError} if path is invalid or potentially dangerous
 */
function validateDirectoryPath(dataDir: string): void {
  // Guard: Null/undefined input
  if (!dataDir) {
    throw new ValidationError('Directory path cannot be null or undefined');
  }

  // Guard: Non-string input
  if (typeof dataDir !== 'string') {
    throw new ValidationError('Directory path must be a string');
  }

  // Guard: Empty string
  if (dataDir.trim() === '') {
    throw new ValidationError('Directory path cannot be empty');
  }

  // Guard: Path traversal attempts
  const normalizedPath = path.normalize(dataDir);
  if (normalizedPath.includes('..')) {
    throw new ValidationError('Directory path cannot contain parent directory references (..)');
  }

  // Guard: Excessively long paths (potential DoS)
  if (dataDir.length > 4096) {
    throw new ValidationError('Directory path exceeds maximum length (4096 characters)');
  }

  // Guard: Null bytes (potential security issue)
  if (dataDir.includes('\0')) {
    throw new ValidationError('Directory path cannot contain null bytes');
  }

  // Guard: Control characters (ASCII 0-31, 127)
  if (/[\x00-\x1F\x7F]/.test(dataDir)) {
    throw new ValidationError('Directory path cannot contain control characters');
  }

  // Guard: Unicode control characters and homoglyphs
  if (/[\u2000-\u200F\u202A-\u202E\u2060-\u206F]/.test(dataDir)) {
    throw new ValidationError('Directory path cannot contain Unicode control characters');
  }

  // Guard: Sensitive system directories (Unix-like systems)
  const sensitiveDirs = ['/etc', '/sys', '/proc', '/boot', '/root', '/System', '/private/etc', '/private/var'];
  if (sensitiveDirs.some(d => normalizedPath.startsWith(d))) {
    throw new ValidationError('Directory path cannot point to sensitive system directories');
  }
}

/**
 * Validates state data structure
 * @throws {ValidationError} if state data is invalid
 */
function validateStateData(state: any): asserts state is StateData {
  // Guard: Null/undefined state
  if (!state || typeof state !== 'object') {
    throw new ValidationError('State data must be a non-null object');
  }

  // Guard: Schema drift - unexpected fields (with backward compatibility for Story 2-5 additions)
  const allowedFields = [
    'last_analysis',
    'patterns_found',
    'improvements_applied',
    'corrections_reduction',
    'platform',
    '_schema_note',
    'category_summaries', // Story 2-5
    'frequency_analysis', // Story 2-5
    'total_corrections_analyzed', // Story 2-5
    'total_patterns_found', // Story 2-6
    'approval_rate', // Story 5-3
    'total_sessions', // Story 5-3
    'approval_threshold', // Story 5-3
    'rule_file_line_count', // Story 6-5
  ];
  const extraFields = Object.keys(state).filter(k => !allowedFields.includes(k));
  if (extraFields.length > 0) {
    console.warn(`State data contains unexpected fields (will be ignored): ${extraFields.join(', ')}`);
  }

  // Guard: Validate last_analysis field
  if (!('last_analysis' in state)) {
    throw new ValidationError('State data missing required field: last_analysis');
  }
  if (typeof state.last_analysis !== 'string') {
    throw new ValidationError('last_analysis must be a string');
  }
  // Note: Allow empty string for initial state

  // Guard: Validate patterns_found field (supports both string[] and MergedPattern[] for backward compatibility)
  if (!('patterns_found' in state)) {
    throw new ValidationError('State data missing required field: patterns_found');
  }
  if (!Array.isArray(state.patterns_found)) {
    throw new ValidationError('patterns_found must be an array');
  }
  // Guard: Validate array elements (allow strings for backward compatibility, or MergedPattern objects)
  const validElements = state.patterns_found.every((item: unknown) => {
    // Allow strings (legacy format from Epic 1)
    if (typeof item === 'string') {
      return true;
    }
    // Allow MergedPattern objects (Story 2-6 format)
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const pattern = item as any;
      return (
        typeof pattern.pattern_text === 'string' &&
        typeof pattern.count === 'number' &&
        typeof pattern.is_new === 'boolean' &&
        typeof pattern.session_count === 'number' &&
        typeof pattern.total_frequency === 'number' &&
        typeof pattern.frequency_change === 'number'
      );
    }
    return false;
  });
  if (!validElements) {
    throw new ValidationError('All elements in patterns_found must be strings or valid MergedPattern objects');
  }
  // Guard: DoS protection - limit array size
  if (state.patterns_found.length > 10000) {
    throw new ValidationError('patterns_found array exceeds maximum size (10000)');
  }

  // Guard: Validate improvements_applied field
  if (!('improvements_applied' in state)) {
    throw new ValidationError('State data missing required field: improvements_applied');
  }
  if (typeof state.improvements_applied !== 'number') {
    throw new ValidationError('improvements_applied must be a number');
  }
  // Guard: NaN check before other validations
  if (Number.isNaN(state.improvements_applied)) {
    throw new ValidationError('improvements_applied cannot be NaN');
  }
  if (state.improvements_applied < 0) {
    throw new ValidationError('improvements_applied must be non-negative');
  }
  if (!Number.isFinite(state.improvements_applied)) {
    throw new ValidationError('improvements_applied must be a finite number');
  }

  // Guard: Validate corrections_reduction field
  if (!('corrections_reduction' in state)) {
    throw new ValidationError('State data missing required field: corrections_reduction');
  }
  if (typeof state.corrections_reduction !== 'number') {
    throw new ValidationError('corrections_reduction must be a number');
  }
  // Guard: NaN check before other validations
  if (Number.isNaN(state.corrections_reduction)) {
    throw new ValidationError('corrections_reduction cannot be NaN');
  }
  if (state.corrections_reduction < 0 || state.corrections_reduction > 1) {
    throw new ValidationError('corrections_reduction must be between 0 and 1');
  }
  if (!Number.isFinite(state.corrections_reduction)) {
    throw new ValidationError('corrections_reduction must be a finite number');
  }

  // Guard: Validate platform field
  if (!('platform' in state)) {
    throw new ValidationError('State data missing required field: platform');
  }
  if (!['claude-code', 'cursor', 'unknown'].includes(state.platform)) {
    throw new ValidationError('platform must be one of: claude-code, cursor, unknown');
  }

  // Guard: Validate _schema_note field
  if (!('_schema_note' in state)) {
    throw new ValidationError('State data missing required field: _schema_note');
  }
  if (typeof state._schema_note !== 'string') {
    throw new ValidationError('_schema_note must be a string');
  }
  // Note: Allow empty string for backward compatibility

  // Guard: Validate approval_rate field (Story 5-3)
  if ('approval_rate' in state) {
    if (state.approval_rate !== null && typeof state.approval_rate !== 'number') {
      throw new ValidationError('approval_rate must be a number or null');
    }
    if (typeof state.approval_rate === 'number') {
      // NaN check before other validations
      if (Number.isNaN(state.approval_rate)) {
        throw new ValidationError('approval_rate cannot be NaN');
      }
      if (state.approval_rate < 0 || state.approval_rate > 100) {
        throw new ValidationError('approval_rate must be between 0 and 100');
      }
      if (!Number.isFinite(state.approval_rate)) {
        throw new ValidationError('approval_rate must be a finite number');
      }
    }
  }

  // Guard: Validate total_sessions field (Story 5-3)
  if ('total_sessions' in state) {
    if (typeof state.total_sessions !== 'number') {
      throw new ValidationError('total_sessions must be a number');
    }
    // NaN check before other validations
    if (Number.isNaN(state.total_sessions)) {
      throw new ValidationError('total_sessions cannot be NaN');
    }
    if (state.total_sessions < 0) {
      throw new ValidationError('total_sessions must be non-negative');
    }
    if (!Number.isInteger(state.total_sessions)) {
      throw new ValidationError('total_sessions must be an integer');
    }
    if (!Number.isFinite(state.total_sessions)) {
      throw new ValidationError('total_sessions must be a finite number');
    }
  }

  // Guard: Validate approval_threshold field (Story 5-3)
  if ('approval_threshold' in state) {
    if (typeof state.approval_threshold !== 'number') {
      throw new ValidationError('approval_threshold must be a number');
    }
    // NaN check before other validations
    if (Number.isNaN(state.approval_threshold)) {
      throw new ValidationError('approval_threshold cannot be NaN');
    }
    if (state.approval_threshold < 0 || state.approval_threshold > 100) {
      throw new ValidationError('approval_threshold must be between 0 and 100');
    }
    if (!Number.isFinite(state.approval_threshold)) {
      throw new ValidationError('approval_threshold must be a finite number');
    }
  }
}

/**
 * Validates payload for appendResult
 * @throws {ValidationError} if payload is invalid
 */
function validatePayload(payload: any): void {
  // Guard: Null/undefined payload
  if (payload === null || payload === undefined) {
    throw new ValidationError('Payload cannot be null or undefined');
  }

  // Guard: Prototype pollution patterns (use hasOwnProperty to avoid false positives from inherited properties)
  const hasOwn = Object.prototype.hasOwnProperty;
  if (hasOwn.call(payload, '__proto__') || hasOwn.call(payload, 'constructor') && typeof payload.constructor === 'object') {
    throw new ValidationError('Payload contains forbidden properties that may cause prototype pollution');
  }

  // Guard: Check for non-serializable values (functions, Symbols, etc.)
  const checkSerializable = (obj: any): boolean => {
    if (typeof obj === 'function') return false;
    if (typeof obj === 'symbol') return false;
    if (obj && typeof obj === 'object') {
      return Object.values(obj).every(checkSerializable);
    }
    return true;
  };
  if (!checkSerializable(payload)) {
    throw new ValidationError('Payload contains non-serializable values (functions or symbols)');
  }

  // Guard: Check nesting depth to prevent stack overflow
  const getDepth = (obj: any, currentDepth = 0): number => {
    if (!obj || typeof obj !== 'object') return currentDepth;
    if (currentDepth > 100) return currentDepth; // Prevent infinite recursion
    return 1 + Math.max(0, ...Object.values(obj).map((v: any) => getDepth(v, currentDepth + 1)));
  };
  if (getDepth(payload) > 100) {
    throw new ValidationError('Payload nesting depth exceeds safe limit (100 levels)');
  }

  // Guard: Circular references (would cause JSON.stringify to fail)
  try {
    JSON.stringify(payload);
  } catch (error) {
    throw new ValidationError(`Payload cannot be serialized to JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Guard: Excessively large payloads (potential DoS)
  const serialized = JSON.stringify(payload);
  if (serialized.length > 1024 * 1024) { // 1MB limit
    throw new ValidationError('Payload size exceeds maximum allowed size (1MB)');
  }
}

/**
 * Ensures the data directory exists and is initialized with the required state files.
 * Uses 0o600 permissions to secure the state.
 * @throws {ValidationError} if dataDir is invalid
 * @throws {StateCorruptionError} if existing state is corrupted
 */
export async function initializeState(dataDir: string): Promise<void> {
  // Guard: Validate input path
  validateDirectoryPath(dataDir);

  // Ensure base data directory exists
  try {
    if (!fs.existsSync(dataDir)) {
      await fs.promises.mkdir(dataDir, { recursive: true, mode: 0o700 });
    }
  } catch (error) {
    throw new StateCorruptionError(
      `Failed to create data directory at ${dataDir}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }

  const historyDir = path.join(dataDir, 'history');
  try {
    if (!fs.existsSync(historyDir)) {
      await fs.promises.mkdir(historyDir, { recursive: true, mode: 0o700 });
    }
  } catch (error) {
    throw new StateCorruptionError(
      `Failed to create history directory at ${historyDir}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }

  const gitkeepPath = path.join(historyDir, '.gitkeep');
  try {
    if (!fs.existsSync(gitkeepPath)) {
      await fs.promises.writeFile(gitkeepPath, '', { mode: 0o600 });
    }
  } catch (error) {
    throw new StateCorruptionError(
      `Failed to create .gitkeep file at ${gitkeepPath}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }

  const statePath = path.join(dataDir, 'state.json');
  if (!fs.existsSync(statePath)) {
    const initialState: StateData = {
      last_analysis: '',
      patterns_found: [],
      improvements_applied: 0,
      corrections_reduction: 0,
      platform: 'unknown',
      _schema_note: 'results.jsonl is append-only, one JSON object per line'
    };
    try {
      await fs.promises.writeFile(statePath, JSON.stringify(initialState, null, 2), { mode: 0o600 });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOSPC') {
        throw new StateCorruptionError(
          'Disk space exhausted. Cannot create state file.',
          error
        );
      }
      throw new StateCorruptionError(
        `Failed to write initial state file at ${statePath}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  } else {
    // Guard: Validate existing state file
    try {
      // Check permissions first
      const stats = await fs.promises.stat(statePath);
      const currentMode = stats.mode & 0o777;
      if (currentMode !== 0o600) {
        await fs.promises.chmod(statePath, 0o600);
      }

      const content = await fs.promises.readFile(statePath, 'utf-8');
      const existingState = JSON.parse(content);
      validateStateData(existingState);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new StateCorruptionError(
          `Existing state file at ${statePath} is invalid: ${error.message}`,
          error
        );
      }
      if (error instanceof Error && 'code' in error) {
        if (error.code === 'ENOSPC') {
          throw new StateCorruptionError('Disk space exhausted. Cannot validate state file.', error);
        }
        if (error.code === 'EACCES') {
          throw new StateCorruptionError(`Permission denied reading state file at ${statePath}`, error);
        }
      }
      throw new StateCorruptionError(
        `Failed to read or validate existing state file at ${statePath}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  const resultsPath = path.join(dataDir, 'results.jsonl');
  try {
    if (!fs.existsSync(resultsPath)) {
      await fs.promises.writeFile(resultsPath, '', { mode: 0o600 });
    } else {
      // Guard: Validate existing results.jsonl is not malformed
      const stats = await fs.promises.stat(resultsPath);
      if (stats.size > 0) {
        const content = await fs.promises.readFile(resultsPath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim() !== '');
        // Validate it's proper JSONL format
        for (const line of lines) {
          try {
            JSON.parse(line);
          } catch (parseError) {
            throw new StateCorruptionError(
              `Existing results.jsonl contains malformed JSON on line: ${line.substring(0, 50)}...`,
              parseError instanceof Error ? parseError : new Error(String(parseError))
            );
          }
        }
      }
      // Ensure permissions are strictly 0600
      await fs.promises.chmod(resultsPath, 0o600);
    }
  } catch (error) {
    if (error instanceof StateCorruptionError) {
      throw error;
    }
    if (error instanceof Error && 'code' in error) {
      if (error.code === 'ENOSPC') {
        throw new StateCorruptionError('Disk space exhausted. Cannot initialize results file.', error);
      }
      if (error.code === 'EACCES') {
        throw new StateCorruptionError(`Permission denied accessing results file at ${resultsPath}`, error);
      }
    }
    throw new StateCorruptionError(
      `Failed to initialize results file at ${resultsPath}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Reads and validates state from state.json file
 * @param statePath - Path to state.json file
 * @returns Validated StateData object
 * @throws {ValidationError} if statePath is invalid
 * @throws {StateCorruptionError} if file cannot be read or parsed
 */
export async function readState(statePath: string): Promise<StateData> {
  // Guard: Validate file path
  if (!statePath || typeof statePath !== 'string') {
    throw new ValidationError('State path must be a non-empty string');
  }

  try {
    // Read file content
    const content = await fs.promises.readFile(statePath, 'utf-8')
      .catch(e => {
        if (e && typeof e === 'object' && 'code' in e && e.code === 'EACCES') {
          throw new StateCorruptionError('Permission denied reading state.json', e instanceof Error ? e : new Error(String(e)));
        }
        throw e;
      });

    // Parse JSON
    const state: StateData = JSON.parse(content);

    // Validate state data
    validateStateData(state);

    return state;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof StateCorruptionError) {
      throw error;
    }
    throw new StateCorruptionError(
      `Failed to read state from ${statePath}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Loads historical state at the start of an analysis session.
 *
 * Reads state.json and returns the full StateData object if valid state exists.
 * Handles corruption detection and recovery internally via existing functions:
 * - detectStateCorruption() to identify invalid state
 * - recoverFromBackup() to restore from the last known good backup
 *
 * @param dataDir - Path to the data directory (containing state.json and history/)
 * @returns The loaded StateData object, or null if no state file exists (first run).
 *          When state.json is corrupted, recovers from backup (which may return
 *          a default-initialized state object with empty patterns).
 */
export async function loadStateForAnalysis(dataDir: string): Promise<StateData | null> {
  // Guard: Validate directory path
  if (!dataDir || typeof dataDir !== 'string') {
    throw new ValidationError('Data directory path must be a non-empty string');
  }

  const statePath = path.join(dataDir, 'state.json');

  // Step 1: Check if state.json exists
  try {
    await fs.promises.access(statePath, fs.constants.F_OK);
  } catch (error) {
    // ENOENT = file not found (first run) -- this is normal
    if (error && typeof error === 'object' && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('[INFO] No previous state found at', statePath, '-- starting fresh session');
      return null;
    }
    // Permission denied or other unexpected error -- try recovery path
    console.warn('[WARN] Cannot access state file at', statePath, ':', error);
    // Fall through to recovery -- detectStateCorruption + recoverFromBackup
    // If recovery also fails, the inner catch returns default-initialized state
  }

  // Step 2: Try to read and validate state via readState (which calls validateStateData internally)
  // If access() failed on this path (non-ENOENT), readState will also fail and trigger recovery
  try {
    const state = await readState(statePath);
    return state;
  } catch (error) {
    // readState throws ValidationError or StateCorruptionError on bad data,
    // or throws on permission errors (EACCES) that propagate through
    console.warn('[WARN] State file corrupted or invalid at', statePath, ':', (error instanceof Error) ? error.message : String(error));

    // Step 3: Attempt corruption recovery
    try {
      // detectStateCorruption distinguishes ENOENT (first run) from actual corruption
      const isCorrupted = await detectStateCorruption(statePath);
      if (!isCorrupted) {
        // Unexpected: access succeeded but readState failed and corruption not detected
        // Fall through to recovery as safety net
        console.warn('[WARN] State inconsistency detected -- attempting recovery');
      }

      // recoverFromBackup returns recovered state or default-initialized state
      const recovered = await recoverFromBackup(dataDir);
      console.log('[INFO] State recovered from backup -- continuing with recovered state');
      return recovered;
    } catch (recoveryError) {
      // Recovery itself failed (unexpected -- recoverFromBackup handles all its own errors)
      console.warn('[WARN] State recovery failed, initializing with empty state:', (recoveryError instanceof Error) ? recoveryError.message : String(recoveryError));
      // Return default-initialized state following recoverFromBackup's pattern
      return {
        last_analysis: '',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'unknown',
        _schema_note: 'results.jsonl is append-only, one JSON object per line',
        total_sessions: 0,
        approval_threshold: 75,
        approval_rate: null,
      };
    }
  }
}

/**
 * Check whether a pattern text matches any known historical pattern.
 *
 * Case-insensitive comparison. Handles both MergedPattern objects (current format)
 * and plain strings (legacy format) since StateData.patterns_found is typed as
 * `string[] | MergedPattern[]`.
 *
 * @param patternText - The pattern text to check
 * @param historicalPatterns - Array of historical patterns (MergedPattern or legacy string)
 * @returns true if the pattern text matches any historical pattern
 */
export function isKnownPattern(
  patternText: string,
  historicalPatterns: (string | MergedPattern)[],
): boolean {
  if (!patternText) return false;
  if (!historicalPatterns || historicalPatterns.length === 0) return false;

  const lowerPatternText = patternText.toLowerCase();

  return historicalPatterns.some((p) => {
    if (typeof p === 'string') {
      // Legacy string format
      return p.toLowerCase() === lowerPatternText;
    }
    // MergedPattern object format -- guard against null/malformed elements
    if (p !== null && typeof p === 'object' && typeof p.pattern_text === 'string') {
      return p.pattern_text.toLowerCase() === lowerPatternText;
    }
    // Skip malformed elements
    return false;
  });
}

/**
 * Writes state to state.json file atomically
 * @param statePath - Path to state.json file
 * @param state - StateData object to write
 * @throws {ValidationError} if statePath or state is invalid
 * @throws {StateCorruptionError} if write operation fails
 */
export async function writeState(statePath: string, state: StateData): Promise<void> {
  // Guard: Validate file path
  if (!statePath || typeof statePath !== 'string') {
    throw new ValidationError('State path must be a non-empty string');
  }

  // Guard: Validate state data
  validateStateData(state);

  const tmpPath = `${statePath}.tmp`;

  try {
    // Serialize state to JSON
    const content = JSON.stringify(state, null, 2);

    // Write to temp file
    await fs.promises.writeFile(tmpPath, content, { mode: 0o600 })
      .catch(e => {
        if (e && typeof e === 'object' && 'code' in e && e.code === 'EACCES') {
          throw new StateCorruptionError('Permission denied writing temp state file', e instanceof Error ? e : new Error(String(e)));
        }
        throw e;
      });

    // Verify temp file content
    const verifyContent = await fs.promises.readFile(tmpPath, 'utf8');
    if (verifyContent !== content) {
      throw new StateCorruptionError('Temp file verification failed');
    }

    // Atomic rename (handle cross-device rename)
    await fs.promises.rename(tmpPath, statePath)
      .catch(async (e) => {
        if (e && typeof e === 'object' && 'code' in e && e.code === 'EXDEV') {
          // Cross-device rename: copy then delete
          await fs.promises.copyFile(tmpPath, statePath);
          await fs.promises.unlink(tmpPath);
          return;
        }
        throw e;
      });
  } catch (error) {
    // Clean up temp file if it exists
    try {
      if (fs.existsSync(tmpPath)) {
        await fs.promises.unlink(tmpPath);
      }
    } catch {
      // Ignore cleanup errors
    }

    if (error instanceof ValidationError || error instanceof StateCorruptionError) {
      throw error;
    }
    throw new StateCorruptionError(
      `Failed to write state to ${statePath}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Write state atomically to prevent corruption (Story 5.4)
 * Creates temp file, validates it, then performs atomic rename.
 * Validates temp file BEFORE atomic rename.
 * Validates again after rename to verify write success.
 *
 * @param statePath - Path to state.json file
 * @param state - StateData object to write
 * @throws {ValidationError} if statePath or state is invalid
 * @throws {StateCorruptionError} if write operation fails
 */
export async function writeStateAtomically(
  statePath: string,
  state: StateData
): Promise<void> {
  // Guard: Validate file path
  if (!statePath || typeof statePath !== 'string') {
    throw new ValidationError('State path must be a non-empty string');
  }

  // Guard: Validate state data
  validateStateData(state);

  const tmpPath = `${statePath}.tmp`;

  try {
    // Serialize state to JSON
    const content = JSON.stringify(state, null, 2);

    // Write to temp file with 0o600 permissions
    await fs.promises.writeFile(tmpPath, content, { mode: 0o600 })
      .catch(e => {
        if (e && typeof e === 'object' && 'code' in e && e.code === 'EACCES') {
          throw new StateCorruptionError('Permission denied writing temp state file', e instanceof Error ? e : new Error(String(e)));
        }
        throw e;
      });

    // Validate temp file BEFORE atomic rename (JSON syntax, required fields)
    await validateStateFile(tmpPath);

    // Verify temp file content matches expected content
    const verifyContent = await fs.promises.readFile(tmpPath, 'utf8');
    if (verifyContent !== content) {
      throw new StateCorruptionError('Temp file verification failed');
    }

    // Atomic rename (handle cross-device rename)
    await fs.promises.rename(tmpPath, statePath)
      .catch(async (e) => {
        if (e && typeof e === 'object' && 'code' in e && e.code === 'EXDEV') {
          // Cross-device rename: copy then delete
          await fs.promises.copyFile(tmpPath, statePath);
          await fs.promises.unlink(tmpPath);
          return;
        }
        throw e;
      });

    // Validate again after rename to verify write success
    await validateStateFile(statePath);

  } catch (error) {
    // Clean up temp file if it exists
    try {
      if (fs.existsSync(tmpPath)) {
        await fs.promises.unlink(tmpPath);
      }
    } catch {
      // Ignore cleanup errors
    }

    if (error instanceof ValidationError || error instanceof StateCorruptionError) {
      throw error;
    }
    throw new StateCorruptionError(
      `Failed to write state to ${statePath}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Validate state file on disk (syntax + structure) (Story 5.4)
 * Reads file from disk, parses JSON, validates required fields and types.
 * Difference from validateStateData(): This validates file on disk,
 * validateStateData() validates in-memory object.
 *
 * @param statePath - Path to state.json file
 * @throws {ValidationError} if validation fails
 * @throws {StateCorruptionError} if file cannot be read or parsed
 */
export async function validateStateFile(statePath: string): Promise<void> {
  // Guard: Validate file path
  if (!statePath || typeof statePath !== 'string') {
    throw new ValidationError('State path must be a non-empty string');
  }

  try {
    // Read file from disk
    const content = await fs.promises.readFile(statePath, 'utf-8')
      .catch(e => {
        if (e && typeof e === 'object' && 'code' in e && e.code === 'EACCES') {
          throw new StateCorruptionError('Permission denied reading state file', e instanceof Error ? e : new Error(String(e)));
        }
        throw e;
      });

    // Parse JSON (throws if invalid syntax)
    const state = JSON.parse(content);

    // Validate required fields: last_analysis, patterns_found, platform, _schema_note
    const requiredFields = ['last_analysis', 'patterns_found', 'platform', '_schema_note'];
    for (const field of requiredFields) {
      if (!(field in state)) {
        throw new ValidationError(`State file missing required field: ${field}`);
      }
    }

    // Validate field types: string, array, string
    if (typeof state.last_analysis !== 'string') {
      throw new ValidationError('last_analysis must be a string');
    }

    if (!Array.isArray(state.patterns_found)) {
      throw new ValidationError('patterns_found must be an array');
    }

    if (typeof state.platform !== 'string') {
      throw new ValidationError('platform must be a string');
    }

    if (typeof state._schema_note !== 'string') {
      throw new ValidationError('_schema_note must be a string');
    }

    // Validate timestamp format (ISO 8601 UTC with optional milliseconds)
    if (state.last_analysis) {
      const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      if (!timestampRegex.test(state.last_analysis)) {
        throw new ValidationError(`last_analysis has invalid timestamp format: ${state.last_analysis}`);
      }
    }

    // Validate platform value
    if (!['claude-code', 'cursor', 'unknown'].includes(state.platform)) {
      throw new ValidationError(`platform must be one of: claude-code, cursor, unknown (got: ${state.platform})`);
    }

  } catch (error) {
    if (error instanceof ValidationError || error instanceof StateCorruptionError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new ValidationError(`State file contains invalid JSON syntax: ${error.message}`);
    }
    throw new StateCorruptionError(
      `Failed to validate state file at ${statePath}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Detect corrupted or malformed state.json (Story 5.4)
 * Distinguishes ENOENT (first run) from corruption.
 * Detects corrupted JSON (throws on parse).
 * Detects missing required fields.
 * Returns false for missing files (first run, not corruption).
 * Returns true for corrupted files.
 *
 * @param statePath - Path to state.json file
 * @returns True if file is corrupted, false if valid or missing (first run)
 */
export async function detectStateCorruption(statePath: string): Promise<boolean> {
  // Guard: Validate file path
  if (!statePath || typeof statePath !== 'string') {
    throw new ValidationError('State path must be a non-empty string');
  }

  try {
    // Check if file exists
    await fs.promises.access(statePath, fs.constants.F_OK);
  } catch (error) {
    // File doesn't exist - return false (first run, not corruption)
    const err = error as NodeJS.ErrnoException;
    if (err && err.code === 'ENOENT') {
      return false;
    }
    // Other access errors - treat as corruption
    return true;
  }

  try {
    // Try to read and parse the file
    const content = await fs.promises.readFile(statePath, 'utf-8')
      .catch(e => {
        if (e && typeof e === 'object' && 'code' in e && e.code === 'EACCES') {
          throw new StateCorruptionError('Permission denied reading state file', e instanceof Error ? e : new Error(String(e)));
        }
        throw e;
      });

    // Parse JSON (throws if corrupted)
    const state = JSON.parse(content);

    // Check for required fields
    const requiredFields = ['last_analysis', 'patterns_found', 'platform', '_schema_note'];
    for (const field of requiredFields) {
      if (!(field in state)) {
        return true; // Missing required field = corruption
      }
    }

    // Check field types
    if (typeof state.last_analysis !== 'string') return true;
    if (!Array.isArray(state.patterns_found)) return true;
    if (typeof state.platform !== 'string') return true;
    if (typeof state._schema_note !== 'string') return true;

    // File is valid
    return false;

  } catch (error) {
    // Any error during read/parse indicates corruption
    if (error instanceof ValidationError || error instanceof StateCorruptionError) {
      return true;
    }
    if (error instanceof SyntaxError) {
      return true; // Invalid JSON = corruption
    }
    return true; // Other errors = treat as corruption
  }
}

/**
 * Recover state from most recent valid backup (Story 5.4)
 * Scans data/history/ for backup files matching pattern state-*.json.
 * Sorts by filename (timestamp) to find most recent.
 * Validates each backup before using (skips corrupted).
 * Returns most recent valid backup.
 * Reinitializes with defaults if no valid backup.
 * Logs recovery event to results.jsonl with recovery_source field.
 *
 * @param dataDir - Data directory containing history/ subdirectory
 * @returns Recovered state data
 * @throws {ValidationError} if dataDir is invalid
 * @throws {StateCorruptionError} if recovery fails
 */
export async function recoverFromBackup(dataDir: string): Promise<StateData> {
  // Guard: Validate directory path
  validateDirectoryPath(dataDir);

  const historyDir = path.join(dataDir, 'history');
  const resultsPath = path.join(dataDir, 'results.jsonl');

  try {
    // Ensure history directory exists
    if (!fs.existsSync(historyDir)) {
      console.warn('[WARN] History directory does not exist, initializing with empty state');
      const initialState: StateData = {
        last_analysis: generateTimestamp(),
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'unknown',
        _schema_note: 'results.jsonl is append-only, one JSON object per line',
        total_sessions: 0,
        approval_threshold: 75,
        approval_rate: null,
      };
      return initialState;
    }

    // Scan for backup files matching pattern state-*.json
    const files = await fs.promises.readdir(historyDir);
    const backupFiles = files.filter(f => f.startsWith('state-') && f.endsWith('.json'));

    if (backupFiles.length === 0) {
      console.warn('[WARN] No backup files found, initializing with empty state');
      const initialState: StateData = {
        last_analysis: generateTimestamp(),
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'unknown',
        _schema_note: 'results.jsonl is append-only, one JSON object per line',
        total_sessions: 0,
        approval_threshold: 75,
        approval_rate: null,
      };
      return initialState;
    }

    // Sort by filename (timestamp) to find most recent (newest last)
    backupFiles.sort();

    // Try each backup from most recent to oldest
    for (let i = backupFiles.length - 1; i >= 0; i--) {
      const backupFile = backupFiles[i];
      const backupPath = path.join(historyDir, backupFile);

      try {
        // Validate backup before using
        await validateStateFile(backupPath);

        // Read and parse backup
        const content = await fs.promises.readFile(backupPath, 'utf-8');
        const state: StateData = JSON.parse(content);

        // Validate state data structure
        validateStateData(state);

        // Log recovery event to results.jsonl
        const recoveryEvent = {
          timestamp: generateTimestamp(),
          event_type: 'state_recovery',
          recovery_source: backupFile,
          message: `State recovered from ${backupFile}`,
        };

        try {
          await appendResult(dataDir, recoveryEvent);
        } catch (logError) {
          // Log error but don't fail recovery
          console.warn(`[WARN] Failed to log recovery event: ${logError instanceof Error ? logError.message : String(logError)}`);
        }

        console.log(`[INFO] Successfully recovered state from ${backupFile}`);
        return state;

      } catch (backupError) {
        // Backup is corrupted, skip to next
        console.warn(`[WARN] Backup file ${backupFile} is corrupted, trying next backup`);
        continue;
      }
    }

    // No valid backup found, reinitialize with defaults
    console.warn('[WARN] No valid backup found, initializing with empty state');
    const initialState: StateData = {
      last_analysis: generateTimestamp(),
      patterns_found: [],
      improvements_applied: 0,
      corrections_reduction: 0,
      platform: 'unknown',
      _schema_note: 'results.jsonl is append-only, one JSON object per line',
      total_sessions: 0,
      approval_threshold: 75,
      approval_rate: null,
    };
    return initialState;

  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new StateCorruptionError(
      `Failed to recover state from backup in ${historyDir}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Simple file lock mechanism to prevent concurrent write conflicts
 * Uses lock files with retry logic for cross-platform compatibility
 */
class FileLock {
  private lockPath: string;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly lockTimeout: number;
  private acquired = false;

  constructor(targetPath: string, options?: { maxRetries?: number; retryDelay?: number; lockTimeout?: number }) {
    // Guard: Validate and sanitize options
    this.maxRetries = Math.max(1, Math.min(100, options?.maxRetries ?? 5));
    this.retryDelay = Math.max(10, Math.min(10000, options?.retryDelay ?? 100));
    this.lockTimeout = Math.max(1000, Math.min(300000, options?.lockTimeout ?? 30000));

    // Guard: Validate target path
    if (!targetPath || typeof targetPath !== 'string') {
      throw new StateCorruptionError('Target path must be a non-empty string');
    }

    // Guard: Prevent path traversal in lock file path
    const normalizedTarget = path.normalize(targetPath);
    if (normalizedTarget.includes('..')) {
      throw new StateCorruptionError('Target path cannot contain parent directory references');
    }

    this.lockPath = `${targetPath}.lock`;
  }

  /**
   * Acquires a file lock with retry logic
   * @throws {StateCorruptionError} if lock cannot be acquired after max retries
   */
  async acquire(): Promise<void> {
    // Guard: Prevent double acquisition
    if (this.acquired) {
      throw new StateCorruptionError('Lock already acquired');
    }

    const startTime = Date.now();
    const totalTimeout = this.lockTimeout * 2; // Allow twice the lock timeout for acquisition

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      // Guard: Prevent excessive retry duration
      const elapsed = Date.now() - startTime;
      if (elapsed > totalTimeout) {
        throw new StateCorruptionError(
          `Lock acquisition timeout after ${elapsed}ms at ${this.lockPath}`
        );
      }

      try {
        // Check if lock file exists and is stale
        if (fs.existsSync(this.lockPath)) {
          // Guard: Validate lock file before reading
          const stats = await fs.promises.stat(this.lockPath).catch(() => null);
          if (!stats) {
            // File disappeared, retry
            await this.delay(Math.min(this.retryDelay, 100));
            continue;
          }

          const lockAge = Date.now() - stats.mtime.getTime();

          // Remove stale locks (older than lockTimeout)
          if (lockAge > this.lockTimeout) {
            try {
              await fs.promises.unlink(this.lockPath);
            } catch (error) {
              // Lock was removed by another process or error occurred, continue
              if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                // Non-ENOENT errors should be logged but not fatal
                console.warn(`Warning: Failed to remove stale lock: ${error}`);
              }
            }
          } else {
            // Lock is active, wait and retry
            const delay = Math.min(this.retryDelay * (attempt + 1), 5000);
            await this.delay(delay);
            continue;
          }
        }

        // Guard: Validate JSON serialization
        let lockContent: string;
        try {
          lockContent = JSON.stringify({
            pid: process.pid,
            timestamp: new Date().toISOString(),
            hostname: require('os').hostname()
          });
        } catch (error) {
          throw new StateCorruptionError(
            'Failed to serialize lock data',
            error instanceof Error ? error : new Error(String(error))
          );
        }

        // Guard: Limit lock content size
        if (lockContent.length > 4096) {
          throw new StateCorruptionError('Lock content exceeds maximum size');
        }

        await fs.promises.writeFile(this.lockPath, lockContent, {
          flag: 'wx', // Exclusive create
          mode: 0o600
        });

        // Lock acquired successfully
        this.acquired = true;
        return;

      } catch (error) {
        if (error instanceof Error && 'code' in error) {
          const errorCode = (error as NodeJS.ErrnoException).code;

          // EEXIST means lock file exists (another process holds it)
          if (errorCode === 'EEXIST') {
            const delay = Math.min(this.retryDelay * (attempt + 1), 5000);
            await this.delay(delay);
            continue;
          }

          // Handle permission errors
          if (errorCode === 'EACCES' || errorCode === 'EPERM') {
            throw new StateCorruptionError(
              `Permission denied acquiring lock at ${this.lockPath}`,
              error
            );
          }

          // Handle disk full errors
          if (errorCode === 'ENOSPC') {
            throw new StateCorruptionError(
              'Disk space exhausted while acquiring lock',
              error
            );
          }
        }

        // Other errors on final attempt
        if (attempt === this.maxRetries - 1) {
          throw new StateCorruptionError(
            `Failed to acquire file lock at ${this.lockPath} after ${this.maxRetries} attempts`,
            error instanceof Error ? error : new Error(String(error))
          );
        }

        // Retry on other errors with exponential backoff
        const delay = Math.min(this.retryDelay * Math.pow(2, attempt), 5000);
        await this.delay(delay);
      }
    }

    throw new StateCorruptionError(
      `Could not acquire file lock at ${this.lockPath} after ${this.maxRetries} attempts. Another process may be holding the lock.`
    );
  }

  /**
   * Releases the file lock
   * @throws {StateCorruptionError} if lock cannot be released
   */
  async release(): Promise<void> {
    // Guard: Prevent releasing unacquired lock
    if (!this.acquired) {
      return; // Already released or never acquired
    }

    try {
      // Guard: Check if file still exists before deleting
      if (fs.existsSync(this.lockPath)) {
        await fs.promises.unlink(this.lockPath);
      }
      this.acquired = false;
    } catch (error) {
      this.acquired = false; // Mark as released even if unlink failed

      const errorCode = (error as NodeJS.ErrnoException).code;

      // ENOENT is OK - lock was already removed
      if (errorCode === 'ENOENT') {
        return;
      }

      throw new StateCorruptionError(
        `Failed to release file lock at ${this.lockPath}`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Helper delay function for retry logic
   */
  private delay(ms: number): Promise<void> {
    // Guard: Validate delay duration
    const safeMs = Math.max(0, Math.min(60000, ms));
    return new Promise(resolve => setTimeout(resolve, safeMs));
  }
}

/**
 * Appends a JSON object to the results log with file locking for concurrent access safety.
 * Uses fs.promises.appendFile which ensures atomicity in single-node environments.
 * @throws {ValidationError} if dataDir or payload is invalid
 * @throws {StateCorruptionError} if file operations fail
 */
export async function appendResult(dataDir: string, payload: any): Promise<void> {
  // Guard: Validate directory path
  validateDirectoryPath(dataDir);

  // Guard: Validate payload
  validatePayload(payload);

  // Guard: Sanitize path to prevent symlink attacks
  const resultsPath = path.join(dataDir, 'results.jsonl');
  const normalizedPath = path.normalize(resultsPath);

  // Guard: Ensure path doesn't escape target directory
  if (!normalizedPath.startsWith(path.normalize(dataDir))) {
    throw new ValidationError('Results path escapes target directory');
  }

  const lock = new FileLock(normalizedPath);

  try {
    // Acquire lock to prevent concurrent writes
    await lock.acquire();

    try {
      // Ensure directory exists first
      await initializeState(dataDir);

      // Guard: Check file size before appending to prevent unbounded growth
      const stats = await fs.promises.stat(normalizedPath).catch(() => null);
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

      if (stats && stats.size > MAX_FILE_SIZE) {
        throw new ValidationError(`Results file exceeds maximum size (${MAX_FILE_SIZE / 1024 / 1024}MB). Consider archiving or truncating.`);
      }

      // Guard: Validate JSON serialization
      let jsonLine: string;
      try {
        jsonLine = JSON.stringify(payload) + '\n';
      } catch (error) {
        throw new ValidationError(
          `Failed to serialize payload to JSON: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Guard: Limit line length to prevent log file abuse
      const MAX_LINE_LENGTH = 1024 * 1024; // 1MB per line
      if (jsonLine.length > MAX_LINE_LENGTH) {
        throw new ValidationError(`JSON line exceeds maximum length (${MAX_LINE_LENGTH} bytes)`);
      }

      // Guard: Validate JSON line before writing
      if (!jsonLine.endsWith('\n')) {
        throw new ValidationError('Generated JSON line must end with newline');
      }

      // Guard: Validate UTF-8 encoding
      const buffer = Buffer.from(jsonLine, 'utf-8');
      if (buffer.length !== jsonLine.length) {
        throw new ValidationError('Generated JSON contains invalid UTF-8 sequences');
      }

      // Guard: Verify buffer can be converted back
      if (buffer.toString('utf-8') !== jsonLine) {
        throw new ValidationError('UTF-8 encoding validation failed');
      }

      // Guard: Prevent writing to symlinks (security)
      const writePath = await fs.promises.realpath(normalizedPath).catch(() => normalizedPath);

      await fs.promises.appendFile(writePath, jsonLine, { mode: 0o600 });
    } finally {
      // Always release lock, even if write failed
      await lock.release();
    }
  } catch (error) {
    if (error instanceof ValidationError || error instanceof StateCorruptionError) {
      throw error;
    }
    if (error instanceof Error && 'code' in error) {
      const errorCode = (error as NodeJS.ErrnoException).code;

      if (errorCode === 'ENOSPC') {
        throw new StateCorruptionError('Disk space exhausted. Cannot append to results file.', error);
      }
      if (errorCode === 'EROFS') {
        throw new StateCorruptionError('File system is read-only. Cannot append to results file.', error);
      }
      if (errorCode === 'EACCES') {
        throw new StateCorruptionError(`Permission denied writing to results file at ${normalizedPath}`, error);
      }
      if (errorCode === 'ELOOP') {
        throw new StateCorruptionError('Too many symbolic links in results file path', error);
      }
    }
    throw new StateCorruptionError(
      `Failed to append result to ${normalizedPath}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Input to persistAnalysisResults() — pre-computed session summary
 */
export interface AnalysisSessionResult {
  patterns: MergedPattern[];
  approvedCount: number;
  rejectedCount: number;
  totalAnalyzed: number;
}

/**
 * Creates a timestamped backup of a file before modification.
 * Uses ISO 8601 UTC timestamps and kebab-case naming convention.
 *
 * @param sourceFilePath - Absolute path to the source file to backup
 * @param historyDir - Directory where backup files are stored
 * @returns Absolute path to the created backup file, or null if source file doesn't exist (AC8)
 * @throws {ValidationError} if paths are invalid
 * @throws {StateCorruptionError} if backup creation fails
 */
export async function createBackup(sourceFilePath: string, historyDir: string): Promise<string | null> {
  // Guard: Validate source file path
  if (!sourceFilePath || typeof sourceFilePath !== 'string') {
    throw new ValidationError('Source file path must be a non-empty string');
  }

  // Guard: Validate history directory path
  validateDirectoryPath(historyDir);

  // Guard: Check if source file exists - return null for graceful skip per AC8
  if (!fs.existsSync(sourceFilePath)) {
    console.warn(`[WARNING] Source file does not exist, skipping backup: ${sourceFilePath}`);
    return null;
  }

  // Guard: Validate source is a regular file (not directory, symlink, or special file)
  const sourceStats = await fs.promises.stat(sourceFilePath);
  if (!sourceStats.isFile()) {
    throw new ValidationError(`Source path is not a file: ${sourceFilePath}`);
  }

  // Guard: Prevent symlink attacks - ensure we're backing up a regular file
  try {
    const sourceStatsReal = await fs.promises.lstat(sourceFilePath);
    if (!sourceStatsReal.isFile() || sourceStatsReal.isSymbolicLink()) {
      throw new ValidationError(`Source path must be a regular file, not a symlink or special file: ${sourceFilePath}`);
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Cannot verify source file type: ${sourceFilePath}`);
  }

  // Note: Source file size validation removed - backups should be created for ANY existing file
  // The 100-byte validation in AC1 applies to backup integrity checking, not source file eligibility

  // Guard: Validate source file size is within reasonable limits (10MB max to prevent memory issues)
  const MAX_BACKUP_SIZE = 10 * 1024 * 1024; // 10MB
  if (sourceStats.size > MAX_BACKUP_SIZE) {
    throw new ValidationError(`Source file is too large for backup (${sourceStats.size} bytes, maximum ${MAX_BACKUP_SIZE} bytes): ${sourceFilePath}`);
  }

  // Guard: Ensure history directory exists with proper permissions (AC7)
  try {
    if (!fs.existsSync(historyDir)) {
      await fs.promises.mkdir(historyDir, { recursive: true, mode: 0o700 });
    } else {
      // Update permissions if directory exists with different permissions (AC7)
      const stats = await fs.promises.stat(historyDir);
      const currentMode = stats.mode & 0o777;
      if (currentMode !== 0o700) {
        await fs.promises.chmod(historyDir, 0o700);
      }
    }
  } catch (error) {
    throw new StateCorruptionError(
      `Failed to create or update history directory at ${historyDir}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }

  // Guard: Verify history directory is writable
  try {
    await fs.promises.access(historyDir, fs.constants.W_OK);
  } catch (error) {
    throw new StateCorruptionError(
      `History directory is not writable: ${historyDir}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }

  // Generate timestamp in ISO 8601 UTC format (AR20)
  // Replace colons with hyphens for cross-platform compatibility (Windows doesn't allow colons in filenames)
  const timestamp = new Date().toISOString().replace(/:/g, '-');

  // Extract filename from source path
  let sourceFileName = path.basename(sourceFilePath, path.extname(sourceFilePath));
  const sourceExt = path.extname(sourceFilePath);

  // Guard: Truncate source filename if too long to fit with timestamp
  // Reserve space for: -{timestamp}.{ext} (approximately 35 chars for timestamp + ext)
  const MAX_FILENAME_LENGTH = 255;
  const timestampLength = timestamp.length + sourceExt.length + 1; // +1 for hyphen
  const maxSourceNameLength = MAX_FILENAME_LENGTH - timestampLength;

  if (sourceFileName.length > maxSourceNameLength) {
    sourceFileName = sourceFileName.substring(0, maxSourceNameLength);
  }

  // Create backup filename using kebab-case convention (AR18)
  // Format: {basename}-{timestamp}.{ext}
  const backupFileName = `${sourceFileName}-${timestamp}${sourceExt}`;
  const backupFilePath = path.join(historyDir, backupFileName);

  // Guard: Verify filename doesn't exceed limits (shouldn't happen after truncation)
  if (backupFileName.length > MAX_FILENAME_LENGTH) {
    throw new ValidationError(`Backup filename exceeds maximum length (${MAX_FILENAME_LENGTH} characters): ${backupFileName}`);
  }

  // Guard: Prevent overwriting existing backup with retry logic for timestamp collisions (AC6)
  // Use a retry loop to handle concurrent backup attempts and existing files
  const MAX_RETRIES = 10; // Increased retries for better concurrent handling
  let finalBackupPath: string | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Generate unique filename for each attempt
    // First attempt uses original timestamp, subsequent attempts add unique suffix
    let attemptTimestamp = timestamp;
    if (attempt > 0) {
      // Generate new timestamp for this attempt to maintain ISO 8601 UTC format (AR20)
      // Replace colons with hyphens for cross-platform compatibility
      attemptTimestamp = new Date().toISOString().replace(/:/g, '-');
      // Add attempt counter and random suffix for uniqueness
      const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      finalBackupPath = path.join(historyDir, `${sourceFileName}-${attemptTimestamp}-${attempt}-${randomSuffix}${sourceExt}`);
    } else {
      finalBackupPath = backupFilePath;
    }

    try {
      // Perform the file copy operation with exclusive flag to prevent race conditions
      // This is atomic - if file exists, EEXIST is thrown immediately
      await fs.promises.copyFile(sourceFilePath, finalBackupPath, fs.constants.COPYFILE_EXCL);
      // Success! Break out of retry loop
      lastError = null;
      break;
    } catch (copyError) {
      // If file already exists (race condition), try next filename
      if (copyError instanceof Error && (copyError as NodeJS.ErrnoException).code === 'EEXIST') {
        lastError = copyError as Error;
        continue; // Try next filename
      }

      // For other errors, throw immediately
      throw copyError;
    }
  }

  // Check if we successfully created a backup
  if (lastError !== null || !finalBackupPath || !fs.existsSync(finalBackupPath)) {
    throw new StateCorruptionError(`Failed to create unique backup filename after ${MAX_RETRIES} attempts: ${backupFilePath}`);
  }

  try {
    // File was already copied in the retry loop above - no need to copy again

    // Set file permissions to 0o600 (owner read/write only)
    await fs.promises.chmod(finalBackupPath, 0o600);

    // Verify backup file integrity (NFR21, AC3)
    const backupStats = await fs.promises.stat(finalBackupPath);
    // Note: Size comparison may fail for sparse files or different filesystem allocation strategies
    // The checksum validation below is the definitive integrity check
    if (backupStats.size === 0) {
      await fs.promises.unlink(finalBackupPath);
      throw new StateCorruptionError('Backup file is empty - integrity check failed');
    }

    // Verify content matches using SHA-256 checksum (AC3, Task 1.9)
    const calculateChecksum = async (filePath: string): Promise<string> => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
      });
    };

    const sourceChecksum = await calculateChecksum(sourceFilePath);
    const backupChecksum = await calculateChecksum(finalBackupPath);

    if (sourceChecksum !== backupChecksum) {
      await fs.promises.unlink(finalBackupPath);
      throw new StateCorruptionError('Backup file checksum mismatch - integrity check failed');
    }

    return finalBackupPath;
  } catch (error) {
    // Clean up failed backup attempt if it exists
    if (fs.existsSync(finalBackupPath)) {
      try {
        await fs.promises.unlink(finalBackupPath);
      } catch {
        // Ignore cleanup errors
      }
    }

    if (error instanceof ValidationError || error instanceof StateCorruptionError) {
      throw error;
    }

    if (error instanceof Error && 'code' in error) {
      const errorCode = (error as NodeJS.ErrnoException).code;

      if (errorCode === 'ENOSPC') {
        throw new StateCorruptionError(
          'Disk space exhausted. Cannot create backup. Free up disk space and try again.',
          error
        );
      }
      if (errorCode === 'EACCES' || errorCode === 'EPERM') {
        throw new StateCorruptionError(
          `Permission denied creating backup at ${finalBackupPath}. Check file and directory permissions.`,
          error
        );
      }
      if (errorCode === 'ENOENT') {
        throw new StateCorruptionError(
          `Source file not found: ${sourceFilePath}. Ensure the source file exists and try again.`,
          error
        );
      }
    }

    throw new StateCorruptionError(
      `Failed to create backup at ${finalBackupPath}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Merge new patterns with existing patterns, Deduplicates by pattern_text,
 * updating frequency counts and session tracking for existing patterns.
 */
export function updatePatterns(
  existing: MergedPattern[],
  newPatterns: MergedPattern[],
): MergedPattern[] {
  const result: MergedPattern[] = [...existing];
  const existingMap = new Map<string, MergedPattern>();

  // Index existing patterns by pattern_text
  for (const p of existing) {
    existingMap.set(p.pattern_text, p);
  }

  // Merge or add new patterns
  for (const newP of newPatterns) {
    const existingP = existingMap.get(newP.pattern_text);

    if (existingP) {
      // Update existing pattern
      const merged: MergedPattern = {
        ...existingP,
        count: existingP.count + newP.count,
        total_frequency: existingP.total_frequency + newP.count,
        session_count: existingP.session_count + 1,
        frequency_change: newP.count,
        last_seen: new Date().toISOString(),
        is_new: false,
      };
      existingMap.set(newP.pattern_text, merged);
      // Replace in result array
      const idx = result.findIndex(p => p.pattern_text === newP.pattern_text);
      if (idx >= 0) {
        result[idx] = merged;
      }
    } else {
      // New pattern
      const pattern: MergedPattern = {
        ...newP,
        is_new: true,
        session_count: 1,
        total_frequency: newP.count,
        frequency_change: newP.count,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      };
      existingMap.set(newP.pattern_text, pattern);
      result.push(pattern);
    }
  }

  return result;
}

/**
 * Merge patterns with deduplication and count updates (Story 5.4)
 * Deduplicates by pattern_text (case-insensitive), updates count for recurring patterns,
 * preserves first_seen for existing patterns, sets first_seen for new patterns.
 * Handles missing count field (defaults to 1).
 *
 * @param existing - Existing patterns array
 * @param newPatterns - New patterns to merge
 * @returns Merged patterns array
 */
export function mergePatterns(
  existing: MergedPattern[],
  newPatterns: MergedPattern[]
): MergedPattern[] {
  const result: MergedPattern[] = [...existing];
  const existingMap = new Map<string, MergedPattern>();

  // Index existing patterns by lowercase pattern_text for case-insensitive lookup
  for (const p of existing) {
    existingMap.set(p.pattern_text.toLowerCase(), p);
  }

  // Merge or add new patterns
  for (const newP of newPatterns) {
    const newPKey = newP.pattern_text.toLowerCase();
    const existingP = existingMap.get(newPKey);

    if (existingP) {
      // Update existing pattern - preserve first_seen from original
      const merged: MergedPattern = {
        ...existingP,
        // Sum counts: existing + new (default to 1 if missing)
        count: existingP.count + (newP.count || 1),
        total_frequency: existingP.total_frequency + (newP.count || 1),
        session_count: existingP.session_count + 1,
        frequency_change: newP.count || 1,
        last_seen: generateTimestamp(),
        is_new: false,
        // CRITICAL: Preserve first_seen from original pattern
        first_seen: existingP.first_seen,
      };
      existingMap.set(newPKey, merged);
      // Replace in result array
      const idx = result.findIndex(p => p.pattern_text.toLowerCase() === newPKey);
      if (idx >= 0) {
        result[idx] = merged;
      }
    } else {
      // New pattern - set first_seen to current time with millisecond precision
      const pattern: MergedPattern = {
        ...newP,
        count: newP.count || 1, // Default to 1 if missing
        is_new: true,
        session_count: 1,
        total_frequency: newP.count || 1,
        frequency_change: newP.count || 1,
        first_seen: generateTimestampWithMillis(),
        last_seen: generateTimestamp(),
      };
      existingMap.set(newPKey, pattern);
      result.push(pattern);
    }
  }

  return result;
}

/**
 * Detect if any new patterns exist (Story 5.4)
 * Uses case-insensitive comparison via toLowerCase()
 * Returns true if at least one new pattern found
 * Returns false if all patterns already exist
 * Returns true when existing is empty
 * Returns false when new patterns is empty
 *
 * @param existingPatterns - Existing patterns array
 * @param newPatterns - New patterns to check
 * @returns True if new patterns exist, false otherwise
 */
export function hasNewPatterns(
  existingPatterns: MergedPattern[],
  newPatterns: MergedPattern[]
): boolean {
  // Return false when new patterns is empty
  if (!newPatterns || newPatterns.length === 0) {
    return false;
  }

  // Return true when existing is empty
  if (!existingPatterns || existingPatterns.length === 0) {
    return true;
  }

  // Create set of existing pattern texts (lowercase for case-insensitive comparison)
  const existingPatternTexts = new Set(
    existingPatterns.map(p => p.pattern_text.toLowerCase())
  );

  // Check if any new pattern doesn't exist in existing (case-insensitive)
  for (const newP of newPatterns) {
    if (!existingPatternTexts.has(newP.pattern_text.toLowerCase())) {
      return true; // At least one new pattern found
    }
  }

  return false; // All patterns already exist
}

/**
 * Persist analysis session results to state.json and results.jsonl
 *
 * Atomically writes updated state.json (temp file + rename pattern).
 * Appends session metrics to results.jsonl via existing appendResult().
 *
 * @param dataDir - Data directory containing state.json and results.jsonl
 * @param session - Pre-computed analysis session summary
 */
// Guard: session input validation
function validateSession(session: AnalysisSessionResult): void {
  if (!session || typeof session !== 'object') {
    throw new ValidationError('Session must be a non-null object');
  }
  if (!Array.isArray(session.patterns)) {
    throw new ValidationError('session.patterns must be an array');
  }
  if (typeof session.approvedCount !== 'number' || typeof session.rejectedCount !== 'number') {
    throw new ValidationError('session.approvedCount must be non-negative');
  }
  if (!Number.isFinite(session.approvedCount)) {
    throw new ValidationError('session.approvedCount must be a finite number');
  }
  if (!Number.isFinite(session.totalAnalyzed)) {
    throw new ValidationError('session.totalAnalyzed must be a finite number');
  }
}

export async function persistAnalysisResults(
  dataDir: string,
  session: AnalysisSessionResult,
): Promise<void> {
  validateDirectoryPath(dataDir);

  validateSession(session);

  const statePath = path.join(dataDir, 'state.json');
  const tmpPath = path.join(dataDir, 'state.json.tmp');
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let originalContent: string | null = null;
    try {
      // Read current state (preserve original for rollback)
      originalContent = await fs.promises.readFile(statePath, 'utf8');
      const currentState: StateData = JSON.parse(originalContent);

      validateSession(session);

      // Merge patterns
      const existingPatterns = Array.isArray(currentState.patterns_found) ? currentState.patterns_found : [];
      const mergedPatterns = updatePatterns(existingPatterns as MergedPattern[], session.patterns);

      // Build updated state
      const updatedState: StateData = {
        ...currentState,
        last_analysis: new Date().toISOString(),
        patterns_found: mergedPatterns,
        improvements_applied: (currentState.improvements_applied || 0) + session.approvedCount,
      };

      // Serialize and validate
      const newContent = JSON.stringify(updatedState, null, 2);
      JSON.parse(newContent); // Validate it's valid JSON

      // Atomic write: temp file + rename
      await fs.promises.writeFile(tmpPath, newContent, { mode: 0o600 });

      // Verify temp file before rename
      const verifyContent = await fs.promises.readFile(tmpPath, 'utf8');
      if (verifyContent !== newContent) {
        throw new StateCorruptionError('Temp file verification failed');
      }

      // Atomic rename
      await fs.promises.rename(tmpPath, statePath);

      // Append to results.jsonl
      await appendResult(dataDir, {
        timestamp: new Date().toISOString(),
        patterns: session.patterns.length,
        approved: session.approvedCount,
        rejected: session.rejectedCount,
        patterns_found: session.patterns || [], // Guard: undefined/null patterns
      });

      // Update metrics after persisting results (Story 5-3)
      // Note: Metrics update failure is logged but doesn't fail the persist operation
      // since results are already safely stored. Metrics can be recalculated from results.jsonl.
      try {
        await updateMetrics(dataDir);
      } catch (metricsError) {
        // Log metrics failure with full context for debugging
        console.warn('[WARN] Metrics update failed after persisting results. Results are safe but metrics may be out of sync.', {
          error: metricsError instanceof Error ? metricsError.message : String(metricsError),
          dataDir,
          note: 'Run /improve-rules --stats to recalculate metrics manually if needed'
        });
      }

      return; // Success
    } catch (error) {
      // Clean up temp file if it exists
      try {
        if (fs.existsSync(tmpPath)) {
          await fs.promises.unlink(tmpPath);
        }
      } catch {
        // Temp file doesn't exist or unlink failed, ignore
      }

      // On last attempt, rethrow
      if (attempt === MAX_RETRIES - 1) {
        if (error instanceof ValidationError || error instanceof StateCorruptionError) {
          throw error;
        }
        throw new StateCorruptionError(
          `Failed to persist analysis results after ${MAX_RETRIES} attempts`,
          error instanceof Error ? error : new Error(String(error))
        );
      }

      // Exponential backoff
      const backoffMs = Math.pow(2, attempt) * 100;
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

/**
 * Result entry from results.jsonl
 */
interface ResultsJsonlEntry {
  timestamp: string;
  patterns: number;
  approved: number;
  rejected: number;
  patterns_found?: any[];
}

/**
 * Calculates improvements_applied metric by summing the 'approved' field from all results.jsonl entries
 * @param resultsJsonlPath - Path to results.jsonl file
 * @returns Total count of approved improvements
 * @throws {StateCorruptionError} if file operations fail
 */
export async function calculateImprovementsApplied(
  resultsJsonlPath: string
): Promise<number> {
  try {
    // Handle file not found (first run)
    if (!fs.existsSync(resultsJsonlPath)) {
      return 0;
    }

    const content = await fs.promises.readFile(resultsJsonlPath, 'utf-8')
      .catch(e => {
        if (e && typeof e === 'object' && 'code' in e && e.code === 'EACCES') {
          throw new StateCorruptionError('Permission denied reading results.jsonl', e instanceof Error ? e : new Error(String(e)));
        }
        throw e;
      });
    const lines = content.split('\n').filter(line => line.trim());

    let total = 0;

    for (const line of lines) {
      try {
        const entry: ResultsJsonlEntry = JSON.parse(line);
        // Guard: Validate approved is a finite number
        if (typeof entry.approved !== 'number' || !Number.isFinite(entry.approved)) {
          console.warn(`[WARNING] Invalid approved value in JSONL entry: ${entry.approved}`);
          continue;
        }
        // Guard: Validate approved is non-negative
        if (entry.approved < 0) {
          console.warn(`[WARNING] Negative approved value in JSONL entry: ${entry.approved}, clamping to 0`);
          continue;
        }
        total += entry.approved;
        // Guard: Check for integer overflow
        if (total > Number.MAX_SAFE_INTEGER) {
          console.warn('[WARNING] Total improvements applied exceeds MAX_SAFE_INTEGER, clamping');
          total = Number.MAX_SAFE_INTEGER;
          break;
        }
      } catch (error) {
        // Skip corrupted entries with warning
        console.warn(`[WARNING] Skipping corrupted JSONL entry: ${line.substring(0, 50)}...`);
        continue;
      }
    }

    return total;
  } catch (error) {
    throw new StateCorruptionError(
      `Failed to calculate improvements_applied from ${resultsJsonlPath}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Calculates corrections_reduction metric as a ratio (0-1)
 * Baseline: average of 'rejected' field from first 3 sessions
 * Current: average of 'rejected' field from last 3 sessions
 * Returns 0 if insufficient data (< 3 sessions)
 * @param resultsJsonlPath - Path to results.jsonl file
 * @returns Corrections reduction ratio (0-1), always returns number (never null)
 * @throws {StateCorruptionError} if file operations fail
 */
export async function calculateCorrectionsReduction(
  resultsJsonlPath: string
): Promise<number> {
  try {
    // Handle file not found or empty (first run)
    if (!fs.existsSync(resultsJsonlPath)) {
      return 0; // Insufficient data - return 0 (NOT null)
    }

    const content = await fs.promises.readFile(resultsJsonlPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    // Need at least 3 sessions for meaningful baseline
    if (lines.length < 3) {
      return 0; // Insufficient data - return 0 (NOT null)
    }

    // Parse entries, skipping corrupted lines
    const parsedEntries: ResultsJsonlEntry[] = [];
    for (const line of lines) {
      try {
        const entry: ResultsJsonlEntry = JSON.parse(line);
        // Guard: Validate rejected is a finite non-negative number
        if (typeof entry.rejected === 'number') {
          if (!Number.isFinite(entry.rejected)) {
            console.warn(`[WARNING] Invalid rejected value (not finite) in JSONL entry, treating as 0`);
            entry.rejected = 0;
          }
          if (entry.rejected < 0) {
            console.warn(`[WARNING] Negative rejected value in JSONL entry: ${entry.rejected}, clamping to 0`);
            entry.rejected = 0;
          }
        }
        parsedEntries.push(entry);
      } catch (error) {
        // Skip corrupted entries with warning
        console.warn(`[WARNING] Skipping corrupted JSONL entry: ${line.substring(0, 50)}...`);
        continue;
      }
    }

    // Check again after skipping corrupted entries
    if (parsedEntries.length < 3) {
      return 0; // Insufficient data - return 0 (NOT null)
    }

    // Baseline: average of first 3 sessions' rejected count
    const baselineEntries = parsedEntries.slice(0, 3);
    const baselineAvg = baselineEntries.reduce((sum, entry) =>
      sum + (entry.rejected || 0), 0) / 3;

    // Guard: Division by zero check and negative baseline
    if (baselineAvg === 0) {
      return 0; // No baseline corrections, no reduction possible
    }
    if (baselineAvg < 0) {
      console.warn('[WARNING] Negative baseline detected, clamping to 0');
      return 0;
    }

    // Current: average of last 3 sessions' rejected count
    const currentEntries = parsedEntries.slice(-3);
    const currentAvg = currentEntries.reduce((sum, entry) =>
      sum + (entry.rejected || 0), 0) / 3;

    // Guard: Check for negative current average (data corruption)
    if (currentAvg < 0) {
      console.warn('[WARNING] Negative current average detected, clamping to 0');
      return 0;
    }

    // Calculate ratio (0-1), NOT percentage
    const reduction = (baselineAvg - currentAvg) / baselineAvg;

    // Clamp to 0-1 ratio and ensure finite number
    const clampedReduction = Math.max(0, Math.min(1, reduction));
    if (!Number.isFinite(clampedReduction)) {
      return 0; // Guard against NaN/Infinity
    }

    return clampedReduction;
  } catch (error) {
    throw new StateCorruptionError(
      `Failed to calculate corrections_reduction from ${resultsJsonlPath}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Calculates approval_rate percentage
 * @param resultsJsonlPath - Path to results.jsonl file
 * @returns Approval rate percentage (0-100), or null if no suggestions
 * @throws {StateCorruptionError} if file operations fail
 */
export async function calculateApprovalRate(
  resultsJsonlPath: string
): Promise<number | null> {
  try {
    // Handle file not found (first run)
    if (!fs.existsSync(resultsJsonlPath)) {
      return null;
    }

    const content = await fs.promises.readFile(resultsJsonlPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return null;
    }

    let totalApproved = 0;
    let totalSuggestions = 0;

    for (const line of lines) {
      try {
        const entry: ResultsJsonlEntry = JSON.parse(line);
        // Guard: Validate approved and rejected are finite non-negative numbers
        const approved = typeof entry.approved === 'number' && Number.isFinite(entry.approved) && entry.approved >= 0
          ? entry.approved
          : 0;
        const rejected = typeof entry.rejected === 'number' && Number.isFinite(entry.rejected) && entry.rejected >= 0
          ? entry.rejected
          : 0;

        totalApproved += approved;
        totalSuggestions += approved + rejected;
      } catch (error) {
        // Skip corrupted entries with warning
        console.warn(`[WARNING] Skipping corrupted JSONL entry: ${line.substring(0, 50)}...`);
        continue;
      }
    }

    // Guard: Division by zero check
    if (totalSuggestions === 0) {
      return null;
    }

    // Calculate percentage
    const approvalRate = (totalApproved / totalSuggestions) * 100;

    // Clamp to 0-100 and ensure finite number
    const clampedRate = Math.max(0, Math.min(100, approvalRate));
    if (!Number.isFinite(clampedRate)) {
      return null; // Guard against NaN/Infinity
    }

    return clampedRate;
  } catch (error) {
    throw new StateCorruptionError(
      `Failed to calculate approval_rate from ${resultsJsonlPath}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Helper function to extract pattern text from a pattern object
 * @param pattern - Pattern object (string or object with pattern_text field)
 * @returns Pattern text string or null if not found
 */
function extractPatternText(pattern: any): string | null {
  if (typeof pattern === 'string' && pattern) {
    return pattern;
  }
  if (pattern && typeof pattern === 'object' && pattern.pattern_text && typeof pattern.pattern_text === 'string') {
    return pattern.pattern_text;
  }
  return null;
}

/**
 * Calculates pattern approval rate for a specific pattern
 * @param patternId - Pattern identifier (pattern_text)
 * @param resultsJsonlPath - Path to results.jsonl file
 * @returns Pattern approval rate percentage (0-100), or null if pattern not found
 * @throws {StateCorruptionError} if file operations fail
 */
export async function calculatePatternApprovalRate(
  patternId: string,
  resultsJsonlPath: string
): Promise<number | null> {
  try {
    // Validate patternId
    if (!patternId || typeof patternId !== 'string') {
      throw new ValidationError('Pattern ID must be a non-empty string');
    }

    // Handle file not found
    if (!fs.existsSync(resultsJsonlPath)) {
      return null;
    }

    const content = await fs.promises.readFile(resultsJsonlPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return null;
    }

    let patternSuggestions = 0;
    let patternApprovals = 0;

    for (const line of lines) {
      try {
        const entry: ResultsJsonlEntry = JSON.parse(line);

        // Check if pattern appears in patterns_found array
        if (entry.patterns_found && Array.isArray(entry.patterns_found)) {
          const patternExists = entry.patterns_found.some((p: any) => {
            const patternText = extractPatternText(p);
            return patternText !== null && patternText === patternId;
          });

          if (patternExists) {
            patternSuggestions++;
            // Count as approved if user approved any changes in this session
            if (entry.approved > 0) {
              patternApprovals++;
            }
          }
        }
      } catch (error) {
        // Skip corrupted entries with warning
        console.warn(`[WARNING] Skipping corrupted JSONL entry: ${line.substring(0, 50)}...`);
        continue;
      }
    }

    // Guard: Pattern not found or division by zero
    if (patternSuggestions === 0) {
      return null;
    }

    // Calculate percentage
    const approvalRate = (patternApprovals / patternSuggestions) * 100;

    // Clamp to 0-100 and ensure finite number
    const clampedRate = Math.max(0, Math.min(100, approvalRate));
    if (!Number.isFinite(clampedRate)) {
      return null; // Guard against NaN/Infinity
    }

    return clampedRate;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new StateCorruptionError(
      `Failed to calculate pattern approval rate for ${patternId}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Updates all metrics in state.json after analysis session
 * Atomically writes updated state.json (temp file + rename pattern)
 * @param dataDir - Data directory containing state.json and results.jsonl
 * @throws {ValidationError} if dataDir is invalid
 * @throws {StateCorruptionError} if state update fails
 */
export async function updateMetrics(dataDir: string): Promise<void> {
  // Guard: Validate directory path
  validateDirectoryPath(dataDir);

  const statePath = path.join(dataDir, 'state.json');
  const tmpPath = path.join(dataDir, 'state.json.tmp');
  const resultsJsonlPath = path.join(dataDir, 'results.jsonl');

  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let originalContent: string | null = null;
    try {
      // Read current state (preserve original for rollback)
      originalContent = await fs.promises.readFile(statePath, 'utf8')
        .catch(e => {
          if (e && typeof e === 'object' && 'code' in e && e.code === 'EACCES') {
            throw new StateCorruptionError('Permission denied reading state.json', e instanceof Error ? e : new Error(String(e)));
          }
          throw e;
        });
      const currentState: StateData = JSON.parse(originalContent);

      // Calculate all metrics from results.jsonl (source of truth)
      const improvementsApplied = await calculateImprovementsApplied(resultsJsonlPath);
      const correctionsReduction = await calculateCorrectionsReduction(resultsJsonlPath);
      const approvalRate = await calculateApprovalRate(resultsJsonlPath);

      // Count total sessions from results.jsonl
      // Use the already-calculated improvements to determine session count
      // This avoids a race condition between exists check and read
      let totalSessions = 0;
      try {
        const content = await fs.promises.readFile(resultsJsonlPath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        totalSessions = lines.length;
        // Guard: Check for unreasonably large session counts (potential corruption)
        if (totalSessions > 100000) {
          console.warn(`[WARN] Session count (${totalSessions}) exceeds reasonable maximum (100000), clamping`);
          totalSessions = 100000;
        }
      } catch (readError) {
        // If file doesn't exist or can't be read, totalSessions stays 0
        if ((readError instanceof Error && 'code' in readError && readError.code !== 'ENOENT') ||
            !(readError instanceof Error)) {
          console.warn('[WARN] Failed to read results.jsonl for session count:', readError instanceof Error ? readError.message : String(readError));
        }
      }

      // Get approval threshold from state (default 75%)
      const approvalThreshold = (currentState as any).approval_threshold || 75;

      // Build updated state with new metrics
      const updatedState: StateData = {
        ...currentState,
        improvements_applied: improvementsApplied,
        corrections_reduction: correctionsReduction,
        approval_rate: approvalRate,
        total_sessions: totalSessions,
        approval_threshold: approvalThreshold,
      };

      // Serialize and validate (with circular reference guard)
      const getCircularReplacer = () => {
        const seen = new WeakSet();
        return (key: string, value: any) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return undefined; // Drop circular references
            }
            seen.add(value);
          }
          return value;
        };
      };
      const newContent = JSON.stringify(updatedState, getCircularReplacer(), 2);
      JSON.parse(newContent); // Validate it's valid JSON

      // Atomic write: temp file + rename
      await fs.promises.writeFile(tmpPath, newContent, { mode: 0o600 })
        .catch(e => {
          if (e && typeof e === 'object' && 'code' in e && e.code === 'EACCES') {
            throw new StateCorruptionError('Permission denied writing temp state file', e instanceof Error ? e : new Error(String(e)));
          }
          throw e;
        });

      // Verify temp file before rename
      const verifyContent = await fs.promises.readFile(tmpPath, 'utf8');
      if (verifyContent !== newContent) {
        throw new StateCorruptionError('Temp file verification failed');
      }

      // Atomic rename (handle cross-device rename)
      await fs.promises.rename(tmpPath, statePath)
        .catch(async (e) => {
          if (e && typeof e === 'object' && 'code' in e && e.code === 'EXDEV') {
            // Cross-device rename: copy then delete
            await fs.promises.copyFile(tmpPath, statePath);
            await fs.promises.unlink(tmpPath);
            return;
          }
          throw e;
        });

      return; // Success
    } catch (error) {
      // Clean up temp file if it exists
      try {
        if (fs.existsSync(tmpPath)) {
          await fs.promises.unlink(tmpPath);
        }
      } catch {
        // Temp file doesn't exist or unlink failed, ignore
      }

      // On last attempt, rethrow
      if (attempt === MAX_RETRIES - 1) {
        if (error instanceof ValidationError || error instanceof StateCorruptionError) {
          throw error;
        }
        throw new StateCorruptionError(
          `Failed to update metrics after ${MAX_RETRIES} attempts`,
          error instanceof Error ? error : new Error(String(error))
        );
      }

      // Exponential backoff
      const backoffMs = Math.pow(2, attempt) * 100;
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

/**
 * Update state after each analysis session (Story 5.4)
 * Main orchestrator for state updates.
 *
 * Key Logic:
 * - Read existing state or create new (first run)
 * - Detect and warn on platform inconsistency
 * - Update last_analysis to current ISO 8601 UTC timestamp
 * - Increment total_sessions (always, even if no new patterns)
 * - Merge patterns_found array (only if new patterns exist)
 * - Preserve existing platform value (only update if unknown/missing)
 * - Write atomically to prevent corruption
 * - Handle first run gracefully
 *
 * @param dataDir - Data directory containing state.json
 * @param newPatterns - New patterns discovered in this session
 * @param platform - Detected platform ('claude-code' | 'cursor' | 'unknown')
 * @throws {ValidationError} if dataDir or newPatterns is invalid
 * @throws {StateCorruptionError} if state update fails
 */
export async function updateSessionState(
  dataDir: string,
  newPatterns: MergedPattern[],
  platform: 'claude-code' | 'cursor' | 'unknown'
): Promise<void> {
  // Guard: Validate directory path
  validateDirectoryPath(dataDir);

  // Guard: Validate platform
  if (!platform || typeof platform !== 'string') {
    throw new ValidationError('Platform must be a non-empty string');
  }
  if (!['claude-code', 'cursor', 'unknown'].includes(platform)) {
    throw new ValidationError(`Platform must be one of: claude-code, cursor, unknown (got: ${platform})`);
  }

  // Guard: Validate newPatterns
  if (!Array.isArray(newPatterns)) {
    throw new ValidationError('newPatterns must be an array');
  }

  const statePath = path.join(dataDir, 'state.json');

  try {
    // Read existing state or create new (first run)
    let currentState: StateData;
    const isFirstRun = !fs.existsSync(statePath);

    if (isFirstRun) {
      // First run: create new state with defaults
      currentState = {
        last_analysis: generateTimestampWithMillis(),
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: platform as 'claude-code' | 'cursor' | 'unknown',
        _schema_note: 'results.jsonl is append-only, one JSON object per line',
        total_sessions: 1,
        approval_threshold: 75,
        approval_rate: null, // Include all required fields from Stories 5.1-5.3
      };

      // Merge new patterns if provided
      if (newPatterns.length > 0) {
        currentState.patterns_found = newPatterns.map(p => ({
          ...p,
          count: p.count || 1,
          first_seen: generateTimestampWithMillis(),
          last_seen: generateTimestamp(),
          session_count: 1,
          total_frequency: p.count || 1,
          is_new: true,
          frequency_change: p.count || 1,
        }));
      }
    } else {
      // Read existing state
      const content = await fs.promises.readFile(statePath, 'utf-8')
        .catch(e => {
          if (e && typeof e === 'object' && 'code' in e && e.code === 'EACCES') {
            throw new StateCorruptionError('Permission denied reading state.json', e instanceof Error ? e : new Error(String(e)));
          }
          throw e;
        });
      currentState = JSON.parse(content);

      // Validate existing state (handle missing platform field gracefully)
      try {
        validateStateData(currentState);
      } catch (error) {
        // If validation fails due to missing platform, set it to unknown
        if (error instanceof ValidationError && error.message.includes('platform')) {
          currentState.platform = 'unknown';
        } else {
          throw error;
        }
      }

      // Detect and warn on platform inconsistency
      if (currentState.platform !== 'unknown' && currentState.platform !== platform) {
        console.warn(`[WARN] Platform inconsistency detected: existing=${currentState.platform}, new=${platform}. Preserving existing platform.`);
        // Preserve existing platform value
        platform = currentState.platform;
      } else if (currentState.platform === 'unknown') {
        // Update if existing is 'unknown'
        platform = platform;
      } else {
        // Preserve existing known platform
        platform = currentState.platform;
      }

      // Update last_analysis to current ISO 8601 UTC timestamp
      currentState.last_analysis = generateTimestamp();

      // Increment total_sessions (always, even if no new patterns)
      currentState.total_sessions = (currentState.total_sessions || 0) + 1;

      // Get existing patterns
      const existingPatterns = Array.isArray(currentState.patterns_found)
        ? currentState.patterns_found as MergedPattern[]
        : [];

      // Check if there are new patterns (case-insensitive)
      const hasNew = hasNewPatterns(existingPatterns, newPatterns);

      // Merge patterns if newPatterns is not empty (AC2: update frequency counts for recurring patterns)
      // AC8 exception: If newPatterns is empty, don't modify patterns_found
      if (newPatterns.length > 0) {
        currentState.patterns_found = mergePatterns(existingPatterns, newPatterns);
      }

      // Log when no new patterns discovered (for user awareness)
      if (!hasNew) {
        console.log('[INFO] No new patterns discovered in this session');
      }

      // Update platform (preserve or set detected)
      currentState.platform = platform as 'claude-code' | 'cursor' | 'unknown';
    }

    // Check if state file exists and is read-only before attempting write
    if (fs.existsSync(statePath)) {
      try {
        const stats = await fs.promises.stat(statePath);
        const mode = stats.mode & 0o777;
        // Check if file is read-only (not writable by owner)
        if ((mode & 0o200) === 0) {
          throw new StateCorruptionError(
            `Cannot update state file at ${statePath}: file is read-only`
          );
        }
      } catch (error) {
        if (error instanceof StateCorruptionError) {
          throw error;
        }
        // If stat fails, continue with write attempt (will fail with appropriate error)
      }
    }

    // Write atomically to prevent corruption
    await writeStateAtomically(statePath, currentState);

    // Log session to results.jsonl with patterns_found count (AC8)
    const patternsCount = Array.isArray(currentState.patterns_found) ? currentState.patterns_found.length : 0;
    await appendResult(dataDir, {
      timestamp: generateTimestamp(),
      event_type: 'state_update',
      patterns: patternsCount,  // Use 'patterns' field for consistency with persistAnalysisResults
      total_sessions: currentState.total_sessions || 1,
    });

  } catch (error) {
    if (error instanceof ValidationError || error instanceof StateCorruptionError) {
      throw error;
    }
    throw new StateCorruptionError(
      `Failed to update session state in ${dataDir}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Filters patterns based on approval rate threshold
 * @param patterns - Array of patterns to filter
 * @param dataDir - Data directory containing results.jsonl
 * @param threshold - Minimum approval rate (0-100), defaults to 75
 * @returns Filtered array of patterns with approval rate >= threshold
 * @throws {ValidationError} if dataDir is invalid
 * @throws {StateCorruptionError} if filtering fails
 */
export async function filterPatternsByApprovalRate(
  patterns: MergedPattern[],
  dataDir: string,
  threshold?: number
): Promise<MergedPattern[]> {
  // Guard: Validate directory path
  validateDirectoryPath(dataDir);

  // Guard: Validate threshold
  const approvalThreshold = threshold ?? 75;
  if (typeof approvalThreshold !== 'number' || approvalThreshold < 0 || approvalThreshold > 100) {
    throw new ValidationError('Approval threshold must be a number between 0 and 100');
  }

  const resultsJsonlPath = path.join(dataDir, 'results.jsonl');
  const filteredPatterns: MergedPattern[] = [];
  let filteredCount = 0;

  for (const pattern of patterns) {
    const patternText = pattern.pattern_text;

    // Guard: Check pattern_text exists
    if (!patternText) {
      console.warn('[WARNING] Pattern missing pattern_text, skipping');
      continue;
    }

    // Calculate approval rate for this pattern (with error handling)
    const approvalRate = await calculatePatternApprovalRate(patternText, resultsJsonlPath)
      .catch(e => {
        console.warn(`[WARNING] Failed to calculate approval for pattern: ${e instanceof Error ? e.message : String(e)}`);
        return null; // Include pattern on error
      });

    // If no data available, include pattern (don't filter new patterns)
    if (approvalRate === null) {
      filteredPatterns.push(pattern);
      continue;
    }

    // Filter based on threshold
    if (approvalRate >= approvalThreshold) {
      filteredPatterns.push(pattern);
    } else {
      filteredCount++;
    }
  }

  // Log filtered patterns count
  if (filteredCount > 0) {
    console.log(`[INFO] Filtered ${filteredCount} patterns below ${approvalThreshold}% approval rate`);
  }

  return filteredPatterns;
}

/**
 * Displays current metrics from state.json in human-readable format
 * @param dataDir - Data directory containing state.json
 * @throws {ValidationError} if dataDir is invalid
 * @throws {StateCorruptionError} if state cannot be read
 */
export async function displayStats(dataDir: string): Promise<void> {
  // Guard: Validate directory path
  validateDirectoryPath(dataDir);

  const statePath = path.join(dataDir, 'state.json');

  try {
    // Read state file
    const content = await fs.promises.readFile(statePath, 'utf-8')
      .catch(e => {
        if (e && typeof e === 'object' && 'code' in e && e.code === 'EACCES') {
          throw new StateCorruptionError('Permission denied reading state.json', e instanceof Error ? e : new Error(String(e)));
        }
        throw e;
      });
    const state: StateData = JSON.parse(content);

    // Display metrics in markdown format
    console.log('\n# 📊 Project-Self_Improvement Stats\n');

    // Total improvements applied
    console.log(`**Total improvements applied:** ${state.improvements_applied || 0}`);

    // Corrections reduction with "Insufficient data" handling
    const sessionCount = (state as any).total_sessions || 0;
    let reductionDisplay: string;
    if (sessionCount < 3) {
      reductionDisplay = 'Insufficient data (need 3+ sessions)';
    } else {
      // Convert from 0-1 ratio to percentage for display
      const reductionRatio = typeof state.corrections_reduction === 'number' ? state.corrections_reduction : 0;
      const reductionPercentage = (reductionRatio * 100).toFixed(1);
      reductionDisplay = `${reductionPercentage}%`;
    }
    console.log(`**Corrections reduction:** ${reductionDisplay}`);

    // Approval rate
    const approvalRate = (state as any).approval_rate;
    if (approvalRate !== null && approvalRate !== undefined) {
      // Guard: Clamp approval rate to 0-100 range for display
      const clampedRate = Math.max(0, Math.min(100, approvalRate));
      console.log(`**Approval rate:** ${clampedRate.toFixed(1)}%`);
    } else {
      console.log('**Approval rate:** No data');
    }

    // Total analysis sessions
    console.log(`**Total analysis sessions:** ${sessionCount}`);

    // Patterns discovered
    const patternsCount = Array.isArray(state.patterns_found) ? state.patterns_found.length : 0;
    console.log(`**Patterns discovered:** ${patternsCount}`);

    // Approval threshold
    const threshold = (state as any).approval_threshold || 75;
    console.log(`**Approval threshold:** ${threshold}%`);

    console.log(''); // Empty line for spacing
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new StateCorruptionError(
      `Failed to display stats from ${statePath}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Validates a metric value and returns the validated value or error
 * @param metricName - Name of the metric being validated
 * @param value - Value to validate
 * @returns Object with valid flag, optional error message, and optional corrected value
 */
export function validateMetricValue(metricName: string, value: any): { valid: boolean; error?: string; value?: any } {
  switch (metricName) {
    case 'improvements_applied':
      // Must be non-negative integer
      if (typeof value !== 'number') {
        return { valid: false, error: 'improvements_applied must be a number', value: 0 };
      }
      if (Number.isNaN(value)) {
        return { valid: false, error: 'improvements_applied cannot be NaN', value: 0 };
      }
      if (!Number.isFinite(value)) {
        return { valid: false, error: 'improvements_applied must be finite', value: 0 };
      }
      if (!Number.isInteger(value)) {
        return { valid: false, error: 'improvements_applied must be an integer', value: Math.floor(value) };
      }
      if (value < 0) {
        return { valid: false, error: 'improvements_applied must be non-negative', value: 0 };
      }
      return { valid: true, value };

    case 'corrections_reduction':
      // Must be number 0-1 (NEVER null)
      if (value === null || value === undefined) {
        return { valid: false, error: 'corrections_reduction must be a number (not null)', value: 0 };
      }
      if (typeof value !== 'number') {
        return { valid: false, error: 'corrections_reduction must be a number', value: 0 };
      }
      if (Number.isNaN(value)) {
        return { valid: false, error: 'corrections_reduction cannot be NaN', value: 0 };
      }
      if (!Number.isFinite(value)) {
        return { valid: false, error: 'corrections_reduction must be finite', value: 0 };
      }
      if (value < 0) {
        return { valid: false, error: 'corrections_reduction must be non-negative', value: 0 };
      }
      if (value > 1) {
        return { valid: false, error: 'corrections_reduction must be ≤ 1', value: 1 };
      }
      return { valid: true, value };

    case 'approval_rate':
      // Can be number 0-100 or null
      if (value === null || value === undefined) {
        return { valid: true, value: null };
      }
      if (typeof value !== 'number') {
        return { valid: false, error: 'approval_rate must be a number or null', value: null };
      }
      if (Number.isNaN(value)) {
        return { valid: false, error: 'approval_rate cannot be NaN', value: null };
      }
      if (!Number.isFinite(value)) {
        return { valid: false, error: 'approval_rate must be finite', value: null };
      }
      if (value < 0) {
        return { valid: false, error: 'approval_rate must be non-negative', value: 0 };
      }
      if (value > 100) {
        return { valid: false, error: 'approval_rate must be ≤ 100', value: 100 };
      }
      return { valid: true, value };

    case 'total_sessions':
      // Must be non-negative integer
      if (typeof value !== 'number') {
        return { valid: false, error: 'total_sessions must be a number', value: 0 };
      }
      if (Number.isNaN(value)) {
        return { valid: false, error: 'total_sessions cannot be NaN', value: 0 };
      }
      if (!Number.isFinite(value)) {
        return { valid: false, error: 'total_sessions must be finite', value: 0 };
      }
      if (!Number.isInteger(value)) {
        return { valid: false, error: 'total_sessions must be an integer', value: Math.floor(value) };
      }
      if (value < 0) {
        return { valid: false, error: 'total_sessions must be non-negative', value: 0 };
      }
      return { valid: true, value };

    case 'approval_threshold':
      // Must be number 0-100
      if (typeof value !== 'number') {
        return { valid: false, error: 'approval_threshold must be a number', value: 75 };
      }
      if (Number.isNaN(value)) {
        return { valid: false, error: 'approval_threshold cannot be NaN', value: 75 };
      }
      if (!Number.isFinite(value)) {
        return { valid: false, error: 'approval_threshold must be finite', value: 75 };
      }
      if (value < 0) {
        return { valid: false, error: 'approval_threshold must be non-negative', value: 0 };
      }
      if (value > 100) {
        return { valid: false, error: 'approval_threshold must be ≤ 100', value: 100 };
      }
      return { valid: true, value };

    default:
      return { valid: false, error: `Unknown metric name: ${metricName}` };
  }
}

// ============================================================================
// STORY 6.10: RULE CONSOLIDATION
// ============================================================================

/**
 * Platform type for rule files
 */
export type RulePlatform = 'cursor' | 'copilot' | 'claude-code';

/**
 * Parsed rule with metadata
 */
export interface ParsedRule {
  id: string;
  text: string;
  category: string;
  lineNumber: number;
}

/**
 * Consolidation proposal structure
 */
export interface ConsolidationProposal {
  categories: {
    name: string;
    rules: Array<{ text: string; line: number; id: string }>;
  }[];
  redundancies: Array<{
    groupId: string;
    rules: string[]; // rule IDs
    similarity: number; // 0-1 score
    suggestedConsolidation: string;
  }>;
  contradictions: Array<{
    ruleId1: string;
    ruleId2: string;
    reason: string;
    conflict: string;
  }>;
  metrics: {
    originalRules: number;
    originalLines: number;
    consolidatedRules: number;
    consolidatedLines: number;
    reductionPercentage: number;
  };
  platform: RulePlatform;
}

/**
 * Consolidation approval state
 */
export interface ConsolidationApprovalState {
  approved: Set<string>;
  rejected: Set<string>;
  edited: Map<string, string>;
  contradictions: Map<string, string>;
}

/**
 * Count non-empty, non-comment lines in rules content
 *
 * @param content - Rules file content
 * @returns Count of non-empty, non-comment lines
 */
export function countNonEmptyLines(content: string): number {
  // Guard: Validate content is not null/undefined
  if (content == null) {
    throw new Error('content cannot be null or undefined');
  }

  return content.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith('#');
  }).length;
}

/**
 * Detect file format from content (independent of platform)
 *
 * @param content - File content to analyze
 * @returns 'markdown' or 'plain'
 */
export function detectFormat(content: string): 'markdown' | 'plain' {
  // Guard: Validate content is not null/undefined
  if (content == null) {
    throw new Error('content cannot be null or undefined');
  }

  // Check for Markdown signatures
  const hasMarkdownHeadings = /^##\s+.+/m.test(content);
  const hasMarkdownBullets = /^-\s+.+/m.test(content);

  if (hasMarkdownHeadings || hasMarkdownBullets) {
    return 'markdown';
  }

  return 'plain';
}

/**
 * Infer category from rule text using keyword matching
 *
 * @param text - Rule text
 * @returns Inferred category name
 */
function inferCategoryFromKeywords(text: string): string {
  // Guard: Validate text is not null/undefined
  if (text == null) {
    throw new Error('text cannot be null or undefined');
  }

  const lowerText = text.toLowerCase();

  const categoryKeywords = {
    'Code Style': ['typescript', 'async', 'await', 'promise', 'function', 'variable', 'const', 'let', 'arrow', 'return', 'type'],
    'Testing': ['test', 'mock', 'spec', 'jest', 'unit', 'integration', 'assertion', 'coverage'],
    'Error Handling': ['error', 'catch', 'throw', 'exception', 'try', 'handling'],
    'Documentation': ['comment', 'document', 'readme', 'jsdoc', 'annotation'],
    'Security': ['security', 'validate', 'sanitize', 'auth', 'permission', 'csrf', 'xss'],
    'Performance': ['performance', 'optimize', 'cache', 'debounce', 'throttle', 'lazy'],
    'Git': ['git', 'commit', 'branch', 'merge', 'pull', 'push', 'changelog']
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return category;
      }
    }
  }

  return 'General';
}

/**
 * Parse rules content into structured objects
 *
 * @param content - Raw rules content
 * @param platform - Platform type
 * @returns Array of parsed rules
 */
export async function parseRules(content: string, platform: RulePlatform): Promise<ParsedRule[]> {
  // Guard: Validate content is not null/undefined
  if (content == null) {
    throw new Error('content cannot be null or undefined');
  }

  // Guard: Limit content size to prevent memory exhaustion
  const MAX_CONTENT_SIZE = 1000000; // 1MB
  if (content.length > MAX_CONTENT_SIZE) {
    throw new Error(`Rules content too large: ${content.length} chars (max ${MAX_CONTENT_SIZE})`);
  }

  const lines = content.split('\n');
  const rules: ParsedRule[] = [];
  let currentCategory = 'General';
  let ruleIdCounter = 0;

  const format = detectFormat(content);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      continue;
    }

    // Guard: Limit line length to prevent processing issues
    const MAX_LINE_LENGTH = 10000;
    if (line.length > MAX_LINE_LENGTH) {
      throw new Error(`Rule line too long: ${line.length} chars (max ${MAX_LINE_LENGTH}) at line ${i + 1}`);
    }

    // Extract category from section headers
    if (format === 'markdown') {
      const markdownHeader = line.match(/^##\s+(.+)/);
      if (markdownHeader) {
        currentCategory = markdownHeader[1].trim();
        continue;
      }
    } else {
      const plainHeader = line.match(/^#\s+(.+)/);
      if (plainHeader) {
        currentCategory = plainHeader[1].trim();
        continue;
      }
    }

    // Skip standalone comments
    if (line.startsWith('#')) {
      continue;
    }

    // Validate rule has at least one directive
    if (line.length > 0) {
      const ruleId = `rule-${ruleIdCounter++}`;
      rules.push({
        id: ruleId,
        text: line,
        category: currentCategory,
        lineNumber: i + 1
      });
    }

    // Guard: Limit total number of rules to prevent memory exhaustion
    const MAX_RULES = 10000;
    if (rules.length >= MAX_RULES) {
      throw new Error(`Too many rules: ${rules.length} (max ${MAX_RULES})`);
    }
  }

  return rules;
}

/**
 * Normalize text for similarity comparison
 *
 * @param text - Text to normalize
 * @returns Normalized tokens
 */
function normalizeText(text: string): Set<string> {
  // Guard: Validate text is not null/undefined
  if (text == null) {
    throw new Error('text cannot be null or undefined');
  }

  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'need', 'make', 'take']);

  // Semantic equivalents - map similar words to the same token
  const equivalents: Record<string, string> = {
    'use': 'use',
    'prefer': 'use',
    'utilize': 'use',
    'instead': 'instead',
    'over': 'instead',
    'avoid': 'avoid',
    'dont': 'avoid',
    "don't": 'avoid',
    'not': 'avoid',
    'always': 'always',
    'never': 'never',
    'ensure': 'ensure',
    'make': 'ensure',
    'add': 'add',
    'include': 'add',
    'write': 'write',
    'create': 'write'
  };

  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0 && !stopWords.has(word))
    .map(word => equivalents[word] || word);

  return new Set(tokens);
}

/**
 * Calculate Jaccard similarity between two rules
 *
 * @param rule1 - First rule text
 * @param rule2 - Second rule text
 * @returns Similarity score (0-1)
 */
export function calculateJaccardSimilarity(rule1: string, rule2: string): number {
  // Guard: Validate inputs are not null/undefined
  if (rule1 == null || rule2 == null) {
    throw new Error('rules cannot be null or undefined');
  }

  const tokens1 = normalizeText(rule1);
  const tokens2 = normalizeText(rule2);

  if (tokens1.size === 0 && tokens2.size === 0) {
    return 0;
  }

  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Group similar rules using transitive closure
 *
 * @param rules - Parsed rules to group
 * @returns Array of rule ID groups
 */
export function groupSimilarRules(rules: ParsedRule[]): string[][] {
  // Guard: Validate rules array
  if (rules == null) {
    throw new Error('rules cannot be null or undefined');
  }

  const SIMILARITY_THRESHOLD = 0.7;

  const groups: string[][] = [];
  const processed = new Set<string>();

  for (let i = 0; i < rules.length; i++) {
    if (processed.has(rules[i].id)) {
      continue;
    }

    const currentGroup = [rules[i].id];
    processed.add(rules[i].id);

    // Find all similar rules using transitive closure
    let added = true;
    while (added) {
      added = false;

      for (let j = 0; j < rules.length; j++) {
        if (processed.has(rules[j].id)) {
          continue;
        }

        // Check if this rule is similar to any rule in the current group
        let isSimilarToGroup = false;
        for (const groupId of currentGroup) {
          const groupRule = rules.find(r => r.id === groupId);
          if (groupRule && calculateJaccardSimilarity(groupRule.text, rules[j].text) > SIMILARITY_THRESHOLD) {
            isSimilarToGroup = true;
            break;
          }
        }

        if (isSimilarToGroup) {
          currentGroup.push(rules[j].id);
          processed.add(rules[j].id);
          added = true;
        }
      }
    }

    // Only add groups with more than one rule
    if (currentGroup.length > 1) {
      groups.push(currentGroup);
    }
  }

  return groups;
}

/**
 * Detect contradictions between rules
 *
 * @param rules - Parsed rules to analyze
 * @returns Array of contradictions
 */
export function detectContradictions(rules: ParsedRule[]): Array<{
  ruleId1: string;
  ruleId2: string;
  reason: string;
  conflict: string;
}> {
  // Guard: Validate rules array
  if (rules == null) {
    throw new Error('rules cannot be null or undefined');
  }

  const contradictions: Array<{
    ruleId1: string;
    ruleId2: string;
    reason: string;
    conflict: string;
  }> = [];

  const antonymPairs = [
    { positive: ['use', 'prefer', 'always', 'utilize'], negative: ['avoid', 'never', 'don\'t', 'dont'] },
    { positive: ['enable', 'activate'], negative: ['disable', 'deactivate'] },
    { positive: ['include', 'add'], negative: ['exclude', 'remove'] }
  ];

  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const rule1 = rules[i];
      const rule2 = rules[j];

      // Only check rules in the same category (same scope)
      if (rule1.category !== rule2.category) {
        continue;
      }

      const text1 = rule1.text.toLowerCase();
      const text2 = rule2.text.toLowerCase();

      // Check for antonym pairs
      for (const pair of antonymPairs) {
        const hasPositive1 = pair.positive.some(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'i');
          return regex.test(text1);
        });
        const hasNegative1 = pair.negative.some(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'i');
          return regex.test(text1);
        });
        const hasPositive2 = pair.positive.some(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'i');
          return regex.test(text2);
        });
        const hasNegative2 = pair.negative.some(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'i');
          return regex.test(text2);
        });

        if ((hasPositive1 && hasNegative2) || (hasNegative1 && hasPositive2)) {
          // Check if they're talking about the same thing (extract key topic)
          const tokens1 = normalizeText(rule1.text);
          const tokens2 = normalizeText(rule2.text);
          const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));

          if (intersection.size >= 1) {
            contradictions.push({
              ruleId1: rule1.id,
              ruleId2: rule2.id,
              reason: `Rules have opposite directives in the same category (${rule1.category})`,
              conflict: `"${rule1.text}" vs "${rule2.text}"`
            });
          }
        }
      }
    }
  }

  return contradictions;
}

/**
 * Generate consolidated rule text from similar rules
 *
 * @param rules - Rules to consolidate
 * @returns Consolidated rule text
 */
function generateConsolidatedRule(rules: ParsedRule[]): string {
  // Guard: Validate rules array
  if (rules == null || !Array.isArray(rules)) {
    throw new Error('rules must be a non-null array');
  }

  if (rules.length === 0) {
    return '';
  }

  if (rules.length === 1) {
    return rules[0].text;
  }

  // Extract key terms and concepts from all rules
  const allTokens = new Set<string>();
  for (const rule of rules) {
    const tokens = normalizeText(rule.text);
    tokens.forEach(t => allTokens.add(t));
  }

  // Build consolidated rule
  const keyTerms = Array.from(allTokens).slice(0, 10).join(', ');
  return `${rules[0].text} (consolidated from ${rules.length} similar rules: ${keyTerms})`;
}

/**
 * Calculate consolidation benefit metrics
 *
 * @param rules - Original parsed rules
 * @param redundancies - Detected redundancy groups
 * @returns Benefit metrics
 */
export function calculateConsolidationBenefit(
  rules: ParsedRule[],
  redundancies: Array<{ groupId: string; rules: string[]; similarity: number; suggestedConsolidation: string }>
): {
  originalRules: number;
  originalLines: number;
  consolidatedRules: number;
  consolidatedLines: number;
  reductionPercentage: number;
} {
  // Guard: Validate inputs
  if (rules == null || redundancies == null) {
    throw new Error('parameters cannot be null or undefined');
  }

  const originalRules = rules.length;
  const originalLines = rules.length;

  // Calculate consolidated counts
  const consolidatedRulesCount = redundancies.length + (originalRules - redundancies.reduce((sum, r) => sum + r.rules.length, 0));

  // Count actual consolidated lines
  let consolidatedLines = 0;
  for (const redundancy of redundancies) {
    consolidatedLines += 1; // Each consolidation becomes 1 line
  }
  // Add unchanged rules
  const unchangedRules = originalRules - redundancies.reduce((sum, r) => sum + r.rules.length, 0);
  consolidatedLines += unchangedRules;

  const reductionPercentage = originalLines === 0 ? 0 : ((originalLines - consolidatedLines) / originalLines) * 100;

  return {
    originalRules,
    originalLines,
    consolidatedRules: consolidatedRulesCount,
    consolidatedLines,
    reductionPercentage
  };
}

/**
 * Main consolidation analysis function
 *
 * @param rulesContent - Raw rules file content
 * @param platform - Platform type
 * @returns Consolidation proposal
 */
export async function consolidateRules(
  rulesContent: string,
  platform: RulePlatform
): Promise<ConsolidationProposal> {
  // Guard: Validate rulesContent
  if (rulesContent == null) {
    throw new Error('rulesContent cannot be null or undefined');
  }

  // Guard: Validate platform
  const validPlatforms = ['cursor', 'copilot', 'claude-code'];
  if (!validPlatforms.includes(platform)) {
    throw new Error(`Invalid platform: ${platform}. Must be one of: ${validPlatforms.join(', ')}`);
  }

  // Guard: Check minimum rule count
  const parsedRules = await parseRules(rulesContent, platform);
  if (parsedRules.length < 5) {
    throw new Error('Too few rules to consolidate effectively. Minimum 5 rules required for meaningful analysis.');
  }

  // Detect contradictions
  const contradictions = detectContradictions(parsedRules);

  // Group similar rules
  const similarityGroups = groupSimilarRules(parsedRules);

  // Generate redundancies with consolidated suggestions
  const redundancies = similarityGroups.map((group, index) => {
    const groupRules = parsedRules.filter(r => group.includes(r.id));
    const suggestedConsolidation = generateConsolidatedRule(groupRules);

    return {
      groupId: `group-${index}`,
      rules: group,
      similarity: 0.8, // Simplified - in real implementation would calculate actual similarity
      suggestedConsolidation
    };
  });

  // Calculate metrics
  const metrics = calculateConsolidationBenefit(parsedRules, redundancies);

  // Group by category
  const categoryMap = new Map<string, Array<{ text: string; line: number; id: string }>>();
  for (const rule of parsedRules) {
    if (!categoryMap.has(rule.category)) {
      categoryMap.set(rule.category, []);
    }
    categoryMap.get(rule.category)!.push({
      text: rule.text,
      line: rule.lineNumber,
      id: rule.id
    });
  }

  const categories = Array.from(categoryMap.entries()).map(([name, rules]) => ({ name, rules }));

  return {
    categories,
    redundancies,
    contradictions,
    metrics,
    platform
  };
}

/**
 * Format consolidated rules for platform-specific output
 *
 * @param consolidatedRules - Rules to format
 * @param platform - Target platform
 * @returns Formatted content
 */
export function formatConsolidatedRules(
  consolidatedRules: Array<{ category: string; text: string }>,
  platform: RulePlatform
): string {
  // Guard: Validate consolidatedRules
  if (consolidatedRules == null) {
    throw new Error('consolidatedRules cannot be null or undefined');
  }

  // Guard: Validate platform
  const validPlatforms = ['cursor', 'copilot', 'claude-code'];
  if (!validPlatforms.includes(platform)) {
    throw new Error(`Invalid platform: ${platform}. Must be one of: ${validPlatforms.join(', ')}`);
  }

  const format = platform === 'cursor' ? 'plain' : 'markdown';

  if (format === 'markdown') {
    // Markdown format with ## headings and - bullet points
    const categoryMap = new Map<string, string[]>();
    for (const rule of consolidatedRules) {
      if (!categoryMap.has(rule.category)) {
        categoryMap.set(rule.category, []);
      }
      categoryMap.get(rule.category)!.push(rule.text);
    }

    let output = '';
    for (const [category, rules] of categoryMap.entries()) {
      output += `## ${category}\n`;
      for (const rule of rules) {
        output += `- ${rule}\n`;
      }
      output += '\n';
    }

    return output.trim();
  } else {
    // Plain text format with # comments
    const categoryMap = new Map<string, string[]>();
    for (const rule of consolidatedRules) {
      if (!categoryMap.has(rule.category)) {
        categoryMap.set(rule.category, []);
      }
      categoryMap.get(rule.category)!.push(rule.text);
    }

    let output = '';
    for (const [category, rules] of categoryMap.entries()) {
      output += `# ${category}\n`;
      for (const rule of rules) {
        output += `${rule}\n`;
      }
      output += '\n';
    }

    return output.trim();
  }
}

/**
 * Apply consolidations to rules file
 *
 * @param approvalState - User approval decisions
 * @param proposal - Consolidation proposal
 * @param rulesFilePath - Path to rules file
 */
export async function applyConsolidations(
  approvalState: ConsolidationApprovalState,
  proposal: ConsolidationProposal,
  rulesFilePath: string
): Promise<void> {
  // Import required modules
  const fsPromises = (await import('fs')).promises;
  const path = (await import('path')).default;

  // Guard: Validate approvalState
  if (approvalState == null) {
    throw new Error('approvalState cannot be null or undefined');
  }

  // Guard: Validate proposal
  if (proposal == null) {
    throw new Error('proposal cannot be null or undefined');
  }

  // Guard: Validate rulesFilePath exists and is accessible
  try {
    await fsPromises.access(rulesFilePath, fsPromises.constants.R_OK);
  } catch {
    throw new Error(`Rules file not found or inaccessible: ${rulesFilePath}`);
  }

  // Guard: Validate proposal references valid rule IDs
  const allRuleIds = new Set(proposal.categories.flatMap(c => c.rules.map(r => r.id)));
  for (const redundancy of proposal.redundancies) {
    for (const ruleId of redundancy.rules) {
      if (!allRuleIds.has(ruleId)) {
        throw new Error(`Invalid rule ID in proposal: ${ruleId}`);
      }
    }
  }

  // Pre-analysis backup verification
  const historyDir = ABSOLUTE_PATHS.HISTORY_DIR;

  try {
    await fsPromises.access(historyDir, fsPromises.constants.W_OK);
  } catch {
    await fsPromises.mkdir(historyDir, { mode: 0o700, recursive: true });
  }

  // Create pre-consolidation backup
  const backupResult = await createBackup(rulesFilePath, historyDir);
  if (backupResult === null) {
    throw new Error('Pre-consolidation backup failed — consolidation aborted to prevent data loss');
  }

  // Build consolidated content
  const consolidatedRules: Array<{ category: string; text: string }> = [];

  // Add approved consolidations
  for (const redundancy of proposal.redundancies) {
    if (approvalState.approved.has(redundancy.groupId)) {
      const editedText = approvalState.edited.get(redundancy.groupId);
      const category = proposal.categories.find(c =>
        c.rules.some(r => redundancy.rules.includes(r.id))
      );

      consolidatedRules.push({
        category: category?.name || 'General',
        text: editedText || redundancy.suggestedConsolidation
      });
    }
  }

  // Add unchanged rules
  for (const category of proposal.categories) {
    for (const rule of category.rules) {
      const isInConsolidation = proposal.redundancies.some(r =>
        approvalState.approved.has(r.groupId) && r.rules.includes(rule.id)
      );

      if (!isInConsolidation) {
        consolidatedRules.push({
          category: category.name,
          text: rule.text
        });
      }
    }
  }

  // Format for platform
  const consolidatedContent = formatConsolidatedRules(consolidatedRules, proposal.platform);

  // Atomic write with proper error handling
  const tempPath = `${rulesFilePath}.tmp`;

  try {
    // Clean up temp file if it already exists
    try {
      await fsPromises.unlink(tempPath);
    } catch {
      // Ignore if temp file doesn't exist
    }

    // Write to temp file with disk space check
    try {
      await fsPromises.writeFile(tempPath, consolidatedContent, { mode: 0o600, encoding: 'utf8' });
    } catch (writeError: any) {
      if (writeError.code === 'ENOSPC') {
        throw new Error('Disk full - cannot consolidate rules');
      }
      throw writeError;
    }

    // Atomic rename
    await fsPromises.rename(tempPath, rulesFilePath);
  } catch (renameError) {
    // Clean up temp file on failure
    try {
      await fsPromises.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw renameError;
  }

  // Log to results.jsonl
  const logEntry = {
    timestamp: new Date().toISOString(),
    status: 'consolidated',
    summary: `Consolidated ${proposal.metrics.originalRules} rules to ${proposal.metrics.consolidatedRules} rules (${proposal.metrics.reductionPercentage.toFixed(1)}% reduction)`,
    rules_before: proposal.metrics.originalRules,
    rules_after: proposal.metrics.consolidatedRules,
    lines_reduced: proposal.metrics.originalLines - proposal.metrics.consolidatedLines,
    categories_consolidated: proposal.categories.length,
    contradictions_resolved: approvalState.contradictions.size,
    platform: proposal.platform,
    backup_timestamp: backupResult
  };

  try {
    await appendResult(ABSOLUTE_PATHS.BASE, logEntry);
  } catch (error) {
    console.warn('[WARNING] Failed to log consolidation to results.jsonl:', error);
  }
}

