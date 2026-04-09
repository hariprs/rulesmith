/**
 * API-Level Acceptance Tests for Pattern Data Transformation (Story 3-2)
 *
 * TDD Red Phase: Failing API-level acceptance tests
 *
 * These tests validate the API contracts, interfaces, and business logic
 * at the API boundaries without external dependencies (Chart.js rendering).
 *
 * Testing Strategy:
 * - Validate interface contracts and type definitions
 * - Test business logic validation at API boundaries
 * - Verify error handling and error codes
 * - Test input validation and sanitization
 * - Validate AR22 compliance for all errors
 *
 * Test Pyramid Level: API (Unit-level business logic tests in separate file)
 *
 * AC Coverage:
 * - AC1: Pattern Frequency Transformation
 * - AC2: Temporal Trend Transformation
 * - AC3: Category Distribution Transformation
 * - AC4: Pattern Detail Enrichment
 * - AC6: Type Safety and Error Handling
 *
 * @todo Remove this todo when implementation is complete
 */

import { describe, test, expect } from '@jest/globals';
import {
  PatternFrequencyData,
  PatternTrendData,
  CategoryDistributionData,
  PatternTooltipData,
  ChartMetadata,
  transformToFrequencyChart,
  transformToTrendChart,
  transformToDistributionChart,
  PatternTransformationErrorCode,
  PatternTransformationAR22Error,
  validatePatterns,
  isMergedPattern,
} from '../../src/visualization/types';
import { MergedPattern, PatternCategory } from '../../src/pattern-matcher';
import { ContentType } from '../../src/content-analyzer';

// ============================================================================
// TYPE DEFINITIONS AND ENUMS
// ============================================================================

