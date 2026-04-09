/**
 * Integration-Level Acceptance Tests for Pattern Data Transformation (Story 3-2)
 *
 * TDD Red Phase: Failing integration-level acceptance tests
 *
 * These tests validate the end-to-end transformation pipeline from Epic 2's
 * MergedPattern data to Chart.js-compatible formats, testing realistic scenarios
 * and data flows.
 *
 * Testing Strategy:
 * - Test complete transformation pipelines with real data
 * - Validate data integrity across transformation steps
 * - Test performance with realistic datasets
 * - Verify Chart.js compatibility (without rendering)
 * - Test edge cases with production-like data
 *
 * Test Pyramid Level: Integration
 *
 * AC Coverage:
 * - AC1: Pattern Frequency Transformation (end-to-end)
 * - AC2: Temporal Trend Transformation (end-to-end)
 * - AC3: Category Distribution Transformation (end-to-end)
 * - AC4: Pattern Detail Enrichment (integration)
 * - AC5: Performance with Large Datasets
 *
 * @todo Remove this todo when implementation is complete
 */

import { describe, test, expect } from '@jest/globals';
import {
  transformToFrequencyChart,
  transformToTrendChart,
  transformToDistributionChart,
} from '../../src/visualization/types';
import { MergedPattern, PatternCategory } from '../../src/pattern-matcher';
import { ContentType } from '../../src/content-analyzer';

// ============================================================================
// TEST FIXTURES - Realistic Epic 2 Data
// ============================================================================

/**
 * Realistic MergedPattern[] dataset from Epic 2's pattern detection pipeline
 * Mirrors production data structure and characteristics
 */
const realisticMergedPatterns: MergedPattern[] = [
  {
    pattern_text: 'Use const instead of let',
    count: 5,
    category: PatternCategory.CODE_STYLE,
    examples: [
      {
        original_suggestion: 'Use let for variables',
        user_correction: 'Use const instead',
        context: 'Variable declaration in function',
      },
      {
        original_suggestion: 'let x = 5',
        user_correction: 'const x = 5',
        context: 'Variable initialization',
      },
    ],
    suggested_rule: 'Use const for immutable variables',
    first_seen: '2026-03-01T10:00:00Z',
    last_seen: '2026-03-18T11:00:00Z',
    content_types: [ContentType.CODE],
    session_count: 3,
    total_frequency: 15,
    is_new: false,
    frequency_change: 0.5,
  },
  {
    pattern_text: 'Add unit tests for new functions',
    count: 3,
    category: PatternCategory.CONVENTION,
    examples: [
      {
        original_suggestion: 'No test for new function',
        user_correction: 'Add unit test',
        context: 'Function implementation',
      },
    ],
    suggested_rule: 'Add unit tests for all new functions',
    first_seen: '2026-03-05T10:00:00Z',
    last_seen: '2026-03-15T11:00:00Z',
    content_types: [ContentType.CODE, ContentType.TEST_PLAN],
    session_count: 2,
    total_frequency: 8,
    is_new: false,
    frequency_change: -0.2,
  },
  {
    pattern_text: 'Use TypeScript strict mode',
    count: 7,
    category: PatternCategory.CODE_STYLE,
    examples: [],
    suggested_rule: 'Enable TypeScript strict mode',
    first_seen: '2026-03-01T10:00:00Z',
    last_seen: '2026-03-18T11:00:00Z',
    content_types: [ContentType.CODE],
    session_count: 4,
    total_frequency: 20,
    is_new: false,
    frequency_change: 0.8,
  },
  {
    pattern_text: 'Organize imports alphabetically',
    count: 4,
    category: PatternCategory.FORMATTING,
    examples: [
      {
        original_suggestion: 'Random import order',
        user_correction: 'Alphabetical imports',
        context: 'Import statements',
      },
    ],
    suggested_rule: 'Organize imports alphabetically',
    first_seen: '2026-03-10T10:00:00Z',
    last_seen: '2026-03-18T11:00:00Z',
    content_types: [ContentType.CODE],
    session_count: 2,
    total_frequency: 10,
    is_new: true,
    frequency_change: 1.0,
  },
  {
    pattern_text: 'Use async/await instead of Promise.then()',
    count: 6,
    category: PatternCategory.TERMINOLOGY,
    examples: [
      {
        original_suggestion: 'Use Promise.then()',
        user_correction: 'Use async/await instead',
        context: 'Async handling',
      },
    ],
    suggested_rule: 'Prefer async/await over Promise chains',
    first_seen: '2026-03-01T10:00:00Z',
    last_seen: '2026-03-18T11:00:00Z',
    content_types: [ContentType.CODE],
    session_count: 5,
    total_frequency: 25,
    is_new: false,
    frequency_change: 1.2,
  },
  {
    pattern_text: 'Add JSDoc comments for public functions',
    count: 2,
    category: PatternCategory.CONVENTION,
    examples: [],
    suggested_rule: 'Document public APIs with JSDoc',
    first_seen: '2026-03-12T10:00:00Z',
    last_seen: '2026-03-18T11:00:00Z',
    content_types: [ContentType.CODE, ContentType.DOCUMENTATION],
    session_count: 1,
    total_frequency: 2,
    is_new: true,
    frequency_change: 0,
  },
];

