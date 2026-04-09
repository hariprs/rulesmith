import {
  Pattern,
  PatternCategory,
  PatternExample,
} from './pattern-detector';
import { calculateSimilarity } from './correction-classifier';

/**
 * Pattern with category confidence scoring
 *
 * @interface PatternWithCategoryConfidence
 */
export interface PatternWithCategoryConfidence extends Pattern {
  /** Category confidence score (0-1) */
  category_confidence?: number;
  /** Secondary category for borderline cases */
  secondary_category?: PatternCategory;
}

/**
 * Category grouper for enhanced thematic grouping
 *
 * @class CategoryGrouper
 */
export class CategoryGrouper {
  /**
   * Calculate category confidence for a pattern
   *
   * @param pattern - Pattern to analyze
   * @return Confidence score (0-1)
   */
  calculateCategoryConfidence(pattern: Pattern): number {
    if (!pattern || !pattern.examples || pattern.examples.length === 0) {
      return 0;
    }

    // Calculate confidence based on average similarity of examples
    const similarities: number[] = [];

    for (let i = 0; i < pattern.examples.length; i++) {
      for (let j = i + 1; j < pattern.examples.length; j++) {
        // Guard: Ensure examples exist and have user_correction
        const example1 = pattern.examples[i];
        const example2 = pattern.examples[j];
        if (!example1?.user_correction || !example2?.user_correction) {
          continue;
        }

        const sim = calculateSimilarity(
          example1.user_correction,
          example2.user_correction
        );
        // Guard: Ensure similarity is a valid number
        if (typeof sim === 'number' && !isNaN(sim)) {
          similarities.push(sim);
        }
      }
    }

    if (similarities.length === 0) {
      return 0.5; // Default confidence for single example
    }

    // Average similarity as confidence proxy
    const avgSimilarity =
      similarities.reduce((sum, s) => sum + s, 0) / similarities.length;

    return Math.min(1, Math.max(0, avgSimilarity));
  }

  /**
   * Determine secondary category for borderline cases
   *
   * @param pattern - Pattern to analyze
   * @return Secondary category or undefined
   */
  determineSecondaryCategory(
    pattern: Pattern
  ): PatternCategory | undefined {
    const confidence = this.calculateCategoryConfidence(pattern);

    // Only assign secondary category for borderline cases
    if (confidence >= 0.7) {
      return undefined; // High confidence, no secondary category needed
    }

    // Determine secondary category based on pattern text
    const primaryCategory = pattern.category;

    // Guard: Ensure pattern_text exists and is a string
    if (!pattern.pattern_text || typeof pattern.pattern_text !== 'string') {
      return PatternCategory.OTHER;
    }

    const patternText = pattern.pattern_text.toLowerCase();

    // Find potential secondary categories
    const secondaryCandidates: PatternCategory[] = [];

    // Check for code_style indicators
    if (
      primaryCategory !== PatternCategory.CODE_STYLE &&
      (patternText.includes('variable') ||
        patternText.includes('function') ||
        patternText.includes('class') ||
        patternText.includes('naming') ||
        patternText.includes('camelcase') ||
        patternText.includes('snake_case'))
    ) {
      secondaryCandidates.push(PatternCategory.CODE_STYLE);
    }

    // Check for terminology indicators
    if (
      primaryCategory !== PatternCategory.TERMINOLOGY &&
      (patternText.includes('term') ||
        patternText.includes('word') ||
        patternText.includes('phrase') ||
        patternText.includes('acronym'))
    ) {
      secondaryCandidates.push(PatternCategory.TERMINOLOGY);
    }

    // Check for structure indicators
    if (
      primaryCategory !== PatternCategory.STRUCTURE &&
      (patternText.includes('file') ||
        patternText.includes('folder') ||
        patternText.includes('organization') ||
        patternText.includes('structure') ||
        patternText.includes('architecture'))
    ) {
      secondaryCandidates.push(PatternCategory.STRUCTURE);
    }

    // Check for formatting indicators
    if (
      primaryCategory !== PatternCategory.FORMATTING &&
      (patternText.includes('indent') ||
        patternText.includes('space') ||
        patternText.includes('tab') ||
        patternText.includes('line') ||
        patternText.includes('spacing'))
    ) {
      secondaryCandidates.push(PatternCategory.FORMATTING);
    }

    // Check for convention indicators
    if (
      primaryCategory !== PatternCategory.CONVENTION &&
      (patternText.includes('standard') ||
        patternText.includes('best practice') ||
        patternText.includes('convention') ||
        patternText.includes('guideline'))
    ) {
      secondaryCandidates.push(PatternCategory.CONVENTION);
    }

    // Return first secondary candidate if any
    return secondaryCandidates.length > 0
      ? secondaryCandidates[0]
      : PatternCategory.OTHER;
  }

  /**
   * Add category confidence and secondary category to patterns
   *
   * @param patterns - Patterns to enhance
   * @return Patterns with category confidence and secondary category
   */
  enhancePatternCategories(
    patterns: Pattern[]
  ): PatternWithCategoryConfidence[] {
    if (!patterns || patterns.length === 0) {
      return [];
    }

    return patterns.map(pattern => {
      const confidence = this.calculateCategoryConfidence(pattern);
      const secondaryCategory = this.determineSecondaryCategory(pattern);

      return {
        ...pattern,
        category_confidence: confidence,
        secondary_category: secondaryCategory,
      };
    });
  }

  /**
   * Group patterns by category with confidence filtering
   *
   * @param patterns - Patterns to group
   * @param minConfidence - Minimum confidence threshold (default: 0)
   * @return Patterns grouped by category
   */
  groupPatternsByCategory(
    patterns: Pattern[],
    minConfidence: number = 0
  ): Record<PatternCategory, Pattern[]> {
    const result: Record<string, Pattern[]> = {
      [PatternCategory.CODE_STYLE]: [],
      [PatternCategory.TERMINOLOGY]: [],
      [PatternCategory.STRUCTURE]: [],
      [PatternCategory.FORMATTING]: [],
      [PatternCategory.CONVENTION]: [],
      [PatternCategory.OTHER]: [],
    };

    if (!patterns || patterns.length === 0) {
      return result as Record<PatternCategory, Pattern[]>;
    }

    for (const pattern of patterns) {
      // Guard: Validate pattern before processing
      if (!pattern || !pattern.category) {
        continue;
      }

      const confidence = this.calculateCategoryConfidence(pattern);

      // Filter by minimum confidence
      if (confidence >= minConfidence) {
        // Guard: Ensure category key exists in result
        if (result[pattern.category]) {
          result[pattern.category].push(pattern);
        }
      }
    }

    return result as Record<PatternCategory, Pattern[]>;
  }

  /**
   * Validate category assignment
   *
   * @param pattern - Pattern to validate
   * @return True if category assignment is valid
   */
  validateCategoryAssignment(pattern: Pattern): boolean {
    if (!pattern || !pattern.category) {
      return false;
    }

    // Check if category is valid
    const validCategories = Object.values(PatternCategory);
    if (!validCategories.includes(pattern.category)) {
      return false;
    }

    // Check if pattern has examples
    if (!pattern.examples || pattern.examples.length === 0) {
      return false;
    }

    // Check if pattern text is not empty
    if (!pattern.pattern_text || pattern.pattern_text.trim().length === 0) {
      return false;
    }

    return true;
  }
}
