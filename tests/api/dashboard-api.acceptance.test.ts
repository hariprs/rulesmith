/**
 * Dashboard API-Level Acceptance Tests (Story 3-4)
 *
 * Test-Driven Development: RED PHASE - Failing tests ONLY
 * Pure business logic tests without UI/Chart.js dependencies.
 * These tests validate data transformations, calculations, and filter logic.
 *
 * Test Level: API-Level (Unit tests for business logic)
 * Scope: Pure functions, data transformations, calculations
 *
 * @module tests/api/dashboard-api-acceptance
 */

import { describe, it, expect } from '@jest/globals';
import { MergedPattern } from '../../src/pattern-matcher';
import { PatternCategory } from '../../src/pattern-detector';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create test patterns with known properties
 */
function createKnownPatterns(): MergedPattern[] {
  const now = new Date();

  return [
    {
      pattern_text: 'Missing error handling',
      suggested_rule: 'Add try-catch blocks',
      category: 'error-handling' as PatternCategory,
      count: 50,
      confidence: 0.9,
      first_seen: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      last_seen: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      examples: [],
      session_count: 10,
      total_frequency: 50,
      is_new: false,
      frequency_change: 5,
      content_types: ['typescript'],
    } as MergedPattern,
    {
      pattern_text: 'Unused imports',
      suggested_rule: 'Remove unused imports',
      category: 'code-quality' as PatternCategory,
      count: 30,
      confidence: 0.85,
      first_seen: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      last_seen: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      examples: [],
      session_count: 8,
      total_frequency: 30,
      is_new: true,
      frequency_change: -2,
      content_types: ['javascript'],
    } as MergedPattern,
    {
      pattern_text: 'Missing input validation',
      suggested_rule: 'Validate all inputs',
      category: 'security' as PatternCategory,
      count: 20,
      confidence: 0.95,
      first_seen: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_seen: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      examples: [],
      session_count: 5,
      total_frequency: 20,
      is_new: false,
      frequency_change: 0,
      content_types: ['typescript'],
    } as MergedPattern,
  ];
}

// ============================================================================
// AC1: DASHBOARD LAYOUT - DATA LAYER TESTS
// ============================================================================

describe('AC1: Dashboard Layout - Data Layer (API-Level)', () => {
  it('should determine optimal chart count based on pattern dataset size', () => {
    // Arrange
    const smallDataset = createKnownPatterns().slice(0, 1);
    const mediumDataset = createKnownPatterns();
    const largeDataset = Array.from({ length: 100 }, (_, i) => ({
      ...createKnownPatterns()[0],
      pattern_text: `Pattern ${i}`,
    }));

    // Act
    const { getOptimalChartCount } = require('../../src/visualization/dashboard-layout');
    const smallCount = getOptimalChartCount(smallDataset.length);
    const mediumCount = getOptimalChartCount(mediumDataset.length);
    const largeCount = getOptimalChartCount(largeDataset.length);

    // Assert
    expect(smallCount).toBeGreaterThanOrEqual(2);
    expect(mediumCount).toBeGreaterThanOrEqual(3);
    expect(largeCount).toBe(4);
  });

  it('should calculate chart arrangement based on data availability', () => {
    // Arrange
    const patterns = createKnownPatterns();

    // Act
    const { getChartArrangement } = require('../../src/visualization/dashboard-layout');
    const arrangement = getChartArrangement(patterns);

    // Assert
    expect(arrangement).toBeInstanceOf(Array);
    expect(arrangement.length).toBeGreaterThan(0);
    expect(arrangement.length).toBeLessThanOrEqual(4);
    expect(arrangement).toContain('category');
    expect(arrangement).toContain('top');
  });

  it('should validate layout configuration parameters', () => {
    // Arrange
    const validConfig = {
      containerId: 'test-container',
      chartCount: 4,
      responsive: true,
    };

    const invalidConfig = {
      containerId: '',
      chartCount: -1,
      responsive: true,
    };

    // Act
    const { validateLayoutConfig } = require('../../src/visualization/dashboard-layout');
    const validResult = validateLayoutConfig(validConfig);
    const invalidResult = validateLayoutConfig(invalidConfig);

    // Assert
    expect(validResult.isValid).toBe(true);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors).toBeInstanceOf(Array);
  });
});