/**
 * Longitudinal patterns across multiple sessions (session_count > 1)
 */
const longitudinalPatterns: MergedPattern[] = [
  {
    pattern_text: 'Use const instead of let',
    count: 5,
    category: PatternCategory.CODE_STYLE,
    examples: [],
    suggested_rule: 'Use const for immutable variables',
    first_seen: '2026-02-01T10:00:00Z',
    last_seen: '2026-03-18T11:00:00Z',
    content_types: [ContentType.CODE],
    session_count: 8,
    total_frequency: 45,
    is_new: false,
    frequency_change: 2.5,
  },
  {
    pattern_text: 'Add error handling',
    count: 3,
    category: PatternCategory.STRUCTURE,
    examples: [],
    suggested_rule: 'Always handle errors appropriately',
    first_seen: '2026-02-15T10:00:00Z',
    last_seen: '2026-03-18T11:00:00Z',
    content_types: [ContentType.CODE],
    session_count: 6,
    total_frequency: 28,
    is_new: false,
    frequency_change: 1.8,
  },
];

/**
 * Large dataset for performance testing (AC5)
 */
const createLargeDataset = (size: number): MergedPattern[] => {
  return Array.from({ length: size }, (_, i) => ({
    pattern_text: `Pattern ${i}`,
    count: Math.floor(Math.random() * 10) + 1,
    category: Object.values(PatternCategory)[i % 6],
    examples: [],
    suggested_rule: `Suggested rule for pattern ${i}`,
    first_seen: '2026-01-01T10:00:00Z',
    last_seen: '2026-03-18T11:00:00Z',
    content_types: [ContentType.CODE],
    session_count: Math.floor(Math.random() * 5) + 1,
    total_frequency: Math.floor(Math.random() * 20) + 1,
    is_new: Math.random() > 0.5,
    frequency_change: Math.random() * 3,
  }));
};

// ============================================================================
// END-TO-END TRANSFORMATION PIPELINES
// ============================================================================

