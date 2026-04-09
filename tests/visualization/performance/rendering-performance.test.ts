/**
 * Performance Tests for Chart Rendering (Story 3-2)
 *
 * TDD Red Phase: Failing performance acceptance tests
 *
 * These tests validate performance requirements for chart rendering
 * with varying dataset sizes as specified in AC5.
 *
 * Performance Requirements (AC5):
 * - 100 patterns in < 1 second
 * - 1,000 patterns in < 1 second
 * - 10,000 patterns in < 5 seconds
 * - No memory leaks during render/destroy cycles
 *
 * Testing Strategy:
 * - Test rendering performance with different dataset sizes
 * - Test data transformation performance
 * - Test memory usage and cleanup
 * - Test rendering with data sampling for large datasets
 * - Benchmark and document performance baselines
 *
 * Test Pyramid Level: Performance (5% - benchmark tests)
 *
 * @jest-environment jsdom
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { transformPatternsToBarChart, transformPatternsToLineChart } from '../../../src/visualization/transformers';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

enum PatternCategory {
  CODE_STYLE = 'code_style',
  TERMINOLOGY = 'terminology',
  STRUCTURE = 'structure',
  FORMATTING = 'formatting',
  CONVENTION = 'convention',
  OTHER = 'other',
}

enum ContentType {
  CODE = 'code',
  DOCUMENTATION = 'documentation',
  DIAGRAM = 'diagram',
  PRD = 'prd',
  TEST_PLAN = 'test_plan',
  GENERAL_TEXT = 'general_text',
}

interface PatternExample {
  original_suggestion: string;
  user_correction: string;
  context: string;
  timestamp: string;
  content_type: ContentType;
}

interface MergedPattern {
  pattern_text: string;
  count: number;
  category: PatternCategory;
  examples: PatternExample[];
  suggested_rule: string;
  first_seen: string;
  last_seen: string;
  content_types: ContentType[];
  session_count: number;
  total_frequency: number;
  is_new: boolean;
  frequency_change: number;
}

interface ChartData {
  chartType: 'bar' | 'line' | 'pie';
  title: string;
  xAxis: {
    label: string;
    data: string[];
  };
  yAxis: {
    label: string;
    data: number[];
  };
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }[];
  metadata?: {
    totalPatterns: number;
    dateRange: { start: string; end: string };
    categories: string[];
  };
}

interface PerformanceMetrics {
  renderTime: number;
  transformTime: number;
  totalTime: number;
  memoryUsed: number;
  datasetSize: number;
}

// ============================================================================
// PERFORMANCE TESTING FUNCTIONS
// ============================================================================

/**
 * Generate test patterns for performance testing
 */
function generateTestPatterns(count: number): MergedPattern[] {
  const categories = Object.values(PatternCategory);
  return Array.from({ length: count }, (_, i) => ({
    pattern_text: `Pattern ${i}`,
    count: Math.floor(Math.random() * 100) + 1,
    category: categories[i % categories.length],
    examples: [],
    suggested_rule: `Test rule ${i}`,
    first_seen: '2026-03-15T10:00:00Z',
    last_seen: '2026-03-18T11:00:00Z',
    content_types: [ContentType.CODE],
    session_count: 1,
    total_frequency: Math.floor(Math.random() * 100) + 1,
    is_new: i % 2 === 0,
    frequency_change: Math.floor(Math.random() * 10) - 5,
  }));
}

/**
 * Sample data for large datasets (top N patterns)
 */
function sampleTopPatterns(patterns: MergedPattern[], n: number): MergedPattern[] {
  return patterns
    .sort((a, b) => b.total_frequency - a.total_frequency)
    .slice(0, n);
}

/**
 * Measure memory usage
 */
function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed;
  }
  return 0;
}

/**
 * Check for memory leaks after transformations
 */
function checkMemoryLeaks(cycles: number): { hasLeaks: boolean; memoryGrowth: number } {
  const initialMemory = getMemoryUsage();

  for (let i = 0; i < cycles; i++) {
    const chartData = transformPatternsToBarChart(generateTestPatterns(100));
    // In real implementation, would render and destroy chart here
  }

  const finalMemory = getMemoryUsage();
  const memoryGrowth = finalMemory - initialMemory;

  return {
    hasLeaks: memoryGrowth > cycles * 1024 * 1024, // More than 1MB per cycle
    memoryGrowth,
  };
}

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Sample pattern for generation
 */