// ============================================================================
// AC2: FILTER LOGIC - PURE FUNCTION TESTS
// ============================================================================

describe('AC2: Filter Logic - Pure Functions (API-Level)', () => {
  it('should filter patterns by date range correctly', () => {
    // Arrange
    const patterns = createKnownPatterns();
    const { applyDateRangeFilter } = require('../../src/visualization/dashboard-filters');

    // Act
    const last7Days = applyDateRangeFilter(patterns, '7-days');
    const last30Days = applyDateRangeFilter(patterns, '30-days');
    const allTime = applyDateRangeFilter(patterns, 'all-time');

    // Assert
    expect(last7Days.length).toBeLessThanOrEqual(last30Days.length);
    expect(last30Days.length).toBeLessThanOrEqual(allTime.length);
    expect(allTime.length).toBe(patterns.length);
  });

  it('should filter patterns by category correctly', () => {
    // Arrange
    const patterns = createKnownPatterns();
    const { applyCategoryFilter } = require('../../src/visualization/dashboard-filters');

    // Act
    const errorHandlingOnly = applyCategoryFilter(patterns, ['error-handling' as PatternCategory]);
    const multipleCategories = applyCategoryFilter(patterns, [
      'error-handling' as PatternCategory,
      'code-quality' as PatternCategory,
    ]);

    // Assert
    expect(errorHandlingOnly.length).toBe(1);
    expect(errorHandlingOnly[0].category).toBe('error-handling');
    expect(multipleCategories.length).toBe(2);
  });

  it('should filter patterns by frequency threshold correctly', () => {
    // Arrange
    const patterns = createKnownPatterns();
    const { applyFrequencyThreshold } = require('../../src/visualization/dashboard-filters');

    // Act
    const highFrequency = applyFrequencyThreshold(patterns, 25);
    const veryHighFrequency = applyFrequencyThreshold(patterns, 40);

    // Assert
    highFrequency.forEach(pattern => {
      expect(pattern.count).toBeGreaterThanOrEqual(25);
    });

    veryHighFrequency.forEach(pattern => {
      expect(pattern.count).toBeGreaterThanOrEqual(40);
    });

    expect(veryHighFrequency.length).toBeLessThanOrEqual(highFrequency.length);
  });

  it('should filter patterns by search text correctly', () => {
    // Arrange
    const patterns = createKnownPatterns();
    const { applySearchFilter } = require('../../src/visualization/dashboard-filters');

    // Act
    const searchResults = applySearchFilter(patterns, 'error');
    const noResults = applySearchFilter(patterns, 'nonexistent');

    // Assert
    expect(searchResults.length).toBeGreaterThan(0);
    searchResults.forEach(pattern => {
      const matchesText = pattern.pattern_text.toLowerCase().includes('error');
      const matchesRule = pattern.suggested_rule?.toLowerCase().includes('error');
      expect(matchesText || matchesRule).toBe(true);
    });

    expect(noResults.length).toBe(0);
  });

  it('should apply multiple filters in correct order', () => {
    // Arrange
    const patterns = createKnownPatterns();
    const { applyFilters } = require('../../src/visualization/dashboard-filters');

    // Act
    const filtered = applyFilters(patterns, {
      dateRange: 'all-time',
      categories: ['error-handling' as PatternCategory, 'security' as PatternCategory],
      frequencyThreshold: 20,
      searchText: '',
    });

    // Assert
    filtered.forEach(pattern => {
      expect(['error-handling', 'security']).toContain(pattern.category);
      expect(pattern.count).toBeGreaterThanOrEqual(20);
    });
  });

  it('should export filter state to URL parameters correctly', () => {
    // Arrange
    const { exportFilterState } = require('../../src/visualization/dashboard-filters');
    const filterState = {
      dateRange: '30-days' as const,
      categories: ['code-quality' as PatternCategory, 'security' as PatternCategory],
      frequencyThreshold: 15,
      searchText: 'validation',
    };

    // Act
    const queryString = exportFilterState(filterState);

    // Assert
    expect(queryString).toContain('dateRange=30-days');
    expect(queryString).toContain('categories=code-quality%2Csecurity');
    expect(queryString).toContain('threshold=15');
    expect(queryString).toContain('search=validation');
  });

  it('should import filter state from URL parameters correctly', () => {
    // Arrange
    const { importFilterState } = require('../../src/visualization/dashboard-filters');
    const queryString = 'dateRange=7-days&categories=error-handling%2Csecurity&threshold=10&search=test';

    // Act
    const filterState = importFilterState(queryString);

    // Assert
    expect(filterState.dateRange).toBe('7-days');
    expect(filterState.categories).toEqual(['error-handling', 'security']);
    expect(filterState.frequencyThreshold).toBe(10);
    expect(filterState.searchText).toBe('test');
  });

  it('should debounce filter changes to prevent excessive recalculations', () => {
    // Arrange
    const { createDebouncedFilter } = require('../../src/visualization/dashboard-filters');
    let callCount = 0;
    const debouncedFilter = createDebouncedFilter(() => callCount++, 300);

    // Act
    debouncedFilter();
    debouncedFilter();
    debouncedFilter();

    // Assert
    // Should only call once after debounce period
    expect(callCount).toBe(0);

    setTimeout(() => {
      expect(callCount).toBe(1);
    }, 350);
  });
});