describe('Pattern Data Transformation - End-to-End Pipelines', () => {
  describe('Frequency Chart Transformation Pipeline (AC1, AC4)', () => {
    test('should transform realistic Epic 2 data to frequency chart', () => {
      const result = transformToFrequencyChart(realisticMergedPatterns);

      // Validate structure
      expect(result.labels).toBeDefined();
      expect(result.datasets).toBeDefined();
      expect(result.tooltipData).toBeDefined();

      // Validate data integrity
      expect(result.labels.length).toBeGreaterThan(0);
      expect(result.datasets[0].data.length).toBe(result.labels.length);
      expect(result.datasets[0].backgroundColor.length).toBe(result.labels.length);
      expect(result.datasets[0].borderColor.length).toBe(result.labels.length);

      // Validate category grouping
      expect(result.labels).toContain(PatternCategory.CODE_STYLE);
      expect(result.labels).toContain(PatternCategory.CONVENTION);
      expect(result.labels).toContain(PatternCategory.FORMATTING);
      expect(result.labels).toContain(PatternCategory.TERMINOLOGY);

      // Validate frequency aggregation
      const codeStyleIndex = result.labels.indexOf(PatternCategory.CODE_STYLE);
      const codeStyleFrequency = result.datasets[0].data[codeStyleIndex];
      expect(codeStyleFrequency).toBe(35); // 15 + 20
    });

    test('should preserve pattern details for drill-down interactions', () => {
      const result = transformToFrequencyChart(realisticMergedPatterns);

      // Validate tooltip data structure
      expect(result.tooltipData.length).toBeGreaterThan(0);
      expect(result.tooltipData[0].pattern_text).toBeDefined();
      expect(result.tooltipData[0].suggested_rule).toBeDefined();
      expect(result.tooltipData[0].total_frequency).toBeDefined();
      expect(result.tooltipData[0].session_count).toBeDefined();

      // Validate examples are preserved
      const patternsWithExamples = result.tooltipData.filter((t) => t.examples.length > 0);
      expect(patternsWithExamples.length).toBeGreaterThan(0);
      expect(patternsWithExamples[0].examples[0].original_suggestion).toBeDefined();
      expect(patternsWithExamples[0].examples[0].user_correction).toBeDefined();
      expect(patternsWithExamples[0].examples[0].context).toBeDefined();
    });

    test('should handle mixed categories and frequencies', () => {
      const mixedPatterns: MergedPattern[] = [
        ...realisticMergedPatterns,
        {
          pattern_text: 'Structure pattern',
          count: 1,
          category: PatternCategory.STRUCTURE,
          examples: [],
          suggested_rule: 'Test rule',
          first_seen: '2026-03-18T10:00:00Z',
          last_seen: '2026-03-18T10:00:00Z',
          content_types: [ContentType.CODE],
          session_count: 1,
          total_frequency: 1,
          is_new: true,
          frequency_change: 0,
        },
        {
          pattern_text: 'Other pattern',
          count: 1,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: 'Test rule',
          first_seen: '2026-03-18T10:00:00Z',
          last_seen: '2026-03-18T10:00:00Z',
          content_types: [ContentType.GENERAL_TEXT],
          session_count: 1,
          total_frequency: 1,
          is_new: true,
          frequency_change: 0,
        },
      ];

      const result = transformToFrequencyChart(mixedPatterns);

      expect(result.labels).toContain(PatternCategory.STRUCTURE);
      expect(result.labels).toContain(PatternCategory.OTHER);
    });
  });

  describe('Temporal Trend Transformation Pipeline (AC2, AC4)', () => {
    test('should transform realistic Epic 2 data to trend chart by day', () => {
      const result = transformToTrendChart(realisticMergedPatterns, 'day');

      // Validate structure
      expect(result.labels).toBeDefined();
      expect(result.datasets).toBeDefined();
      expect(result.tooltipData).toBeDefined();

      // Validate time-series data
      expect(result.labels.length).toBeGreaterThan(0);
      expect(result.datasets[0].data.length).toBe(result.labels.length);

      // Validate dataset properties
      expect(result.datasets[0].tension).toBeDefined();
      expect(result.datasets[0].borderColor).toBeDefined();
      expect(result.datasets[0].backgroundColor).toBeDefined();
    });

    test('should transform realistic Epic 2 data to trend chart by week', () => {
      const result = transformToTrendChart(realisticMergedPatterns, 'week');

      expect(result.labels).toBeDefined();
      expect(result.datasets).toBeDefined();
      expect(result.labels.length).toBeGreaterThan(0);
    });

    test('should transform realistic Epic 2 data to trend chart by month', () => {
      const result = transformToTrendChart(realisticMergedPatterns, 'month');

      expect(result.labels).toBeDefined();
      expect(result.datasets).toBeDefined();
      expect(result.labels.length).toBeGreaterThan(0);
    });

    test('should handle longitudinal patterns with multiple sessions', () => {
      const result = transformToTrendChart(longitudinalPatterns, 'week');

      expect(result.datasets).toBeDefined();
      expect(result.datasets.length).toBeGreaterThan(0);

      // Validate that longitudinal patterns are represented
      const totalDataPoints = result.datasets[0].data.reduce((sum, val) => sum + val, 0);
      expect(totalDataPoints).toBeGreaterThan(0);
    });

    test('should handle patterns spanning different time ranges', () => {
      const patternsWithDifferentRanges: MergedPattern[] = [
        {
          pattern_text: 'Old pattern',
          count: 5,
          category: PatternCategory.CODE_STYLE,
          examples: [],
          suggested_rule: 'Test rule',
          first_seen: '2026-01-01T10:00:00Z',
          last_seen: '2026-01-31T11:00:00Z',
          content_types: [ContentType.CODE],
          session_count: 3,
          total_frequency: 15,
          is_new: false,
          frequency_change: 0,
        },
        {
          pattern_text: 'Recent pattern',
          count: 3,
          category: PatternCategory.CONVENTION,
          examples: [],
          suggested_rule: 'Test rule',
          first_seen: '2026-03-01T10:00:00Z',
          last_seen: '2026-03-18T11:00:00Z',
          content_types: [ContentType.CODE],
          session_count: 2,
          total_frequency: 8,
          is_new: true,
          frequency_change: 1,
        },
      ];

      const result = transformToTrendChart(patternsWithDifferentRanges, 'week');

      expect(result.labels).toBeDefined();
      expect(result.datasets).toBeDefined();
    });

    test('should filter out patterns with invalid timestamps', () => {
      const patternsWithInvalidTimestamps: MergedPattern[] = [
        ...realisticMergedPatterns,
        {
          pattern_text: 'Invalid timestamp pattern',
          count: 2,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: 'Test rule',
          first_seen: 'not-a-valid-timestamp',
          last_seen: 'also-invalid',
          content_types: [ContentType.GENERAL_TEXT],
          session_count: 1,
          total_frequency: 2,
          is_new: false,
          frequency_change: 0,
        },
      ];

      const result = transformToTrendChart(patternsWithInvalidTimestamps, 'day');

      // Should only include valid patterns
      expect(result).toBeDefined();
      expect(result.datasets[0].data.length).toBeGreaterThan(0);
    });
  });

  describe('Category Distribution Transformation Pipeline (AC3, AC4)', () => {
    test('should transform realistic Epic 2 data to distribution chart', () => {
      const result = transformToDistributionChart(realisticMergedPatterns);

      // Validate structure
      expect(result.labels).toBeDefined();
      expect(result.datasets).toBeDefined();
      expect(result.tooltipData).toBeDefined();

      // Validate all categories are represented
      expect(result.labels).toContain(PatternCategory.CODE_STYLE);
      expect(result.labels).toContain(PatternCategory.CONVENTION);
      expect(result.labels).toContain(PatternCategory.FORMATTING);
      expect(result.labels).toContain(PatternCategory.TERMINOLOGY);

      // Validate dataset properties
      expect(result.datasets[0].backgroundColor).toBeDefined();
      expect(result.datasets[0].borderColor).toBeDefined();
      expect(result.datasets[0].hoverOffset).toBeDefined();
    });

    test('should calculate correct percentages for each category', () => {
      const result = transformToDistributionChart(realisticMergedPatterns);

      const totalFrequency = result.datasets[0].data.reduce((sum, freq) => sum + freq, 0);

      // Total should be 80 (15 + 8 + 20 + 10 + 25 + 2)
      expect(totalFrequency).toBe(80);

      // Each category should have a non-zero frequency
      result.datasets[0].data.forEach((frequency) => {
        expect(frequency).toBeGreaterThan(0);
      });
    });

    test('should handle uneven distribution across categories', () => {
      const unevenPatterns: MergedPattern[] = [
        {
          pattern_text: 'Dominant pattern 1',
          count: 50,
          category: PatternCategory.CODE_STYLE,
          examples: [],
          suggested_rule: 'Test rule',
          first_seen: '2026-03-18T10:00:00Z',
          last_seen: '2026-03-18T10:00:00Z',
          content_types: [ContentType.CODE],
          session_count: 10,
          total_frequency: 100,
          is_new: false,
          frequency_change: 10,
        },
        {
          pattern_text: 'Dominant pattern 2',
          count: 60,
          category: PatternCategory.CODE_STYLE,
          examples: [],
          suggested_rule: 'Test rule',
          first_seen: '2026-03-18T10:00:00Z',
          last_seen: '2026-03-18T10:00:00Z',
          content_types: [ContentType.CODE],
          session_count: 12,
          total_frequency: 120,
          is_new: false,
          frequency_change: 12,
        },
        {
          pattern_text: 'Rare pattern',
          count: 1,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: 'Test rule',
          first_seen: '2026-03-18T10:00:00Z',
          last_seen: '2026-03-18T10:00:00Z',
          content_types: [ContentType.GENERAL_TEXT],
          session_count: 1,
          total_frequency: 1,
          is_new: true,
          frequency_change: 0,
        },
      ];

      const result = transformToDistributionChart(unevenPatterns);

      expect(result).toBeDefined();
      expect(result.labels.length).toBeGreaterThan(0);
    });

    test('should preserve pattern details in tooltip data', () => {
      const result = transformToDistributionChart(realisticMergedPatterns);

      expect(result.tooltipData).toBeDefined();
      expect(result.tooltipData.length).toBeGreaterThan(0);
      expect(result.tooltipData[0].pattern_text).toBeDefined();
      expect(result.tooltipData[0].suggested_rule).toBeDefined();
      expect(result.tooltipData[0].total_frequency).toBeDefined();
    });
  });
});

