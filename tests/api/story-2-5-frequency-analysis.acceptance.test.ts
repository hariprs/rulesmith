/**
 * Story 2-5: Thematic Grouping & Frequency Counting
 * API-Level Acceptance Tests
 *
 * These tests verify the acceptance criteria at the API/integration level,
 * following the test pyramid principle of preferring API-level tests over E2E.
 *
 * Test Scope:
 * - API-level tests for FrequencyAnalyzer class methods
 * - Integration tests with Story 2-4 PatternDetector output
 * - State.json schema integration tests
 * - Business logic validation for frequency counting and thematic grouping
 *
 * TDD Red Phase: All tests are expected to FAIL until implementation is complete
 */

import {
  FrequencyAnalyzer,
  CategorySummary,
  FrequencyAnalysis,
} from '../../src/frequency-analyzer';
import {
  Pattern,
  PatternCategory,
  PatternExample,
} from '../../src/pattern-detector';
import { ContentType } from '../../src/content-analyzer';

// ============================================================================
// ACCEPTANCE CRITERION 1: Thematic Grouping & Frequency Analysis
// ============================================================================

describe('Story 2-5 Acceptance Criterion 1: Thematic Grouping & Frequency Analysis', () => {
  describe('Given recurring patterns have been identified from Story 2.4', () => {
    describe('When thematic grouping and frequency analysis is performed', () => {
      testThen('Then related corrections are grouped into 6 thematic categories', () => {
        // Given: PatternDetector output from Story 2.4
        const mockPatterns = createMockPatternDetectorOutput();

        // When: Perform frequency analysis
        const analyzer = new FrequencyAnalyzer();
        const summaries = analyzer.generateCategorySummaries(mockPatterns);

        // Then: Verify all 6 categories are supported
        const categories = summaries.map(s => s.category);
        expect(categories).toContain(PatternCategory.CODE_STYLE);
        expect(categories).toContain(PatternCategory.TERMINOLOGY);
        expect(categories).toContain(PatternCategory.STRUCTURE);
        expect(categories).toContain(PatternCategory.FORMATTING);
        expect(categories).toContain(PatternCategory.CONVENTION);
        expect(categories).toContain(PatternCategory.OTHER);
      });

      testThen('And each pattern\'s frequency is counted within the conversation', () => {
        // Given: PatternDetector output with various counts
        const mockPatterns = [
          createMockPattern({ pattern_text: 'Pattern A', count: 5 }),
          createMockPattern({ pattern_text: 'Pattern B', count: 3 }),
          createMockPattern({ pattern_text: 'Pattern C', count: 2 }),
        ];

        // When: Analyze frequency distribution
        const analyzer = new FrequencyAnalyzer();
        const analysis = analyzer.analyzeFrequencyDistribution(mockPatterns);

        // Then: Verify frequency counts are accurate
        expect(analysis.most_common_pattern.count).toBe(5);
        expect(analysis.frequency_distribution.mean).toBeCloseTo(3.33, 1);
      });

      testThen('And the frequency count is stored in the pattern object', () => {
        // Given: PatternDetector output
        const mockPatterns = [
          createMockPattern({ pattern_text: 'Pattern A', count: 5 }),
        ];

        // When: Sort by frequency
        const analyzer = new FrequencyAnalyzer();
        const sorted = analyzer.sortByFrequency(mockPatterns);

        // Then: Verify count field is preserved
        expect(sorted[0].count).toBeDefined();
        expect(sorted[0].count).toBe(5);
        expect(typeof sorted[0].count).toBe('number');
      });

      testThen('And patterns are sorted by frequency (highest first)', () => {
        // Given: Unsorted patterns
        const mockPatterns = [
          createMockPattern({ pattern_text: 'Low freq', count: 2 }),
          createMockPattern({ pattern_text: 'High freq', count: 5 }),
          createMockPattern({ pattern_text: 'Medium freq', count: 3 }),
        ];

        // When: Sort by frequency
        const analyzer = new FrequencyAnalyzer();
        const sorted = analyzer.sortByFrequency(mockPatterns);

        // Then: Verify descending order
        expect(sorted[0].count).toBeGreaterThanOrEqual(sorted[1].count);
        expect(sorted[1].count).toBeGreaterThanOrEqual(sorted[2].count);
        expect(sorted[0].count).toBe(5);
        expect(sorted[1].count).toBe(3);
        expect(sorted[2].count).toBe(2);
      });

      testThen('And the output includes category labels for each pattern group', () => {
        // Given: Patterns from multiple categories
        const mockPatterns = [
          createMockPattern({
            pattern_text: 'Use camelCase',
            count: 5,
            category: PatternCategory.CODE_STYLE,
          }),
          createMockPattern({
            pattern_text: 'Use API not Api',
            count: 3,
            category: PatternCategory.TERMINOLOGY,
          }),
        ];

        // When: Generate category summaries
        const analyzer = new FrequencyAnalyzer();
        const summaries = analyzer.generateCategorySummaries(mockPatterns);

        // Then: Verify category labels are present
        expect(summaries[0].category).toBeDefined();
        expect(typeof summaries[0].category).toBe('string');
        expect(summaries.every(s => s.category !== null)).toBe(true);
      });
    });
  });

  // ============================================================================
  // INTEGRATION TESTS: Story 2-4 → Story 2-5 Pipeline
  // ============================================================================

  describe('Story 2-4 Output → Story 2-5 Input Transformation', () => {
    test('should accept Pattern[] from PatternDetector.detectPatterns()', () => {
      // Given: Output from Story 2.4
      const story24Output = createRealisticPatternDetectorOutput();

      // When: Pass to FrequencyAnalyzer
      const analyzer = new FrequencyAnalyzer();
      const sorted = analyzer.sortByFrequency(story24Output);

      // Then: Should process without errors
      expect(sorted).toBeDefined();
      expect(Array.isArray(sorted)).toBe(true);
      expect(sorted.length).toBeGreaterThan(0);
    });

    test('should leverage existing count field from Pattern interface', () => {
      // Given: Pattern with count field (already calculated in Story 2.4)
      const pattern = createMockPattern({
        pattern_text: 'Use camelCase',
        count: 5, // Already calculated by Story 2.4
      });

      // When: Sort by frequency
      const analyzer = new FrequencyAnalyzer();
      const sorted = analyzer.sortByFrequency([pattern]);

      // Then: Should use existing count, not recalculate
      expect(sorted[0].count).toBe(5);
    });

    test('should extend Pattern with optional frequency_trend field', () => {
      // Given: Pattern from Story 2.4
      const pattern = createMockPattern({
        count: 5,
        examples: [
          createMockExample('2026-03-17T10:00:00Z'),
          createMockExample('2026-03-17T10:30:00Z'),
          createMockExample('2026-03-17T11:00:00Z'),
          createMockExample('2026-03-17T11:30:00Z'),
          createMockExample('2026-03-17T12:00:00Z'),
        ],
      });

      // When: Detect frequency trend
      const analyzer = new FrequencyAnalyzer();
      const trend = analyzer.detectFrequencyTrend(pattern);

      // Then: Should return valid trend value
      expect(['increasing', 'decreasing', 'stable']).toContain(trend);
    });
  });

  // ============================================================================
  // STATE.JSON INTEGRATION TESTS
  // ============================================================================

  describe('State.json Schema Integration', () => {
    test('should generate output compatible with state.json structure', () => {
      // Given: Patterns from Story 2.4
      const mockPatterns = createRealisticPatternDetectorOutput();

      // When: Perform frequency analysis
      const analyzer = new FrequencyAnalyzer();
      const sortedPatterns = analyzer.sortByFrequency(mockPatterns);
      const summaries = analyzer.generateCategorySummaries(sortedPatterns);
      const analysis = analyzer.analyzeFrequencyDistribution(sortedPatterns);

      // Then: Verify output structure matches state.json schema
      expect(Array.isArray(sortedPatterns)).toBe(true);
      expect(Array.isArray(summaries)).toBe(true);
      expect(analysis).toBeDefined();

      // Verify CategorySummary structure
      if (summaries.length > 0) {
        expect(summaries[0].category).toBeDefined();
        expect(summaries[0].total_patterns).toBeDefined();
        expect(summaries[0].total_frequency).toBeDefined();
        expect(summaries[0].average_frequency).toBeDefined();
        expect(Array.isArray(summaries[0].top_patterns)).toBe(true);
      }

      // Verify FrequencyAnalysis structure
      expect(analysis.high_frequency_patterns).toBeDefined();
      expect(analysis.medium_frequency_patterns).toBeDefined();
      expect(analysis.low_frequency_patterns).toBeDefined();
      expect(analysis.most_common_pattern).toBeDefined();
      expect(analysis.frequency_distribution).toBeDefined();
      expect(analysis.frequency_distribution.mean).toBeDefined();
      expect(analysis.frequency_distribution.median).toBeDefined();
      expect(analysis.frequency_distribution.mode).toBeDefined();
      expect(analysis.frequency_distribution.range).toBeDefined();
    });

    test('should include frequency_trend in Pattern when stored in state.json', () => {
      // Given: Pattern with examples
      const pattern = createMockPattern({
        count: 4,
        examples: [
          createMockExample('2026-03-17T10:00:00Z'),
          createMockExample('2026-03-17T10:30:00Z'),
          createMockExample('2026-03-17T11:00:00Z'),
          createMockExample('2026-03-17T11:30:00Z'),
        ],
      });

      // When: Detect trend
      const analyzer = new FrequencyAnalyzer();
      const trend = analyzer.detectFrequencyTrend(pattern);

      // Then: Trend should be storable in state.json
      expect(typeof trend).toBe('string');
      expect(trend.length).toBeGreaterThan(0);
    });

    test('should include category_summaries in state.json output', () => {
      // Given: Multiple patterns across categories
      const mockPatterns = [
        createMockPattern({
          pattern_text: 'Use camelCase',
          count: 5,
          category: PatternCategory.CODE_STYLE,
        }),
        createMockPattern({
          pattern_text: 'Use API not Api',
          count: 3,
          category: PatternCategory.TERMINOLOGY,
        }),
      ];

      // When: Generate summaries
      const analyzer = new FrequencyAnalyzer();
      const summaries = analyzer.generateCategorySummaries(mockPatterns);

      // Then: Should be serializable for state.json
      expect(() => JSON.stringify(summaries)).not.toThrow();
      const json = JSON.stringify(summaries);
      expect(json.length).toBeGreaterThan(0);
    });

    test('should include frequency_analysis in state.json output', () => {
      // Given: Patterns
      const mockPatterns = [
        createMockPattern({ count: 5 }),
        createMockPattern({ count: 3 }),
        createMockPattern({ count: 2 }),
      ];

      // When: Analyze frequency distribution
      const analyzer = new FrequencyAnalyzer();
      const analysis = analyzer.analyzeFrequencyDistribution(mockPatterns);

      // Then: Should be serializable for state.json
      expect(() => JSON.stringify(analysis)).not.toThrow();
      const json = JSON.stringify(analysis);
      expect(json.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // BUSINESS LOGIC TESTS
  // ============================================================================

  describe('Frequency Counting Business Logic', () => {
    test('should accurately count pattern occurrences from Story 2.4 output', () => {
      // Given: Patterns with various counts
      const patterns = [
        createMockPattern({ pattern_text: 'Pattern A', count: 2 }),
        createMockPattern({ pattern_text: 'Pattern B', count: 3 }),
        createMockPattern({ pattern_text: 'Pattern C', count: 5 }),
        createMockPattern({ pattern_text: 'Pattern D', count: 8 }),
      ];

      // When: Analyze frequency distribution
      const analyzer = new FrequencyAnalyzer();
      const analysis = analyzer.analyzeFrequencyDistribution(patterns);

      // Then: Verify counts
      expect(analysis.low_frequency_patterns).toBe(1); // count: 2
      expect(analysis.medium_frequency_patterns).toBe(1); // count: 3
      expect(analysis.high_frequency_patterns).toBe(2); // count: 5, 8 (>= 5 is high)
    });

    test('should handle edge case: all patterns have same frequency', () => {
      // Given: All patterns with count = 3
      const patterns = [
        createMockPattern({ pattern_text: 'Pattern A', count: 3 }),
        createMockPattern({ pattern_text: 'Pattern B', count: 3 }),
        createMockPattern({ pattern_text: 'Pattern C', count: 3 }),
      ];

      // When: Analyze
      const analyzer = new FrequencyAnalyzer();
      const analysis = analyzer.analyzeFrequencyDistribution(patterns);

      // Then: Should handle gracefully
      expect(analysis.medium_frequency_patterns).toBe(3);
      expect(analysis.frequency_distribution.mean).toBe(3);
      expect(analysis.frequency_distribution.mode).toBe(3);
    });

    test('should handle edge case: single pattern', () => {
      // Given: Single pattern
      const patterns = [createMockPattern({ count: 5 })];

      // When: Analyze
      const analyzer = new FrequencyAnalyzer();
      const analysis = analyzer.analyzeFrequencyDistribution(patterns);

      // Then: Should handle gracefully
      expect(analysis.high_frequency_patterns).toBe(1);
      expect(analysis.most_common_pattern.count).toBe(5);
    });
  });

  describe('Thematic Grouping Business Logic', () => {
    test('should group patterns by all 6 categories', () => {
      // Given: Patterns across all categories
      const patterns = [
        createMockPattern({ category: PatternCategory.CODE_STYLE, count: 3 }),
        createMockPattern({ category: PatternCategory.TERMINOLOGY, count: 2 }),
        createMockPattern({ category: PatternCategory.STRUCTURE, count: 4 }),
        createMockPattern({ category: PatternCategory.FORMATTING, count: 2 }),
        createMockPattern({ category: PatternCategory.CONVENTION, count: 3 }),
        createMockPattern({ category: PatternCategory.OTHER, count: 2 }),
      ];

      // When: Generate summaries
      const analyzer = new FrequencyAnalyzer();
      const summaries = analyzer.generateCategorySummaries(patterns);

      // Then: Should have all 6 categories
      expect(summaries).toHaveLength(6);
    });

    test('should calculate category-level metrics correctly', () => {
      // Given: Multiple patterns in same category
      const patterns = [
        createMockPattern({
          pattern_text: 'Use camelCase',
          category: PatternCategory.CODE_STYLE,
          count: 5,
        }),
        createMockPattern({
          pattern_text: 'Use async/await',
          category: PatternCategory.CODE_STYLE,
          count: 3,
        }),
        createMockPattern({
          pattern_text: 'Add semicolons',
          category: PatternCategory.CODE_STYLE,
          count: 2,
        }),
      ];

      // When: Generate summaries
      const analyzer = new FrequencyAnalyzer();
      const summaries = analyzer.generateCategorySummaries(patterns);
      const codeStyleSummary = summaries.find(s => s.category === PatternCategory.CODE_STYLE);

      // Then: Verify metrics
      expect(codeStyleSummary?.total_patterns).toBe(3);
      expect(codeStyleSummary?.total_frequency).toBe(10); // 5 + 3 + 2
      expect(codeStyleSummary?.average_frequency).toBeCloseTo(3.33, 1); // 10 / 3
    });

    test('should identify top 3 patterns per category', () => {
      // Given: 5 patterns in same category
      const patterns = [
        createMockPattern({
          pattern_text: 'Pattern A (count 10)',
          category: PatternCategory.CODE_STYLE,
          count: 10,
        }),
        createMockPattern({
          pattern_text: 'Pattern B (count 8)',
          category: PatternCategory.CODE_STYLE,
          count: 8,
        }),
        createMockPattern({
          pattern_text: 'Pattern C (count 6)',
          category: PatternCategory.CODE_STYLE,
          count: 6,
        }),
        createMockPattern({
          pattern_text: 'Pattern D (count 4)',
          category: PatternCategory.CODE_STYLE,
          count: 4,
        }),
        createMockPattern({
          pattern_text: 'Pattern E (count 2)',
          category: PatternCategory.CODE_STYLE,
          count: 2,
        }),
      ];

      // When: Generate summaries
      const analyzer = new FrequencyAnalyzer();
      const summaries = analyzer.generateCategorySummaries(patterns);
      const codeStyleSummary = summaries.find(s => s.category === PatternCategory.CODE_STYLE);

      // Then: Should have top 3
      expect(codeStyleSummary?.top_patterns).toHaveLength(3);
      expect(codeStyleSummary?.top_patterns[0]).toBe('Pattern A (count 10)');
      expect(codeStyleSummary?.top_patterns[1]).toBe('Pattern B (count 8)');
      expect(codeStyleSummary?.top_patterns[2]).toBe('Pattern C (count 6)');
    });
  });

  // ============================================================================
  // FREQUENCY TREND DETECTION BUSINESS LOGIC
  // ============================================================================

  describe('Frequency Trend Detection Business Logic', () => {
    test('should detect increasing trend for accelerating patterns', () => {
      // Given: Pattern with increasing frequency over time
      const pattern = createMockPattern({
        count: 6,
        examples: [
          // First half: 2 examples in 60 minutes
          createMockExample('2026-03-17T10:00:00Z'),
          createMockExample('2026-03-17T11:00:00Z'),
          // Second half: 4 examples in 30 minutes (accelerating)
          createMockExample('2026-03-17T11:30:00Z'),
          createMockExample('2026-03-17T11:40:00Z'),
          createMockExample('2026-03-17T11:50:00Z'),
          createMockExample('2026-03-17T12:00:00Z'),
        ],
      });

      // When: Detect trend
      const analyzer = new FrequencyAnalyzer();
      const trend = analyzer.detectFrequencyTrend(pattern);

      // Then: Should be increasing
      // Ratio: 4/30min vs 2/60min = 4/0.5 vs 2/1 = 8 vs 2 = 4.0 >= 1.5
      expect(trend).toBe('increasing');
    });

    test('should detect decreasing trend for decelerating patterns', () => {
      // Given: Pattern with decreasing frequency over time
      const pattern = createMockPattern({
        count: 6,
        examples: [
          // First half: 4 examples in 30 minutes
          createMockExample('2026-03-17T10:00:00Z'),
          createMockExample('2026-03-17T10:10:00Z'),
          createMockExample('2026-03-17T10:20:00Z'),
          createMockExample('2026-03-17T10:30:00Z'),
          // Second half: 2 examples in 60 minutes (decelerating)
          createMockExample('2026-03-17T11:00:00Z'),
          createMockExample('2026-03-17T12:00:00Z'),
        ],
      });

      // When: Detect trend
      const analyzer = new FrequencyAnalyzer();
      const trend = analyzer.detectFrequencyTrend(pattern);

      // Then: Should be decreasing
      // Ratio: 2/60min vs 4/30min = 2/1 vs 4/0.5 = 2 vs 8 = 0.25 <= 0.67
      expect(trend).toBe('decreasing');
    });

    test('should detect stable trend for consistent patterns', () => {
      // Given: Pattern with consistent frequency
      const pattern = createMockPattern({
        count: 4,
        examples: [
          createMockExample('2026-03-17T10:00:00Z'),
          createMockExample('2026-03-17T10:30:00Z'),
          createMockExample('2026-03-17T11:00:00Z'),
          createMockExample('2026-03-17T11:30:00Z'),
        ],
      });

      // When: Detect trend
      const analyzer = new FrequencyAnalyzer();
      const trend = analyzer.detectFrequencyTrend(pattern);

      // Then: Should be stable
      // Ratio: 2/30min vs 2/30min = 1.0 (not >= 1.5 and not <= 0.67)
      expect(trend).toBe('stable');
    });

    test('should return stable for patterns with count < 3', () => {
      // Given: Pattern with only 2 occurrences
      const pattern = createMockPattern({
        count: 2,
        examples: [
          createMockExample('2026-03-17T10:00:00Z'),
          createMockExample('2026-03-17T11:00:00Z'),
        ],
      });

      // When: Detect trend
      const analyzer = new FrequencyAnalyzer();
      const trend = analyzer.detectFrequencyTrend(pattern);

      // Then: Should be stable (insufficient data)
      expect(trend).toBe('stable');
    });
  });
});

// ============================================================================
// TEST HELPER FUNCTIONS
// ============================================================================

/**
 * Helper function to create mock Pattern objects
 */
function createMockPattern(overrides: Partial<Pattern> = {}): Pattern {
  const defaultPattern: Pattern = {
    pattern_text: 'Default pattern',
    count: 2,
    category: PatternCategory.OTHER,
    examples: [],
    suggested_rule: 'Default rule',
    first_seen: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    content_types: [ContentType.GENERAL_TEXT],
  };
  return { ...defaultPattern, ...overrides };
}

/**
 * Helper function to create mock PatternExample objects
 */
function createMockExample(
  timestamp: string,
  contentType: ContentType = ContentType.GENERAL_TEXT
): PatternExample {
  return {
    original_suggestion: 'AI suggestion',
    user_correction: 'User correction',
    context: 'Test context',
    timestamp,
    content_type: contentType,
  };
}

/**
 * Create mock PatternDetector output simulating Story 2.4 results
 */
function createMockPatternDetectorOutput(): Pattern[] {
  return [
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
      pattern_text: 'Organize files by feature',
      count: 2,
      category: PatternCategory.STRUCTURE,
    }),
    createMockPattern({
      pattern_text: 'Use 2 spaces for indentation',
      count: 4,
      category: PatternCategory.FORMATTING,
    }),
    createMockPattern({
      pattern_text: 'Follow Prettier rules',
      count: 2,
      category: PatternCategory.CONVENTION,
    }),
    createMockPattern({
      pattern_text: 'Other pattern',
      count: 2,
      category: PatternCategory.OTHER,
    }),
  ];
}

/**
 * Create realistic PatternDetector output for integration testing
 */
function createRealisticPatternDetectorOutput(): Pattern[] {
  return [
    createMockPattern({
      pattern_text: 'Use camelCase instead of snake_case for variable names',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [
        createMockExample('2026-03-17T10:00:00Z', ContentType.CODE),
        createMockExample('2026-03-17T10:30:00Z', ContentType.CODE),
      ],
      suggested_rule: 'Use camelCase instead of snake_case for variable names',
      first_seen: '2026-03-17T10:00:00Z',
      last_seen: '2026-03-17T11:30:00Z',
      content_types: [ContentType.CODE],
    }),
    createMockPattern({
      pattern_text: 'Use async/await instead of Promise chains',
      count: 3,
      category: PatternCategory.CODE_STYLE,
      examples: [
        createMockExample('2026-03-17T10:15:00Z', ContentType.CODE),
      ],
      suggested_rule: 'Use async/await instead of Promise chains',
      first_seen: '2026-03-17T10:15:00Z',
      last_seen: '2026-03-17T11:00:00Z',
      content_types: [ContentType.CODE],
    }),
    createMockPattern({
      pattern_text: 'Use API instead of Api in documentation',
      count: 4,
      category: PatternCategory.TERMINOLOGY,
      examples: [
        createMockExample('2026-03-17T10:20:00Z', ContentType.DOCUMENTATION),
      ],
      suggested_rule: 'Use API instead of Api in documentation',
      first_seen: '2026-03-17T10:20:00Z',
      last_seen: '2026-03-17T11:15:00Z',
      content_types: [ContentType.DOCUMENTATION],
    }),
    createMockPattern({
      pattern_text: 'Add semicolons to statements',
      count: 2,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Add semicolons to statements',
      first_seen: '2026-03-17T10:45:00Z',
      last_seen: '2026-03-17T11:00:00Z',
      content_types: [ContentType.CODE],
    }),
  ];
}

/**
 * Helper function for "Then" test descriptions
 * Uses Jest test function with BDD-style naming
 */
function testThen(description: string, testFn: () => void) {
  return test(description, testFn);
}