// ============================================================================
// AC3: CROSS-CHART INTERACTION - DATA LAYER TESTS
// ============================================================================

describe('AC3: Cross-Chart Interaction - Data Layer (API-Level)', () => {
  it('should identify related patterns across different chart types', () => {
    // Arrange
    const patterns = createKnownPatterns();
    const { findRelatedPatterns } = require('../../src/visualization/dashboard');

    // Act
    const relatedToErrorHandling = findRelatedPatterns(patterns, 'error-handling');

    // Assert
    expect(relatedToErrorHandling).toBeInstanceOf(Array);
    expect(relatedToErrorHandling.length).toBeGreaterThan(0);
    relatedToErrorHandling.forEach(pattern => {
      expect(pattern.category).toBe('error-handling');
    });
  });

  it('should generate tooltip data for pattern details', () => {
    // Arrange
    const patterns = createKnownPatterns();
    const { generateTooltipData } = require('../../src/visualization/dashboard');

    // Act
    const tooltipData = generateTooltipData(patterns[0]);

    // Assert
    expect(tooltipData.patternText).toBeTruthy();
    expect(tooltipData.suggestedRule).toBeTruthy();
    expect(tooltipData.exampleCount).toBeGreaterThanOrEqual(0);
    expect(tooltipData.confidence).toBeGreaterThan(0);
  });

  it('should extract examples from MergedPattern for display', () => {
    // Arrange
    const patternWithExamples = {
      ...createKnownPatterns()[0],
      examples: [
        {
          conversation_file: 'test1.md',
          line_number: 10,
          context: 'Example context 1',
          corrected: false,
        },
        {
          conversation_file: 'test2.md',
          line_number: 20,
          context: 'Example context 2',
          corrected: true,
        },
      ],
    };

    // Act
    const { extractExamples } = require('../../src/visualization/dashboard');
    const examples = extractExamples(patternWithExamples);

    // Assert
    expect(examples.length).toBe(2);
    expect(examples[0].conversation_file).toBe('test1.md');
    expect(examples[1].line_number).toBe(20);
  });

  it('should maintain filter state during pattern navigation', () => {
    // Arrange
    const { preserveFilterState } = require('../../src/visualization/dashboard');
    const originalFilters = {
      dateRange: '30-days' as const,
      categories: ['code-quality' as PatternCategory],
      frequencyThreshold: 10,
      searchText: 'test',
    };

    // Act
    const preserved = preserveFilterState(originalFilters);

    // Assert
    expect(preserved.dateRange).toBe(originalFilters.dateRange);
    expect(preserved.categories).toEqual(originalFilters.categories);
    expect(preserved.frequencyThreshold).toBe(originalFilters.frequencyThreshold);
    expect(preserved.searchText).toBe(originalFilters.searchText);
  });
});

