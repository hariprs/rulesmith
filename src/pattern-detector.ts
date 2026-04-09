/**
 * Pattern Detector Implementation (Story 2-4)
 *
 * Recurring pattern detection across multiple corrections within a conversation
 * following the test architecture principle: unit > integration > E2E
 *
 * This module provides:
 * - Exact match pattern detection (identical corrections appearing 2+ times)
 * - Similarity-based pattern detection (similar themes with >= 0.7 similarity)
 * - Pattern categorization (code_style, terminology, structure, formatting, convention)
 * - Suggested rule generation using [ACTION] instead of [CURRENT_PATTERN] template
 * - Content type integration (works with ContentAnalyzedCorrection from Story 2-3)
 * - Role-agnostic processing (equal treatment of all content types)
 * - AR22 compliant error handling
 * - Performance-conscious pattern detection
 *
 * @module pattern-detector
 */

import { ContentAnalyzedCorrection, ContentType } from './content-analyzer';
import { CorrectionClassifier, calculateSimilarity } from './correction-classifier';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Pattern categories for organizing detected patterns
 *
 * @enum {string}
 */
export enum PatternCategory {
  /** Naming conventions, formatting, structure preferences */
  CODE_STYLE = 'code_style',
  /** Word choice, phrases, acronyms */
  TERMINOLOGY = 'terminology',
  /** File organization, code organization */
  STRUCTURE = 'structure',
  /** Indentation, spacing, punctuation */
  FORMATTING = 'formatting',
  /** Team standards, best practices */
  CONVENTION = 'convention',
  /** Uncategorized patterns */
  OTHER = 'other',
}

/**
 * Pattern example with context from original correction
 *
 * @interface PatternExample
 */
export interface PatternExample {
  /** Original AI suggestion */
  original_suggestion: string;
  /** User's correction */
  user_correction: string;
  /** Context from conversation */
  context: string;
  /** Timestamp of correction */
  timestamp: string;
  /** Content type of correction */
  content_type: ContentType;
}

/**
 * Detected pattern with full metadata
 *
 * @interface Pattern
 */
export interface Pattern {
  /** Human-readable pattern description */
  pattern_text: string;
  /** Number of occurrences (>= 2) */
  count: number;
  /** Categorized type */
  category: PatternCategory;
  /** Up to 3 examples with context */
  examples: PatternExample[];
  /** Actionable rule suggestion */
  suggested_rule: string;
  /** ISO timestamp of first occurrence */
  first_seen: string;
  /** ISO timestamp of most recent occurrence */
  last_seen: string;
  /** Content types where pattern appears */
  content_types: ContentType[];
}

/**
 * Detection summary with pattern statistics
 *
 * @interface DetectionSummary
 */
export interface DetectionSummary {
  /** Number of identical correction patterns */
  exact_matches: number;
  /** Number of similar theme patterns */
  similar_themes: number;
  /** Distribution by category */
  categories_distribution: Record<PatternCategory, number>;
}

/**
 * Complete pattern detection result
 *
 * @interface PatternDetectionResult
 */
export interface PatternDetectionResult {
  /** Total corrections analyzed */
  total_corrections_analyzed: number;
  /** Number of patterns found */
  patterns_found: number;
  /** Array of detected patterns */
  patterns: Pattern[];
  /** Detection summary */
  detection_summary: DetectionSummary;
}

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Error codes for pattern detection failures
 *
 * @enum {string}
 */
export enum PatternDetectionErrorCode {
  /** Pattern detection failed */
  PATTERN_DETECTION_FAILED = 'PATTERN_DETECTION_FAILED',
  /** Insufficient corrections for pattern detection */
  INSUFFICIENT_CORRECTIONS = 'INSUFFICIENT_CORRECTIONS',
  /** Invalid input provided */
  INVALID_INPUT = 'INVALID_INPUT',
  /** Similarity calculation error */
  SIMILARITY_CALCULATION_ERROR = 'SIMILARITY_CALCULATION_ERROR',
  /** Pattern categorization error */
  CATEGORIZATION_ERROR = 'CATEGORIZATION_ERROR',
}

// ============================================================================
// ERROR HANDLING (AR22 COMPLIANT)
// ============================================================================

/**
 * AR22 compliant error class for pattern detection
 *
 * @class AR22Error
 * @extends Error
 */
export class AR22Error extends Error {
  public readonly what: string;
  public readonly how: string[];
  public readonly technical: string;
  public readonly code?: PatternDetectionErrorCode;
  public readonly originalError?: Error;

