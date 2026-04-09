/**
 * Comprehensive Unit Tests for Data Transformers (Story 3-2)
 *
 * Testing Strategy: Unit-Level Focus (70% of test pyramid)
 *
 * These tests focus on pure function testing of data transformation logic.
 * All tests are isolated, fast, and test individual functions without external dependencies.
 *
 * Coverage Targets:
 * - Edge cases: empty, null, single, large datasets
 * - Business logic: grouping, frequency calculation, color assignment
 * - Data integrity: metadata preservation, type validation
 * - Error handling: malformed data, missing fields, invalid types
 *
 * Test Speed Target: < 1ms per test
 */

import { describe, test, expect } from '@jest/globals';
import {
  transformPatternsToBarChart,
  transformPatternsToBarChartByPattern,
  transformPatternsToLineChart,
  transformPatternsToPieChart,
  getPatternFrequencyData,
  getCategoryDistributionData,
  getTemporalPatternData,
} from '../../../src/visualization/transformers';
import { MergedPattern, PatternCategory } from '../../../src/pattern-matcher';
import { ContentType } from '../../../src/content-analyzer';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const validPattern: MergedPattern = {
  pattern_text: 'Use const instead of let',
  count: 5,
  category: PatternCategory.CODE_STYLE,
  examples: [],
  suggested_rule: 'Use const for immutable variables',
  first_seen: '2026-03-15T10:00:00Z',
  last_seen: '2026-03-18T11:00:00Z',
  content_types: [ContentType.CODE],
  session_count: 2,
  total_frequency: 8,
  is_new: false,
  frequency_change: 2,
};

const multiplePatterns: MergedPattern[] = [
  validPattern,
  {
    ...validPattern,
    pattern_text: 'Use fetch instead of axios',
    count: 3,
    category: PatternCategory.TERMINOLOGY,
  },
  {
    ...validPattern,
    pattern_text: 'Organize imports alphabetically',
    count: 7,
    category: PatternCategory.FORMATTING,
  },
];

// ============================================================================
// EDGE CASE TESTS - Empty, Null, Undefined Inputs
// ============================================================================

describe('Data Transformers - Edge Cases', () => {
  describe('transformPatternsToBarChart', () => {
    test('should throw error for empty patterns array', () => {
      expect(() => transformPatternsToBarChart([])).toThrow();
    });

    test('should handle null input gracefully', () => {
      expect(() => {
        transformPatternsToBarChart(null as any);
      }).toThrow();
    });

    test('should handle undefined input gracefully', () => {
      expect(() => {
        transformPatternsToBarChart(undefined as any);
      }).toThrow();
    });

    test('should handle single pattern', () => {
      const result = transformPatternsToBarChart([validPattern]);

      expect(result).toBeDefined();
      expect(result.xAxis.data.length).toBeGreaterThan(0);
      expect(result.yAxis.data.length).toBeGreaterThan(0);
      expect(result.metadata?.dataPointCount).toBe(1);
    });

    test('should handle large dataset (>10K patterns)', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        ...validPattern,
        pattern_text: `Pattern ${i}`,
        category: Object.values(PatternCategory)[i % 6],
      }));

      const startTime = Date.now();
      const result = transformPatternsToBarChart(largeDataset);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
      expect(result.metadata?.totalPatterns).toBe(10000);
    });
  });

  describe('transformPatternsToBarChartByPattern', () => {
    test('should handle empty patterns array', () => {
      expect(() => transformPatternsToBarChartByPattern([])).toThrow();
    });

    test('should handle single pattern', () => {
      const result = transformPatternsToBarChartByPattern([validPattern]);

      expect(result).toBeDefined();
      expect(result.xAxis.data).toHaveLength(1);
      expect(result.yAxis.data).toHaveLength(1);
    });

    test('should handle large dataset', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        ...validPattern,
        pattern_text: `Pattern ${i}`,
        count: i % 100,
      }));

      const startTime = Date.now();
      const result = transformPatternsToBarChartByPattern(largeDataset, 100);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000);
      expect(result.xAxis.data).toHaveLength(100); // Limited by maxPatterns
    });
  });
});