// ============================================================================
// AC4: STATISTICS CALCULATION - PURE FUNCTION TESTS
// ============================================================================

describe('AC4: Statistics Calculation - Pure Functions (API-Level)', () => {
  it('should calculate total patterns correctly', () => {
    // Arrange
    const patterns = createKnownPatterns();
    const { calculateTotalPatterns } = require('../../src/visualization/dashboard-stats');

    // Act
    const total = calculateTotalPatterns(patterns);

    // Assert
    expect(total).toBe(patterns.length);
  });

  it('should calculate total corrections correctly', () => {
    // Arrange
    const patterns = createKnownPatterns();
    const { calculateTotalCorrections } = require('../../src/visualization/dashboard-stats');

    // Act
    const total = calculateTotalCorrections(patterns);

    // Assert
    const expected = patterns.reduce((sum, p) => sum + p.count, 0);
    expect(total).toBe(expected);
  });

  it('should identify top category correctly', () => {
    // Arrange
    const patterns = createKnownPatterns();
    const { calculateTopCategory } = require('../../src/visualization/dashboard-stats');

    // Act
    const topCategory = calculateTopCategory(patterns);

    // Assert
    expect(topCategory).toBe('error-handling');
  });

  it('should identify most active period correctly', () => {
    // Arrange
    const patterns = createKnownPatterns();
    const { calculateMostActivePeriod } = require('../../src/visualization/dashboard-stats');

    // Act
    const mostActivePeriod = calculateMostActivePeriod(patterns);

    // Assert
    expect(mostActivePeriod).toBeTruthy();
    expect(mostActivePeriod).toMatch(/\d{4}-\d{2}/);
  });

  it('should calculate average frequency correctly', () => {
    // Arrange
    const patterns = createKnownPatterns();
    const { calculateAverageFrequency } = require('../../src/visualization/dashboard-stats');

    // Act
    const average = calculateAverageFrequency(patterns);

    // Assert
    const expected = patterns.reduce((sum, p) => sum + p.count, 0) / patterns.length;
    expect(average).toBeCloseTo(expected, 2);
  });

  it('should calculate category distribution correctly', () => {
    // Arrange
    const patterns = createKnownPatterns();
    const { calculateCategoryDistribution } = require('../../src/visualization/dashboard-stats');

    // Act
    const distribution = calculateCategoryDistribution(patterns);

    // Assert
    expect(distribution.get('error-handling')).toBe(50);
    expect(distribution.get('code-quality')).toBe(30);
    expect(distribution.get('security')).toBe(20);
  });

  it('should calculate trend indicators correctly', () => {
    // Arrange
    const patterns = createKnownPatterns();
    const { calculateTrends } = require('../../src/visualization/dashboard-stats');

    // Act
    const trends = calculateTrends(patterns);

    // Assert
    expect(trends).toBeTruthy();
    expect(trends.current).toBeGreaterThanOrEqual(0);
    expect(trends.previous).toBeGreaterThanOrEqual(0);
    expect(['up', 'down', 'neutral']).toContain(trends.direction);
    expect(typeof trends.change).toBe('number');
  });

  it('should format numbers with K, M, B suffixes correctly', () => {
    // Arrange
    const { formatNumber } = require('../../src/visualization/dashboard-stats');

    // Act
    const formatted1K = formatNumber(1200);
    const formatted1M = formatNumber(3400000);
    const formatted1B = formatNumber(2500000000);
    const formattedNormal = formatNumber(500);

    // Assert
    expect(formatted1K).toBe('1.2K');
    expect(formatted1M).toBe('3.4M');
    expect(formatted1B).toBe('2.5B');
    expect(formattedNormal).toBe('500');
  });

  it('should handle empty pattern arrays gracefully', () => {
    // Arrange
    const { calculateSummaryStatistics } = require('../../src/visualization/dashboard-stats');

    // Act
    const stats = calculateSummaryStatistics([]);

    // Assert
    expect(stats.totalPatterns).toBe(0);
    expect(stats.totalCorrections).toBe(0);
    expect(stats.topCategory).toBeNull();
    expect(stats.mostActivePeriod).toBeNull();
    expect(stats.averageFrequency).toBe(0);
  });

  it('should detect statistics changes correctly', () => {
    // Arrange
    const { calculateSummaryStatistics, detectStatisticsChanges } = require('../../src/visualization/dashboard-stats');
    const patterns1 = createKnownPatterns();
    const patterns2 = [...createKnownPatterns(), {
      pattern_text: 'New pattern',
      suggested_rule: 'New rule',
      category: 'documentation' as PatternCategory,
      count: 10,
      confidence: 0.8,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      examples: [],
      session_count: 1,
      total_frequency: 10,
      is_new: true,
      frequency_change: 0,
      content_types: [],
    } as MergedPattern];

    // Act
    const stats1 = calculateSummaryStatistics(patterns1);
    const stats2 = calculateSummaryStatistics(patterns2);
    const changes = detectStatisticsChanges(stats1, stats2);

    // Assert
    expect(changes).toContain('totalPatterns');
    expect(changes).toContain('totalCorrections');
  });
});

