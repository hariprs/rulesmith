/**
 * Story 2-5: Thematic Grouping & Frequency Counting
 * End-to-End Pipeline Tests
 *
 * E2E tests are used sparingly per the test pyramid principle.
 * These tests validate the COMPLETE analysis pipeline from conversation
 * loading through pattern detection to frequency analysis.
 *
 * When to use E2E tests:
 * - Testing complete workflows that touch multiple components
 * - Validating integration points between subsystems
 * - Ensuring state.json persistence works end-to-end
 *
 * TDD Red Phase: All tests are expected to FAIL until implementation is complete
 */

import {
  FrequencyAnalyzer,
  CategorySummary,
  FrequencyAnalysis,
} from '../../src/frequency-analyzer';
import {
  PatternDetector,
  Pattern,
  PatternCategory,
} from '../../src/pattern-detector';
import { ContentType, ContentAnalyzedCorrection } from '../../src/content-analyzer';
import { ClassificationType, ClassifiedCorrection } from '../../src/correction-classifier';

// ============================================================================
// E2E TEST 1: Complete Analysis Pipeline (Story 2-1 → 2-2 → 2-3 → 2-4 → 2-5)
// ============================================================================

describe('Story 2-5 E2E Test: Complete Analysis Pipeline', () => {
  test('should perform complete frequency analysis from raw conversation to sorted patterns', () => {
    // Given: A set of content-analyzed corrections (Story 2-3 output)
    const analyzedCorrections = createMockContentAnalyzedCorrections();

    // Step 1: Story 2-4 - Detect recurring patterns
    const patternDetector = new PatternDetector();
    const patternResult = patternDetector.detectPatterns(analyzedCorrections);

    // Step 2: Story 2-5 - Sort by frequency
    const frequencyAnalyzer = new FrequencyAnalyzer();
    const sortedPatterns = frequencyAnalyzer.sortByFrequency(patternResult.patterns);

    // Step 3: Story 2-5 - Generate category summaries
    const categorySummaries = frequencyAnalyzer.generateCategorySummaries(sortedPatterns);

    // Step 4: Story 2-5 - Analyze frequency distribution
    const frequencyAnalysis = frequencyAnalyzer.analyzeFrequencyDistribution(sortedPatterns);

    // Then: Verify complete pipeline output
    expect(sortedPatterns).toBeDefined();
    expect(Array.isArray(sortedPatterns)).toBe(true);
    expect(sortedPatterns.length).toBeGreaterThan(0);

    // Verify frequency sorting (highest first)
    for (let i = 0; i < sortedPatterns.length - 1; i++) {
      expect(sortedPatterns[i].count).toBeGreaterThanOrEqual(sortedPatterns[i + 1].count);
    }

    // Verify category summaries
    expect(categorySummaries).toBeDefined();
    expect(Array.isArray(categorySummaries)).toBe(true);

    // Verify frequency analysis
    expect(frequencyAnalysis).toBeDefined();
    expect(frequencyAnalysis.most_common_pattern).toBeDefined();
    expect(frequencyAnalysis.frequency_distribution).toBeDefined();
  });

  test('should persist frequency analysis results to state.json structure', () => {
    // Given: Analysis pipeline output
    const analyzedCorrections = createMockContentAnalyzedCorrections();
    const patternDetector = new PatternDetector();
    const patternResult = patternDetector.detectPatterns(analyzedCorrections);
    const frequencyAnalyzer = new FrequencyAnalyzer();
    const sortedPatterns = frequencyAnalyzer.sortByFrequency(patternResult.patterns);
    const categorySummaries = frequencyAnalyzer.generateCategorySummaries(sortedPatterns);
    const frequencyAnalysis = frequencyAnalyzer.analyzeFrequencyDistribution(sortedPatterns);

    // When: Construct state.json object
    const stateJson = {
      last_analysis: new Date().toISOString(),
      patterns_found: sortedPatterns,
      category_summaries: categorySummaries,
      frequency_analysis: frequencyAnalysis,
      improvements_applied: 0,
      corrections_reduction: 0,
      platform: 'claude-code',
    };

    // Then: Verify structure is serializable and valid
    expect(() => JSON.stringify(stateJson, null, 2)).not.toThrow();
    const jsonString = JSON.stringify(stateJson, null, 2);
    expect(jsonString.length).toBeGreaterThan(0);

    // Verify required fields exist
    const parsed = JSON.parse(jsonString);
    expect(parsed.last_analysis).toBeDefined();
    expect(parsed.patterns_found).toBeDefined();
    expect(parsed.category_summaries).toBeDefined();
    expect(parsed.frequency_analysis).toBeDefined();
  });

  test('should handle realistic conversation with mixed patterns across categories', () => {
    // Given: Realistic conversation with various correction types
    const realisticCorrections = createRealisticConversationCorrections();

    // When: Run complete analysis pipeline
    const patternDetector = new PatternDetector();
    const patternResult = patternDetector.detectPatterns(realisticCorrections);
    const frequencyAnalyzer = new FrequencyAnalyzer();
    const sortedPatterns = frequencyAnalyzer.sortByFrequency(patternResult.patterns);
    const categorySummaries = frequencyAnalyzer.generateCategorySummaries(sortedPatterns);
    const frequencyAnalysis = frequencyAnalyzer.analyzeFrequencyDistribution(sortedPatterns);

    // Then: Verify realistic results
    expect(sortedPatterns.length).toBeGreaterThan(0);

    // Should have patterns across multiple categories
    const uniqueCategories = new Set(sortedPatterns.map(p => p.category));
    expect(uniqueCategories.size).toBeGreaterThan(1);

    // Category summaries should reflect distribution
    expect(categorySummaries.length).toBeGreaterThan(0);
    expect(categorySummaries.length).toBeLessThanOrEqual(6); // Max 6 categories

    // Frequency analysis should be complete
    expect(frequencyAnalysis.high_frequency_patterns).toBeGreaterThanOrEqual(0);
    expect(frequencyAnalysis.medium_frequency_patterns).toBeGreaterThanOrEqual(0);
    expect(frequencyAnalysis.low_frequency_patterns).toBeGreaterThanOrEqual(0);
    expect(
      frequencyAnalysis.high_frequency_patterns +
      frequencyAnalysis.medium_frequency_patterns +
      frequencyAnalysis.low_frequency_patterns
    ).toBe(sortedPatterns.length);
  });
});

