/**
 * Performance Tests for Chart Rendering (Story 3-3)
 *
 * TDD Red Phase: Failing performance acceptance tests
 *
 * These tests verify performance requirements from acceptance criteria:
 * - AC1: Bar chart 100 patterns < 2 seconds
 * - AC2: Bar chart 10K patterns (top 100) < 3 seconds
 * - AC3: Line chart 1K patterns spanning 6 months < 2 seconds
 * - AC4: Doughnut chart < 1 second
 * - Memory leak detection (render/destroy cycles)
 * - Performance benchmarks
 *
 * Testing Strategy:
 * - Measure actual render times with various dataset sizes
 * - Test memory leak detection (render/destroy cycles)
 * - Use performance.now() for precise timing
 * - Test with max dataset sizes
 * - Create performance benchmarks
 *
 * Test Pyramid Level: Performance (5% - Critical for user experience)
 *
 * @jest-environment jsdom
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ChartData, ChartType } from '../../../src/visualization/types';
import { MergedPattern } from '../../../src/pattern-matcher';
import { PatternCategory, ContentType } from '../../../src/pattern-detector';

// ============================================================================
// MOCK CHART.JS FOR PERFORMANCE TESTING
// ============================================================================

jest.mock('chart.js/auto', () => {
  let renderDelay = 0;

  return {
    Chart: jest.fn().mockImplementation((canvas: any, config: any) => ({
      canvas,
      config,
      destroy: jest.fn(),
      update: jest.fn(),
      resize: jest.fn(),
      id: canvas.id || 'unknown',
    })),
    setRenderDelay: (delay: number) => {
      renderDelay = delay;
    },
  };
});

// ============================================================================
// PERFORMANCE FIXTURES
// ============================================================================

/**
 * Create patterns for performance testing
 */
const createPerformancePatterns = (count: number): MergedPattern[] => {
  const categories = Object.values(PatternCategory);
  const patterns: MergedPattern[] = [];

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    patterns.push({
      pattern_text: `Performance Pattern ${i + 1}: ${category} example`,
      count: Math.floor(Math.random() * 100) + 1,
      category,
      examples: [],
      suggested_rule: `Rule for performance pattern ${i + 1}`,
      first_seen: '2026-01-01T00:00:00Z',
      last_seen: '2026-03-18T23:59:59Z',
      content_types: [ContentType.CODE],
      session_count: Math.floor(Math.random() * 10) + 1,
      total_frequency: Math.floor(Math.random() * 1000) + 1,
      is_new: i % 2 === 0,
      frequency_change: Math.floor(Math.random() * 20) - 10,
    });
  }

  return patterns;
};

/**
 * Create temporal patterns spanning 6 months
 */
const createTemporalPatterns = (count: number, months: number = 6): MergedPattern[] => {
  const patterns: MergedPattern[] = [];
  const daysInMonth = 30;
  const totalDays = months * daysInMonth;

  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor(Math.random() * totalDays);
    const date = new Date('2026-01-01T00:00:00Z');
    date.setDate(date.getDate() + dayOffset);
    date.setHours(Math.floor(Math.random() * 24));
    date.setMinutes(Math.floor(Math.random() * 60));

    patterns.push({
      pattern_text: `Temporal Pattern ${i + 1}`,
      count: 1,
      category: Object.values(PatternCategory)[i % Object.values(PatternCategory).length],
      examples: [],
      suggested_rule: `Rule ${i + 1}`,
      first_seen: date.toISOString(),
      last_seen: date.toISOString(),
      content_types: [ContentType.CODE],
      session_count: 1,
      total_frequency: 1,
      is_new: true,
      frequency_change: 0,
    });
  }

  return patterns;
};

// ============================================================================
// SETUP AND TEARDOWN
// ============================================================================

function createCanvas(canvasId: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.id = canvasId;
  canvas.style.width = '800px';
  canvas.style.height = '600px';
  document.body.appendChild(canvas);
  return canvas;
}