// ============================================================================
// AC6: PERFORMANCE - DATA TRANSFORMATION TESTS
// ============================================================================

describe('AC6: Performance - Data Transformations (API-Level)', () => {
  it('should transform patterns for chart rendering efficiently', () => {
    // Arrange
    const patterns = Array.from({ length: 1000 }, (_, i) => ({
      pattern_text: `Pattern ${i}`,
      suggested_rule: `Rule ${i}`,
      category: `category-${i % 5}` as PatternCategory,
      count: Math.floor(Math.random() * 100) + 1,
      confidence: 0.8,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      examples: [],
      session_count: 1,
      total_frequency: 1,
      is_new: false,
      frequency_change: 0,
      content_types: [],
    } as MergedPattern));

    // Act
    const startTime = performance.now();
    const { transformPatternsForDashboard } = require('../../src/visualization/dashboard');
    const transformed = transformPatternsForDashboard(patterns);
    const transformTime = performance.now() - startTime;

    // Assert
    expect(transformed).toBeTruthy();
    expect(transformTime).toBeLessThan(500);
  });

  it('should batch filter updates for performance', () => {
    // Arrange
    const patterns = createKnownPatterns();
    const { batchFilterUpdates } = require('../../src/visualization/dashboard-filters');

    // Act
    const startTime = performance.now();
    const results = batchFilterUpdates(patterns, [
      { type: 'category', value: 'error-handling' as PatternCategory },
      { type: 'frequency', value: 25 },
    ]);
    const batchTime = performance.now() - startTime;

    // Assert
    expect(results.length).toBe(2);
    expect(batchTime).toBeLessThan(100);
  });

  it('should cache filter results to avoid redundant calculations', () => {
    // Arrange
    const patterns = createKnownPatterns();
    const { createCachedFilter } = require('../../src/visualization/dashboard-filters');

    // Act
    const cachedFilter = createCachedFilter(patterns);

    const firstCall = cachedFilter.apply({ dateRange: 'all-time', categories: [], frequencyThreshold: 0, searchText: '' });
    const secondCall = cachedFilter.apply({ dateRange: 'all-time', categories: [], frequencyThreshold: 0, searchText: '' });

    // Assert
    expect(firstCall).toEqual(secondCall);
    expect(cachedFilter.getHitCount()).toBe(1);
  });

  it('should optimize data structures for large datasets', () => {
    // Arrange
    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
      pattern_text: `Pattern ${i}`,
      suggested_rule: `Rule ${i}`,
      category: `category-${i % 10}` as PatternCategory,
      count: Math.floor(Math.random() * 100) + 1,
      confidence: 0.8,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      examples: [],
      session_count: 1,
      total_frequency: 1,
      is_new: false,
      frequency_change: 0,
      content_types: [],
    } as MergedPattern));

    // Act
    const startTime = performance.now();
    const { optimizeDataStructure } = require('../../src/visualization/dashboard');
    const optimized = optimizeDataStructure(largeDataset);
    const optimizeTime = performance.now() - startTime;

    // Assert
    expect(optimized).toBeTruthy();
    expect(optimizeTime).toBeLessThan(1000);
    expect(optimized.size).toBe(10000);
  });
});
