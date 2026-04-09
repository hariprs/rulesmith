import {
  Pattern,
  PatternCategory,
  PatternExample,
} from './pattern-detector';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Category summary with frequency metrics
 *
 * @interface CategorySummary
 */
export interface CategorySummary {
  /** Category identifier */
  category: PatternCategory;
  /** Total patterns in this category */
  total_patterns: number;
  /** Total frequency (sum of all pattern counts) */
  total_frequency: number;
  /** Average frequency per pattern */
  average_frequency: number;
  /** Top 3 pattern names by frequency */
  top_patterns: string[];
}

/**
 * Frequency analysis with distribution metrics
 *
 * @interface FrequencyAnalysis
 */
export interface FrequencyAnalysis {
  /** Number of high frequency patterns (count >= 5) */
  high_frequency_patterns: number;
  /** Number of medium frequency patterns (count >= 3 and < 5) */
  medium_frequency_patterns: number;
  /** Number of low frequency patterns (count == 2) */
  low_frequency_patterns: number;
  /** Pattern with highest frequency */
  most_common_pattern: Pattern;
  /** Statistical distribution metrics */
  frequency_distribution: {
    /** Mean frequency */
    mean: number;
    /** Median frequency */
    median: number;
    /** Mode frequency */
    mode: number;
    /** Range [min, max] */
    range: [number, number];
  };
}

/**
 * Extended pattern with frequency analysis fields
 *
 * @interface PatternWithFrequency
 */
export interface PatternWithFrequency extends Pattern {
  /** Frequency trend over time */
  frequency_trend?: 'increasing' | 'decreasing' | 'stable';
  /** Category confidence score (0-1) */
  category_confidence?: number;
  /** Secondary category for borderline cases */
  secondary_category?: PatternCategory;
}

/**
 * Extended pattern detection result with frequency analysis
 *
 * @interface PatternDetectionResultWithAnalysis
 */
export interface PatternDetectionResultWithAnalysis {
  /** Total corrections analyzed */
  total_corrections_analyzed: number;
  /** Number of patterns found */
  patterns_found: number;
  /** Array of detected patterns (sorted by frequency) */
  patterns: Pattern[];
  /** Detection summary */
  detection_summary: {
    exact_matches: number;
    similar_themes: number;
    categories_distribution: Record<PatternCategory, number>;
  };
  /** Category summaries (NEW for Story 2-5) */
  category_summaries: CategorySummary[];
  /** Frequency analysis (NEW for Story 2-5) */
  frequency_analysis: FrequencyAnalysis;
}

// ============================================================================
// FREQUENCY ANALYZER CLASS
// ============================================================================

/**
 * Frequency analyzer for pattern counting and trend detection
 *
 * @class FrequencyAnalyzer
 */
export class FrequencyAnalyzer {
  /**
   * Sort patterns by frequency (descending)
   *
   * @param patterns - Patterns to sort
   * @return Patterns sorted by count (highest first)
   */
  sortByFrequency(patterns: Pattern[]): Pattern[] {
    if (!patterns || patterns.length === 0) {
      return [];
    }

    // Create a copy to avoid mutating the original array
    return [...patterns].sort((a, b) => {
      // Primary sort: by frequency (descending)
      const countDiff = b.count - a.count;
      if (countDiff !== 0) {
        return countDiff;
      }

      // Secondary sort: by category (alphabetical) for tiebreaking
      return a.category.localeCompare(b.category);
    });
  }