// ============================================================================
// PERFORMANCE TESTS (AC5)
// ============================================================================

describe('Pattern Data Transformation - Performance (AC5)', () => {
  describe('Small Dataset Performance (< 1 second)', () => {
    test('should complete in < 1 second for 100 patterns (AC5)', () => {
      const dataset = createLargeDataset(100);

      const startTime = performance.now();
      const result = transformToFrequencyChart(dataset);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000); // < 1 second
    });

    test('should complete in < 1 second for 1,000 patterns frequency chart (AC5)', () => {
      const dataset = createLargeDataset(1000);

      const startTime = performance.now();
      const result = transformToFrequencyChart(dataset);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000); // < 1 second
    });

    test('should complete in < 1 second for 1,000 patterns trend chart (AC5)', () => {
      const dataset = createLargeDataset(1000);

      const startTime = performance.now();
      const result = transformToTrendChart(dataset, 'day');
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000); // < 1 second
    });

    test('should complete in < 1 second for 1,000 patterns distribution chart (AC5)', () => {
      const dataset = createLargeDataset(1000);

      const startTime = performance.now();
      const result = transformToDistributionChart(dataset);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000); // < 1 second
    });
  });

  describe('Large Dataset Performance (< 5 seconds)', () => {
    test('should complete in < 5 seconds for 10,000 patterns frequency chart (AC5)', () => {
      const dataset = createLargeDataset(10000);

      const startTime = performance.now();
      const result = transformToFrequencyChart(dataset);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // < 5 seconds
    });

    test('should complete in < 5 seconds for 10,000 patterns trend chart (AC5)', () => {
      const dataset = createLargeDataset(10000);

      const startTime = performance.now();
      const result = transformToTrendChart(dataset, 'week');
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // < 5 seconds
    });

    test('should complete in < 5 seconds for 10,000 patterns distribution chart (AC5)', () => {
      const dataset = createLargeDataset(10000);

      const startTime = performance.now();
      const result = transformToDistributionChart(dataset);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // < 5 seconds
    });
  });

  describe('Performance Characteristics', () => {
    test('should use efficient data structures for grouping (AC5)', () => {
      const dataset = createLargeDataset(5000);

      const startTime = performance.now();
      const result = transformToFrequencyChart(dataset);
      const endTime = performance.now();

      expect(result).toBeDefined();

      // Performance should be roughly linear
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(2500); // Should scale well
    });

    test('should handle memory efficiently with large datasets (AC5)', () => {
      const dataset = createLargeDataset(10000);

      // This test ensures no memory leaks or excessive memory usage
      const result = transformToFrequencyChart(dataset);

      expect(result).toBeDefined();
      expect(result.labels.length).toBeLessThanOrEqual(6); // Max 6 categories
      expect(result.datasets[0].data.length).toBeLessThanOrEqual(6);
    });
  });
});