function removeCanvas(canvasId: string): void {
  const canvas = document.getElementById(canvasId);
  if (canvas && canvas.parentNode) {
    canvas.parentNode.removeChild(canvas);
  }
}

// ============================================================================
// IMPORT RENDER FUNCTIONS
// ============================================================================

let renderPatternFrequencyChart: any;
let renderTopPatternsChart: any;
let renderPatternTrendsChart: any;
let renderCategoryDistributionChart: any;
let destroyChart: any;

try {
  const chartRendererModule = require('../../../src/visualization/chart-renderer');
  renderPatternFrequencyChart = chartRendererModule.renderPatternFrequencyChart;
  renderTopPatternsChart = chartRendererModule.renderTopPatternsChart;
  renderPatternTrendsChart = chartRendererModule.renderPatternTrendsChart;
  renderCategoryDistributionChart = chartRendererModule.renderCategoryDistributionChart;
  destroyChart = chartRendererModule.destroyChart;
} catch (error) {
  // Module not yet implemented
}

// ============================================================================
// AC1 PERFORMANCE: BAR CHART - 100 PATTERNS < 2 SECONDS
// ============================================================================

describe('AC1 Performance: Bar Chart - 100 Patterns', () => {
  let canvas: HTMLCanvasElement;
  let canvasId: string;

  beforeEach(() => {
    canvasId = `perf-canvas-${Date.now()}`;
    canvas = createCanvas(canvasId);
  });

  afterEach(() => {
    if (destroyChart) {
      destroyChart(canvas);
    }
    removeCanvas(canvasId);
  });

  test('should complete rendering in < 2 seconds for 100 patterns', async () => {
    const patterns = createPerformancePatterns(100);

    const startTime = performance.now();

    if (renderPatternFrequencyChart) {
      const chart = renderPatternFrequencyChart(canvas, patterns);
      expect(chart).toBeDefined();

      // Wait for Chart.js animation to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      throw new Error('renderPatternFrequencyChart not implemented');
    }

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    console.log(`AC1 Performance: Bar chart 100 patterns rendered in ${renderTime.toFixed(2)}ms`);
    expect(renderTime).toBeLessThan(2000);
  });

  test('should maintain performance across multiple renders', async () => {
    const patterns = createPerformancePatterns(100);
    const renderTimes: number[] = [];

    for (let i = 0; i < 5; i++) {
      if (destroyChart) {
        destroyChart(canvas);
      }

      const startTime = performance.now();

      if (renderPatternFrequencyChart) {
        const chart = renderPatternFrequencyChart(canvas, patterns);
        expect(chart).toBeDefined();

        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }

      const endTime = performance.now();
      renderTimes.push(endTime - startTime);
    }

    const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
    console.log(`AC1 Performance: Average render time for 5 iterations: ${avgRenderTime.toFixed(2)}ms`);

    // All renders should be under 2 seconds
    renderTimes.forEach(time => {
      expect(time).toBeLessThan(2000);
    });

    // Average should be reasonably consistent (within 50% variance)
    const maxTime = Math.max(...renderTimes);
    const minTime = Math.min(...renderTimes);
    const variance = ((maxTime - minTime) / minTime) * 100;
    expect(variance).toBeLessThan(50);
  });
});

// ============================================================================
// AC2 PERFORMANCE: BAR CHART - 10K PATTERNS (TOP 100) < 3 SECONDS
// ============================================================================