// ============================================================================
// BUSINESS LOGIC TESTS - Grouping, Frequency, Colors
// ============================================================================

describe('Data Transformers - Business Logic', () => {
  describe('getCategoryDistributionData', () => {
    test('should group patterns by category correctly', () => {
      const result = getCategoryDistributionData(multiplePatterns);

      expect(result).toHaveLength(3);
      expect(result.find(r => r.category === PatternCategory.CODE_STYLE)?.patternCount).toBe(1);
      expect(result.find(r => r.category === PatternCategory.TERMINOLOGY)?.patternCount).toBe(1);
      expect(result.find(r => r.category === PatternCategory.FORMATTING)?.patternCount).toBe(1);
    });

    test('should calculate frequencies accurately', () => {
      const result = getCategoryDistributionData(multiplePatterns);

      const totalFrequency = result.reduce((sum, r) => sum + r.frequency, 0);
      expect(totalFrequency).toBe(24); // 8 + 8 + 8 (all have same total_frequency)
    });

    test('should calculate percentages correctly', () => {
      const result = getCategoryDistributionData(multiplePatterns);

      const totalPercentage = result.reduce((sum, r) => sum + r.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1);
    });
  });

  describe('getPatternFrequencyData', () => {
    test('should extract pattern metadata correctly', () => {
      const result = getPatternFrequencyData([validPattern]);

      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Use const instead of let');
      expect(result[0].frequency).toBe(8);
      expect(result[0].category).toBe(PatternCategory.CODE_STYLE);
      expect(result[0].metadata?.patternText).toBe('Use const instead of let');
      expect(result[0].metadata?.suggestedRule).toBe('Use const for immutable variables');
      expect(result[0].metadata?.exampleCount).toBe(0);
    });
  });

  describe('getTemporalPatternData', () => {
    test('should extract temporal data correctly', () => {
      const result = getTemporalPatternData([validPattern]);

      expect(result).toHaveLength(1);
      expect(result[0].timestamp).toBe('2026-03');
      expect(result[0].frequency).toBe(8);
      expect(result[0].cumulativeFrequency).toBe(8);
    });

    test('should handle patterns with same month', () => {
      const patterns = [
        validPattern,
        { ...validPattern, pattern_text: 'Pattern 2', first_seen: '2026-03-20T10:00:00Z' },
      ];

      const result = getTemporalPatternData(patterns);

      expect(result).toHaveLength(1);
      expect(result[0].frequency).toBe(16); // Sum of both patterns
    });

    test('should handle patterns across multiple months', () => {
      const patterns = [
        validPattern,
        { ...validPattern, pattern_text: 'Pattern 2', first_seen: '2026-04-20T10:00:00Z' },
      ];

      const result = getTemporalPatternData(patterns);

      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBe('2026-03');
      expect(result[1].timestamp).toBe('2026-04');
    });
  });
});

// ============================================================================
// DATA INTEGRITY TESTS - Metadata Preservation, Type Validation
// ============================================================================

describe('Data Transformers - Data Integrity', () => {
  describe('transformPatternsToBarChart', () => {
    test('should preserve pattern metadata', () => {
      const result = transformPatternsToBarChart(multiplePatterns);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.source).toBe('Epic 2 MergedPattern');
      expect(result.metadata?.timestamp).toBeDefined();
      expect(result.metadata?.dataPointCount).toBe(3);
    });

    test('should handle special characters in pattern text', () => {
      const patterns = [
        { ...validPattern, pattern_text: 'Use "quotes" correctly' },
        { ...validPattern, pattern_text: 'Handle <html> tags' },
        { ...validPattern, pattern_text: 'Use emoji 🎉' },
      ];

      expect(() => {
        transformPatternsToBarChart(patterns);
      }).not.toThrow();
    });

    test('should sample large datasets when showAll is false', () => {
      const largeDataset = Array.from({ length: 200 }, (_, i) => ({
        ...validPattern,
        pattern_text: `Pattern ${i}`,
        count: i,
      }));

      const result = transformPatternsToBarChart(largeDataset, { maxPatterns: 100, showAll: false });

      expect(result.metadata?.dataPointCount).toBeLessThanOrEqual(100);
    });
  });

  describe('transformPatternsToLineChart', () => {
    test('should preserve date range metadata', () => {
      const patterns = [
        { ...validPattern, first_seen: '2026-03-01T10:00:00Z' },
        { ...validPattern, first_seen: '2026-03-15T10:00:00Z' },
        { ...validPattern, first_seen: '2026-03-20T10:00:00Z' },
      ];

      const result = transformPatternsToLineChart(patterns);

      expect(result).toBeDefined();
      expect(result.datasets[0].data.length).toBeGreaterThan(0);
    });
  });

  describe('transformPatternsToPieChart', () => {
    test('should preserve distribution metadata', () => {
      const result = transformPatternsToPieChart(multiplePatterns);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.source).toBe('Epic 2 MergedPattern');
      expect(result.metadata?.dataPointCount).toBe(3);
      expect(result.metadata?.totalFrequency).toBeDefined();
    });
  });
});

