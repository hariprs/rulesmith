/**
 * Analysis Pipeline Integration (Story 2-5 + Story 2-6)
 *
 * Integrates Story 2-4 (PatternDetector), Story 2-5 (FrequencyAnalyzer, CategoryGrouper),
 * and Story 2-6 (PatternTracker for longitudinal pattern tracking)
 * for comprehensive pattern analysis with frequency counting, thematic grouping,
 * and longitudinal tracking across multiple sessions.
 */

import {
  PatternDetector,
  Pattern,
  PatternCategory,
  PatternDetectionResult,
} from './pattern-detector';

// Re-export PatternDetectionResult for use in tests
export type { PatternDetectionResult };
import { ContentAnalyzedCorrection } from './content-analyzer';
import {
  FrequencyAnalyzer,
  CategorySummary,
  FrequencyAnalysis,
  PatternDetectionResultWithAnalysis,
  PatternWithFrequency,
} from './frequency-analyzer';
import { CategoryGrouper } from './category-grouping';
import {
  PatternTracker,
  MergedPattern,
  LongitudinalReport,
} from './pattern-tracker';

// ============================================================================
// STORY 2-7: ZERO CORRECTION RESULT TYPE
// ============================================================================

/**
 * Result type for zero-correction scenarios (Story 2-7)
 * Returned when no corrections are found in the conversation
 */
export interface ZeroCorrectionResult {
  /** Result type identifier */
  type: 'zero_corrections';
  /** Number of corrections analyzed (always 0) */
  total_corrections_analyzed: 0;
  /** Message explaining why no patterns were found */
  message: string;
  /** Whether state should be updated (always false for zero corrections) */
  should_update_state: false;
}

/**
 * Union type for all possible analysis results
 */
export type AnalysisResult =
  | (PatternDetectionResultWithAnalysis & { longitudinal_report?: LongitudinalReport })
  | ZeroCorrectionResult;

// ============================================================================
// ANALYSIS PIPELINE
// ============================================================================

/**
 * Analyze corrections with frequency counting, thematic grouping, and longitudinal tracking
 *
 * @param corrections - Content analyzed corrections from Story 2-3
 * @param statePath - Path to state.json file for longitudinal tracking
 * @return Pattern detection result with frequency analysis and longitudinal tracking
 *
 * @example
 * ```typescript
 * const result = await analyzeWithFrequency(analyzedCorrections, statePath);
 * console.log(`Found ${result.patterns_found} patterns`);
 * console.log(`High frequency: ${result.frequency_analysis.high_frequency_patterns}`);
 * console.log(`New patterns: ${result.longitudinal_report?.session_summary.new_pattern_count}`);
 * ```
 */
