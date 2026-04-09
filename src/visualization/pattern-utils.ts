/**
 * Pattern Utility Functions (Story 3-5)
 *
 * Shared utility functions for working with Pattern and MergedPattern objects.
 * These functions are used across multiple modules to avoid code duplication.
 *
 * @module visualization/pattern-utils
 */

import { Pattern } from '../pattern-detector';
import { MergedPattern } from '../pattern-matcher';

// ============================================================================
// PATTERN ACCESSOR FUNCTIONS
// ============================================================================

/**
 * Get frequency from pattern (handles both Pattern and MergedPattern)
 *
 * @param pattern - Pattern or MergedPattern object
 * @returns Frequency count
 *
 * @example
 * ```ts
 * const freq = getPatternFrequency(pattern);
 * console.log(`Pattern occurs ${freq} times`);
 * ```
 */
export function getPatternFrequency(pattern: Pattern | MergedPattern): number {
  // MergedPattern has total_frequency, Pattern has count
  return 'total_frequency' in pattern ? pattern.total_frequency : pattern.count;
}

/**
 * Get category from pattern
 *
 * @param pattern - Pattern or MergedPattern object
 * @returns Category string or 'Uncategorized' if not set
 *
 * @example
 * ```ts
 * const category = getPatternCategory(pattern);
 * console.log(`Pattern belongs to: ${category}`);
 * ```
 */
export function getPatternCategory(pattern: Pattern | MergedPattern): string {
  return pattern.category?.toString() || 'Uncategorized';
}

/**
 * Get confidence from pattern
 *
 * @param pattern - Pattern or MergedPattern object
 * @returns Confidence value (0-1) or 0 if not available
 *
 * @remarks
 * Note: Pattern and MergedPattern types don't currently have a confidence field.
 * This function returns 0 as a default. If confidence is added to the schema,
 * update this function accordingly.
 *
 * @example
 * ```ts
 * const confidence = getPatternConfidence(pattern);
 * console.log(`Pattern confidence: ${(confidence * 100).toFixed(0)}%`);
 * ```
 */
export function getPatternConfidence(pattern: Pattern | MergedPattern): number {
  // Pattern doesn't have confidence field
  // Return 0 as default value
  // TODO: Update if confidence is added to pattern schema
  return 0;
}

/**
 * Check if pattern is a MergedPattern
 *
 * @param pattern - Pattern or MergedPattern object
 * @returns True if pattern is a MergedPattern
 *
 * @example
 * ```ts
 * if (isMergedPattern(pattern)) {
 *   console.log('Has examples:', pattern.examples?.length);
 * }
 * ```
 */
export function isMergedPattern(pattern: Pattern | MergedPattern): pattern is MergedPattern {
  return 'total_frequency' in pattern;
}

/**
 * Get pattern examples safely
 *
 * @param pattern - Pattern or MergedPattern object
 * @returns Array of pattern examples or empty array
 *
 * @example
 * ```ts
 * const examples = getPatternExamples(pattern);
 * console.log(`Found ${examples.length} examples`);
 * ```
 */
export function getPatternExamples(pattern: Pattern | MergedPattern): import('../pattern-detector').PatternExample[] {
  return pattern.examples || [];
}

/**
 * Format date from pattern timestamp
 *
 * @param dateString - ISO date string
 * @returns Formatted date string
 *
 * @example
 * ```ts
 * const formatted = formatDate(pattern.first_seen);
 * console.log(`First seen: ${formatted}`);
 * ```
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Truncate text to max length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 *
 * @example
 * ```ts
 * const truncated = truncateText(pattern.pattern_text, 50);
 * console.log(truncated); // "This is a very long pat..."
 * ```
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Calculate percentage with division by zero guard
 *
 * @param value - Numerator value
 * @param total - Denominator value (total)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 *
 * @example
 * ```ts
 * const percentage = calculatePercentage(25, 100, 1);
 * console.log(percentage); // "25.0%"
 * ```
 */
export function calculatePercentage(value: number, total: number, decimals: number = 1): string {
  if (total === 0) {
    return '0.0';
  }
  return ((value / total) * 100).toFixed(decimals);
}