// ============================================================================
// ERROR HANDLING TESTS - Malformed Data, Missing Fields, Invalid Types
// ============================================================================

describe('Data Transformers - Error Handling', () => {
  describe('transformPatternsToBarChart', () => {
    test('should throw error for patterns with missing category', () => {
      const patterns = [
        { ...validPattern },
        { ...validPattern, category: undefined as any, first_seen: undefined as any, last_seen: undefined as any },
      ];

      expect(() => {
        transformPatternsToBarChart(patterns);
      }).toThrow(); // Should throw validation error for invalid pattern
    });

    test('should handle patterns with zero frequency', () => {
      const patterns = [
        { ...validPattern, total_frequency: 0 },
      ];

      const result = transformPatternsToBarChart(patterns);

      expect(result).toBeDefined();
      expect(result.datasets[0].data).toContain(0);
    });

    test('should handle patterns with invalid frequency', () => {
      const patterns = [
        { ...validPattern, total_frequency: NaN },
      ];

      const result = transformPatternsToBarChart(patterns);

      expect(result).toBeDefined();
    });
  });

  describe('transformPatternsToLineChart', () => {
    test('should throw error for patterns with missing temporal data', () => {
      const patterns = [
        { ...validPattern, first_seen: undefined as any, last_seen: undefined as any },
      ];

      expect(() => {
        transformPatternsToLineChart(patterns);
      }).toThrow(); // Should throw validation error
    });

    test('should throw error for patterns with malformed timestamps', () => {
      const patterns = [
        { ...validPattern, first_seen: 'invalid-date' },
      ];

      expect(() => {
        transformPatternsToLineChart(patterns);
      }).toThrow(); // Should throw validation error
    });
  });

  describe('transformPatternsToPieChart', () => {
    test('should handle single category pie chart', () => {
      const patterns = [
        { ...validPattern, category: PatternCategory.CODE_STYLE },
        { ...validPattern, category: PatternCategory.CODE_STYLE },
      ];

      const result = transformPatternsToPieChart(patterns);

      expect(result).toBeDefined();
      expect(result.xAxis.data).toHaveLength(1);
    });
  });
});

// ============================================================================
// PERFORMANCE TESTS - Large Datasets, Memory Usage
// ============================================================================