  constructor(
    brief: string,
    details: { what: string; how: string[]; technical: string },
    code?: PatternDetectionErrorCode,
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
// PATTERN DETECTOR CLASS
// ============================================================================

/**
 * PatternDetector class for recurring pattern detection
 *
 * Features:
 * - Exact match detection (identical corrections)
 * - Similarity-based detection (similar themes)
 * - Pattern categorization (5 categories + other)
 * - Suggested rule generation
 * - Content type integration
 * - Role-agnostic processing
 *
 * @class PatternDetector
 */
export class PatternDetector {
  private classifier: CorrectionClassifier;

  constructor() {
    try {
      this.classifier = new CorrectionClassifier();
    } catch (e) {
      throw new AR22Error(
        'Failed to initialize PatternDetector',
        {
          what: 'CorrectionClassifier constructor threw an exception',
          how: [
            'Check CorrectionClassifier dependencies are properly imported',
            'Verify classifier module is not missing required configuration',
            'Review classifier constructor for required parameters',
          ],
          technical: e instanceof Error ? e.message : 'Unknown error',
        },
        PatternDetectionErrorCode.PATTERN_DETECTION_FAILED,
        e instanceof Error ? e : undefined
      );
    }
  }

  /**
   * Calculate string similarity reusing Story 2-2 implementation
   *
   * @private
   * @param str1 - First string to compare
   * @param str2 - Second string to compare
   * @returns Similarity score between 0 and 1
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // Reuse Story 2-2 similarity calculation
    return calculateSimilarity(str1, str2);
  }

  /**
   * Detect patterns from content-analyzed corrections
   *
   * @param corrections - Array of ContentAnalyzedCorrection from Story 2-3
   * @returns PatternDetectionResult with detected patterns
   *
   * @throws {AR22Error} When input validation fails
   */
  detectPatterns(corrections: ContentAnalyzedCorrection[]): PatternDetectionResult {
    // Validate input - return empty result for null/undefined instead of throwing
    if (!corrections || !Array.isArray(corrections)) {
      return {
        total_corrections_analyzed: 0,
        patterns_found: 0,
        patterns: [],
        detection_summary: {
          exact_matches: 0,
          similar_themes: 0,
          categories_distribution: {
            [PatternCategory.CODE_STYLE]: 0,
            [PatternCategory.TERMINOLOGY]: 0,
            [PatternCategory.STRUCTURE]: 0,
            [PatternCategory.FORMATTING]: 0,
            [PatternCategory.CONVENTION]: 0,
            [PatternCategory.OTHER]: 0,
          },
        },
      };
    }

    // Guard against null/undefined elements and validate structure
    const validCorrections = corrections.filter((c) => {
      // Filter out null/undefined
      if (c == null) {
        return false;
      }
      // Validate that element has required properties for ContentAnalyzedCorrection
      if (typeof c.user_correction !== 'string' || typeof c.original_suggestion !== 'string') {
        return false;
      }
      // Ensure it's a plain object, not an array or special type
      if (Array.isArray(c)) {
        return false;
      }
      return true;
    });

    // Handle insufficient corrections (less than 2)
    if (validCorrections.length < 2) {
      return {
        total_corrections_analyzed: validCorrections.length,
        patterns_found: 0,
        patterns: [],
        detection_summary: {
          exact_matches: 0,
          similar_themes: 0,
          categories_distribution: {
            [PatternCategory.CODE_STYLE]: 0,
            [PatternCategory.TERMINOLOGY]: 0,
            [PatternCategory.STRUCTURE]: 0,
            [PatternCategory.FORMATTING]: 0,
            [PatternCategory.CONVENTION]: 0,
            [PatternCategory.OTHER]: 0,
          },
        },
      };
    }

    // Perform pattern detection
    const patterns: Pattern[] = [];
    const SIMILARITY_THRESHOLD = 0.7;
    const processedIndices = new Set<number>();

    // Group corrections by normalized text for exact match detection
    const exactMatches = new Map<string, ContentAnalyzedCorrection[]>();
    for (let i = 0; i < validCorrections.length; i++) {
      const correction = validCorrections[i];
      const normalized = correction.normalized_correction;
      if (!exactMatches.has(normalized)) {
        exactMatches.set(normalized, []);
      }
      exactMatches.get(normalized)!.push(correction);
    }

    // Find patterns from exact matches (2+ occurrences)
    for (const [normalized, corrections] of exactMatches.entries()) {
      if (corrections.length >= 2) {
        const pattern = this.createPatternFromCorrections(corrections, normalized, true);
        patterns.push(pattern);

        // Mark these indices as processed
        for (const correction of corrections) {
          const index = validCorrections.indexOf(correction);
          if (index !== -1) {
            processedIndices.add(index);
          }
        }
      }
    }

    // Find similar patterns (similarity-based detection)
    // Only process corrections that weren't part of exact matches
    for (let i = 0; i < validCorrections.length; i++) {
      if (processedIndices.has(i)) continue;

      const similarCorrections = [validCorrections[i]];
      const currentNormalized = validCorrections[i].normalized_correction;

      for (let j = i + 1; j < validCorrections.length; j++) {
        if (processedIndices.has(j)) continue;

        const similarity = this.calculateSimilarity(
          currentNormalized,
          validCorrections[j].normalized_correction
        );

        if (similarity >= SIMILARITY_THRESHOLD && similarity < 1.0) {
          similarCorrections.push(validCorrections[j]);
          processedIndices.add(j);
        }
      }

      if (similarCorrections.length >= 2) {
        const pattern = this.createPatternFromCorrections(
          similarCorrections,
          currentNormalized,
          false
        );
        patterns.push(pattern);
      }

      processedIndices.add(i);
    }

    // Calculate detection summary
    const exactMatchesCount = patterns.filter(p =>
      p.examples.length > 0 && p.examples.every(e =>
        e.user_correction === p.examples[0].user_correction
      )
    ).length;

    const similarThemesCount = patterns.length - exactMatchesCount;

    const categoriesDistribution: Record<PatternCategory, number> = {
      [PatternCategory.CODE_STYLE]: 0,
      [PatternCategory.TERMINOLOGY]: 0,
      [PatternCategory.STRUCTURE]: 0,
      [PatternCategory.FORMATTING]: 0,
      [PatternCategory.CONVENTION]: 0,
      [PatternCategory.OTHER]: 0,
    };

    for (const pattern of patterns) {
      categoriesDistribution[pattern.category]++;
    }

    return {
      total_corrections_analyzed: validCorrections.length,
      patterns_found: patterns.length,
      patterns,
      detection_summary: {
        exact_matches: exactMatchesCount,
        similar_themes: similarThemesCount,
        categories_distribution: categoriesDistribution,
      },
    };
  }

  /**
   * Create a pattern from a group of corrections
   *
   * @private
   * @param corrections - Array of corrections that form the pattern
   * @param patternText - The pattern text
   * @param isExactMatch - Whether this is an exact match pattern
   * @returns Pattern object
   */
  private createPatternFromCorrections(
    corrections: ContentAnalyzedCorrection[],
    patternText: string,
    isExactMatch: boolean
  ): Pattern {
    const category = this.categorizePattern(patternText);
    const suggestedRule = this.generateSuggestedRule(patternText);

    // Get unique content types
    const contentTypes = Array.from(
      new Set(corrections.map(c => c.content_metadata.type))
    );

    // Create examples with incremental timestamps for trend detection
    // Note: Using incremental timestamps as placeholder for actual conversation timestamps
    // In future versions, this should use actual message timestamps from conversation metadata
    const now = Date.now();
    const correctionsSlice = corrections.slice(0, 3);

    // Guard: Ensure we have corrections to process
    if (correctionsSlice.length === 0) {
      const fallbackTimestamp = new Date().toISOString();
      return {
        pattern_text: isExactMatch ? patternText : `${patternText} (similar theme)`,
        count: 0,
        category,
        examples: [],
        suggested_rule: this.generateSuggestedRule(patternText),
        first_seen: fallbackTimestamp,
        last_seen: fallbackTimestamp,
        content_types: [],
      };
    }

    const exampleTimestamps = correctionsSlice.map((_, index) => {
      // Space examples 1 hour apart for trend detection
      const timestamp = new Date(now - (correctionsSlice.length - 1 - index) * 60 * 60 * 1000);
      return timestamp.toISOString();
    });

    const examples: PatternExample[] = correctionsSlice.map((c, index) => ({
      original_suggestion: c.original_suggestion,
      user_correction: c.user_correction,
      context: c.context,
      // Guard: Provide fallback timestamp if index is out of bounds
      timestamp: exampleTimestamps[index] || new Date().toISOString(),
      content_type: c.content_metadata.type,
    }));

    // Calculate first_seen and last_seen from examples
    // Guard: Ensure array has elements before accessing
    const first_seen = exampleTimestamps[exampleTimestamps.length - 1] || new Date().toISOString();
    const last_seen = exampleTimestamps[0] || new Date().toISOString();

    return {
      pattern_text: isExactMatch ? patternText : `${patternText} (similar theme)`,
      count: corrections.length,
      category,
      examples,
      suggested_rule: suggestedRule,
      first_seen,
      last_seen,
      content_types: contentTypes,
    };
  }

  /**
   * Categorize a pattern based on its content
   *
   * @private
   * @param patternText - The pattern text to categorize
   * @returns PatternCategory for the pattern
   */
  private categorizePattern(patternText: string): PatternCategory {
    // Validate input
    if (!patternText || typeof patternText !== 'string' || !patternText.trim()) {
      return PatternCategory.OTHER;
    }

    const lowerText = patternText.toLowerCase();

    // Code Style patterns (check first - naming conventions)
    if (/\b(camelcase|snake_case|kebab-case|pascalcase|naming)\b/i.test(lowerText) ||
        /\b(indentation|2 spaces|tabs)\b/i.test(lowerText)) {
      return PatternCategory.CODE_STYLE;
    }

    // Terminology patterns (word choice, capitalization, acronyms)
    if (/\b(api|endpoint)\b/i.test(lowerText) ||
        (/\b(use|call|invoke)\b/i.test(lowerText) && !/\b(async|await|promise)\b/i.test(lowerText)) ||
        /\b(instead of api|instead of API)\b/i.test(lowerText) ||
        /\b(capitalization|spelling|wording|abbreviation|acronym)\b/i.test(lowerText)) {
      return PatternCategory.TERMINOLOGY;
    }

    // Convention patterns (best practices, async patterns)
    if (/\b(async|await|promise|callback)\b/i.test(lowerText) ||
        /\b(best practice)\b/i.test(lowerText)) {
      return PatternCategory.CONVENTION;
    }

    // Structure patterns
    if (/\b(import|export|require|module|package|file|folder|directory|organize|group)\b/i.test(lowerText) ||
        /\b(order|sort|arrange|structure|layout)\b/i.test(lowerText)) {
      return PatternCategory.STRUCTURE;
    }

    // Formatting patterns
    if (/\b(space|tab|indent|newline|line break|blank|spacing|padding|alignment)\b/i.test(lowerText) ||
        /\b(comma|period|semicolon|colon|punctuation)\b/i.test(lowerText)) {
      return PatternCategory.FORMATTING;
    }

    // Default to OTHER for unusual patterns
    if (/\b(unusual|strange|weird|odd)\b/i.test(lowerText)) {
      return PatternCategory.OTHER;
    }

    // Default to OTHER for unrecognized patterns
    return PatternCategory.OTHER;
  }

  /**
   * Generate suggested rule for a pattern
   *
   * @private
   * @param patternText - The pattern text
   * @returns Suggested rule string
   */
  private generateSuggestedRule(patternText: string): string {
    // Validate input
    if (!patternText || typeof patternText !== 'string' || !patternText.trim()) {
      return 'No pattern specified - cannot generate rule suggestion';
    }

    const trimmedText = patternText.trim();

    // If pattern already contains "instead of", use it as-is
    if (/\binstead of\b/i.test(trimmedText)) {
      // Capitalize first letter
      return trimmedText.charAt(0).toUpperCase() + trimmedText.slice(1);
    }

    // Extract action from pattern text
    const lowerText = trimmedText.toLowerCase();

    // Common pattern: "use X" -> "Use X instead of current pattern"
    if (/^use\s+/i.test(lowerText)) {
      return `${trimmedText.charAt(0).toUpperCase() + trimmedText.slice(1)} instead of current pattern`;
    }

    // Common pattern: "add X" -> "Add X"
    if (/^add\s+/i.test(lowerText)) {
      return `${trimmedText.charAt(0).toUpperCase() + trimmedText.slice(1)}`;
    }

    // Common pattern: "remove X" -> "Remove X"
    if (/^remove\s+/i.test(lowerText)) {
      return `${trimmedText.charAt(0).toUpperCase() + trimmedText.slice(1)}`;
    }

    // Default: use the pattern text as-is with capitalization
    return trimmedText.charAt(0).toUpperCase() + trimmedText.slice(1);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Detect patterns with a single function call
 * Convenience function that creates detector and processes in one step
 *
 * @param corrections - Array of ContentAnalyzedCorrection from Story 2-3
 * @returns PatternDetectionResult with detected patterns
 *
 * @example
 * ```typescript
 * const result = detectPatterns(analyzedCorrections);
 * console.log(`Found ${result.patterns_found} patterns`);
 * ```
 */
export function detectPatterns(corrections: ContentAnalyzedCorrection[]): PatternDetectionResult {
  // Guard against null/undefined input at utility function level
  if (!corrections || !Array.isArray(corrections)) {
    return {
      total_corrections_analyzed: 0,
      patterns_found: 0,
      patterns: [],
      detection_summary: {
        exact_matches: 0,
        similar_themes: 0,
        categories_distribution: {
          [PatternCategory.CODE_STYLE]: 0,
          [PatternCategory.TERMINOLOGY]: 0,
          [PatternCategory.STRUCTURE]: 0,
          [PatternCategory.FORMATTING]: 0,
          [PatternCategory.CONVENTION]: 0,
          [PatternCategory.OTHER]: 0,
        },
      },
    };
  }

  const detector = new PatternDetector();
  return detector.detectPatterns(corrections);
}