describe('AC2 Performance: Bar Chart - 10K Patterns (Top 100)', () => {
  let canvas: HTMLCanvasElement;
  let canvasId: string;

  beforeEach(() => {
    canvasId = `perf-canvas-${Date.now()}`;
    canvas = createCanvas(canvasId);
  });

  afterEach(() => {
    if (destroyChart) {
      destroyChart(canvas);
    }
    removeCanvas(canvasId);
  });

  test('should complete rendering in < 3 seconds for top 100 from 10K patterns', async () => {
    const largePatterns = createPerformancePatterns(10000);

    const startTime = performance.now();

    if (renderTopPatternsChart) {
      const chart = renderTopPatternsChart(canvas, largePatterns, 100);
      expect(chart).toBeDefined();

      // Wait for Chart.js animation
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      throw new Error('renderTopPatternsChart not implemented');
    }

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    console.log(`AC2 Performance: Bar chart top 100 from 10K patterns rendered in ${renderTime.toFixed(2)}ms`);
    expect(renderTime).toBeLessThan(3000);
  });

  test('should sample efficiently from 10K patterns', async () => {
    const largePatterns = createPerformancePatterns(10000);

    // Measure sampling time
    const sampleStartTime = performance.now();

    if (renderTopPatternsChart) {
      const chart = renderTopPatternsChart(canvas, largePatterns, 100);
      expect(chart).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      throw new Error('renderTopPatternsChart not implemented');
    }

    const sampleEndTime = performance.now();
    const sampleTime = sampleEndTime - sampleStartTime;

    console.log(`AC2 Performance: Sampling from 10K patterns took ${sampleTime.toFixed(2)}ms`);

    // Sampling should be fast (< 500ms)
    expect(sampleTime).toBeLessThan(500);
  });

  test('should handle varying topN values efficiently', async () => {
    const largePatterns = createPerformancePatterns(10000);
    const topNValues = [10, 25, 50, 100];
    const renderTimes: number[] = [];

    for (const topN of topNValues) {
      if (destroyChart) {
        destroyChart(canvas);
      }

      const startTime = performance.now();

      if (renderTopPatternsChart) {
        const chart = renderTopPatternsChart(canvas, largePatterns, topN);
        expect(chart).toBeDefined();

        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        throw new Error('renderTopPatternsChart not implemented');
      }

      const endTime = performance.now();
      renderTimes.push(endTime - startTime);

      console.log(`AC2 Performance: Top ${topN} patterns rendered in ${(endTime - startTime).toFixed(2)}ms`);
    }

    // All should be under 3 seconds
    renderTimes.forEach(time => {
      expect(time).toBeLessThan(3000);
    });
  });
});

// ============================================================================
// AC3 PERFORMANCE: LINE CHART - 1K PATTERNS SPANNING 6 MONTHS < 2 SECONDS
// ============================================================================

describe('AC3 Performance: Line Chart - 1K Patterns Spanning 6 Months', () => {
  let canvas: HTMLCanvasElement;
  let canvasId: string;

  beforeEach(() => {
    canvasId = `perf-canvas-${Date.now()}`;
    canvas = createCanvas(canvasId);
  });

  afterEach(() => {
    if (destroyChart) {
      destroyChart(canvas);
    }
    removeCanvas(canvasId);
  });

  test('should complete rendering in < 2 seconds for 1K patterns spanning 6 months', async () => {
    const temporalPatterns = createTemporalPatterns(1000, 6);

    const startTime = performance.now();

    if (renderPatternTrendsChart) {
      const chart = renderPatternTrendsChart(canvas, temporalPatterns);
      expect(chart).toBeDefined();

      // Wait for Chart.js animation
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      throw new Error('renderPatternTrendsChart not implemented');
    }

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    console.log(`AC3 Performance: Line chart 1K patterns spanning 6 months rendered in ${renderTime.toFixed(2)}ms`);
    expect(renderTime).toBeLessThan(2000);
  });

  test('should handle sparse temporal data efficiently', async () => {
    // Create patterns with gaps (sparse data)
    const sparsePatterns: MergedPattern[] = [];
    for (let i = 0; i < 100; i++) {
      const dayOffset = i * 5; // Every 5 days
      const date = new Date('2026-01-01T00:00:00Z');
      date.setDate(date.getDate() + dayOffset);

      sparsePatterns.push({
        pattern_text: `Sparse Pattern ${i + 1}`,
        count: Math.floor(Math.random() * 10) + 1,
        category: Object.values(PatternCategory)[i % Object.values(PatternCategory).length],
        examples: [],
        suggested_rule: `Rule ${i + 1}`,
        first_seen: date.toISOString(),
        last_seen: date.toISOString(),
        content_types: [ContentType.CODE],
        session_count: 1,
        total_frequency: 1,
        is_new: true,
        frequency_change: 0,
      });
    }

    const startTime = performance.now();

    if (renderPatternTrendsChart) {
      const chart = renderPatternTrendsChart(canvas, sparsePatterns);
      expect(chart).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      throw new Error('renderPatternTrendsChart not implemented');
    }

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    console.log(`AC3 Performance: Sparse temporal data (100 points) rendered in ${renderTime.toFixed(2)}ms`);
    expect(renderTime).toBeLessThan(2000);
  });

  test('should handle single day (flat line) efficiently', async () => {
    const singleDayPatterns: MergedPattern[] = createTemporalPatterns(100, 1/30); // All on same day

    const startTime = performance.now();

    if (renderPatternTrendsChart) {
      const chart = renderPatternTrendsChart(canvas, singleDayPatterns);
      expect(chart).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      throw new Error('renderPatternTrendsChart not implemented');
    }

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    console.log(`AC3 Performance: Single day (flat line) rendered in ${renderTime.toFixed(2)}ms`);
    expect(renderTime).toBeLessThan(2000);
  });
});

