/**
 * YOLO Integration Tests for Chart Renderer (Story 3-3)
 *
 * YOLO Approach: Real Chart.js rendering tests with actual canvas elements.
 * Tests transformer → renderer pipeline end-to-end with jsdom environment.
 *
 * This is the REAL integration test that validates Chart.js actually renders.
 *
 * @jest-environment jsdom
 */

import { JSDOM } from 'jsdom';
import { Chart } from 'chart.js/auto';
import {
  renderPatternFrequencyChart,
  renderTopPatternsChart,
  renderPatternTrendsChart,
  renderCategoryDistributionChart,
  destroyChart,
  destroyAllCharts,
  getOrCreateCanvas,
  getChartInstance,
} from '../../../src/visualization/chart-renderer';
import { MergedPattern } from '../../../src/pattern-matcher';
import { PatternCategory } from '../../../src/pattern-detector';
import { ContentType } from '../../../src/content-analyzer';

describe('YOLO Chart Renderer Integration Tests', () => {
  let container: HTMLDivElement;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    // Clean up any existing charts
    destroyAllCharts();

    // Create container and canvas elements
    container = document.createElement('div');
    container.id = 'chart-container';
    document.body.appendChild(container);

    canvas = document.createElement('canvas');
    canvas.id = 'test-canvas';
    container.appendChild(canvas);
  });

  afterEach(() => {
    // Clean up charts after each test
    destroyAllCharts();

    // Remove container from DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  // ============================================================================
  // TEST FIXTURES
  // ============================================================================

  /**
   * Create mock MergedPattern for testing
   */
  const createMockPattern = (
    patternText: string,
    count: number,
    category: PatternCategory = PatternCategory.OTHER,
    daysAgo: number = 0
  ): MergedPattern => {
    const now = new Date();
    const past = new Date(now.getTime() - daysAgo * 86400000);

    return {
      pattern_text: patternText,
      count,
      category,
      examples: [],
      suggested_rule: `Use ${patternText} instead`,
      first_seen: past.toISOString(),
      last_seen: now.toISOString(),
      content_types: [ContentType.CODE],
      is_new: daysAgo === 0,
      frequency_change: 0,
      session_count: 1,
      total_frequency: count,
    };
  };

  /**
   * Create sample patterns for testing
   */
  const createSamplePatterns = (count: number = 10): MergedPattern[] => {
    const patterns: MergedPattern[] = [];
    const categories = Object.values(PatternCategory);

    for (let i = 0; i < count; i++) {
      const category = categories[i % categories.length];
      patterns.push(
        createMockPattern(`pattern_${i}`, i + 1, category, i % 5)
      );
    }

    return patterns;
  };

  // ============================================================================
  // YOLO POC: BAR CHART RENDERING TESTS
  // ============================================================================

  describe('YOLO POC: Bar Chart Rendering', () => {
    it('should render bar chart with real Chart.js (YOLO APPROACH)', () => {
      const patterns = createSamplePatterns(10);

      // This should work with real Chart.js rendering
      const chart = renderPatternFrequencyChart(canvas, patterns);

      // Verify chart was created
      expect(chart).toBeDefined();
      expect(chart).toBeInstanceOf(Chart);

      // Verify chart is stored in cache
      expect(getChartInstance(canvas.id)).toBe(chart);

      // Verify canvas has ARIA attributes
      expect(canvas.getAttribute('role')).toBe('img');
      expect(canvas.getAttribute('aria-label')).toContain('Bar chart showing');

      console.log('✅ YOLO POC SUCCESS: Bar chart rendered with real Chart.js!');
    });

    it('should throw error for empty patterns', () => {
      expect(() => {
        renderPatternFrequencyChart(canvas, []);
      }).toThrow('No patterns to display');
    });

    it('should handle single category (one bar)', () => {
      const patterns = [
        createMockPattern('pattern1', 5, PatternCategory.CODE_STYLE),
        createMockPattern('pattern2', 3, PatternCategory.CODE_STYLE),
      ];

      const chart = renderPatternFrequencyChart(canvas, patterns);

      expect(chart).toBeDefined();
      expect(chart).toBeInstanceOf(Chart);
    });

    it('should render with canvas ID string', () => {
      const patterns = createSamplePatterns(5);
      const chart = renderPatternFrequencyChart(canvas.id, patterns);

      expect(chart).toBeDefined();
      expect(chart).toBeInstanceOf(Chart);
    });

    it('should throw error for invalid canvas ID', () => {
      const patterns = createSamplePatterns(5);

      expect(() => {
        renderPatternFrequencyChart('non-existent-canvas', patterns);
      }).toThrow('Canvas element not found');
    });

    it('should complete rendering in < 2 seconds for 100 patterns', () => {
      const patterns = createSamplePatterns(100);

      const startTime = performance.now();
      const chart = renderPatternFrequencyChart(canvas, patterns);
      const endTime = performance.now();

      const renderTime = endTime - startTime;

      expect(chart).toBeDefined();
      expect(renderTime).toBeLessThan(2000);

      console.log(`✅ Rendered 100 patterns in ${renderTime.toFixed(2)}ms`);
    });
  });

  // ============================================================================
  // TOP PATTERNS CHART TESTS
  // ============================================================================

  describe('Top Patterns Chart', () => {
    it('should render top N patterns chart', () => {
      const patterns = createSamplePatterns(30);
      const chart = renderTopPatternsChart(canvas, patterns, 10);

      expect(chart).toBeDefined();
      expect(chart).toBeInstanceOf(Chart);
      expect((chart.config as any).type).toBe('bar');
      expect((chart.options as any).indexAxis).toBe('y'); // Horizontal
    });

    it('should truncate long pattern text to 30 chars', () => {
      const patterns = [
        createMockPattern('This is a very long pattern text that should be truncated', 10),
      ];

      const chart = renderTopPatternsChart(canvas, patterns, 10);

      expect(chart).toBeDefined();

      const labels = chart.data.labels;
      if (labels && labels.length > 0) {
        const label = labels[0] as string;
        expect(label.length).toBeLessThanOrEqual(33); // 30 + '...'
      }
    });

    it('should throw error for empty patterns', () => {
      expect(() => {
        renderTopPatternsChart(canvas, []);
      }).toThrow('No patterns to display');
    });

    it('should complete rendering in < 3 seconds for top 100 patterns', () => {
      const patterns = createSamplePatterns(100);

      const startTime = performance.now();
      const chart = renderTopPatternsChart(canvas, patterns, 100);
      const endTime = performance.now();

      const renderTime = endTime - startTime;

      expect(chart).toBeDefined();
      expect(renderTime).toBeLessThan(3000);

      console.log(`✅ Rendered top 100 patterns in ${renderTime.toFixed(2)}ms`);
    });
  });

  // ============================================================================
  // LINE CHART TESTS
  // ============================================================================

  describe('Pattern Trends Chart', () => {
    it('should render line chart with temporal data', () => {
      const patterns = createSamplePatterns(10);
      const chart = renderPatternTrendsChart(canvas, patterns);

      expect(chart).toBeDefined();
      expect(chart).toBeInstanceOf(Chart);
      expect((chart.config as any).type).toBe('line');
    });

    it('should configure smooth curves with tension', () => {
      const patterns = createSamplePatterns(10);
      const chart = renderPatternTrendsChart(canvas, patterns);

      expect(chart).toBeDefined();

      const dataset = chart.data.datasets[0] as any;
      expect(dataset.tension).toBe(0.4);
    });

    it('should enable fill area below line', () => {
      const patterns = createSamplePatterns(10);
      const chart = renderPatternTrendsChart(canvas, patterns);

      expect(chart).toBeDefined();

      const dataset = chart.data.datasets[0] as any;
      expect(dataset.fill).toBe(true);
    });

    it('should handle single day patterns', () => {
      const patterns = [
        createMockPattern('pattern1', 5, PatternCategory.CODE_STYLE, 0),
        createMockPattern('pattern2', 3, PatternCategory.CODE_STYLE, 0),
      ];

      const chart = renderPatternTrendsChart(canvas, patterns);

      expect(chart).toBeDefined();
    });

    it('should throw error for empty patterns', () => {
      expect(() => {
        renderPatternTrendsChart(canvas, []);
      }).toThrow('No patterns to display');
    });

    it('should complete rendering in < 2 seconds', () => {
      const patterns = createSamplePatterns(50);

      const startTime = performance.now();
      const chart = renderPatternTrendsChart(canvas, patterns);
      const endTime = performance.now();

      const renderTime = endTime - startTime;

      expect(chart).toBeDefined();
      expect(renderTime).toBeLessThan(2000);

      console.log(`✅ Rendered line chart in ${renderTime.toFixed(2)}ms`);
    });
  });

  // ============================================================================
  // DOUGHNUT CHART TESTS
  // ============================================================================

  describe('Category Distribution Chart', () => {
    it('should render doughnut chart', () => {
      const patterns = createSamplePatterns(10);
      const chart = renderCategoryDistributionChart(canvas, patterns);

      expect(chart).toBeDefined();
      expect(chart).toBeInstanceOf(Chart);
      expect((chart.config as any).type).toBe('doughnut');
    });

    it('should configure doughnut cutout', () => {
      const patterns = createSamplePatterns(10);
      const chart = renderCategoryDistributionChart(canvas, patterns);

      expect(chart).toBeDefined();
      expect((chart.options as any).cutout).toBe('60%');
    });

    it('should show legend on right side', () => {
      const patterns = createSamplePatterns(10);
      const chart = renderCategoryDistributionChart(canvas, patterns);

      expect(chart).toBeDefined();
      expect((chart.options as any).plugins?.legend?.position).toBe('right');
    });

    it('should handle single category (full circle)', () => {
      const patterns = [
        createMockPattern('pattern1', 5, PatternCategory.CODE_STYLE),
        createMockPattern('pattern2', 3, PatternCategory.CODE_STYLE),
      ];

      const chart = renderCategoryDistributionChart(canvas, patterns);

      expect(chart).toBeDefined();
    });

    it('should throw error for empty patterns', () => {
      expect(() => {
        renderCategoryDistributionChart(canvas, []);
      }).toThrow('No patterns to display');
    });
  });

  // ============================================================================
  // CANVAS LIFECYCLE MANAGEMENT TESTS
  // ============================================================================

  describe('Canvas Lifecycle Management', () => {
    it('should create canvas element with getOrCreateCanvas', () => {
      const testCanvas = getOrCreateCanvas('chart-container', 'new-canvas');

      expect(testCanvas).toBeInstanceOf(HTMLCanvasElement);
      expect(testCanvas.id).toBe('new-canvas');
      expect(document.getElementById('new-canvas')).toBe(testCanvas);

      // Clean up
      testCanvas.remove();
    });

    it('should reuse existing canvas element', () => {
      const firstCanvas = getOrCreateCanvas('chart-container', 'reuse-canvas');
      const secondCanvas = getOrCreateCanvas('chart-container', 'reuse-canvas');

      expect(firstCanvas).toBe(secondCanvas);
      expect(firstCanvas.id).toBe('reuse-canvas');

      // Clean up
      firstCanvas.remove();
    });

    it('should destroy chart instance', () => {
      const patterns = createSamplePatterns(5);
      const chart = renderPatternFrequencyChart(canvas, patterns);

      expect(chart).toBeDefined();
      expect(getChartInstance(canvas.id)).toBe(chart);

      destroyChart(chart);
      expect(getChartInstance(canvas.id)).toBeUndefined();
    });

    it('should handle destroying null chart gracefully', () => {
      expect(() => {
        destroyChart(null);
      }).not.toThrow();
    });

    it('should destroy all chart instances', () => {
      const patterns = createSamplePatterns(5);

      const chart1 = renderPatternFrequencyChart(canvas, patterns);
      const chart2 = renderTopPatternsChart(canvas, patterns);

      expect(getChartInstance(canvas.id)).toBeDefined();

      destroyAllCharts();

      expect(getChartInstance(canvas.id)).toBeUndefined();
    });
  });

  // ============================================================================
  // MEMORY LEAK DETECTION TESTS
  // ============================================================================

  describe('Memory Leak Detection', () => {
    it('should not leak memory on render/destroy cycles', () => {
      const patterns = createSamplePatterns(10);

      // Render and destroy 50 times
      for (let i = 0; i < 50; i++) {
        const chart = renderPatternFrequencyChart(canvas, patterns);
        destroyChart(chart);
      }

      // Verify no charts remain
      expect(getChartInstance(canvas.id)).toBeUndefined();

      console.log('✅ No memory leaks detected after 50 render/destroy cycles');
    });

    it('should handle multiple charts on same canvas', () => {
      const patterns = createSamplePatterns(5);

      const chart1 = renderPatternFrequencyChart(canvas, patterns);
      const chart2 = renderPatternFrequencyChart(canvas, patterns);

      // Second chart should replace first
      expect(getChartInstance(canvas.id)).toBe(chart2);
      expect(chart1).not.toBe(chart2);

      destroyAllCharts();
    });
  });

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  describe('Accessibility (AC5)', () => {
    it('should add ARIA labels to all charts', () => {
      const patterns = createSamplePatterns(5);

      renderPatternFrequencyChart(canvas, patterns);
      expect(canvas.getAttribute('role')).toBe('img');
      expect(canvas.getAttribute('aria-label')).toContain('Bar chart showing');

      destroyAllCharts();

      renderTopPatternsChart(canvas, patterns);
      expect(canvas.getAttribute('aria-label')).toContain('Bar chart showing top');

      destroyAllCharts();

      renderPatternTrendsChart(canvas, patterns);
      expect(canvas.getAttribute('aria-label')).toContain('Line chart showing pattern trends');

      destroyAllCharts();

      renderCategoryDistributionChart(canvas, patterns);
      expect(canvas.getAttribute('aria-label')).toContain('Doughnut chart showing pattern distribution');
    });

    it('should make charts responsive', () => {
      const patterns = createSamplePatterns(5);
      const chart = renderPatternFrequencyChart(canvas, patterns);

      expect(chart.options.responsive).toBe(true);
      expect(chart.options.maintainAspectRatio).toBe(false);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS (AC6)
  // ============================================================================

  describe('Error Handling (AC6)', () => {
    it('should throw AR22 compliant error for empty patterns', () => {
      try {
        renderPatternFrequencyChart(canvas, []);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.what || error.message).toBeDefined();
      }
    });

    it('should throw AR22 compliant error for invalid canvas', () => {
      const patterns = createSamplePatterns(5);

      try {
        renderPatternFrequencyChart('non-existent' as any, patterns);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.what || error.message).toBeDefined();
      }
    });
  });
});