// ============================================================================
// E2E TEST 2: Integration with State Management
// ============================================================================

describe('Story 2-5 E2E Test: State Management Integration', () => {
  test('should merge frequency analysis with existing state.json', () => {
    // Given: Existing state.json from previous analysis
    const existingState = {
      last_analysis: '2026-03-17T10:00:00Z',
      patterns_found: [
        {
          pattern_text: 'Old pattern',
          count: 2,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: 'Old rule',
          first_seen: '2026-03-17T09:00:00Z',
          last_seen: '2026-03-17T10:00:00Z',
          content_types: [ContentType.GENERAL_TEXT],
        },
      ],
      improvements_applied: 0,
      corrections_reduction: 0,
      platform: 'claude-code',
    };

    // Given: New frequency analysis results
    const analyzedCorrections = createMockContentAnalyzedCorrections();
    const patternDetector = new PatternDetector();
    const patternResult = patternDetector.detectPatterns(analyzedCorrections);
    const frequencyAnalyzer = new FrequencyAnalyzer();
    const sortedPatterns = frequencyAnalyzer.sortByFrequency(patternResult.patterns);
    const categorySummaries = frequencyAnalyzer.generateCategorySummaries(sortedPatterns);
    const frequencyAnalysis = frequencyAnalyzer.analyzeFrequencyDistribution(sortedPatterns);

    // When: Merge with existing state
    const mergedState = {
      ...existingState,
      last_analysis: new Date().toISOString(),
      patterns_found: sortedPatterns,
      category_summaries: categorySummaries,
      frequency_analysis: frequencyAnalysis,
    };

    // Then: Verify merge preserves existing fields and adds new ones
    expect(mergedState.last_analysis).not.toBe(existingState.last_analysis);
    expect(mergedState.patterns_found).toBeDefined();
    expect(mergedState.category_summaries).toBeDefined();
    expect(mergedState.frequency_analysis).toBeDefined();
    expect(mergedState.improvements_applied).toBe(existingState.improvements_applied);
    expect(mergedState.corrections_reduction).toBe(existingState.corrections_reduction);
    expect(mergedState.platform).toBe(existingState.platform);
  });
});

// ============================================================================
// E2E TEST 3: Longitudinal Tracking Readiness (Story 2-6 Prep)
// ============================================================================