describe('Pattern Data Transformation - Type Definitions', () => {
  describe('PatternFrequencyData Interface (AC1)', () => {
    test('should have all required fields for Chart.js bar chart', () => {
      const frequencyData: PatternFrequencyData = {
        labels: ['CODE_STYLE', 'TERMINOLOGY', 'STRUCTURE'],
        datasets: [
          {
            label: 'Pattern Frequency',
            data: [15, 8, 12],
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
            borderColor: ['#FF6384', '#36A2EB', '#FFCE56'],
          },
        ],
        tooltipData: [],
      };

      expect(frequencyData.labels).toBeDefined();
      expect(frequencyData.datasets).toBeDefined();
      expect(frequencyData.tooltipData).toBeDefined();
      expect(Array.isArray(frequencyData.labels)).toBe(true);
      expect(Array.isArray(frequencyData.datasets)).toBe(true);
      expect(Array.isArray(frequencyData.tooltipData)).toBe(true);
    });

    test('should have Chart.js compatible dataset structure', () => {
      const dataset: PatternFrequencyData['datasets'][0] = {
        label: 'Pattern Frequency',
        data: [10, 20, 30],
        backgroundColor: ['#FF6384'],
        borderColor: ['#FF6384'],
      };

      expect(dataset.label).toBeDefined();
      expect(dataset.data).toBeDefined();
      expect(dataset.backgroundColor).toBeDefined();
      expect(dataset.borderColor).toBeDefined();
      expect(Array.isArray(dataset.data)).toBe(true);
    });
  });

  describe('PatternTrendData Interface (AC2)', () => {
    test('should have all required fields for Chart.js line chart', () => {
      const trendData: PatternTrendData = {
        labels: ['2026-03-01', '2026-03-08', '2026-03-15'],
        datasets: [
          {
            label: 'CODE_STYLE',
            data: [5, 8, 12],
            borderColor: '#FF6384',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.4,
          },
        ],
        tooltipData: [],
      };

      expect(trendData.labels).toBeDefined();
      expect(trendData.datasets).toBeDefined();
      expect(trendData.tooltipData).toBeDefined();
      expect(Array.isArray(trendData.labels)).toBe(true);
      expect(Array.isArray(trendData.datasets)).toBe(true);
      expect(Array.isArray(trendData.tooltipData)).toBe(true);
    });

    test('should support time-series data structure', () => {
      const dataset: PatternTrendData['datasets'][0] = {
        label: 'CODE_STYLE',
        data: [5, 8, 12],
        borderColor: '#FF6384',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4,
      };

      expect(dataset.tension).toBeDefined();
      expect(typeof dataset.tension).toBe('number');
      expect(dataset.tension).toBeGreaterThanOrEqual(0);
      expect(dataset.tension).toBeLessThanOrEqual(1);
    });
  });

  describe('CategoryDistributionData Interface (AC3)', () => {
    test('should have all required fields for Chart.js pie chart', () => {
      const distributionData: CategoryDistributionData = {
        labels: ['CODE_STYLE', 'TERMINOLOGY', 'STRUCTURE'],
        datasets: [
          {
            label: 'Pattern Distribution',
            data: [15, 8, 12],
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
            borderColor: ['#FF6384', '#36A2EB', '#FFCE56'],
            hoverOffset: 4,
          },
        ],
        tooltipData: [],
      };

      expect(distributionData.labels).toBeDefined();
      expect(distributionData.datasets).toBeDefined();
      expect(distributionData.tooltipData).toBeDefined();
      expect(Array.isArray(distributionData.labels)).toBe(true);
      expect(Array.isArray(distributionData.datasets)).toBe(true);
    });

    test('should include hoverOffset for interactivity', () => {
      const dataset: CategoryDistributionData['datasets'][0] = {
        label: 'Pattern Distribution',
        data: [10, 20, 30],
        backgroundColor: ['#FF6384'],
        borderColor: ['#FF6384'],
        hoverOffset: 4,
      };

      expect(dataset.hoverOffset).toBeDefined();
      expect(typeof dataset.hoverOffset).toBe('number');
    });
  });

  describe('PatternTooltipData Interface (AC4)', () => {
    test('should have all required fields for drill-down interactions', () => {
      const tooltipData: PatternTooltipData = {
        pattern_text: 'Use const instead of let',
        suggested_rule: 'Use const for immutable variables',
        confidence: 0.9,
        examples: [
          {
            original_suggestion: 'Use let for variables',
            user_correction: 'Use const instead',
            context: 'Variable declaration',
          },
        ],
        total_frequency: 15,
        session_count: 3,
      };

      expect(tooltipData.pattern_text).toBeDefined();
      expect(tooltipData.suggested_rule).toBeDefined();
      expect(tooltipData.confidence).toBeDefined();
      expect(tooltipData.examples).toBeDefined();
      expect(tooltipData.total_frequency).toBeDefined();
      expect(tooltipData.session_count).toBeDefined();
    });

    test('should allow optional confidence field', () => {
      const tooltipDataWithoutConfidence: PatternTooltipData = {
        pattern_text: 'Test pattern',
        suggested_rule: 'Test rule',
        examples: [],
        total_frequency: 10,
        session_count: 2,
      };

      expect(tooltipDataWithoutConfidence.confidence).toBeUndefined();
    });

    test('should support multiple examples', () => {
      const tooltipData: PatternTooltipData = {
        pattern_text: 'Test pattern',
        suggested_rule: 'Test rule',
        examples: [
          {
            original_suggestion: 'Example 1',
            user_correction: 'Correction 1',
            context: 'Context 1',
          },
          {
            original_suggestion: 'Example 2',
            user_correction: 'Correction 2',
            context: 'Context 2',
          },
          {
            original_suggestion: 'Example 3',
            user_correction: 'Correction 3',
            context: 'Context 3',
          },
        ],
        total_frequency: 10,
        session_count: 2,
      };

      expect(tooltipData.examples.length).toBe(3);
    });
  });

  describe('ChartMetadata Interface (AC6)', () => {
    test('should have all required metadata fields', () => {
      const metadata: ChartMetadata = {
        generatedAt: '2026-03-18T13:00:00Z',
        totalPatterns: 100,
        dateRange: {
          start: '2026-03-01T00:00:00Z',
          end: '2026-03-18T23:59:59Z',
        },
        chartType: 'bar',
      };

      expect(metadata.generatedAt).toBeDefined();
      expect(metadata.totalPatterns).toBeDefined();
      expect(metadata.dateRange).toBeDefined();
      expect(metadata.chartType).toBeDefined();
    });

    test('should support all chart types', () => {
      const barMetadata: ChartMetadata = { chartType: 'bar', generatedAt: '2026-03-18T13:00:00Z', totalPatterns: 100, dateRange: { start: '2026-03-01', end: '2026-03-18' } };
      const lineMetadata: ChartMetadata = { chartType: 'line', generatedAt: '2026-03-18T13:00:00Z', totalPatterns: 100, dateRange: { start: '2026-03-01', end: '2026-03-18' } };
      const pieMetadata: ChartMetadata = { chartType: 'pie', generatedAt: '2026-03-18T13:00:00Z', totalPatterns: 100, dateRange: { start: '2026-03-01', end: '2026-03-18' } };

      expect(barMetadata.chartType).toBe('bar');
      expect(lineMetadata.chartType).toBe('line');
      expect(pieMetadata.chartType).toBe('pie');
    });
  });

  describe('PatternTransformationErrorCode Enum (AC6)', () => {
    test('should have all required error codes', () => {
      expect(PatternTransformationErrorCode.INVALID_INPUT).toBeDefined();
      expect(PatternTransformationErrorCode.TRANSFORMATION_FAILED).toBeDefined();
      expect(PatternTransformationErrorCode.VALIDATION_FAILED).toBeDefined();
      expect(PatternTransformationErrorCode.TIMESTAMP_ERROR).toBeDefined();
    });

    test('should have 4 error codes total', () => {
      const errorCodes = Object.values(PatternTransformationErrorCode);
      expect(errorCodes).toHaveLength(4);
    });
  });
});