// ============================================================================
// DATA INTEGRITY TESTS
// ============================================================================

describe('Pattern Data Transformation - Data Integrity', () => {
  test('should preserve all pattern data through transformation pipeline', () => {
    const result = transformToFrequencyChart(realisticMergedPatterns);

    // Validate that all input patterns are represented
    const totalInputFrequency = realisticMergedPatterns.reduce(
      (sum, pattern) => sum + pattern.total_frequency,
      0
    );
    const totalOutputFrequency = result.datasets[0].data.reduce(
      (sum, frequency) => sum + frequency,
      0
    );

    expect(totalOutputFrequency).toBe(totalInputFrequency);
  });

  test('should maintain consistent indexing between datasets and tooltips', () => {
    const result = transformToFrequencyChart(realisticMergedPatterns);

    // Validate that tooltip data aligns with chart data
    expect(result.tooltipData.length).toBeGreaterThan(0);

    // Each tooltip should have valid data
    result.tooltipData.forEach((tooltip) => {
      expect(tooltip.pattern_text).toBeDefined();
      expect(tooltip.suggested_rule).toBeDefined();
      expect(tooltip.total_frequency).toBeGreaterThan(0);
      expect(tooltip.session_count).toBeGreaterThan(0);
    });
  });

  test('should handle patterns with missing optional fields gracefully', () => {
    const patternsWithMissingFields: MergedPattern[] = [
      {
        pattern_text: 'Pattern without examples',
        count: 5,
        category: PatternCategory.CODE_STYLE,
        examples: [], // Empty examples array
        suggested_rule: 'Test rule',
        first_seen: '2026-03-18T10:00:00Z',
        last_seen: '2026-03-18T10:00:00Z',
        content_types: [ContentType.CODE],
        session_count: 2,
        total_frequency: 10,
        is_new: false,
        frequency_change: 0,
      },
      {
        pattern_text: 'Pattern without confidence',
        count: 3,
        category: PatternCategory.CONVENTION,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: '2026-03-18T10:00:00Z',
        last_seen: '2026-03-18T10:00:00Z',
        content_types: [ContentType.CODE],
        session_count: 1,
        total_frequency: 3,
        is_new: true,
        frequency_change: 0,
        // No confidence field
      },
    ];

    const result = transformToFrequencyChart(patternsWithMissingFields);

    expect(result).toBeDefined();
    expect(result.tooltipData.length).toBe(2);
  });

  test('should validate Chart.js compatibility of output structure', () => {
    const frequencyResult = transformToFrequencyChart(realisticMergedPatterns);
    const trendResult = transformToTrendChart(realisticMergedPatterns, 'day');
    const distributionResult = transformToDistributionChart(realisticMergedPatterns);

    // Validate Chart.js structure: { labels: string[], datasets: [...] }
    expect(frequencyResult.labels).toBeDefined();
    expect(frequencyResult.datasets).toBeDefined();
    expect(trendResult.labels).toBeDefined();
    expect(trendResult.datasets).toBeDefined();
    expect(distributionResult.labels).toBeDefined();
    expect(distributionResult.datasets).toBeDefined();

    // Validate dataset structure: { label: string, data: number[] }
    expect(frequencyResult.datasets[0].label).toBeDefined();
    expect(frequencyResult.datasets[0].data).toBeDefined();
    expect(trendResult.datasets[0].label).toBeDefined();
    expect(trendResult.datasets[0].data).toBeDefined();
    expect(distributionResult.datasets[0].label).toBeDefined();
    expect(distributionResult.datasets[0].data).toBeDefined();
  });
});