  /**
   * Detect frequency trend based on timestamp analysis
   *
   * @param pattern - Pattern to analyze
   * @return Frequency trend (increasing, decreasing, or stable)
   */
  detectFrequencyTrend(pattern: Pattern): 'increasing' | 'decreasing' | 'stable' {
    if (!pattern || pattern.count < 3) {
      return 'stable'; // Insufficient data for trend detection
    }

    const examples = pattern.examples;
    if (!examples || examples.length < 3) {
      return 'stable';
    }

    // Sort examples by timestamp to ensure chronological order
    const sortedExamples = [...examples].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp)
    );

    // Split into first half and second half
    const midPoint = Math.floor(sortedExamples.length / 2);
    const earlyExamples = sortedExamples.slice(0, midPoint);
    const lateExamples = sortedExamples.slice(midPoint);

    // Guard: Ensure we have examples in both halves
    if (earlyExamples.length === 0 || lateExamples.length === 0) {
      return 'stable';
    }

    // Calculate time span for each half
    const earlyTimeSpan = this.calculateTimeSpan(earlyExamples);
    const lateTimeSpan = this.calculateTimeSpan(lateExamples);

    // Guard: Validate time spans are positive numbers
    if (earlyTimeSpan <= 0 || lateTimeSpan <= 0) {
      return 'stable';
    }

    // Calculate frequency (examples per time unit)
    const earlyFrequency = earlyExamples.length / earlyTimeSpan;
    const lateFrequency = lateExamples.length / lateTimeSpan;

    // Guard: Validate frequencies are positive numbers
    if (earlyFrequency <= 0 || lateFrequency <= 0 || isNaN(earlyFrequency) || isNaN(lateFrequency)) {
      return 'stable';
    }

    // Calculate ratio
    const ratio = lateFrequency / earlyFrequency;

    // Determine trend based on thresholds
    if (ratio >= 1.5) {
      return 'increasing';
    } else if (ratio <= 0.67) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  /**
   * Calculate time span for examples
   *
   * @private
   * @param examples - Examples to analyze
   * @return Time span in milliseconds
   */
  private calculateTimeSpan(examples: PatternExample[]): number {
    if (!examples || examples.length === 0) {
      return 1;
    }
    if (examples.length === 1) {
      return 1;
    }

    // Guard: Validate timestamps and convert to numbers
    const timestamps = examples
      .map(e => {
        const time = new Date(e.timestamp).getTime();
        // Guard: Check for invalid dates (NaN)
        return isNaN(time) ? Date.now() : time;
      })
      .filter(t => !isNaN(t));

    // Guard: Ensure we have valid timestamps
    if (timestamps.length < 2) {
      return 1;
    }

    const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);

    // Guard: Ensure positive time span
    return timeSpan > 0 ? timeSpan : 1;
  }

  /**
   * Generate category summaries
   *
   * @param patterns - Patterns to summarize
   * @return Array of category summaries
   */
  generateCategorySummaries(patterns: Pattern[]): CategorySummary[] {
    if (!patterns || patterns.length === 0) {
      return [];
    }

    const categories = Object.values(PatternCategory);
    const summaries: CategorySummary[] = [];

    for (const category of categories) {
      const categoryPatterns = patterns.filter(p => p.category === category);

      if (categoryPatterns.length === 0) {
        continue;
      }

      const totalFrequency = categoryPatterns.reduce((sum, p) => sum + (p.count || 0), 0);

      // Guard: Prevent division by zero (shouldn't happen due to length check, but safe to guard)
      const averageFrequency = categoryPatterns.length > 0
        ? totalFrequency / categoryPatterns.length
        : 0;

      const top_patterns = categoryPatterns
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, 3)
        .map(p => p.pattern_text || 'Unknown Pattern');

      summaries.push({
        category,
        total_patterns: categoryPatterns.length,
        total_frequency: totalFrequency,
        average_frequency: averageFrequency,
        top_patterns,
      });
    }

    // Sort summaries by total frequency (descending)
    return summaries.sort((a, b) => b.total_frequency - a.total_frequency);
  }

  /**
   * Analyze frequency distribution
   *
   * @param patterns - Patterns to analyze
   * @return Frequency analysis with distribution metrics
   */
  analyzeFrequencyDistribution(patterns: Pattern[]): FrequencyAnalysis {
    if (!patterns || patterns.length === 0) {
      return {
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
      };
    }

    const frequencies = patterns.map(p => p.count || 0);

    // Guard: Validate frequencies array is not empty
    if (frequencies.length === 0) {
      return {
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
      };
    }

    const mean = frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length;
    const median = this.calculateMedian(frequencies);
    const mode = this.calculateMode(frequencies);
    const range: [number, number] = [
      Math.min(...frequencies),
      Math.max(...frequencies),
    ];

    const high_frequency_patterns = patterns.filter(p => (p.count || 0) >= 5).length;
    const medium_frequency_patterns = patterns.filter(
      p => (p.count || 0) >= 3 && (p.count || 0) < 5
    ).length;
    const low_frequency_patterns = patterns.filter(p => (p.count || 0) === 2).length;

    // Find most common pattern (highest count, first if tie)
    const sortedPatterns = this.sortByFrequency(patterns);
    const most_common_pattern = sortedPatterns.length > 0 ? sortedPatterns[0] : null;

    return {
      high_frequency_patterns,
      medium_frequency_patterns,
      low_frequency_patterns,
      most_common_pattern: most_common_pattern as Pattern,
      frequency_distribution: {
        mean,
        median,
        mode,
        range,
      },
    };
  }

  /**
   * Calculate median of values
   *
   * @private
   * @param values - Values to analyze
   * @return Median value
   */
  private calculateMedian(values: number[]): number {
    if (!values || values.length === 0) {
      return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }

  /**
   * Calculate mode of values
   *
   * @private
   * @param values - Values to analyze
   * @return Mode value
   */
  private calculateMode(values: number[]): number {
    if (!values || values.length === 0) {
      return 0;
    }

    const frequency: Record<number, number> = {};
    let maxFreq = 0;
    let mode = values[0];

    for (const value of values) {
      frequency[value] = (frequency[value] || 0) + 1;

      if (frequency[value] > maxFreq) {
        maxFreq = frequency[value];
        mode = value;
      }
    }

    return mode;
  }

  /**
   * Get frequency level for a pattern
   *
   * @param pattern - Pattern to categorize
   * @return Frequency level (high, medium, or low)
   */
  getFrequencyLevel(pattern: Pattern): 'high' | 'medium' | 'low' {
    if (!pattern) {
      return 'low';
    }

    if (pattern.count >= 5) {
      return 'high';
    } else if (pattern.count >= 3) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}
