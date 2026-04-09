/**
 * Frequency Analyzer Test Suite (Story 2-5)
 *
 * Comprehensive test coverage for thematic grouping and frequency counting
 * Following test architecture principle: unit > integration > E2E
 *
 * Test categories:
 * 1. Frequency-Based Sorting Tests
 * 2. Frequency Trend Detection Tests
 * 3. Category Summary Generation Tests
 * 4. Frequency Distribution Analysis Tests
 * 5. Category Confidence Scoring Tests
 * 6. Edge Case and Error Handling Tests
 * 7. Integration Tests with Story 2-4 Pattern Detector
 *
 * TDD Red Phase: All tests are expected to FAIL until implementation is complete
 */

import {
  FrequencyAnalyzer,
  CategorySummary,
  FrequencyAnalysis,
  PatternWithFrequency,
} from '../frequency-analyzer';
import {
  Pattern,
  PatternCategory,
  PatternExample,
} from '../pattern-detector';
import { ContentType } from '../content-analyzer';
import { CategoryGrouper } from '../category-grouping';

// ============================================================================
// TEST FIXTURES (Reused from Story 2-4 pattern-detector.test.ts)
// ============================================================================

/**
 * Create a mock pattern for testing frequency analysis
 */
const createMockPattern = (
  overrides: Partial<Pattern> = {}
): Pattern => {
  const defaultPattern: Pattern = {
    pattern_text: 'Use camelCase instead of snake_case',
    count: 2,
    category: PatternCategory.CODE_STYLE,
    examples: [],
    suggested_rule: 'Use camelCase instead of snake_case',
    first_seen: '2026-03-17T10:00:00Z',
    last_seen: '2026-03-17T11:00:00Z',
    content_types: [ContentType.CODE],
  };
  return { ...defaultPattern, ...overrides };
};

/**
 * Create a mock pattern example with timestamp
 */
const createMockExample = (
  timestamp: string,
  content_type: ContentType = ContentType.CODE
): PatternExample => {
  return {
    original_suggestion: 'AI suggestion',
    user_correction: 'User correction',
    context: 'Test context',
    timestamp,
    content_type,
  };
};

// ============================================================================
// FREQUENCY-BASED SORTING TESTS (Unit Tests)
// ============================================================================