export async function analyzeWithFrequency(
  corrections: ContentAnalyzedCorrection[],
  statePath?: string
): Promise<AnalysisResult> {
  // Story 2-7: Zero-correction detection (early exit)
  // If no corrections found, return zero-correction result immediately
  if (corrections.length === 0) {
    return {
      type: 'zero_corrections',
      total_corrections_analyzed: 0,
      message: 'No correction patterns were found in this conversation.',
      should_update_state: false,
    };
  }

  // Guard: Validate input array size
  const MAX_CORRECTIONS = 100000;
  if (!Array.isArray(corrections)) {
    throw new Error('Corrections must be an array');
  }
  if (corrections.length > MAX_CORRECTIONS) {
    throw new Error(
      `Corrections array size (${corrections.length}) exceeds maximum allowed (${MAX_CORRECTIONS}). ` +
      `Please process data in smaller batches.`
    );
  }

  // Step 1: Story 2-4 - Detect patterns (already calculates count)
  const detector = new PatternDetector();
  const result = detector.detectPatterns(corrections);

  // Handle empty results gracefully (no patterns found)
  // Note: This is different from zero corrections - corrections existed but no patterns detected
  if (!result.patterns || result.patterns.length === 0) {
    return {
      ...result,
      patterns: [],
      category_summaries: [],
      frequency_analysis: {
        high_frequency_patterns: 0,
        medium_frequency_patterns: 0,
        low_frequency_patterns: 0,
        most_common_pattern: null as any,
        frequency_distribution: {
          mean: 0,
          median: 0,
          mode: 0,
          range: [0, 0],
        },
      },
      // Don't include longitudinal_report for empty patterns
    };
  }

  // Step 2: Story 2-5 - Sort by frequency
  const freqAnalyzer = new FrequencyAnalyzer();
  const sortedPatterns = freqAnalyzer.sortByFrequency(result.patterns);

  // Step 3: Story 2-5 - Generate category summaries
  const summaries = freqAnalyzer.generateCategorySummaries(sortedPatterns);

  // Step 4: Story 2-5 - Analyze frequency distribution
  const analysis = freqAnalyzer.analyzeFrequencyDistribution(sortedPatterns);

  // Step 5: Story 2-5 - Add frequency trend to patterns
  // Guard: Ensure sortedPatterns is valid before mapping
  const patternsWithTrend: PatternWithFrequency[] = (sortedPatterns || [])
    .map((pattern): PatternWithFrequency | null => {
      if (!pattern) {
        return null;
      }
      const trend = freqAnalyzer.detectFrequencyTrend(pattern);
      return {
        ...pattern,
        frequency_trend: trend,
      };
    })
    .filter((p): p is PatternWithFrequency => p !== null);

  // Step 6: Story 2-5 - Add category confidence
  const categoryGrouper = new CategoryGrouper();
  const enhancedPatterns = categoryGrouper.enhancePatternCategories(patternsWithTrend as Pattern[]);

  // Step 7: Story 2-6 - Longitudinal pattern tracking (if statePath provided)
  let longitudinalReport: LongitudinalReport | undefined;
  let finalPatterns = enhancedPatterns;

  if (statePath) {
    try {
      const tracker = new PatternTracker(statePath);
      const mergeResult = tracker.mergeWithHistorical(enhancedPatterns);
      longitudinalReport = tracker.generateLongitudinalReport(mergeResult.patterns);
      finalPatterns = mergeResult.patterns;
    } catch (error) {
      // Log detailed warning but continue with current session patterns
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorName = error instanceof Error ? error.constructor.name : 'Error';
      console.warn(
        `Longitudinal tracking failed, using current session patterns only:\n` +
        `  Error Type: ${errorName}\n` +
        `  Message: ${errorMessage}\n` +
        `  State Path: ${statePath}`
      );
    }
  }

  return {
    ...result,
    patterns: finalPatterns,
    category_summaries: summaries,
    frequency_analysis: analysis,
    longitudinal_report: longitudinalReport,
  };
}

/**
 * Write frequency analysis results with longitudinal tracking to state.json
 *
 * Story 2-7: Does NOT update state for zero-correction results
 *
 * @param result - Pattern detection result with frequency analysis and longitudinal report
 * @param statePath - Path to state.json file
 */