const samplePattern: MergedPattern = {
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

// ============================================================================
// DATA TRANSFORMATION PERFORMANCE TESTS
// ============================================================================

describe('Data Transformation Performance', () => {
  test('should transform 100 patterns in < 100ms', () => {
    const patterns = generateTestPatterns(100);

    const startTime = Date.now();
    transformPatternsToBarChart(patterns);
    const endTime = Date.now();

    const duration = endTime - startTime;

    expect(duration).toBeLessThan(100);
  });

  test('should transform 1,000 patterns in < 500ms', () => {
    const patterns = generateTestPatterns(1000);

    const startTime = Date.now();
    transformPatternsToBarChart(patterns);
    const endTime = Date.now();

    const duration = endTime - startTime;

    expect(duration).toBeLessThan(500);
  });

  test('should transform 10,000 patterns in < 2000ms', () => {
    const patterns = generateTestPatterns(10000);

    const startTime = Date.now();
    transformPatternsToBarChart(patterns);
    const endTime = Date.now();

    const duration = endTime - startTime;

    expect(duration).toBeLessThan(2000);
  });

  test('should transform line chart data efficiently', () => {
    const patterns = generateTestPatterns(1000);

    const startTime = Date.now();
    transformPatternsToLineChart(patterns);
    const endTime = Date.now();

    const duration = endTime - startTime;

    expect(duration).toBeLessThan(500);
  });

  test('should have O(n) time complexity for transformation', () => {
    const sizes = [100, 500, 1000, 5000];
    const times: number[] = [];

    sizes.forEach((size) => {
      const patterns = generateTestPatterns(size);

      const startTime = Date.now();
      transformPatternsToBarChart(patterns);
      const endTime = Date.now();

      times.push(endTime - startTime);
    });

    // Check linear scaling - skip if any time is 0 to avoid Infinity
    for (let i = 1; i < times.length; i++) {
      if (times[i - 1] > 0 && times[i] > 0) {
        const ratio = times[i] / times[i - 1];
        const sizeRatio = sizes[i] / sizes[i - 1];
        expect(ratio).toBeLessThan(sizeRatio * 2);
      }
    }
  });
});

// ============================================================================
// CHART RENDERING PERFORMANCE TESTS (AC5)
// ============================================================================
// NOTE: Rendering tests are for Story 3-3. Story 3-2 focuses on transformation.
// These tests validate transformation performance per AC5 requirements.

describe('Chart Data Transformation Performance - AC5 Requirements', () => {
  test('should transform 100 patterns in < 1 second (AC5)', () => {
    const patterns = generateTestPatterns(100);

    const startTime = Date.now();
    const chartData = transformPatternsToBarChart(patterns);
    const endTime = Date.now();

    const duration = endTime - startTime;

    expect(chartData).toBeDefined();
    expect(duration).toBeLessThan(1000);
  });

  test('should transform 1,000 patterns in < 1 second (AC5)', () => {
    const patterns = generateTestPatterns(1000);

    const startTime = Date.now();
    const chartData = transformPatternsToBarChart(patterns);
    const endTime = Date.now();

    const duration = endTime - startTime;

    expect(chartData).toBeDefined();
    expect(duration).toBeLessThan(1000);
  });

  test('should transform 10,000 patterns in < 5 seconds (AC5)', () => {
    const patterns = generateTestPatterns(10000);

    const startTime = Date.now();
    const chartData = transformPatternsToBarChart(patterns);
    const endTime = Date.now();

    const duration = endTime - startTime;

    expect(chartData).toBeDefined();
    expect(duration).toBeLessThan(5000);
  });

  test('should transform line chart data with 1000 patterns efficiently', () => {
    const patterns = generateTestPatterns(1000);

    const startTime = Date.now();
    const chartData = transformPatternsToLineChart(patterns);
    const endTime = Date.now();

    const duration = endTime - startTime;

    expect(chartData).toBeDefined();
    expect(duration).toBeLessThan(1000);
  });

  test('should transform all chart types efficiently', () => {
    const patterns = generateTestPatterns(1000);

    // Test all transformer types
    const barData = transformPatternsToBarChart(patterns);
    const lineData = transformPatternsToLineChart(patterns);

    expect(barData).toBeDefined();
    expect(lineData).toBeDefined();
  });
});

// ============================================================================
// MEMORY LEAK DETECTION TESTS
// ============================================================================
// NOTE: Memory leak tests for rendering are deferred to Story 3-3.
// Story 3-2 tests transformation memory efficiency.

describe('Memory Efficiency - Transformation Tests', () => {
  test('should not leak memory during repeated transformations', () => {
    const patterns = generateTestPatterns(1000);

    const initialMemory = getMemoryUsage();

    // Perform multiple transformations
    for (let i = 0; i < 100; i++) {
      transformPatternsToBarChart(patterns);
      transformPatternsToLineChart(patterns);
    }

    const finalMemory = getMemoryUsage();
    const memoryGrowth = finalMemory - initialMemory;

    // Memory growth should be minimal for transformations
    // (transformations create new objects but don't retain references)
    if (initialMemory > 0 && finalMemory > 0) {
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB for 200 transformations
    }
  });

  test('should handle large dataset transformations efficiently', () => {
    const patterns = generateTestPatterns(10000);

    const initialMemory = getMemoryUsage();

    const chartData = transformPatternsToBarChart(patterns);

    const finalMemory = getMemoryUsage();
    const memoryGrowth = finalMemory - initialMemory;

    expect(chartData).toBeDefined();

    // Memory usage should be reasonable for 10K patterns
    if (initialMemory > 0 && finalMemory > 0) {
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    }
  });
});

// ============================================================================
// DATA SAMPLING PERFORMANCE TESTS
// ============================================================================

describe('Data Sampling Performance - Large Datasets', () => {
  test('should sample top 100 patterns from 10K quickly', () => {
    const patterns = generateTestPatterns(10000);

    const startTime = Date.now();
    const sampled = sampleTopPatterns(patterns, 100);
    const endTime = Date.now();

    const duration = endTime - startTime;

    expect(sampled).toHaveLength(100);
    expect(duration).toBeLessThan(100); // Should be very fast
  });

  test('should transform sampled data faster than full dataset', () => {
    const fullPatterns = generateTestPatterns(10000);
    const sampledPatterns = sampleTopPatterns(fullPatterns, 100);

    const fullStartTime = Date.now();
    const fullData = transformPatternsToBarChart(fullPatterns);
    const fullEndTime = Date.now();
    const fullDuration = fullEndTime - fullStartTime;

    const sampledStartTime = Date.now();
    const sampledData = transformPatternsToBarChart(sampledPatterns);
    const sampledEndTime = Date.now();
    const sampledDuration = sampledEndTime - sampledStartTime;

    // Sampled should be significantly faster
    expect(sampledDuration).toBeLessThan(fullDuration);
  });

  test('should maintain correct ordering in sampled data', () => {
    const patterns = generateTestPatterns(1000);
    const sampled = sampleTopPatterns(patterns, 100);

    // Should be sorted by frequency (descending)
    for (let i = 1; i < sampled.length; i++) {
      expect(sampled[i].total_frequency).toBeLessThanOrEqual(sampled[i - 1].total_frequency);
    }
  });

  test('should handle sampling when n exceeds dataset size', () => {
    const patterns = generateTestPatterns(50);
    const sampled = sampleTopPatterns(patterns, 100);

    expect(sampled).toHaveLength(50);
  });
});

// ============================================================================
// PERFORMANCE BENCHMARK TESTS
// ============================================================================

describe('Performance Benchmarks - Story 3-2 Transformations', () => {
  test('should benchmark transformation for all dataset sizes', () => {
    const sizes = [100, 1000, 10000];
    const benchmarks: { size: number; time: number }[] = [];

    sizes.forEach((size) => {
      const patterns = generateTestPatterns(size);

      const startTime = Date.now();
      transformPatternsToBarChart(patterns);
      const endTime = Date.now();

      benchmarks.push({
        size,
        time: endTime - startTime,
      });
    });

    // Log benchmarks for documentation
    console.log('Transformation Benchmarks:');
    benchmarks.forEach((b) => {
      console.log(`  ${b.size} patterns: ${b.time}ms`);
    });

    // Verify AC5 performance requirements
    expect(benchmarks[0].time).toBeLessThan(1000); // 100 patterns < 1s
    expect(benchmarks[1].time).toBeLessThan(1000); // 1000 patterns < 1s
    expect(benchmarks[2].time).toBeLessThan(5000); // 10000 patterns < 5s
  });

  test('should document memory usage for different dataset sizes', () => {
    const sizes = [100, 1000, 10000];
    const memoryUsage: { size: number; memory: number }[] = [];

    sizes.forEach((size) => {
      const patterns = generateTestPatterns(size);

      const initialMemory = getMemoryUsage();
      transformPatternsToBarChart(patterns);
      const finalMemory = getMemoryUsage();

      memoryUsage.push({
        size,
        memory: finalMemory - initialMemory,
      });
    });

    // Log memory usage for documentation
    console.log('Memory Usage:');
    memoryUsage.forEach((m) => {
      console.log(`  ${m.size} patterns: ${(m.memory / 1024 / 1024).toFixed(2)}MB`);
    });

    // Memory usage should be reasonable
    if (memoryUsage[2].memory > 0) {
      expect(memoryUsage[2].memory).toBeLessThan(100 * 1024 * 1024); // 100MB for 10K patterns
    }
  });
});

// ============================================================================
// EDGE CASE PERFORMANCE TESTS
// ============================================================================

describe('Edge Case Performance', () => {
  test('should handle empty dataset with error', () => {
    const patterns: MergedPattern[] = [];

    // Per AC6, empty patterns should throw an error
    expect(() => {
      transformPatternsToBarChart(patterns);
    }).toThrow();
  });

  test('should handle single pattern quickly', () => {
    const patterns = [samplePattern];

    const startTime = Date.now();
    transformPatternsToBarChart(patterns);
    const endTime = Date.now();

    const duration = endTime - startTime;

    expect(duration).toBeLessThan(10);
  });

  test('should handle patterns with zero frequency', () => {
    const patterns = generateTestPatterns(100).map((p) => ({
      ...p,
      count: 0,
      total_frequency: 0,
    }));

    const startTime = Date.now();
    transformPatternsToBarChart(patterns);
    const endTime = Date.now();

    const duration = endTime - startTime;

    expect(duration).toBeLessThan(100);
  });

  test('should handle patterns with very large frequency values', () => {
    const patterns = generateTestPatterns(100).map((p) => ({
      ...p,
      count: 1000000,
      total_frequency: 1000000,
    }));

    const startTime = Date.now();
    transformPatternsToBarChart(patterns);
    const endTime = Date.now();

    const duration = endTime - startTime;

    expect(duration).toBeLessThan(100);
  });
});