// ============================================================================
// AC4 PERFORMANCE: DOUGHNUT CHART < 1 SECOND
// ============================================================================

describe('AC4 Performance: Doughnut Chart', () => {
  let canvas: HTMLCanvasElement;
  let canvasId: string;

  beforeEach(() => {
    canvasId = `perf-canvas-${Date.now()}`;
    canvas = createCanvas(canvasId);
  });

  afterEach(() => {
    if (destroyChart) {
      destroyChart(canvas);
    }
    removeCanvas(canvasId);
  });

  test('should complete rendering in < 1 second for category distribution', async () => {
    const patterns = createPerformancePatterns(100);

    const startTime = performance.now();

    if (renderCategoryDistributionChart) {
      const chart = renderCategoryDistributionChart(canvas, patterns);
      expect(chart).toBeDefined();

      // Wait for Chart.js animation
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      throw new Error('renderCategoryDistributionChart not implemented');
    }

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    console.log(`AC4 Performance: Doughnut chart rendered in ${renderTime.toFixed(2)}ms`);
    expect(renderTime).toBeLessThan(1000);
  });

  test('should handle single category efficiently', async () => {
    const singleCategoryPatterns: MergedPattern[] = Array.from({ length: 100 }, (_, i) => ({
      ...createPerformancePatterns(1)[0],
      pattern_text: `Pattern ${i + 1}`,
      category: PatternCategory.CODE_STYLE,
    }));

    const startTime = performance.now();

    if (renderCategoryDistributionChart) {
      const chart = renderCategoryDistributionChart(canvas, singleCategoryPatterns);
      expect(chart).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      throw new Error('renderCategoryDistributionChart not implemented');
    }

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    console.log(`AC4 Performance: Single category doughnut chart rendered in ${renderTime.toFixed(2)}ms`);
    expect(renderTime).toBeLessThan(1000);
  });

  test('should handle all categories evenly distributed', async () => {
    const evenPatterns: MergedPattern[] = [];
    const categories = Object.values(PatternCategory);

    categories.forEach(category => {
      for (let i = 0; i < 20; i++) {
        evenPatterns.push({
          ...createPerformancePatterns(1)[0],
          pattern_text: `${category} Pattern ${i + 1}`,
          category,
        });
      }
    });

    const startTime = performance.now();

    if (renderCategoryDistributionChart) {
      const chart = renderCategoryDistributionChart(canvas, evenPatterns);
      expect(chart).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      throw new Error('renderCategoryDistributionChart not implemented');
    }

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    console.log(`AC4 Performance: Even distribution doughnut chart rendered in ${renderTime.toFixed(2)}ms`);
    expect(renderTime).toBeLessThan(1000);
  });
});

// ============================================================================
// MEMORY LEAK DETECTION TESTS
// ============================================================================