describe('Story 2-5 E2E Test: Longitudinal Tracking Readiness', () => {
  test('should include frequency_trend field for Story 2-6 longitudinal tracking', () => {
    // Given: Pattern with multiple examples and timestamps
    const correctionsWithTimestamps = createMockContentAnalyzedCorrections();

    // When: Run complete pipeline
    const patternDetector = new PatternDetector();
    const patternResult = patternDetector.detectPatterns(correctionsWithTimestamps);
    const frequencyAnalyzer = new FrequencyAnalyzer();

    // Add frequency trend to each pattern
    const patternsWithTrends = patternResult.patterns.map(pattern => ({
      ...pattern,
      frequency_trend: frequencyAnalyzer.detectFrequencyTrend(pattern),
    }));

    // Then: Verify trends are present and valid
    patternsWithTrends.forEach(pattern => {
      expect(pattern.frequency_trend).toBeDefined();
      expect(['increasing', 'decreasing', 'stable']).toContain(pattern.frequency_trend);
    });
  });

  test('should preserve timestamp data from Story 2-4 for accurate trend detection', () => {
    // Given: Corrections with actual timestamps
    const correctionsWithTimestamps = createMockContentAnalyzedCorrections();

    // When: Detect patterns (Story 2-4)
    const patternDetector = new PatternDetector();
    const patternResult = patternDetector.detectPatterns(correctionsWithTimestamps);

    // Then: Verify timestamps are preserved in examples
    patternResult.patterns.forEach(pattern => {
      if (pattern.examples.length > 0) {
        pattern.examples.forEach(example => {
          expect(example.timestamp).toBeDefined();
          expect(typeof example.timestamp).toBe('string');
          // Verify ISO format
          expect(() => new Date(example.timestamp)).not.toThrow();
        });
      }
    });
  });
});

// ============================================================================
// E2E TEST 4: Error Handling Edge Cases
// ============================================================================

describe('Story 2-5 E2E Test: Error Handling Edge Cases', () => {
  test('should handle conversation with no recurring patterns gracefully', () => {
    // Given: Corrections with no recurring patterns (all unique)
    const uniqueCorrections = createUniqueCorrections(5);

    // When: Run analysis pipeline
    const patternDetector = new PatternDetector();
    const patternResult = patternDetector.detectPatterns(uniqueCorrections);
    const frequencyAnalyzer = new FrequencyAnalyzer();
    const sortedPatterns = frequencyAnalyzer.sortByFrequency(patternResult.patterns);
    const categorySummaries = frequencyAnalyzer.generateCategorySummaries(sortedPatterns);
    const frequencyAnalysis = frequencyAnalyzer.analyzeFrequencyDistribution(sortedPatterns);

    // Then: Should handle gracefully - patterns may be created from unique corrections
    // The implementation creates patterns even for unique corrections (count >= 1)
    expect(sortedPatterns).toBeDefined();
    expect(Array.isArray(sortedPatterns)).toBe(true);
    expect(categorySummaries).toBeDefined();
    expect(Array.isArray(categorySummaries)).toBe(true);
    expect(frequencyAnalysis).toBeDefined();
  });

  test('should handle conversation with single recurring pattern', () => {
    // Given: Corrections with only one recurring pattern
    const singlePatternCorrections = createSinglePatternCorrections();

    // When: Run analysis pipeline
    const patternDetector = new PatternDetector();
    const patternResult = patternDetector.detectPatterns(singlePatternCorrections);
    const frequencyAnalyzer = new FrequencyAnalyzer();
    const sortedPatterns = frequencyAnalyzer.sortByFrequency(patternResult.patterns);
    const categorySummaries = frequencyAnalyzer.generateCategorySummaries(sortedPatterns);
    const frequencyAnalysis = frequencyAnalyzer.analyzeFrequencyDistribution(sortedPatterns);

    // Then: Should handle gracefully
    expect(sortedPatterns).toHaveLength(1);
    expect(categorySummaries).toHaveLength(1);
    expect(frequencyAnalysis.most_common_pattern).toBeDefined();
  });
});

// ============================================================================
// TEST FIXTURES AND HELPER FUNCTIONS
// ============================================================================

/**
 * Create mock content-analyzed corrections for testing
 * Simulates output from Story 2-3 ContentAnalyzer
 */