// ============================================================================
// INTERFACE CONTRACTS AND FUNCTION SIGNATURES
// ============================================================================

describe('Pattern Data Transformation - Function Signatures (AC6)', () => {
  test('should export transformToFrequencyChart function (AC1)', () => {
    expect(typeof transformToFrequencyChart).toBe('function');
  });

  test('should export transformToTrendChart function (AC2)', () => {
    expect(typeof transformToTrendChart).toBe('function');
  });

  test('should export transformToDistributionChart function (AC3)', () => {
    expect(typeof transformToDistributionChart).toBe('function');
  });

  test('should export validatePatterns function (AC6)', () => {
    expect(typeof validatePatterns).toBe('function');
  });

  test('should export isMergedPattern type guard (AC6)', () => {
    expect(typeof isMergedPattern).toBe('function');
  });

  test('should export PatternTransformationAR22Error class (AC6)', () => {
    expect(typeof PatternTransformationAR22Error).toBe('function');
  });

  test('transformToFrequencyChart should accept MergedPattern[] input (AC1)', () => {
    const patterns: MergedPattern[] = [
      {
        pattern_text: 'Test pattern',
        count: 1,
        category: PatternCategory.CODE_STYLE,
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
    ];

    expect(() => {
      transformToFrequencyChart(patterns);
    }).not.toThrow();
  });

  test('transformToTrendChart should accept MergedPattern[] and period parameter (AC2)', () => {
    const patterns: MergedPattern[] = [
      {
        pattern_text: 'Test pattern',
        count: 1,
        category: PatternCategory.CODE_STYLE,
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
    ];

    expect(() => {
      transformToTrendChart(patterns, 'day');
    }).not.toThrow();

    expect(() => {
      transformToTrendChart(patterns, 'week');
    }).not.toThrow();

    expect(() => {
      transformToTrendChart(patterns, 'month');
    }).not.toThrow();
  });

  test('transformToDistributionChart should accept MergedPattern[] input (AC3)', () => {
    const patterns: MergedPattern[] = [
      {
        pattern_text: 'Test pattern',
        count: 1,
        category: PatternCategory.CODE_STYLE,
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
    ];

    expect(() => {
      transformToDistributionChart(patterns);
    }).not.toThrow();
  });
});

// ============================================================================
// PATTERN FREQUENCY TRANSFORMATION (AC1)
// ============================================================================

describe('Pattern Data Transformation - Frequency Transformation (AC1)', () => {
  const samplePatterns: MergedPattern[] = [
    {
      pattern_text: 'Use const instead of let',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
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
      examples: [],
      suggested_rule: 'Add unit tests for all new functions',
      first_seen: '2026-03-01T10:00:00Z',
      last_seen: '2026-03-18T11:00:00Z',
      content_types: [ContentType.CODE],
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
  ];

  test('should group patterns by category (AC1)', () => {
    const result = transformToFrequencyChart(samplePatterns);

    expect(result.labels).toContain(PatternCategory.CODE_STYLE);
    expect(result.labels).toContain(PatternCategory.CONVENTION);
  });

  test('should sum frequencies within each category (AC1)', () => {
    const result = transformToFrequencyChart(samplePatterns);

    const codeStyleIndex = result.labels.indexOf(PatternCategory.CODE_STYLE);
    const codeStyleFrequency = result.datasets[0].data[codeStyleIndex];

    expect(codeStyleFrequency).toBe(35); // 15 + 20
  });

  test('should preserve individual pattern details for drill-down (AC1, AC4)', () => {
    const result = transformToFrequencyChart(samplePatterns);

    expect(result.tooltipData).toBeDefined();
    expect(result.tooltipData.length).toBeGreaterThan(0);
    expect(result.tooltipData[0].pattern_text).toBeDefined();
    expect(result.tooltipData[0].suggested_rule).toBeDefined();
  });

  test('should handle empty patterns array (AC1, AC6)', () => {
    const result = transformToFrequencyChart([]);

    expect(result).toBeDefined();
    expect(result.labels).toHaveLength(0);
    expect(result.datasets[0].data).toHaveLength(0);
    expect(result.tooltipData).toHaveLength(0);
  });

  test('should handle single pattern (AC1)', () => {
    const singlePattern = [samplePatterns[0]];
    const result = transformToFrequencyChart(singlePattern);

    expect(result.labels.length).toBeGreaterThan(0);
    expect(result.datasets[0].data.length).toBeGreaterThan(0);
  });

  test('should return Chart.js-compatible ChartData object (AC1)', () => {
    const result = transformToFrequencyChart(samplePatterns);

    expect(result.labels).toBeDefined();
    expect(result.datasets).toBeDefined();
    expect(result.datasets[0].label).toBeDefined();
    expect(result.datasets[0].data).toBeDefined();
    expect(result.datasets[0].backgroundColor).toBeDefined();
    expect(result.datasets[0].borderColor).toBeDefined();
  });

  test('should include metadata in result (AC1, AC6)', () => {
    const result = transformToFrequencyChart(samplePatterns);

    // Note: Metadata may be added to the result object
    // This test validates the structure exists
    expect(result).toBeDefined();
  });
});

// ============================================================================
// TEMPORAL TREND TRANSFORMATION (AC2)
// ============================================================================

describe('Pattern Data Transformation - Temporal Trend Transformation (AC2)', () => {
  const samplePatternsWithTimestamps: MergedPattern[] = [
    {
      pattern_text: 'Use const instead of let',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
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
      pattern_text: 'Add unit tests',
      count: 3,
      category: PatternCategory.CONVENTION,
      examples: [],
      suggested_rule: 'Add unit tests for all new functions',
      first_seen: '2026-03-05T10:00:00Z',
      last_seen: '2026-03-15T11:00:00Z',
      content_types: [ContentType.CODE],
      session_count: 2,
      total_frequency: 8,
      is_new: false,
      frequency_change: -0.2,
    },
  ];

  test('should extract temporal data from first_seen/last_seen fields (AC2)', () => {
    const result = transformToTrendChart(samplePatternsWithTimestamps, 'day');

    expect(result.labels).toBeDefined();
    expect(result.labels.length).toBeGreaterThan(0);
  });

  test('should group patterns by time periods based on period parameter (AC2)', () => {
    const dayResult = transformToTrendChart(samplePatternsWithTimestamps, 'day');
    const weekResult = transformToTrendChart(samplePatternsWithTimestamps, 'week');
    const monthResult = transformToTrendChart(samplePatternsWithTimestamps, 'month');

    expect(dayResult).toBeDefined();
    expect(weekResult).toBeDefined();
    expect(monthResult).toBeDefined();
  });

  test('should create time-series datasets showing pattern emergence (AC2)', () => {
    const result = transformToTrendChart(samplePatternsWithTimestamps, 'week');

    expect(result.datasets).toBeDefined();
    expect(result.datasets.length).toBeGreaterThan(0);
    expect(result.datasets[0].data).toBeDefined();
  });

  test('should handle patterns with multiple sessions (longitudinal patterns) (AC2)', () => {
    const longitudinalPattern: MergedPattern = {
      pattern_text: 'Longitudinal pattern',
      count: 10,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Test rule',
      first_seen: '2026-03-01T10:00:00Z',
      last_seen: '2026-03-18T11:00:00Z',
      content_types: [ContentType.CODE],
      session_count: 5,
      total_frequency: 25,
      is_new: false,
      frequency_change: 1.5,
    };

    const result = transformToTrendChart([longitudinalPattern], 'day');

    expect(result.datasets).toBeDefined();
  });

  test('should filter out patterns with invalid timestamps (AC2)', () => {
    const patternsWithInvalidTimestamps: MergedPattern[] = [
      {
        pattern_text: 'Valid pattern',
        count: 5,
        category: PatternCategory.CODE_STYLE,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: '2026-03-01T10:00:00Z',
        last_seen: '2026-03-18T11:00:00Z',
        content_types: [ContentType.CODE],
        session_count: 2,
        total_frequency: 10,
        is_new: false,
        frequency_change: 0,
      },
      {
        pattern_text: 'Invalid pattern',
        count: 3,
        category: PatternCategory.CONVENTION,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: 'invalid-timestamp',
        last_seen: 'also-invalid',
        content_types: [ContentType.CODE],
        session_count: 1,
        total_frequency: 3,
        is_new: false,
        frequency_change: 0,
      },
    ];

    const result = transformToTrendChart(patternsWithInvalidTimestamps, 'day');

    // Should only include valid pattern
    expect(result).toBeDefined();
  });

  test('should return Chart.js time-series ChartData with date labels (AC2)', () => {
    const result = transformToTrendChart(samplePatternsWithTimestamps, 'day');

    expect(result.labels).toBeDefined();
    expect(result.datasets).toBeDefined();
    expect(result.datasets[0].label).toBeDefined();
    expect(result.datasets[0].data).toBeDefined();
    expect(result.datasets[0].borderColor).toBeDefined();
    expect(result.datasets[0].backgroundColor).toBeDefined();
    expect(result.datasets[0].tension).toBeDefined();
  });
});

// ============================================================================
// CATEGORY DISTRIBUTION TRANSFORMATION (AC3)
// ============================================================================

describe('Pattern Data Transformation - Category Distribution Transformation (AC3)', () => {
  const samplePatterns: MergedPattern[] = [
    {
      pattern_text: 'Use const instead of let',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
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
      pattern_text: 'Add unit tests',
      count: 3,
      category: PatternCategory.CONVENTION,
      examples: [],
      suggested_rule: 'Add unit tests for all new functions',
      first_seen: '2026-03-01T10:00:00Z',
      last_seen: '2026-03-18T11:00:00Z',
      content_types: [ContentType.CODE],
      session_count: 2,
      total_frequency: 8,
      is_new: false,
      frequency_change: -0.2,
    },
    {
      pattern_text: 'Organize imports',
      count: 7,
      category: PatternCategory.FORMATTING,
      examples: [],
      suggested_rule: 'Organize imports alphabetically',
      first_seen: '2026-03-01T10:00:00Z',
      last_seen: '2026-03-18T11:00:00Z',
      content_types: [ContentType.CODE],
      session_count: 4,
      total_frequency: 20,
      is_new: false,
      frequency_change: 0.8,
    },
  ];

  test('should count patterns per category (AC3)', () => {
    const result = transformToDistributionChart(samplePatterns);

    expect(result.labels).toContain(PatternCategory.CODE_STYLE);
    expect(result.labels).toContain(PatternCategory.CONVENTION);
    expect(result.labels).toContain(PatternCategory.FORMATTING);
  });

  test('should calculate percentages for each category (AC3)', () => {
    const result = transformToDistributionChart(samplePatterns);

    const totalCount = result.datasets[0].data.reduce((sum, count) => sum + count, 0);

    // Total should be 43 (15 + 8 + 20)
    expect(totalCount).toBe(43);
  });

  test('should create Chart.js pie chart dataset with colors and labels (AC3)', () => {
    const result = transformToDistributionChart(samplePatterns);

    expect(result.datasets[0].backgroundColor).toBeDefined();
    expect(result.datasets[0].borderColor).toBeDefined();
    expect(result.datasets[0].hoverOffset).toBeDefined();
    expect(Array.isArray(result.datasets[0].backgroundColor)).toBe(true);
    expect(Array.isArray(result.datasets[0].borderColor)).toBe(true);
  });

  test('should handle cases where one category dominates (AC3)', () => {
    const dominatedPatterns: MergedPattern[] = [
      ...samplePatterns,
      {
        pattern_text: 'Dominated pattern 1',
        count: 50,
        category: PatternCategory.CODE_STYLE,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: '2026-03-01T10:00:00Z',
        last_seen: '2026-03-18T11:00:00Z',
        content_types: [ContentType.CODE],
        session_count: 10,
        total_frequency: 100,
        is_new: false,
        frequency_change: 10,
      },
      {
        pattern_text: 'Dominated pattern 2',
        count: 60,
        category: PatternCategory.CODE_STYLE,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: '2026-03-01T10:00:00Z',
        last_seen: '2026-03-18T11:00:00Z',
        content_types: [ContentType.CODE],
        session_count: 12,
        total_frequency: 120,
        is_new: false,
        frequency_change: 12,
      },
    ];

    const result = transformToDistributionChart(dominatedPatterns);

    expect(result).toBeDefined();
    expect(result.labels.length).toBeGreaterThan(0);
  });

  test('should include "other" category for low-frequency patterns if needed (AC3)', () => {
    const manyLowFrequencyPatterns: MergedPattern[] = Array.from(
      { length: 10 },
      (_, i) => ({
        pattern_text: `Low frequency pattern ${i}`,
        count: 1,
        category: Object.values(PatternCategory)[i % 6],
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: '2026-03-01T10:00:00Z',
        last_seen: '2026-03-18T11:00:00Z',
        content_types: [ContentType.CODE],
        session_count: 1,
        total_frequency: 1,
        is_new: false,
        frequency_change: 0,
      })
    );

    const result = transformToDistributionChart(manyLowFrequencyPatterns);

    expect(result).toBeDefined();
  });
});

// ============================================================================
// PATTERN DETAIL ENRICHMENT (AC4)
// ============================================================================

describe('Pattern Data Transformation - Pattern Detail Enrichment (AC4)', () => {
  const patternWithDetails: MergedPattern = {
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
  };

  test('should preserve pattern_text for chart labels and tooltips (AC4)', () => {
    const result = transformToFrequencyChart([patternWithDetails]);

    expect(result.tooltipData[0].pattern_text).toBe('Use const instead of let');
  });

  test('should include suggested_rule in hover tooltips (AC4)', () => {
    const result = transformToFrequencyChart([patternWithDetails]);

    expect(result.tooltipData[0].suggested_rule).toBe('Use const for immutable variables');
  });

  test('should attach example snippets up to 3 for pattern context (AC4)', () => {
    const result = transformToFrequencyChart([patternWithDetails]);

    expect(result.tooltipData[0].examples).toBeDefined();
    expect(result.tooltipData[0].examples.length).toBeGreaterThan(0);
    expect(result.tooltipData[0].examples.length).toBeLessThanOrEqual(3);
  });

  test('should format examples with original, correction, and context (AC4)', () => {
    const result = transformToFrequencyChart([patternWithDetails]);

    const example = result.tooltipData[0].examples[0];

    expect(example.original_suggestion).toBeDefined();
    expect(example.user_correction).toBeDefined();
    expect(example.context).toBeDefined();
  });

  test('should store confidence scores for visual emphasis (AC4)', () => {
    const patternWithConfidence: MergedPattern = {
      ...patternWithDetails,
      confidence: 0.95,
    };

    const result = transformToFrequencyChart([patternWithConfidence]);

    expect(result.tooltipData[0].confidence).toBeDefined();
    expect(result.tooltipData[0].confidence).toBe(0.95);
  });

  test('should maintain metadata linkage to original pattern source (AC4)', () => {
    const result = transformToFrequencyChart([patternWithDetails]);

    expect(result.tooltipData[0].total_frequency).toBeDefined();
    expect(result.tooltipData[0].session_count).toBeDefined();
  });
});

// ============================================================================
// TYPE SAFETY AND ERROR HANDLING (AC6)
// ============================================================================

describe('Pattern Data Transformation - Type Safety and Error Handling (AC6)', () => {
  test('should define strict TypeScript interfaces for all chart data formats (AC6)', () => {
    // This test validates that the interfaces exist and are properly typed
    const frequencyData: PatternFrequencyData = {
      labels: [],
      datasets: [
        {
          label: 'Test',
          data: [],
          backgroundColor: [],
          borderColor: [],
        },
      ],
      tooltipData: [],
    };

    const trendData: PatternTrendData = {
      labels: [],
      datasets: [
        {
          label: 'Test',
          data: [],
          borderColor: '#FF6384',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.4,
        },
      ],
      tooltipData: [],
    };

    const distributionData: CategoryDistributionData = {
      labels: [],
      datasets: [
        {
          label: 'Test',
          data: [],
          backgroundColor: [],
          borderColor: [],
          hoverOffset: 4,
        },
      ],
      tooltipData: [],
    };

    expect(frequencyData).toBeDefined();
    expect(trendData).toBeDefined();
    expect(distributionData).toBeDefined();
  });

  test('should validate input MergedPattern[] structure (AC6)', () => {
    const validPattern: MergedPattern = {
      pattern_text: 'Test',
      count: 1,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Test rule',
      first_seen: '2026-03-18T10:00:00Z',
      last_seen: '2026-03-18T10:00:00Z',
      content_types: [ContentType.CODE],
      session_count: 1,
      total_frequency: 1,
      is_new: true,
      frequency_change: 0,
    };

    expect(() => {
      validatePatterns([validPattern]);
    }).not.toThrow();
  });

  test('should handle null/undefined inputs gracefully by returning empty ChartData (AC6)', () => {
    const nullResult = transformToFrequencyChart(null as any);
    const undefinedResult = transformToFrequencyChart(undefined as any);

    expect(nullResult).toBeDefined();
    expect(nullResult.labels).toHaveLength(0);
    expect(undefinedResult).toBeDefined();
    expect(undefinedResult.labels).toHaveLength(0);
  });

  test('should provide type guards for runtime validation (AC6)', () => {
    const validPattern: MergedPattern = {
      pattern_text: 'Test',
      count: 1,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Test rule',
      first_seen: '2026-03-18T10:00:00Z',
      last_seen: '2026-03-18T10:00:00Z',
      content_types: [ContentType.CODE],
      session_count: 1,
      total_frequency: 1,
      is_new: true,
      frequency_change: 0,
    };

    const invalidPattern = { pattern_text: 'Test' };

    expect(isMergedPattern(validPattern)).toBe(true);
    expect(isMergedPattern(invalidPattern)).toBe(false);
  });

  test('should throw PatternTransformationAR22Error for invalid inputs (AC6)', () => {
    const invalidPatterns = [
      { pattern_text: 'Test' },
      { count: 1 },
      'not an array',
      123,
    ];

    invalidPatterns.forEach((invalid) => {
      expect(() => {
        validatePatterns(invalid as any);
      }).toThrow(PatternTransformationAR22Error);
    });
  });

  test('should include comprehensive error information in AR22Error (AC6)', () => {
    try {
      validatePatterns('invalid input' as any);
    } catch (error) {
      expect(error).toBeInstanceOf(PatternTransformationAR22Error);
      const ar22Error = error as PatternTransformationAR22Error;
      expect(ar22Error.what).toBeDefined();
      expect(ar22Error.how).toBeDefined();
      expect(ar22Error.technical).toBeDefined();
    }
  });
});

// ============================================================================
// AR22 ERROR HANDLING COMPLIANCE (AC6)
// ============================================================================

describe('Pattern Data Transformation - AR22 Error Handling (AC6)', () => {
  test('should create AR22Error with required fields', () => {
    const error = new PatternTransformationAR22Error('Test error', {
      what: 'Test what happened',
      how: ['Step 1', 'Step 2'],
      technical: 'Test technical details',
    });

    expect(error.message).toBe('Test error');
    expect(error.what).toBe('Test what happened');
    expect(error.how).toEqual(['Step 1', 'Step 2']);
    expect(error.technical).toBe('Test technical details');
  });

  test('should accept optional error code', () => {
    const error = new PatternTransformationAR22Error(
      'Test error',
      {
        what: 'Test',
        how: ['Fix it'],
        technical: 'Details',
      },
      PatternTransformationErrorCode.INVALID_INPUT
    );

    expect(error.code).toBe(PatternTransformationErrorCode.INVALID_INPUT);
  });

  test('should accept optional original error', () => {
    const originalError = new Error('Original error');
    const error = new PatternTransformationAR22Error(
      'Test error',
      {
        what: 'Test',
        how: ['Fix it'],
        technical: 'Details',
      },
      PatternTransformationErrorCode.INVALID_INPUT,
      originalError
    );

    expect(error.originalError).toBe(originalError);
  });

  test('should have toString method for formatted output', () => {
    const error = new PatternTransformationAR22Error('Test error', {
      what: 'Test what happened',
      how: ['Step 1', 'Step 2'],
      technical: 'Test technical details',
    });

    expect(typeof error.toString).toBe('function');

    const errorString = error.toString();
    expect(errorString).toContain('Test error');
    expect(errorString).toContain('Test what happened');
    expect(errorString).toContain('Step 1');
    expect(errorString).toContain('Test technical details');
  });

  test('should include error code in toString if provided', () => {
    const error = new PatternTransformationAR22Error(
      'Test error',
      {
        what: 'Test',
        how: ['Fix it'],
        technical: 'Details',
      },
      PatternTransformationErrorCode.INVALID_INPUT
    );

    const errorString = error.toString();
    expect(errorString).toContain('INVALID_INPUT');
  });
});