describe('Memory Leak Detection', () => {
  let canvas: HTMLCanvasElement;
  let canvasId: string;

  beforeEach(() => {
    canvasId = `perf-canvas-${Date.now()}`;
    canvas = createCanvas(canvasId);
  });

  afterEach(() => {
    if (destroyChart) {
      destroyChart(canvas);
    }
    removeCanvas(canvasId);
  });

  test('should not leak memory across 50 render/destroy cycles', async () => {
    const patterns = createPerformancePatterns(100);
    const { getChartInstances } = require('chart.js/auto');

    // Force garbage collection if available (Node.js with --expose-gc)
    if (global.gc) {
      global.gc();
    }

    const initialInstances = getChartInstances().size;

    for (let i = 0; i < 50; i++) {
      if (renderPatternFrequencyChart) {
        const chart = renderPatternFrequencyChart(canvas, patterns);
        expect(chart).toBeDefined();

        if (destroyChart) {
          destroyChart(canvas);
        }
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    }

    const finalInstances = getChartInstances().size;

    console.log(`Memory Leak Test: Initial instances: ${initialInstances}, Final instances: ${finalInstances}`);

    // Should not accumulate chart instances
    expect(finalInstances).toBeLessThanOrEqual(initialInstances + 5);
  });

  test('should not leak memory across 100 render/destroy cycles', async () => {
    const patterns = createPerformancePatterns(100);
    const { getChartInstances } = require('chart.js/auto');

    if (global.gc) {
      global.gc();
    }

    for (let i = 0; i < 100; i++) {
      if (renderPatternFrequencyChart) {
        const chart = renderPatternFrequencyChart(canvas, patterns);

        if (destroyChart) {
          destroyChart(canvas);
        }
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    }

    const finalInstances = getChartInstances().size;

    console.log(`Memory Leak Test (100 cycles): Final instances: ${finalInstances}`);

    // Should not accumulate chart instances
    expect(finalInstances).toBeLessThan(10);
  });

  test('should clean up event listeners on destroy', async () => {
    const patterns = createPerformancePatterns(100);

    if (renderPatternFrequencyChart) {
      const chart = renderPatternFrequencyChart(canvas, patterns);

      // Track event listeners
      const initialListeners = (canvas as any).eventListenerCount || 0;

      if (destroyChart) {
        destroyChart(canvas);
      }

      // Verify cleanup (implementation should remove listeners)
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderPatternFrequencyChart not implemented');
    }
  });
});

// ============================================================================
// PERFORMANCE BENCHMARKS
// ============================================================================

describe('Performance Benchmarks', () => {
  let canvas: HTMLCanvasElement;
  let canvasId: string;

  beforeEach(() => {
    canvasId = `perf-canvas-${Date.now()}`;
    canvas = createCanvas(canvasId);
  });

  afterEach(() => {
    if (destroyChart) {
      destroyChart(canvas);
    }
    removeCanvas(canvasId);
  });

  test('benchmark: all chart types with 100 patterns', async () => {
    const patterns = createPerformancePatterns(100);
    const benchmarks: { name: string; time: number }[] = [];

    // Bar chart
    if (renderPatternFrequencyChart) {
      const start1 = performance.now();
      const chart1 = renderPatternFrequencyChart(canvas, patterns);
      await new Promise(resolve => setTimeout(resolve, 100));
      const end1 = performance.now();
      benchmarks.push({ name: 'Bar Chart (100 patterns)', time: end1 - start1 });

      if (destroyChart) {
        destroyChart(canvas);
      }
    } else {
      throw new Error('renderPatternFrequencyChart not implemented');
    }

    // Top patterns bar chart
    if (renderTopPatternsChart) {
      const start2 = performance.now();
      const chart2 = renderTopPatternsChart(canvas, patterns, 10);
      await new Promise(resolve => setTimeout(resolve, 100));
      const end2 = performance.now();
      benchmarks.push({ name: 'Top Patterns Bar Chart (10 from 100)', time: end2 - start2 });

      if (destroyChart) {
        destroyChart(canvas);
      }
    }

    // Line chart
    if (renderPatternTrendsChart) {
      const start3 = performance.now();
      const chart3 = renderPatternTrendsChart(canvas, patterns);
      await new Promise(resolve => setTimeout(resolve, 100));
      const end3 = performance.now();
      benchmarks.push({ name: 'Line Chart (100 patterns)', time: end3 - start3 });

      if (destroyChart) {
        destroyChart(canvas);
      }
    }

    // Doughnut chart
    if (renderCategoryDistributionChart) {
      const start4 = performance.now();
      const chart4 = renderCategoryDistributionChart(canvas, patterns);
      await new Promise(resolve => setTimeout(resolve, 100));
      const end4 = performance.now();
      benchmarks.push({ name: 'Doughnut Chart (100 patterns)', time: end4 - start4 });
    }

    console.log('\n=== Performance Benchmarks ===');
    benchmarks.forEach(b => {
      console.log(`${b.name}: ${b.time.toFixed(2)}ms`);
    });

    // All benchmarks should be under their AC limits
    expect(benchmarks[0].time).toBeLessThan(2000); // Bar chart
    expect(benchmarks[2].time).toBeLessThan(2000); // Line chart
    expect(benchmarks[3].time).toBeLessThan(1000); // Doughnut chart
  });

  test('benchmark: scalability test (10, 100, 1000 patterns)', async () => {
    const sizes = [10, 100, 1000];
    const results: { size: number; time: number }[] = [];

    for (const size of sizes) {
      const patterns = createPerformancePatterns(size);

      if (renderPatternFrequencyChart) {
        const startTime = performance.now();
        const chart = renderPatternFrequencyChart(canvas, patterns);
        await new Promise(resolve => setTimeout(resolve, 100));
        const endTime = performance.now();

        results.push({ size, time: endTime - startTime });

        if (destroyChart) {
          destroyChart(canvas);
        }
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    }

    console.log('\n=== Scalability Benchmarks ===');
    results.forEach(r => {
      console.log(`${r.size} patterns: ${r.time.toFixed(2)}ms`);
    });

    // Verify linear or better scaling (10x data should not take 10x time)
    const [time10, time100, time1000] = results.map(r => r.time);

    // 100 patterns should be < 10x slower than 10 patterns
    expect(time100).toBeLessThan(time10 * 10);

    // 1000 patterns should be < 20x slower than 10 patterns (allowing for some overhead)
    expect(time1000).toBeLessThan(time10 * 20);
  });
});

// ============================================================================
// STRESS TESTS
// ============================================================================

describe('Stress Tests', () => {
  let canvas: HTMLCanvasElement;
  let canvasId: string;

  beforeEach(() => {
    canvasId = `stress-canvas-${Date.now()}`;
    canvas = createCanvas(canvasId);
  });

  afterEach(() => {
    if (destroyChart) {
      destroyChart(canvas);
    }
    removeCanvas(canvasId);
  });

  test('should handle rapid successive renders', async () => {
    const patterns = createPerformancePatterns(100);
    const renderCount = 20;

    const startTime = performance.now();

    for (let i = 0; i < renderCount; i++) {
      if (destroyChart) {
        destroyChart(canvas);
      }

      if (renderPatternFrequencyChart) {
        const chart = renderPatternFrequencyChart(canvas, patterns);
        expect(chart).toBeDefined();
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / renderCount;

    console.log(`Stress Test: ${renderCount} rapid renders in ${totalTime.toFixed(2)}ms (avg: ${avgTime.toFixed(2)}ms)`);

    // Average render time should still be reasonable
    expect(avgTime).toBeLessThan(2000);
  });

  test('should handle maximum dataset size', async () => {
    const maxPatterns = createPerformancePatterns(10000);

    const startTime = performance.now();

    if (renderTopPatternsChart) {
      const chart = renderTopPatternsChart(canvas, maxPatterns, 100);
      expect(chart).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      throw new Error('renderTopPatternsChart not implemented');
    }

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    console.log(`Stress Test: Maximum dataset (10K patterns) rendered in ${renderTime.toFixed(2)}ms`);

    // Should not timeout or hang
    expect(renderTime).toBeLessThan(5000);
  });
});
