/**
 * Pattern Matcher Implementation (Story 2-6)
 *
 * Implements pattern merging algorithm for longitudinal pattern detection across multiple sessions.
 * Handles exact matching, semantic matching, and category validation.
 *
 * Features:
 * - Exact pattern matching (case-insensitive, whitespace-normalized)
 * - Semantic pattern matching (similarity-based with >= 0.85 threshold)
 * - Category validation for pattern merging
 * - First_seen timestamp preservation
 * - Session_count and total_frequency tracking
 * - Frequency_change calculation
 * - AR22 compliant error handling
 *
 * @module pattern-matcher
 */

import {
  Pattern,
  PatternCategory,
  PatternExample,
} from './pattern-detector';

// Re-export PatternCategory for use in visualization module
export { PatternCategory } from './pattern-detector';
import { calculateSimilarity } from './correction-classifier';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Historical pattern with longitudinal tracking fields
 *
 * @interface HistoricalPattern
 */
export interface HistoricalPattern extends Pattern {
  /** ISO timestamp from historical or current session */
  first_seen: string;
  /** Most recent occurrence timestamp */
  last_seen: string;
  /** Number of sessions where pattern appeared */
  session_count: number;
  /** Cumulative frequency across all sessions */
  total_frequency: number;
}

/**
 * Merged pattern with longitudinal analysis data
 *
 * @interface MergedPattern
 */
export interface MergedPattern extends Pattern {
  /** ISO timestamp from historical or current session */
  first_seen: string;
  /** Most recent occurrence timestamp */
  last_seen: string;
  /** Number of sessions where pattern appeared */
  session_count: number;
  /** Cumulative frequency across all sessions */
  total_frequency: number;
  /** True if first seen in current session */
  is_new: boolean;
  /** Current session frequency vs. historical average */
  frequency_change: number;
}

/**
 * Pattern merge statistics
 *
 * @interface MergeStatistics
 */
export interface MergeStatistics {
  /** Number of new patterns detected */
  new_patterns: number;
  /** Number of recurring patterns detected */
  recurring_patterns: number;
  /** Number of patterns with increasing frequency */
  increasing_trends: number;
  /** Number of patterns with decreasing frequency */
  decreasing_trends: number;
  /** Number of exact matches found */
  exact_matches: number;
  /** Number of semantic matches found */
  semantic_matches: number;
}

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Error codes for pattern matching failures
 *
 * @enum {string}
 */
export enum PatternMatchingErrorCode {
  /** Pattern matching failed */
  PATTERN_MATCHING_FAILED = 'PATTERN_MATCHING_FAILED',
  /** Invalid input provided */
  INVALID_INPUT = 'INVALID_INPUT',
  /** Similarity calculation error */
  SIMILARITY_CALCULATION_ERROR = 'SIMILARITY_CALCULATION_ERROR',
  /** Category mismatch error */
  CATEGORY_MISMATCH = 'CATEGORY_MISMATCH',
  /** Timestamp parsing error */
  TIMESTAMP_PARSING_ERROR = 'TIMESTAMP_PARSING_ERROR',
}

// ============================================================================
// ERROR HANDLING (AR22 COMPLIANT)
// ============================================================================

/**
 * AR22 compliant error class for pattern matching
 *
 * @class AR22Error
 * @extends Error
 */
export class AR22Error extends Error {
  public readonly what: string;
  public readonly how: string[];
  public readonly technical: string;
  public readonly code?: PatternMatchingErrorCode;
  public readonly originalError?: Error;