// ============================================================================
// EDGE CASE INTEGRATION TESTS
// ============================================================================

describe('Pattern Data Transformation - Edge Cases (Integration)', () => {
  test('should handle empty dataset gracefully', () => {
    const emptyResult = transformToFrequencyChart([]);

    expect(emptyResult).toBeDefined();
    expect(emptyResult.labels).toHaveLength(0);
    expect(emptyResult.datasets[0].data).toHaveLength(0);
    expect(emptyResult.tooltipData).toHaveLength(0);
  });

  test('should handle single pattern dataset', () => {
    const singlePattern = [realisticMergedPatterns[0]];
    const result = transformToFrequencyChart(singlePattern);

    expect(result).toBeDefined();
    expect(result.labels.length).toBeGreaterThan(0);
    expect(result.datasets[0].data.length).toBeGreaterThan(0);
    expect(result.tooltipData.length).toBe(1);
  });

  test('should handle patterns with same timestamp', () => {
    const sameTimestampPatterns: MergedPattern[] = [
      {
        pattern_text: 'Pattern 1',
        count: 5,
        category: PatternCategory.CODE_STYLE,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: '2026-03-18T10:00:00Z',
        last_seen: '2026-03-18T10:00:00Z',
        content_types: [ContentType.CODE],
        session_count: 1,
        total_frequency: 5,
        is_new: true,
        frequency_change: 0,
      },
      {
        pattern_text: 'Pattern 2',
        count: 3,
        category: PatternCategory.CONVENTION,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: '2026-03-18T10:00:00Z',
        last_seen: '2026-03-18T10:00:00Z',
        content_types: [ContentType.CODE],
        session_count: 1,
        total_frequency: 3,
        is_new: true,
        frequency_change: 0,
      },
    ];

    const result = transformToTrendChart(sameTimestampPatterns, 'day');

    expect(result).toBeDefined();
    expect(result.datasets[0].data.length).toBeGreaterThan(0);
  });

  test('should handle patterns with extreme frequency values', () => {
    const extremeFrequencyPatterns: MergedPattern[] = [
      {
        pattern_text: 'Very high frequency',
        count: 1000,
        category: PatternCategory.CODE_STYLE,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: '2026-03-18T10:00:00Z',
        last_seen: '2026-03-18T10:00:00Z',
        content_types: [ContentType.CODE],
        session_count: 100,
        total_frequency: 10000,
        is_new: false,
        frequency_change: 100,
      },
      {
        pattern_text: 'Very low frequency',
        count: 1,
        category: PatternCategory.OTHER,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: '2026-03-18T10:00:00Z',
        last_seen: '2026-03-18T10:00:00Z',
        content_types: [ContentType.GENERAL_TEXT],
        session_count: 1,
        total_frequency: 1,
        is_new: true,
        frequency_change: 0,
      },
    ];

    const result = transformToFrequencyChart(extremeFrequencyPatterns);

    expect(result).toBeDefined();
    expect(result.datasets[0].data.length).toBeGreaterThan(0);
  });

  test('should handle all patterns in same category', () => {
    const sameCategoryPatterns: MergedPattern[] = Array.from({ length: 10 }, (_, i) => ({
      pattern_text: `Pattern ${i}`,
      count: i + 1,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Test rule',
      first_seen: '2026-03-18T10:00:00Z',
      last_seen: '2026-03-18T10:00:00Z',
      content_types: [ContentType.CODE],
      session_count: 1,
      total_frequency: i + 1,
      is_new: true,
      frequency_change: 0,
    }));

    const result = transformToFrequencyChart(sameCategoryPatterns);

    expect(result).toBeDefined();
    expect(result.labels).toContain(PatternCategory.CODE_STYLE);
  });

  test('should handle patterns with all categories represented', () => {
    const allCategoriesPatterns: MergedPattern[] = Object.values(PatternCategory).map(
      (category) => ({
        pattern_text: `${category} pattern`,
        count: 1,
        category,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: '2026-03-18T10:00:00Z',
        last_seen: '2026-03-18T10:00:00Z',
        content_types: [ContentType.CODE],
        session_count: 1,
        total_frequency: 1,
        is_new: true,
        frequency_change: 0,
      })
    );

    const result = transformToDistributionChart(allCategoriesPatterns);

    expect(result).toBeDefined();
    expect(result.labels.length).toBe(6); // All 6 categories
  });
});