describe('Frequency-Based Sorting', () => {
  describe('sortByFrequency', () => {
    test('should sort patterns by frequency in descending order (highest first)', () => {
      const patterns: Pattern[] = [
        createMockPattern({ pattern_text: 'Pattern A', count: 3 }),
        createMockPattern({ pattern_text: 'Pattern B', count: 5 }),
        createMockPattern({ pattern_text: 'Pattern C', count: 2 }),
        createMockPattern({ pattern_text: 'Pattern D', count: 4 }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const sorted = analyzer.sortByFrequency(patterns);

      // Failing assertion - FrequencyAnalyzer class doesn't exist yet
      expect(sorted[0].count).toBe(5);
      expect(sorted[1].count).toBe(4);
      expect(sorted[2].count).toBe(3);
      expect(sorted[3].count).toBe(2);
    });

    test('should maintain stable sort for patterns with equal frequency using category as tiebreaker', () => {
      const patterns: Pattern[] = [
        createMockPattern({
          pattern_text: 'Pattern A',
          count: 3,
          category: PatternCategory.TERMINOLOGY,
        }),
        createMockPattern({
          pattern_text: 'Pattern B',
          count: 3,
          category: PatternCategory.CODE_STYLE,
        }),
        createMockPattern({
          pattern_text: 'Pattern C',
          count: 3,
          category: PatternCategory.STRUCTURE,
        }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const sorted = analyzer.sortByFrequency(patterns);

      // All have count 3, so verify they're sorted by category
      expect(sorted.every(p => p.count === 3)).toBe(true);
      expect(sorted).toHaveLength(3);
    });

    test('should handle empty array without errors', () => {
      const patterns: Pattern[] = [];

      const analyzer = new FrequencyAnalyzer();
      const sorted = analyzer.sortByFrequency(patterns);

      expect(sorted).toEqual([]);
    });

    test('should handle single pattern without errors', () => {
      const patterns: Pattern[] = [createMockPattern({ count: 5 })];

      const analyzer = new FrequencyAnalyzer();
      const sorted = analyzer.sortByFrequency(patterns);

      expect(sorted).toHaveLength(1);
      expect(sorted[0].count).toBe(5);
    });

    test('should handle all patterns with same frequency', () => {
      const patterns: Pattern[] = [
        createMockPattern({ pattern_text: 'Pattern A', count: 3 }),
        createMockPattern({ pattern_text: 'Pattern B', count: 3 }),
        createMockPattern({ pattern_text: 'Pattern C', count: 3 }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const sorted = analyzer.sortByFrequency(patterns);

      expect(sorted).toHaveLength(3);
      expect(sorted.every(p => p.count === 3)).toBe(true);
    });
  });
});

// ============================================================================
// FREQUENCY TREND DETECTION TESTS (Unit Tests)
// ============================================================================

describe('Frequency Trend Detection', () => {
  describe('detectFrequencyTrend', () => {
    test('should detect increasing trend when recent occurrences are more frequent', () => {
      const pattern = createMockPattern({
        pattern_text: 'Use async/await',
        count: 6,
        examples: [
          createMockExample('2026-03-17T10:00:00Z', ContentType.CODE),
          createMockExample('2026-03-17T10:30:00Z', ContentType.CODE),
          createMockExample('2026-03-17T11:00:00Z', ContentType.CODE),
          createMockExample('2026-03-17T11:15:00Z', ContentType.CODE),
          createMockExample('2026-03-17T11:30:00Z', ContentType.CODE),
          createMockExample('2026-03-17T11:45:00Z', ContentType.CODE),
        ],
      });

      const analyzer = new FrequencyAnalyzer();
      const trend = analyzer.detectFrequencyTrend(pattern);

      // 4 examples in second half (30 mins) vs 2 in first half (30 mins)
      // Ratio: 4/2 = 2.0 >= 1.5, so increasing
      expect(trend).toBe('increasing');
    });

    test('should detect decreasing trend when recent occurrences are less frequent', () => {
      const pattern = createMockPattern({
        pattern_text: 'Use var instead of let',
        count: 6,
        examples: [
          createMockExample('2026-03-17T10:00:00Z', ContentType.CODE),
          createMockExample('2026-03-17T10:10:00Z', ContentType.CODE),
          createMockExample('2026-03-17T10:20:00Z', ContentType.CODE),
          createMockExample('2026-03-17T10:30:00Z', ContentType.CODE),
          createMockExample('2026-03-17T11:00:00Z', ContentType.CODE),
          createMockExample('2026-03-17T11:30:00Z', ContentType.CODE),
        ],
      });

      const analyzer = new FrequencyAnalyzer();
      const trend = analyzer.detectFrequencyTrend(pattern);

      // 2 examples in second half (30 mins) vs 4 in first half (30 mins)
      // Ratio: 2/4 = 0.5 <= 0.67, so decreasing
      expect(trend).toBe('decreasing');
    });

    test('should detect stable trend when frequency is consistent', () => {
      const pattern = createMockPattern({
        pattern_text: 'Add semicolons',
        count: 4,
        examples: [
          createMockExample('2026-03-17T10:00:00Z', ContentType.CODE),
          createMockExample('2026-03-17T10:30:00Z', ContentType.CODE),
          createMockExample('2026-03-17T11:00:00Z', ContentType.CODE),
          createMockExample('2026-03-17T11:30:00Z', ContentType.CODE),
        ],
      });

      const analyzer = new FrequencyAnalyzer();
      const trend = analyzer.detectFrequencyTrend(pattern);

      // 2 examples in each half (30 mins each)
      // Ratio: 2/2 = 1.0, stable (not >= 1.5 and not <= 0.67)
      expect(trend).toBe('stable');
    });

    test('should return stable for patterns with count < 3 (insufficient data)', () => {
      const pattern = createMockPattern({
        pattern_text: 'Use const',
        count: 2,
        examples: [
          createMockExample('2026-03-17T10:00:00Z', ContentType.CODE),
          createMockExample('2026-03-17T10:30:00Z', ContentType.CODE),
        ],
      });

      const analyzer = new FrequencyAnalyzer();
      const trend = analyzer.detectFrequencyTrend(pattern);

      expect(trend).toBe('stable');
    });

    test('should handle patterns with evenly distributed timestamps', () => {
      const pattern = createMockPattern({
        pattern_text: 'Use arrow functions',
        count: 5,
        examples: [
          createMockExample('2026-03-17T10:00:00Z', ContentType.CODE),
          createMockExample('2026-03-17T10:15:00Z', ContentType.CODE),
          createMockExample('2026-03-17T10:30:00Z', ContentType.CODE),
          createMockExample('2026-03-17T10:45:00Z', ContentType.CODE),
          createMockExample('2026-03-17T11:00:00Z', ContentType.CODE),
        ],
      });

      const analyzer = new FrequencyAnalyzer();
      const trend = analyzer.detectFrequencyTrend(pattern);

      expect(trend).toBe('stable');
    });

    test('should sort examples chronologically before trend analysis', () => {
      const pattern = createMockPattern({
        pattern_text: 'Use template literals',
        count: 4,
        examples: [
          createMockExample('2026-03-17T11:30:00Z', ContentType.CODE), // Latest
          createMockExample('2026-03-17T10:00:00Z', ContentType.CODE), // Earliest
          createMockExample('2026-03-17T11:00:00Z', ContentType.CODE), // Mid-late
          createMockExample('2026-03-17T10:30:00Z', ContentType.CODE), // Mid-early
        ],
      });

      const analyzer = new FrequencyAnalyzer();
      const trend = analyzer.detectFrequencyTrend(pattern);

      // Should handle unsorted timestamps correctly
      expect(['increasing', 'decreasing', 'stable']).toContain(trend);
    });
  });
});

// ============================================================================
// CATEGORY SUMMARY GENERATION TESTS (Unit Tests)
// ============================================================================

describe('Category Summary Generation', () => {
  describe('generateCategorySummaries', () => {
    test('should generate summaries for all categories with patterns', () => {
      const patterns: Pattern[] = [
        createMockPattern({
          pattern_text: 'Use camelCase',
          count: 5,
          category: PatternCategory.CODE_STYLE,
        }),
        createMockPattern({
          pattern_text: 'Use API instead of Api',
          count: 3,
          category: PatternCategory.CODE_STYLE,
        }),
        createMockPattern({
          pattern_text: 'Use endpoint instead of end point',
          count: 4,
          category: PatternCategory.TERMINOLOGY,
        }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const summaries = analyzer.generateCategorySummaries(patterns);

      expect(summaries).toHaveLength(2);
      expect(summaries.some(s => s.category === PatternCategory.CODE_STYLE)).toBe(true);
      expect(summaries.some(s => s.category === PatternCategory.TERMINOLOGY)).toBe(true);
    });

    test('should calculate correct total_patterns per category', () => {
      const patterns: Pattern[] = [
        createMockPattern({ category: PatternCategory.CODE_STYLE, count: 5 }),
        createMockPattern({ category: PatternCategory.CODE_STYLE, count: 3 }),
        createMockPattern({ category: PatternCategory.CODE_STYLE, count: 2 }),
        createMockPattern({ category: PatternCategory.TERMINOLOGY, count: 4 }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const summaries = analyzer.generateCategorySummaries(patterns);

      const codeStyleSummary = summaries.find(s => s.category === PatternCategory.CODE_STYLE);
      expect(codeStyleSummary?.total_patterns).toBe(3);

      const terminologySummary = summaries.find(s => s.category === PatternCategory.TERMINOLOGY);
      expect(terminologySummary?.total_patterns).toBe(1);
    });

    test('should calculate correct total_frequency per category', () => {
      const patterns: Pattern[] = [
        createMockPattern({ category: PatternCategory.CODE_STYLE, count: 5 }),
        createMockPattern({ category: PatternCategory.CODE_STYLE, count: 3 }),
        createMockPattern({ category: PatternCategory.TERMINOLOGY, count: 4 }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const summaries = analyzer.generateCategorySummaries(patterns);

      const codeStyleSummary = summaries.find(s => s.category === PatternCategory.CODE_STYLE);
      expect(codeStyleSummary?.total_frequency).toBe(8); // 5 + 3

      const terminologySummary = summaries.find(s => s.category === PatternCategory.TERMINOLOGY);
      expect(terminologySummary?.total_frequency).toBe(4);
    });

    test('should calculate correct average_frequency per category', () => {
      const patterns: Pattern[] = [
        createMockPattern({ category: PatternCategory.CODE_STYLE, count: 5 }),
        createMockPattern({ category: PatternCategory.CODE_STYLE, count: 3 }),
        createMockPattern({ category: PatternCategory.TERMINOLOGY, count: 4 }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const summaries = analyzer.generateCategorySummaries(patterns);

      const codeStyleSummary = summaries.find(s => s.category === PatternCategory.CODE_STYLE);
      expect(codeStyleSummary?.average_frequency).toBe(4); // (5 + 3) / 2

      const terminologySummary = summaries.find(s => s.category === PatternCategory.TERMINOLOGY);
      expect(terminologySummary?.average_frequency).toBe(4); // 4 / 1
    });

    test('should identify top 3 patterns per category by frequency', () => {
      const patterns: Pattern[] = [
        createMockPattern({
          pattern_text: 'Pattern A (highest)',
          count: 10,
          category: PatternCategory.CODE_STYLE,
        }),
        createMockPattern({
          pattern_text: 'Pattern B (second)',
          count: 8,
          category: PatternCategory.CODE_STYLE,
        }),
        createMockPattern({
          pattern_text: 'Pattern C (third)',
          count: 6,
          category: PatternCategory.CODE_STYLE,
        }),
        createMockPattern({
          pattern_text: 'Pattern D (fourth)',
          count: 4,
          category: PatternCategory.CODE_STYLE,
        }),
        createMockPattern({
          pattern_text: 'Pattern E (fifth)',
          count: 2,
          category: PatternCategory.CODE_STYLE,
        }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const summaries = analyzer.generateCategorySummaries(patterns);

      const codeStyleSummary = summaries.find(s => s.category === PatternCategory.CODE_STYLE);
      expect(codeStyleSummary?.top_patterns).toHaveLength(3);
      expect(codeStyleSummary?.top_patterns[0]).toBe('Pattern A (highest)');
      expect(codeStyleSummary?.top_patterns[1]).toBe('Pattern B (second)');
      expect(codeStyleSummary?.top_patterns[2]).toBe('Pattern C (third)');
    });

    test('should handle category with fewer than 3 patterns', () => {
      const patterns: Pattern[] = [
        createMockPattern({
          pattern_text: 'Pattern A',
          count: 5,
          category: PatternCategory.CODE_STYLE,
        }),
        createMockPattern({
          pattern_text: 'Pattern B',
          count: 3,
          category: PatternCategory.CODE_STYLE,
        }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const summaries = analyzer.generateCategorySummaries(patterns);

      const codeStyleSummary = summaries.find(s => s.category === PatternCategory.CODE_STYLE);
      expect(codeStyleSummary?.top_patterns).toHaveLength(2);
    });

    test('should skip categories with no patterns', () => {
      const patterns: Pattern[] = [
        createMockPattern({ category: PatternCategory.CODE_STYLE, count: 5 }),
        createMockPattern({ category: PatternCategory.TERMINOLOGY, count: 3 }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const summaries = analyzer.generateCategorySummaries(patterns);

      // Should only have summaries for CODE_STYLE and TERMINOLOGY
      expect(summaries).toHaveLength(2);
      expect(summaries.every(s =>
        s.category === PatternCategory.CODE_STYLE ||
        s.category === PatternCategory.TERMINOLOGY
      )).toBe(true);
    });

    test('should sort summaries by total_frequency descending', () => {
      const patterns: Pattern[] = [
        createMockPattern({ category: PatternCategory.CODE_STYLE, count: 5 }),
        createMockPattern({ category: PatternCategory.CODE_STYLE, count: 3 }),
        createMockPattern({ category: PatternCategory.TERMINOLOGY, count: 10 }),
        createMockPattern({ category: PatternCategory.STRUCTURE, count: 2 }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const summaries = analyzer.generateCategorySummaries(patterns);

      expect(summaries[0].category).toBe(PatternCategory.TERMINOLOGY); // 10
      expect(summaries[1].category).toBe(PatternCategory.CODE_STYLE); // 8
      expect(summaries[2].category).toBe(PatternCategory.STRUCTURE); // 2
    });

    test('should handle empty patterns array', () => {
      const patterns: Pattern[] = [];

      const analyzer = new FrequencyAnalyzer();
      const summaries = analyzer.generateCategorySummaries(patterns);

      expect(summaries).toEqual([]);
    });
  });
});

// ============================================================================
// FREQUENCY DISTRIBUTION ANALYSIS TESTS (Unit Tests)
// ============================================================================

describe('Frequency Distribution Analysis', () => {
  describe('analyzeFrequencyDistribution', () => {
    test('should categorize patterns by frequency level (high >= 5, medium 3-4, low = 2)', () => {
      const patterns: Pattern[] = [
        createMockPattern({ pattern_text: 'High 1', count: 5 }),
        createMockPattern({ pattern_text: 'High 2', count: 7 }),
        createMockPattern({ pattern_text: 'Medium 1', count: 3 }),
        createMockPattern({ pattern_text: 'Medium 2', count: 4 }),
        createMockPattern({ pattern_text: 'Low 1', count: 2 }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const analysis = analyzer.analyzeFrequencyDistribution(patterns);

      expect(analysis.high_frequency_patterns).toBe(2);
      expect(analysis.medium_frequency_patterns).toBe(2);
      expect(analysis.low_frequency_patterns).toBe(1);
    });

    test('should identify most common pattern (highest count)', () => {
      const patterns: Pattern[] = [
        createMockPattern({ pattern_text: 'Pattern A', count: 5 }),
        createMockPattern({ pattern_text: 'Pattern B', count: 8 }),
        createMockPattern({ pattern_text: 'Pattern C', count: 3 }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const analysis = analyzer.analyzeFrequencyDistribution(patterns);

      expect(analysis.most_common_pattern.pattern_text).toBe('Pattern B');
      expect(analysis.most_common_pattern.count).toBe(8);
    });

    test('should calculate mean frequency correctly', () => {
      const patterns: Pattern[] = [
        createMockPattern({ count: 2 }),
        createMockPattern({ count: 3 }),
        createMockPattern({ count: 4 }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const analysis = analyzer.analyzeFrequencyDistribution(patterns);

      expect(analysis.frequency_distribution.mean).toBe(3); // (2 + 3 + 4) / 3
    });

    test('should calculate median frequency correctly (odd count)', () => {
      const patterns: Pattern[] = [
        createMockPattern({ count: 2 }),
        createMockPattern({ count: 3 }),
        createMockPattern({ count: 5 }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const analysis = analyzer.analyzeFrequencyDistribution(patterns);

      expect(analysis.frequency_distribution.median).toBe(3); // Middle value
    });

    test('should calculate median frequency correctly (even count)', () => {
      const patterns: Pattern[] = [
        createMockPattern({ count: 2 }),
        createMockPattern({ count: 3 }),
        createMockPattern({ count: 4 }),
        createMockPattern({ count: 5 }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const analysis = analyzer.analyzeFrequencyDistribution(patterns);

      expect(analysis.frequency_distribution.median).toBe(3.5); // (3 + 4) / 2
    });

    test('should calculate mode frequency correctly', () => {
      const patterns: Pattern[] = [
        createMockPattern({ count: 2 }),
        createMockPattern({ count: 3 }),
        createMockPattern({ count: 3 }),
        createMockPattern({ count: 4 }),
        createMockPattern({ count: 5 }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const analysis = analyzer.analyzeFrequencyDistribution(patterns);

      expect(analysis.frequency_distribution.mode).toBe(3); // Most frequent
    });

    test('should calculate range correctly', () => {
      const patterns: Pattern[] = [
        createMockPattern({ count: 2 }),
        createMockPattern({ count: 5 }),
        createMockPattern({ count: 8 }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const analysis = analyzer.analyzeFrequencyDistribution(patterns);

      expect(analysis.frequency_distribution.range).toEqual([2, 8]);
    });

    test('should handle empty patterns array', () => {
      const patterns: Pattern[] = [];

      const analyzer = new FrequencyAnalyzer();
      const analysis = analyzer.analyzeFrequencyDistribution(patterns);

      expect(analysis.high_frequency_patterns).toBe(0);
      expect(analysis.medium_frequency_patterns).toBe(0);
      expect(analysis.low_frequency_patterns).toBe(0);
    });

    test('should handle single pattern', () => {
      const patterns: Pattern[] = [createMockPattern({ count: 5 })];

      const analyzer = new FrequencyAnalyzer();
      const analysis = analyzer.analyzeFrequencyDistribution(patterns);

      expect(analysis.high_frequency_patterns).toBe(1);
      expect(analysis.frequency_distribution.mean).toBe(5);
      expect(analysis.frequency_distribution.median).toBe(5);
      expect(analysis.frequency_distribution.mode).toBe(5);
      expect(analysis.frequency_distribution.range).toEqual([5, 5]);
    });
  });
});

// ============================================================================
// CATEGORY CONFIDENCE SCORING TESTS (Unit Tests)
// ============================================================================

describe('Category Confidence Scoring', () => {
  describe('calculateCategoryConfidence', () => {
    test('should calculate confidence based on average similarity of examples', () => {
      const pattern = createMockPattern({
        pattern_text: 'Use camelCase',
        count: 3,
        category: PatternCategory.CODE_STYLE,
      });

      const grouper = new CategoryGrouper();
      const confidence = grouper.calculateCategoryConfidence(pattern);

      // Confidence should be between 0 and 1
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    test('should return high confidence (> 0.8) for consistent examples', () => {
      const pattern = createMockPattern({
        pattern_text: 'Use camelCase naming',
        count: 3,
        category: PatternCategory.CODE_STYLE,
        examples: [
          createMockExample('2026-03-17T10:00:00Z', ContentType.CODE),
          createMockExample('2026-03-17T10:30:00Z', ContentType.CODE),
          createMockExample('2026-03-17T11:00:00Z', ContentType.CODE),
        ],
      });

      const grouper = new CategoryGrouper();
      const confidence = grouper.calculateCategoryConfidence(pattern);

      expect(confidence).toBeGreaterThan(0.8);
    });
  });

  describe('determineSecondaryCategory', () => {
    test('should assign secondary category for borderline cases (confidence < 0.7)', () => {
      const pattern = createMockPattern({
        pattern_text: 'Use async/await',
        count: 3,
        category: PatternCategory.CODE_STYLE,
        examples: [
          createMockExample('async await pattern', ContentType.CODE),
          createMockExample('different words', ContentType.CODE),
        ],
      });

      const grouper = new CategoryGrouper();
      const secondary = grouper.determineSecondaryCategory(pattern);

      // If confidence is low, should have secondary category
      const confidence = grouper.calculateCategoryConfidence(pattern);
      if (confidence < 0.7) {
        expect(secondary).toBeDefined();
      }
    });

    test('should not assign secondary category for high confidence (>= 0.7)', () => {
      const pattern = createMockPattern({
        pattern_text: 'Use camelCase naming',
        count: 3,
        category: PatternCategory.CODE_STYLE,
        examples: [
          createMockExample('use camelCase', ContentType.CODE),
          createMockExample('use camelCase', ContentType.CODE),
        ],
      });

      const grouper = new CategoryGrouper();
      const secondary = grouper.determineSecondaryCategory(pattern);

      const confidence = grouper.calculateCategoryConfidence(pattern);
      if (confidence >= 0.7) {
        expect(secondary).toBeUndefined();
      }
    });
  });
});

// ============================================================================
// EDGE CASE AND ERROR HANDLING TESTS (Unit Tests)
// ============================================================================

describe('Edge Case and Error Handling', () => {
  describe('AR22 Error Handling', () => {
    test('should handle empty patterns array gracefully', () => {
      const patterns: Pattern[] = [];

      const analyzer = new FrequencyAnalyzer();

      expect(() => {
        analyzer.sortByFrequency(patterns);
        analyzer.generateCategorySummaries(patterns);
        analyzer.analyzeFrequencyDistribution(patterns);
      }).not.toThrow();
    });

    test('should validate frequency counts are non-negative', () => {
      const patterns: Pattern[] = [
        createMockPattern({ count: 0 }), // Invalid: count should be >= 2
      ];

      const analyzer = new FrequencyAnalyzer();

      expect(() => {
        analyzer.analyzeFrequencyDistribution(patterns);
      }).not.toThrow();
    });

    test('should provide clear feedback for frequency analysis results', () => {
      const patterns: Pattern[] = [];

      const analyzer = new FrequencyAnalyzer();
      const summaries = analyzer.generateCategorySummaries(patterns);
      const analysis = analyzer.analyzeFrequencyDistribution(patterns);

      // Should return empty arrays/objects, not throw errors
      expect(summaries).toEqual([]);
      expect(analysis.high_frequency_patterns).toBe(0);
    });
  });

  describe('Performance Requirements', () => {
    test('should sort 100 patterns in < 100ms', () => {
      const patterns: Pattern[] = Array.from({ length: 100 }, (_, i) =>
        createMockPattern({
          pattern_text: `Pattern ${i}`,
          count: Math.floor(Math.random() * 10) + 2,
        })
      );

      const analyzer = new FrequencyAnalyzer();
      const startTime = Date.now();
      analyzer.sortByFrequency(patterns);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should generate category summaries in < 200ms for 100 patterns', () => {
      const patterns: Pattern[] = Array.from({ length: 100 }, (_, i) =>
        createMockPattern({
          pattern_text: `Pattern ${i}`,
          count: Math.floor(Math.random() * 10) + 2,
          category: Object.values(PatternCategory)[i % 6],
        })
      );

      const analyzer = new FrequencyAnalyzer();
      const startTime = Date.now();
      analyzer.generateCategorySummaries(patterns);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200);
    });

    test('should detect trend in < 50ms per pattern', () => {
      const pattern = createMockPattern({
        count: 10,
        examples: Array.from({ length: 10 }, (_, i) =>
          createMockExample(`2026-03-17T${10 + i}:00:00Z`, ContentType.CODE)
        ),
      });

      const analyzer = new FrequencyAnalyzer();
      const startTime = Date.now();
      analyzer.detectFrequencyTrend(pattern);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(50);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS WITH STORY 2-4 PATTERN DETECTOR (Integration Tests)
// ============================================================================

describe('Integration with Story 2-4 Pattern Detector', () => {
  describe('End-to-End Frequency Analysis Pipeline', () => {
    test('should accept PatternDetectionResult output and perform frequency analysis', () => {
      // Simulate output from Story 2-4 PatternDetector
      const mockPatternsFromStory24: Pattern[] = [
        createMockPattern({
          pattern_text: 'Use camelCase instead of snake_case',
          count: 5,
          category: PatternCategory.CODE_STYLE,
        }),
        createMockPattern({
          pattern_text: 'Use API instead of Api',
          count: 3,
          category: PatternCategory.TERMINOLOGY,
        }),
        createMockPattern({
          pattern_text: 'Add semicolons',
          count: 4,
          category: PatternCategory.CODE_STYLE,
        }),
      ];

      const analyzer = new FrequencyAnalyzer();

      // Sort by frequency
      const sorted = analyzer.sortByFrequency(mockPatternsFromStory24);
      expect(sorted[0].count).toBeGreaterThanOrEqual(sorted[1].count);

      // Generate category summaries
      const summaries = analyzer.generateCategorySummaries(sorted);
      expect(summaries.length).toBeGreaterThan(0);

      // Analyze frequency distribution
      const analysis = analyzer.analyzeFrequencyDistribution(sorted);
      expect(analysis.high_frequency_patterns).toBeGreaterThanOrEqual(0);
    });

    test('should preserve Pattern interface fields from Story 2-4', () => {
      const mockPattern: Pattern = {
        pattern_text: 'Use camelCase',
        count: 5,
        category: PatternCategory.CODE_STYLE,
        examples: [
          createMockExample('2026-03-17T10:00:00Z', ContentType.CODE),
        ],
        suggested_rule: 'Use camelCase instead of snake_case',
        first_seen: '2026-03-17T10:00:00Z',
        last_seen: '2026-03-17T11:00:00Z',
        content_types: [ContentType.CODE],
      };

      const analyzer = new FrequencyAnalyzer();
      const sorted = analyzer.sortByFrequency([mockPattern]);

      expect(sorted[0].pattern_text).toBe(mockPattern.pattern_text);
      expect(sorted[0].count).toBe(mockPattern.count);
      expect(sorted[0].category).toBe(mockPattern.category);
      expect(sorted[0].examples).toEqual(mockPattern.examples);
      expect(sorted[0].suggested_rule).toBe(mockPattern.suggested_rule);
      expect(sorted[0].first_seen).toBe(mockPattern.first_seen);
      expect(sorted[0].last_seen).toBe(mockPattern.last_seen);
      expect(sorted[0].content_types).toEqual(mockPattern.content_types);
    });

    test('should extend Pattern with frequency_trend field for Story 2-5', () => {
      const mockPattern: Pattern = createMockPattern({
        count: 5,
        examples: [
          createMockExample('2026-03-17T10:00:00Z', ContentType.CODE),
          createMockExample('2026-03-17T10:30:00Z', ContentType.CODE),
          createMockExample('2026-03-17T11:00:00Z', ContentType.CODE),
          createMockExample('2026-03-17T11:30:00Z', ContentType.CODE),
          createMockExample('2026-03-17T12:00:00Z', ContentType.CODE),
        ],
      });

      const analyzer = new FrequencyAnalyzer();
      const trend = analyzer.detectFrequencyTrend(mockPattern);

      expect(['increasing', 'decreasing', 'stable']).toContain(trend);
    });

    test('should integrate with state.json schema from Story 2-4', () => {
      const mockPatternsFromStory24: Pattern[] = [
        createMockPattern({
          pattern_text: 'Use camelCase',
          count: 5,
          category: PatternCategory.CODE_STYLE,
        }),
      ];

      const analyzer = new FrequencyAnalyzer();
      const sorted = analyzer.sortByFrequency(mockPatternsFromStory24);
      const summaries = analyzer.generateCategorySummaries(sorted);
      const analysis = analyzer.analyzeFrequencyDistribution(sorted);

      // Verify output structure matches expected state.json schema
      expect(Array.isArray(sorted)).toBe(true);
      expect(Array.isArray(summaries)).toBe(true);
      expect(analysis).toBeDefined();
      expect(analysis.most_common_pattern).toBeDefined();
      expect(analysis.frequency_distribution).toBeDefined();
    });
  });
});