  constructor(
    brief: string,
    details: { what: string; how: string[]; technical: string },
    code?: PatternMatchingErrorCode,
    originalError?: Error
  ) {
    super(brief);
    this.what = details.what;
    this.how = details.how;
    this.technical = details.technical;
    this.code = code;
    this.originalError = originalError;
    this.name = 'AR22Error';

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AR22Error);
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
// PATTERN MATCHER CLASS
// ============================================================================

/**
 * PatternMatcher class for longitudinal pattern merging
 *
 * Features:
 * - Exact pattern matching (case-insensitive, whitespace-normalized)
 * - Semantic pattern matching (similarity-based)
 * - Category validation for pattern merging
 * - First_seen timestamp preservation
 * - Session_count and total_frequency tracking
 * - Frequency_change calculation
 *
 * @class PatternMatcher
 */
export class PatternMatcher {
  private readonly SEMANTIC_SIMILARITY_THRESHOLD = 0.85;
  private readonly FREQUENCY_INCREASING_THRESHOLD = 0.5;
  private readonly FREQUENCY_DECREASING_THRESHOLD = -0.5;

  /**
   * Normalize pattern text for comparison
   *
   * @private
   * @param text - Text to normalize
   * @returns Normalized text
   */
  private normalizePatternText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }
    // Guard: Limit text length to prevent memory/performance issues
    const MAX_TEXT_LENGTH = 10000;
    if (text.length > MAX_TEXT_LENGTH) {
      return '';
    }
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
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
      return !isNaN(date.getTime()) && date.toISOString() === timestamp;
    } catch {
      return false;
    }
  }

  /**
   * Check if two patterns are an exact match
   *
   * @private
   * @param pattern1 - First pattern
   * @param pattern2 - Second pattern
   * @returns True if patterns are exact match
   */
  private isExactMatch(pattern1: Pattern, pattern2: Pattern): boolean {
    const normalized1 = this.normalizePatternText(pattern1.pattern_text);
    const normalized2 = this.normalizePatternText(pattern2.pattern_text);
    return normalized1 === normalized2 && normalized1 !== '';
  }

  /**
   * Check if two patterns are semantically similar
   *
   * @private
   * @param pattern1 - First pattern
   * @param pattern2 - Second pattern
   * @returns True if patterns are semantically similar
   */
  private isSemanticMatch(pattern1: Pattern, pattern2: Pattern): boolean {
    const normalized1 = this.normalizePatternText(pattern1.pattern_text);
    const normalized2 = this.normalizePatternText(pattern2.pattern_text);

    if (normalized1 === '' || normalized2 === '') {
      return false;
    }

    try {
      const similarity = calculateSimilarity(normalized1, normalized2);
      return similarity >= this.SEMANTIC_SIMILARITY_THRESHOLD && similarity < 1.0;
    } catch (error) {
      throw new AR22Error(
        'Failed to calculate pattern similarity',
        {
          what: 'Similarity calculation threw an exception',
          how: [
            'Check that pattern texts are valid strings',
            'Verify similarity algorithm is properly initialized',
            'Ensure pattern texts are not excessively long',
          ],
          technical: error instanceof Error ? error.message : 'Unknown error',
        },
        PatternMatchingErrorCode.SIMILARITY_CALCULATION_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if two patterns can be merged based on category
   *
   * @private
   * @param pattern1 - First pattern
   * @param pattern2 - Second pattern
   * @returns True if patterns can be merged
   */
  private canMergeByCategory(pattern1: Pattern, pattern2: Pattern): boolean {
    // Only allow merge if categories match exactly
    // This prevents false positives when semantically similar patterns have different categories
    return pattern1.category === pattern2.category;
  }

  /**
   * Merge two patterns into a MergedPattern
   *
   * @private
   * @param current - Current session pattern
   * @param historical - Historical pattern (optional)
   * @param currentTimestamp - Current session timestamp
   * @returns Merged pattern with longitudinal data
   */
  private mergePatternData(
    current: Pattern,
    historical?: HistoricalPattern,
    currentTimestamp?: string
  ): MergedPattern {
    const isNew = !historical;
    const timestamp = currentTimestamp || new Date().toISOString();

    // Calculate first_seen and last_seen
    let firstSeen: string;
    let lastSeen: string;
    let sessionCount: number;
    let totalFrequency: number;
    let frequencyChange: number;

    if (historical) {
      // Preserve historical first_seen
      firstSeen = historical.first_seen;

      // Update last_seen to current session
      lastSeen = timestamp;

      // Increment session count
      sessionCount = (historical.session_count || 1) + 1;

      // Sum total frequency
      totalFrequency = (historical.total_frequency || historical.count) + current.count;

      // Calculate frequency change
      // Use total_frequency if available, otherwise calculate from count * session_count
      const histTotalFreq = historical.total_frequency || (historical.count * historical.session_count);
      const historicalAvg = histTotalFreq / historical.session_count;
      frequencyChange = historicalAvg > 0 ? (current.count - historicalAvg) / historicalAvg : 0;

      // Return merged pattern, preserving historical category
      return {
        ...current,
        first_seen: firstSeen,
        last_seen: lastSeen,
        session_count: sessionCount,
        total_frequency: totalFrequency,
        is_new: isNew,
        frequency_change: frequencyChange,
        category: historical.category, // Preserve historical category
      };
    } else {
      // New pattern
      firstSeen = current.first_seen || timestamp;
      lastSeen = current.last_seen || timestamp;
      sessionCount = 1;
      totalFrequency = current.count;
      frequencyChange = 0;

      return {
        ...current,
        first_seen: firstSeen,
        last_seen: lastSeen,
        session_count: sessionCount,
        total_frequency: totalFrequency,
        is_new: isNew,
        frequency_change: frequencyChange,
      };
    }
  }

  /**
   * Merge current session patterns with historical patterns
   *
   * @param current - Current session patterns
   * @param historical - Historical patterns from state.json
   * @param currentTimestamp - Current session timestamp (ISO 8601)
   * @returns Merged patterns with statistics
   *
   * @throws {AR22Error} When input validation fails
   */
  mergePatterns(
    current: Pattern[],
    historical: HistoricalPattern[],
    currentTimestamp?: string
  ): { patterns: MergedPattern[]; statistics: MergeStatistics } {
    // Validate input
    if (!Array.isArray(current)) {
      throw new AR22Error(
        'Invalid current patterns input',
        {
          what: 'Current patterns must be an array',
          how: [
            'Ensure current patterns parameter is an array',
            'Check that patterns are valid Pattern objects',
            'Verify pattern detection completed successfully',
          ],
          technical: `Received type: ${typeof current}`,
        },
        PatternMatchingErrorCode.INVALID_INPUT
      );
    }

    if (!Array.isArray(historical)) {
      throw new AR22Error(
        'Invalid historical patterns input',
        {
          what: 'Historical patterns must be an array',
          how: [
            'Ensure historical patterns parameter is an array',
            'Check that state.json was loaded correctly',
            'Verify historical patterns are valid HistoricalPattern objects',
          ],
          technical: `Received type: ${typeof historical}`,
        },
        PatternMatchingErrorCode.INVALID_INPUT
      );
    }

    // Guard: DoS protection - limit array sizes
    const MAX_PATTERNS = 10000;
    if (current.length > MAX_PATTERNS) {
      throw new AR22Error(
        'Current patterns array exceeds maximum size',
        {
          what: `Current patterns array contains ${current.length} patterns, maximum allowed is ${MAX_PATTERNS}`,
          how: [
            'Reduce the number of corrections being analyzed',
            'Process data in smaller batches',
            'Check for data quality issues causing pattern explosion',
          ],
          technical: `Current array size: ${current.length}, maximum: ${MAX_PATTERNS}`,
        },
        PatternMatchingErrorCode.INVALID_INPUT
      );
    }

    if (historical.length > MAX_PATTERNS) {
      throw new AR22Error(
        'Historical patterns array exceeds maximum size',
        {
          what: `Historical patterns array contains ${historical.length} patterns, maximum allowed is ${MAX_PATTERNS}`,
          how: [
            'Check state.json for data corruption',
            'Consider resetting state.json if historical data is invalid',
            'Verify pattern detection is working correctly',
          ],
          technical: `Historical array size: ${historical.length}, maximum: ${MAX_PATTERNS}`,
        },
        PatternMatchingErrorCode.INVALID_INPUT
      );
    }

    // Guard: Validate each pattern object has required fields
    for (let i = 0; i < current.length; i++) {
      const pattern = current[i];
      if (!pattern || typeof pattern !== 'object') {
        throw new AR22Error(
          'Invalid pattern object in current patterns',
          {
            what: `Pattern at index ${i} is not a valid object`,
            how: [
              'Check that pattern detection is creating valid Pattern objects',
              'Verify pattern objects have all required fields',
              'Review pattern detection logs for errors',
            ],
            technical: `Pattern at index ${i}: ${typeof pattern}`,
          },
          PatternMatchingErrorCode.INVALID_INPUT
        );
      }
      if (typeof pattern.pattern_text !== 'string' || pattern.pattern_text.trim() === '') {
        throw new AR22Error(
          'Invalid pattern_text in current patterns',
          {
            what: `Pattern at index ${i} has invalid pattern_text field`,
            how: [
              'Check that pattern detection is setting pattern_text correctly',
              'Verify pattern_text is a non-empty string',
              'Review pattern detection logic',
            ],
            technical: `Pattern at index ${i} pattern_text: ${typeof pattern.pattern_text}`,
          },
          PatternMatchingErrorCode.INVALID_INPUT
        );
      }
      if (typeof pattern.count !== 'number' || pattern.count < 0) {
        throw new AR22Error(
          'Invalid count in current patterns',
          {
            what: `Pattern at index ${i} has invalid count field`,
            how: [
              'Check that frequency analysis is calculating count correctly',
              'Verify count is a non-negative number',
              'Review frequency analyzer logic',
            ],
            technical: `Pattern at index ${i} count: ${typeof pattern.count}, value: ${pattern.count}`,
          },
          PatternMatchingErrorCode.INVALID_INPUT
        );
      }
      if (!Object.values(PatternCategory).includes(pattern.category)) {
        throw new AR22Error(
          'Invalid category in current patterns',
          {
            what: `Pattern at index ${i} has invalid category field`,
            how: [
              'Check that category detection is working correctly',
              'Verify category is a valid PatternCategory enum value',
              'Review category grouper logic',
            ],
            technical: `Pattern at index ${i} category: ${pattern.category}`,
          },
          PatternMatchingErrorCode.INVALID_INPUT
        );
      }
    }

    // Validate current timestamp if provided
    const timestamp = currentTimestamp || new Date().toISOString();
    if (currentTimestamp && !this.isValidTimestamp(timestamp)) {
      throw new AR22Error(
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
        PatternMatchingErrorCode.TIMESTAMP_PARSING_ERROR
      );
    }

    // Handle empty inputs
    if (current.length === 0 && historical.length === 0) {
      return {
        patterns: [],
        statistics: {
          new_patterns: 0,
          recurring_patterns: 0,
          increasing_trends: 0,
          decreasing_trends: 0,
          exact_matches: 0,
          semantic_matches: 0,
        },
      };
    }

    const mergedPatterns: MergedPattern[] = [];
    const processedHistorical = new Set<number>();
    const processedCurrent = new Set<number>();
    let exactMatches = 0;
    let semanticMatches = 0;

    // Step 1: Find exact matches
    for (let i = 0; i < current.length; i++) {
      const currentPattern = current[i];
      if (processedCurrent.has(i)) continue;

      for (let j = 0; j < historical.length; j++) {
        if (processedHistorical.has(j)) continue;

        const historicalPattern = historical[j];

        if (this.isExactMatch(currentPattern, historicalPattern)) {
          // Check category compatibility - ONLY merge if categories match exactly
          if (this.canMergeByCategory(currentPattern, historicalPattern)) {
            const merged = this.mergePatternData(currentPattern, historicalPattern, timestamp);
            mergedPatterns.push(merged);
            processedHistorical.add(j);
            processedCurrent.add(i);
            exactMatches++;
            break;
          } else {
            // Category mismatch - log warning and keep patterns separate
            console.warn(
              `Category mismatch for exact match: current="${currentPattern.category}", historical="${historicalPattern.category}". Keeping patterns separate.`
            );
            // DO NOT merge - continue to next historical pattern
            continue;
          }
        }
      }
    }

    // Step 2: Find semantic matches (for remaining patterns)
    for (let i = 0; i < current.length; i++) {
      const currentPattern = current[i];
      if (processedCurrent.has(i)) continue;

      for (let j = 0; j < historical.length; j++) {
        if (processedHistorical.has(j)) continue;

        const historicalPattern = historical[j];

        if (this.isSemanticMatch(currentPattern, historicalPattern)) {
          // Check category compatibility - ONLY merge if categories match exactly
          if (this.canMergeByCategory(currentPattern, historicalPattern)) {
            const merged = this.mergePatternData(currentPattern, historicalPattern, timestamp);
            mergedPatterns.push(merged);
            processedHistorical.add(j);
            processedCurrent.add(i);
            semanticMatches++;
            break;
          } else {
            // Category mismatch - log warning and keep patterns separate
            console.warn(
              `Category mismatch for semantic match: current="${currentPattern.category}", historical="${historicalPattern.category}". Keeping patterns separate.`
            );
            // DO NOT merge - continue to next historical pattern
            continue;
          }
        }
      }
    }

    // Step 3: Add remaining current patterns as new
    for (let i = 0; i < current.length; i++) {
      if (processedCurrent.has(i)) continue;

      const merged = this.mergePatternData(current[i], undefined, timestamp);
      mergedPatterns.push(merged);
      processedCurrent.add(i);
    }

    // Step 4: Add remaining historical patterns (no longer seen)
    for (let j = 0; j < historical.length; j++) {
      if (processedHistorical.has(j)) continue;

      const historicalPattern = historical[j];
      const merged = this.mergePatternData(
        { ...historicalPattern, count: 0 },
        historicalPattern,
        timestamp
      );
      mergedPatterns.push(merged);
      processedHistorical.add(j);
    }

    // Calculate statistics
    const statistics: MergeStatistics = {
      new_patterns: mergedPatterns.filter(p => p.is_new).length,
      recurring_patterns: mergedPatterns.filter(p => !p.is_new).length,
      increasing_trends: mergedPatterns.filter(
        p => p.frequency_change >= this.FREQUENCY_INCREASING_THRESHOLD
      ).length,
      decreasing_trends: mergedPatterns.filter(
        p => p.frequency_change <= this.FREQUENCY_DECREASING_THRESHOLD
      ).length,
      exact_matches: exactMatches,
      semantic_matches: semanticMatches,
    };

    return {
      patterns: mergedPatterns,
      statistics,
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Merge patterns with a single function call
 * Convenience function that creates matcher and processes in one step
 *
 * @param current - Current session patterns
 * @param historical - Historical patterns from state.json
 * @param currentTimestamp - Current session timestamp (optional)
 * @returns Merged patterns with statistics
 *
 * @example
 * ```typescript
 * const result = mergePatterns(currentPatterns, historicalPatterns);
 * console.log(`Found ${result.statistics.new_patterns} new patterns`);
 * ```
 */
export function mergePatterns(
  current: Pattern[],
  historical: HistoricalPattern[],
  currentTimestamp?: string
): { patterns: MergedPattern[]; statistics: MergeStatistics } {
  const matcher = new PatternMatcher();
  return matcher.mergePatterns(current, historical, currentTimestamp);
}