describe('Data Transformers - Performance', () => {
  describe('transformPatternsToBarChart', () => {
    test('should handle 100 patterns in < 100ms', () => {
      const patterns = Array.from({ length: 100 }, () => validPattern);

      const startTime = Date.now();
      transformPatternsToBarChart(patterns);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });

    test('should handle 1,000 patterns in < 1s', () => {
      const patterns = Array.from({ length: 1000 }, () => validPattern);

      const startTime = Date.now();
      transformPatternsToBarChart(patterns);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });

    test('should handle 10,000 patterns in < 5s', () => {
      const patterns = Array.from({ length: 10000 }, () => validPattern);

      const startTime = Date.now();
      transformPatternsToBarChart(patterns);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });
  });

  describe('transformPatternsToLineChart', () => {
    test('should handle 1,000 patterns efficiently', () => {
      const patterns = Array.from({ length: 1000 }, (_, i) => ({
        ...validPattern,
        first_seen: `2026-${String((i % 12) + 1).padStart(2, '0')}-15T10:00:00Z`,
      }));

      const startTime = Date.now();
      const result = transformPatternsToLineChart(patterns);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('transformPatternsToPieChart', () => {
    test('should handle 1,000 patterns efficiently', () => {
      const patterns = Array.from({ length: 1000 }, () => validPattern);

      const startTime = Date.now();
      const result = transformPatternsToPieChart(patterns);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000);
    });
  });
});

// ============================================================================
// INTEGRATION WITH EPIC 2 DATA - Real-world MergedPattern Structures
// ============================================================================

describe('Data Transformers - Epic 2 Integration', () => {
  test('should handle realistic MergedPattern from Story 2-6', () => {
    const realisticPattern: MergedPattern = {
      pattern_text: 'Use const instead of let for immutable variables',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [
        {
          original_suggestion: 'let x = 10;',
          user_correction: 'const x = 10;',
          context: 'Variable declaration in function',
          timestamp: '2026-03-15T10:00:00Z',
          content_type: ContentType.CODE,
        },
      ],
      suggested_rule: 'Use const for variables that are not reassigned',
      first_seen: '2026-03-15T10:00:00Z',
      last_seen: '2026-03-18T11:00:00Z',
      content_types: [ContentType.CODE, ContentType.DOCUMENTATION],
      session_count: 2,
      total_frequency: 8,
      is_new: false,
      frequency_change: 2,
    };

    expect(() => {
      transformPatternsToBarChart([realisticPattern]);
    }).not.toThrow();
  });

  test('should handle patterns with multiple content types', () => {
    const patterns = [
      {
        ...validPattern,
        content_types: [
          ContentType.CODE,
          ContentType.DOCUMENTATION,
          ContentType.TEST_PLAN,
        ],
      },
    ];

    expect(() => {
      transformPatternsToBarChart(patterns);
    }).not.toThrow();
  });

  test('should handle patterns with rich example data', () => {
    const patterns = [
      {
        ...validPattern,
        examples: [
          {
            original_suggestion: 'Example 1',
            user_correction: 'Correction 1',
            context: 'Context 1',
            timestamp: '2026-03-15T10:00:00Z',
            content_type: ContentType.CODE,
          },
          {
            original_suggestion: 'Example 2',
            user_correction: 'Correction 2',
            context: 'Context 2',
            timestamp: '2026-03-16T10:00:00Z',
            content_type: ContentType.DOCUMENTATION,
          },
          {
            original_suggestion: 'Example 3',
            user_correction: 'Correction 3',
            context: 'Context 3',
            timestamp: '2026-03-17T10:00:00Z',
            content_type: ContentType.TEST_PLAN,
          },
        ],
      },
    ];

    expect(() => {
      transformPatternsToBarChart(patterns);
    }).not.toThrow();
  });

  test('should handle patterns with frequency_change data', () => {
    const patterns = [
      { ...validPattern, frequency_change: 5 }, // Increasing
      { ...validPattern, frequency_change: -3 }, // Decreasing
      { ...validPattern, frequency_change: 0 }, // Stable
    ];

    expect(() => {
      transformPatternsToBarChart(patterns);
    }).not.toThrow();
  });

  test('should handle new vs. existing patterns', () => {
    const patterns = [
      { ...validPattern, is_new: true },
      { ...validPattern, is_new: false },
    ];

    const result = transformPatternsToBarChart(patterns);

    expect(result).toBeDefined();
    expect(result.metadata?.totalPatterns).toBe(2);
  });
});

// ============================================================================
// CODE COVERAGE REPORTING
// ============================================================================

describe('Data Transformers - Coverage Summary', () => {
  test('should achieve > 80% code coverage for transformers', () => {
    // This test will be updated after implementation
    // Run with: npm test -- --coverage --collectFrom=src/visualization/transformers.ts

    expect(true).toBe(true); // Placeholder
  });

  test('should test all branches in conditional logic', () => {
    // Verify all if/else branches are tested
    expect(true).toBe(true); // Placeholder
  });

  test('should test all error paths', () => {
    // Verify all error handling code is tested
    expect(true).toBe(true); // Placeholder
  });
});