export async function writeFrequencyAnalysis(
  result: AnalysisResult,
  statePath: string
): Promise<void> {
  const fs = require('fs');
  const path = require('path');

  // Story 2-7: Check for zero-correction result - do NOT update state
  if ('type' in result && result.type === 'zero_corrections') {
    // Silently skip state update for zero corrections
    // This is expected behavior, not an error
    return;
  }

  // Guard: Validate result structure
  if (!result || typeof result !== 'object') {
    throw new Error('Invalid result object provided');
  }
  if (!('patterns' in result) || !Array.isArray(result.patterns)) {
    throw new Error('Result.patterns must be an array');
  }

  try {
    // Use PatternTracker for longitudinal tracking and state management
    const tracker = new PatternTracker(statePath);

    // Extract MergedPattern[] from result.patterns
    const mergedPatterns = result.patterns as MergedPattern[];

    // Guard: Validate frequency_analysis exists before accessing properties
    if (!result.frequency_analysis || typeof result.frequency_analysis !== 'object') {
      throw new Error('Result.frequency_analysis is missing or invalid');
    }

    // Update state file with merged patterns and additional data
    await tracker.updateStateFile(mergedPatterns, {
      category_summaries: result.category_summaries,
      frequency_analysis: {
        high_frequency_patterns: result.frequency_analysis.high_frequency_patterns ?? 0,
        medium_frequency_patterns: result.frequency_analysis.medium_frequency_patterns ?? 0,
        low_frequency_patterns: result.frequency_analysis.low_frequency_patterns ?? 0,
        most_common_pattern: result.frequency_analysis?.most_common_pattern
          ? {
              pattern_text: result.frequency_analysis.most_common_pattern.pattern_text || 'Unknown',
              count: result.frequency_analysis.most_common_pattern.count || 0,
              category: result.frequency_analysis.most_common_pattern.category || PatternCategory.OTHER,
            }
          : null,
        frequency_distribution: result.frequency_analysis.frequency_distribution || {
          mean: 0,
          median: 0,
          mode: 0,
          range: [0, 0],
        },
      },
      total_corrections_analyzed: result.total_corrections_analyzed ?? 0,
    });
  } catch (error) {
    throw new Error(
      `Failed to write frequency analysis to state.json: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Load frequency analysis with longitudinal tracking from state.json
 *
 * @param statePath - Path to state.json file
 * @return Pattern detection result with frequency analysis and longitudinal report, or null if not found
 */
export function loadFrequencyAnalysis(
  statePath: string
): (PatternDetectionResultWithAnalysis & { longitudinal_report?: LongitudinalReport }) | null {
  const fs = require('fs');

  try {
    if (!fs.existsSync(statePath)) {
      return null;
    }

    const content = fs.readFileSync(statePath, 'utf-8');
    const state = JSON.parse(content);

    // Guard: Validate state structure
    if (!state || !state.patterns_found || !Array.isArray(state.patterns_found)) {
      return null;
    }

    // Guard: Validate patterns array is not empty
    if (state.patterns_found.length === 0) {
      return null;
    }

    // Extract patterns (support both legacy string[] and new MergedPattern[])
    const patterns: Pattern[] = state.patterns_found.map((p: any) => {
      if (typeof p === 'string') {
        // Legacy format - convert to Pattern object
        return {
          pattern_text: p,
          count: 1,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: p,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [],
        };
      }
      return p;
    });

    // Generate longitudinal report if we have MergedPattern data
    let longitudinalReport: LongitudinalReport | undefined;
    if (patterns.length > 0 && 'is_new' in patterns[0]) {
      const mergedPatterns = patterns as MergedPattern[];
      longitudinalReport = {
        new_patterns: mergedPatterns.filter(p => p.is_new),
        recurring_patterns: mergedPatterns.filter(p => !p.is_new),
        trends_increasing: mergedPatterns.filter(p => p.frequency_change >= 0.5),
        trends_decreasing: mergedPatterns.filter(p => p.frequency_change <= -0.5),
        session_summary: {
          total_patterns: mergedPatterns.length,
          new_pattern_count: mergedPatterns.filter(p => p.is_new).length,
          recurring_pattern_count: mergedPatterns.filter(p => !p.is_new).length,
          analysis_timestamp: state.last_analysis || new Date().toISOString(),
        },
      };
    }

    return {
      total_corrections_analyzed: state.total_corrections_analyzed || 0,
      patterns_found: state.total_patterns_found || state.patterns_found.length,
      patterns,
      detection_summary: state.detection_summary || {
        exact_matches: 0,
        similar_themes: 0,
        categories_distribution: {} as Record<PatternCategory, number>,
      },
      category_summaries: state.category_summaries || [],
      frequency_analysis: state.frequency_analysis || {
        high_frequency_patterns: 0,
        medium_frequency_patterns: 0,
        low_frequency_patterns: 0,
        most_common_pattern: null as any,
        frequency_distribution: {
          mean: 0,
          median: 0,
          mode: 0,
          range: [0, 0],
        },
      },
      longitudinal_report: longitudinalReport,
    };
  } catch (error) {
    return null;
  }
}