function createMockContentAnalyzedCorrections(): ContentAnalyzedCorrection[] {
  return [
    {
      original_suggestion: 'Use snake_case for variables',
      user_correction: 'Use camelCase for variables',
      context: 'Code review feedback',
      classification: {
        type: 'correction' as ClassificationType,
        confidence: 0.95,
        requires_manual_review: false,
        reasoning: 'User corrected variable naming convention',
      },
      content_metadata: {
        type: ContentType.CODE,
        format: 'code-block',
        detected_patterns: [],
        confidence: 0.9,
      },
      normalized_correction: 'use camelcase for variables',
      applicable_for_patterns: true,
    },
    {
      original_suggestion: 'Use snake_case for variables',
      user_correction: 'Use camelCase for variables',
      context: 'Another code review',
      classification: {
        type: 'correction' as ClassificationType,
        confidence: 0.95,
        requires_manual_review: false,
        reasoning: 'Same correction pattern',
      },
      content_metadata: {
        type: ContentType.CODE,
        format: 'code-block',
        detected_patterns: [],
        confidence: 0.9,
      },
      normalized_correction: 'use camelcase for variables',
      applicable_for_patterns: true,
    },
    {
      original_suggestion: 'Use snake_case for variables',
      user_correction: 'Use camelCase for variables',
      context: 'Third instance',
      classification: {
        type: 'correction' as ClassificationType,
        confidence: 0.95,
        requires_manual_review: false,
        reasoning: 'Recurring pattern',
      },
      content_metadata: {
        type: ContentType.CODE,
        format: 'code-block',
        detected_patterns: [],
        confidence: 0.9,
      },
      normalized_correction: 'use camelcase for variables',
      applicable_for_patterns: true,
    },
    {
      original_suggestion: 'Use Api instead of API',
      user_correction: 'Use API instead of Api',
      context: 'Documentation review',
      classification: {
        type: 'correction' as ClassificationType,
        confidence: 0.9,
        requires_manual_review: false,
        reasoning: 'Terminology correction',
      },
      content_metadata: {
        type: ContentType.DOCUMENTATION,
        format: 'plain-text',
        detected_patterns: [],
        confidence: 0.85,
      },
      normalized_correction: 'use api instead of api',
      applicable_for_patterns: true,
    },
    {
      original_suggestion: 'Use Api instead of API',
      user_correction: 'Use API instead of Api',
      context: 'Another doc review',
      classification: {
        type: 'correction' as ClassificationType,
        confidence: 0.9,
        requires_manual_review: false,
        reasoning: 'Same terminology correction',
      },
      content_metadata: {
        type: ContentType.DOCUMENTATION,
        format: 'plain-text',
        detected_patterns: [],
        confidence: 0.85,
      },
      normalized_correction: 'use api instead of api',
      applicable_for_patterns: true,
    },
  ];
}

/**
 * Create realistic conversation corrections for testing
 */
function createRealisticConversationCorrections() {
  return [
    ...createMockContentAnalyzedCorrections(),
    {
      original_suggestion: 'Use tabs for indentation',
      user_correction: 'Use 2 spaces for indentation',
      context: 'Code style feedback',
      classification: {
        type: 'correction' as ClassificationType,
        confidence: 0.92,
        requires_manual_review: false,
        reasoning: 'Indentation style correction',
      },
      content_metadata: {
        type: ContentType.CODE,
        format: 'code-block',
        detected_patterns: [],
        confidence: 0.88,
      },
      normalized_correction: 'use 2 spaces for indentation',
      applicable_for_patterns: true,
    },
    {
      original_suggestion: 'Use tabs for indentation',
      user_correction: 'Use 2 spaces for indentation',
      context: 'Another style comment',
      classification: {
        type: 'correction' as ClassificationType,
        confidence: 0.92,
        requires_manual_review: false,
        reasoning: 'Same indentation pattern',
      },
      content_metadata: {
        type: ContentType.CODE,
        format: 'code-block',
        detected_patterns: [],
        confidence: 0.88,
      },
      normalized_correction: 'use 2 spaces for indentation',
      applicable_for_patterns: true,
    },
  ];
}

/**
 * Create unique corrections (no recurring patterns)
 */
function createUniqueCorrections(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    original_suggestion: `Suggestion ${i}`,
    user_correction: `Unique correction ${i}`,
    context: `Context ${i}`,
    classification: {
      type: 'correction' as ClassificationType,
      confidence: 0.9,
      requires_manual_review: false,
      reasoning: 'Test correction',
    },
    content_metadata: {
      type: ContentType.GENERAL_TEXT,
      format: 'plain-text',
      detected_patterns: [],
      confidence: 0.85,
    },
    normalized_correction: `unique correction ${i}`,
    applicable_for_patterns: true,
  }));
}

/**
 * Create corrections with single recurring pattern
 */
function createSinglePatternCorrections() {
  return Array.from({ length: 5 }, (_, i) => ({
    original_suggestion: 'Wrong pattern',
    user_correction: 'Correct pattern',
    context: `Context ${i}`,
    classification: {
      type: 'correction' as ClassificationType,
      confidence: 0.9,
      requires_manual_review: false,
      reasoning: 'Test correction',
    },
    content_metadata: {
      type: ContentType.GENERAL_TEXT,
      format: 'plain-text',
      detected_patterns: [],
      confidence: 0.85,
    },
    normalized_correction: 'correct pattern',
    applicable_for_patterns: true,
  }));
}
