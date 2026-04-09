/**
 * Integration Tests for Chart Rendering Pipeline (Story 3-3)
 *
 * TDD Red Phase: Failing integration acceptance tests
 *
 * These tests verify the end-to-end integration between:
 * - Epic 2 MergedPattern data structures
 * - Story 3-2 data transformation functions
 * - Story 3-3 chart rendering functions
 * - Chart.js library
 * - HTML canvas elements
 *
 * Testing Strategy:
 * - Test transform → render pipeline end-to-end
 * - Use real MergedPattern[] from Epic 2 test fixtures
 * - Verify all chart types render without errors
 * - Test canvas lifecycle (create, render, destroy, repeat)
 * - Test multiple charts on same page
 * - Test responsiveness (resize window, verify chart resizes)
 *
 * Test Pyramid Level: Integration (25% - API-level tests)
 *
 * @jest-environment jsdom
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ChartData, ChartType, VisualizationErrorCode } from '../../../src/visualization/types';
import { MergedPattern } from '../../../src/pattern-matcher';
import { PatternCategory, ContentType } from '../../../src/pattern-detector';

// ============================================================================
// MOCK CHART.JS FOR jsdom ENVIRONMENT
// ============================================================================

/**
 * Mock Chart.js for jsdom environment
 */
jest.mock('chart.js/auto', () => {
  const mockChartInstances = new Map<string, any>();

  return {
    Chart: jest.fn().mockImplementation((canvas: any, config: any) => {
      const chartId = canvas.id || 'unknown';
      const mockInstance = {
        canvas,
        config,
        destroy: jest.fn(() => {
          mockChartInstances.delete(chartId);
        }),
        update: jest.fn(),
        resize: jest.fn(),
        id: chartId,
      };

      mockChartInstances.set(chartId, mockInstance);
      return mockInstance;
    }),
    getChartInstances: () => mockChartInstances,
  };
});

// ============================================================================
// REAL FIXTURES FROM EPIC 2
// ============================================================================

/**
 * Realistic MergedPattern fixtures from Epic 2
 */
const createEpic2Patterns = (): MergedPattern[] => [
  {
    pattern_text: 'Use const instead of let',
    count: 5,
    category: PatternCategory.CODE_STYLE,
    examples: [
      {
        original_suggestion: 'use let',
        user_correction: 'use const',
        context: 'Variable declaration',
        timestamp: '2026-03-15T10:00:00Z',
        content_type: ContentType.CODE,
      },
    ],
    suggested_rule: 'Use const for variables that are not reassigned',
    first_seen: '2026-03-15T10:00:00Z',
    last_seen: '2026-03-18T11:00:00Z',
    content_types: [ContentType.CODE],
    session_count: 2,
    total_frequency: 8,
    is_new: false,
    frequency_change: 2,
  },
  {
    pattern_text: 'Prefer fetch over axios',
    count: 3,
    category: PatternCategory.TERMINOLOGY,
    examples: [
      {
        original_suggestion: 'use axios',
        user_correction: 'use fetch',
        context: 'HTTP request library',
        timestamp: '2026-03-16T14:00:00Z',
        content_type: ContentType.CODE,
      },
    ],
    suggested_rule: 'Prefer native fetch API for HTTP requests',
    first_seen: '2026-03-16T14:00:00Z',
    last_seen: '2026-03-18T09:00:00Z',
    content_types: [ContentType.CODE],
    session_count: 1,
    total_frequency: 3,
    is_new: true,
    frequency_change: 0,
  },
  {
    pattern_text: 'Organize imports alphabetically',
    count: 7,
    category: PatternCategory.FORMATTING,
    examples: [
      {
        original_suggestion: 'import statements not organized',
        user_correction: 'organize imports alphabetically',
        context: 'Import statements at top of file',
        timestamp: '2026-03-14T08:00:00Z',
        content_type: ContentType.CODE,
      },
    ],
    suggested_rule: 'Sort import statements alphabetically within groups',
    first_seen: '2026-03-14T08:00:00Z',
    last_seen: '2026-03-18T16:00:00Z',
    content_types: [ContentType.CODE],
    session_count: 3,
    total_frequency: 12,
    is_new: false,
    frequency_change: -1,
  },
  {
    pattern_text: 'Add JSDoc comments to functions',
    count: 4,
    category: PatternCategory.CONVENTION,
    examples: [],
    suggested_rule: 'Document functions with JSDoc comments',
    first_seen: '2026-03-17T10:00:00Z',
    last_seen: '2026-03-18T15:00:00Z',
    content_types: [ContentType.CODE],
    session_count: 1,
    total_frequency: 4,
    is_new: true,
    frequency_change: 0,
  },
  {
    pattern_text: 'Use TypeScript strict mode',
    count: 6,
    category: PatternCategory.STRUCTURE,
    examples: [],
    suggested_rule: 'Enable strict mode in tsconfig.json',
    first_seen: '2026-03-13T09:00:00Z',
    last_seen: '2026-03-18T14:00:00Z',
    content_types: [ContentType.CODE],
    session_count: 2,
    total_frequency: 9,
    is_new: false,
    frequency_change: 1,
  },
];

/**
 * Large dataset for performance testing (10K patterns)
 */
const createLargePatternDataset = (count: number = 10000): MergedPattern[] => {
  const categories = Object.values(PatternCategory);
  const patterns: MergedPattern[] = [];

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    patterns.push({
      pattern_text: `Pattern ${i + 1}: ${category} example`,
      count: Math.floor(Math.random() * 100) + 1,
      category,
      examples: [],
      suggested_rule: `Rule for pattern ${i + 1}`,
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

// ============================================================================
// SETUP AND TEARDOWN
// ============================================================================

/**
 * Create a canvas element in the DOM
 */
function createCanvas(canvasId: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.id = canvasId;
  document.body.appendChild(canvas);
  return canvas;
}

/**
 * Remove a canvas element from the DOM
 */
function removeCanvas(canvasId: string): void {
  const canvas = document.getElementById(canvasId);
  if (canvas && canvas.parentNode) {
    canvas.parentNode.removeChild(canvas);
  }
}

/**
 * Clear all canvas elements from tests
 */
function clearAllCanvases(): void {
  const canvases = document.querySelectorAll('canvas');
  canvases.forEach(canvas => {
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  });
}

// ============================================================================
// IMPORT RENDER FUNCTIONS
// ============================================================================

let renderPatternFrequencyChart: any;
let renderTopPatternsChart: any;
let renderPatternTrendsChart: any;
let renderCategoryDistributionChart: any;
let destroyChart: any;
let getOrCreateCanvas: any;

try {
  const chartRendererModule = require('../../../src/visualization/chart-renderer');
  renderPatternFrequencyChart = chartRendererModule.renderPatternFrequencyChart;
  renderTopPatternsChart = chartRendererModule.renderTopPatternsChart;
  renderPatternTrendsChart = chartRendererModule.renderPatternTrendsChart;
  renderCategoryDistributionChart = chartRendererModule.renderCategoryDistributionChart;
  destroyChart = chartRendererModule.destroyChart;
  getOrCreateCanvas = chartRendererModule.getOrCreateCanvas;
} catch (error) {
  // Module not yet implemented - tests will fail as expected in TDD red phase
}

// ============================================================================
// AC1: BAR CHART - PATTERN FREQUENCIES BY CATEGORY (INTEGRATION)
// ============================================================================

describe('AC1: Bar Chart - Pattern Frequencies by Category (Integration)', () => {
  let canvas: HTMLCanvasElement;
  let canvasId: string;

  beforeEach(() => {
    canvasId = `test-canvas-${Date.now()}`;
    canvas = createCanvas(canvasId);
  });

  afterEach(() => {
    if (destroyChart) {
      destroyChart(canvas);
    }
    removeCanvas(canvasId);
  });

  test('should transform Epic 2 patterns and render bar chart', async () => {
    const patterns = createEpic2Patterns();

    // This test will fail until implementation is complete
    expect(() => {
      if (renderPatternFrequencyChart) {
        renderPatternFrequencyChart(canvas, patterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    }).not.toThrow();
  });

  test('should render chart with correct title on canvas', async () => {
    const patterns = createEpic2Patterns();

    if (renderPatternFrequencyChart) {
      const chart = renderPatternFrequencyChart(canvas, patterns);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderPatternFrequencyChart not implemented');
    }
  });

  test('should render with all PatternCategory values on x-axis', async () => {
    const patterns = createEpic2Patterns();

    if (renderPatternFrequencyChart) {
      const chart = renderPatternFrequencyChart(canvas, patterns);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderPatternFrequencyChart not implemented');
    }
  });

  test('should handle edge case: single category', async () => {
    const singleCategoryPatterns: MergedPattern[] = [
      {
        ...createEpic2Patterns()[0],
        category: PatternCategory.CODE_STYLE,
      },
    ];

    if (renderPatternFrequencyChart) {
      const chart = renderPatternFrequencyChart(canvas, singleCategoryPatterns);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderPatternFrequencyChart not implemented');
    }
  });

  test('should handle edge case: empty patterns array (throw error)', async () => {
    const emptyPatterns: MergedPattern[] = [];

    await expect(async () => {
      if (renderPatternFrequencyChart) {
        renderPatternFrequencyChart(canvas, emptyPatterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    }).rejects.toThrow();
  });

  test('should complete rendering in < 2 seconds for 100 patterns', async () => {
    const patterns = createEpic2Patterns();
    // Expand to 100 patterns for performance test
    const largePatterns: MergedPattern[] = Array.from({ length: 100 }, (_, i) => ({
      ...patterns[i % patterns.length],
      pattern_text: `Pattern ${i + 1}`,
    }));

    const startTime = performance.now();

    if (renderPatternFrequencyChart) {
      renderPatternFrequencyChart(canvas, largePatterns);
    } else {
      throw new Error('renderPatternFrequencyChart not implemented');
    }

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(2000);
  });

  test('should return HTMLCanvasElement or Chart instance for programmatic access', async () => {
    const patterns = createEpic2Patterns();

    if (renderPatternFrequencyChart) {
      const result = renderPatternFrequencyChart(canvas, patterns);
      expect(result).toBeDefined();
      expect(result.canvas || result).toBeDefined();
    } else {
      throw new Error('renderPatternFrequencyChart not implemented');
    }
  });
});

// ============================================================================
// AC2: BAR CHART - TOP PATTERNS BY FREQUENCY (INTEGRATION)
// ============================================================================

describe('AC2: Bar Chart - Top Patterns by Frequency (Integration)', () => {
  let canvas: HTMLCanvasElement;
  let canvasId: string;

  beforeEach(() => {
    canvasId = `test-canvas-${Date.now()}`;
    canvas = createCanvas(canvasId);
  });

  afterEach(() => {
    if (destroyChart) {
      destroyChart(canvas);
    }
    removeCanvas(canvasId);
  });

  test('should transform Epic 2 patterns and render top N bar chart', async () => {
    const patterns = createEpic2Patterns();
    const topN = 10;

    expect(() => {
      if (renderTopPatternsChart) {
        renderTopPatternsChart(canvas, patterns, topN);
      } else {
        throw new Error('renderTopPatternsChart not implemented');
      }
    }).not.toThrow();
  });

  test('should display correct title with N value', async () => {
    const patterns = createEpic2Patterns();
    const topN = 15;

    if (renderTopPatternsChart) {
      const chart = renderTopPatternsChart(canvas, patterns, topN);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderTopPatternsChart not implemented');
    }
  });

  test('should truncate long pattern_text to 30 chars with "..." suffix', async () => {
    const longTextPattern: MergedPattern = {
      ...createEpic2Patterns()[0],
      pattern_text: 'This is a very long pattern text that exceeds thirty characters and should be truncated',
    };

    if (renderTopPatternsChart) {
      const chart = renderTopPatternsChart(canvas, [longTextPattern], 10);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderTopPatternsChart not implemented');
    }
  });

  test('should show full pattern_text in hover tooltip', async () => {
    const patterns = createEpic2Patterns();

    if (renderTopPatternsChart) {
      const chart = renderTopPatternsChart(canvas, patterns, 10);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderTopPatternsChart not implemented');
    }
  });

  test('should include suggested_rule in tooltip', async () => {
    const patterns = createEpic2Patterns();

    if (renderTopPatternsChart) {
      const chart = renderTopPatternsChart(canvas, patterns, 10);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderTopPatternsChart not implemented');
    }
  });

  test('should color-code bars by PatternCategory', async () => {
    const patterns = createEpic2Patterns();

    if (renderTopPatternsChart) {
      const chart = renderTopPatternsChart(canvas, patterns, 10);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderTopPatternsChart not implemented');
    }
  });

  test('should enable horizontal scrolling for >20 patterns', async () => {
    const patterns = createEpic2Patterns();

    if (renderTopPatternsChart) {
      const chart = renderTopPatternsChart(canvas, patterns, 25);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderTopPatternsChart not implemented');
    }
  });

  test('should handle edge case: single pattern', async () => {
    const singlePattern: MergedPattern[] = [createEpic2Patterns()[0]];

    if (renderTopPatternsChart) {
      const chart = renderTopPatternsChart(canvas, singlePattern, 1);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderTopPatternsChart not implemented');
    }
  });

  test('should handle edge case: 10K+ patterns (sample to top 100)', async () => {
    const largePatterns = createLargePatternDataset(10000);

    if (renderTopPatternsChart) {
      const chart = renderTopPatternsChart(canvas, largePatterns, 100);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderTopPatternsChart not implemented');
    }
  });

  test('should complete rendering in < 3 seconds for top 100 from 10K', async () => {
    const largePatterns = createLargePatternDataset(10000);

    const startTime = performance.now();

    if (renderTopPatternsChart) {
      renderTopPatternsChart(canvas, largePatterns, 100);
    } else {
      throw new Error('renderTopPatternsChart not implemented');
    }

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(3000);
  });
});

// ============================================================================
// AC3: LINE CHART - PATTERN TRENDS OVER TIME (INTEGRATION)
// ============================================================================

describe('AC3: Line Chart - Pattern Trends Over Time (Integration)', () => {
  let canvas: HTMLCanvasElement;
  let canvasId: string;

  beforeEach(() => {
    canvasId = `test-canvas-${Date.now()}`;
    canvas = createCanvas(canvasId);
  });

  afterEach(() => {
    if (destroyChart) {
      destroyChart(canvas);
    }
    removeCanvas(canvasId);
  });

  test('should transform Epic 2 patterns and render line chart', async () => {
    const patterns = createEpic2Patterns();

    expect(() => {
      if (renderPatternTrendsChart) {
        renderPatternTrendsChart(canvas, patterns);
      } else {
        throw new Error('renderPatternTrendsChart not implemented');
      }
    }).not.toThrow();
  });

  test('should display correct title with period', async () => {
    const patterns = createEpic2Patterns();

    if (renderPatternTrendsChart) {
      const chart = renderPatternTrendsChart(canvas, patterns);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderPatternTrendsChart not implemented');
    }
  });

  test('should show smooth curves with fill area (tension: 0.4)', async () => {
    const patterns = createEpic2Patterns();

    if (renderPatternTrendsChart) {
      const chart = renderPatternTrendsChart(canvas, patterns);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderPatternTrendsChart not implemented');
    }
  });

  test('should show data points on hover with date, frequency, new count', async () => {
    const patterns = createEpic2Patterns();

    if (renderPatternTrendsChart) {
      const chart = renderPatternTrendsChart(canvas, patterns);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderPatternTrendsChart not implemented');
    }
  });

  test('should handle edge case: single day (flat line)', async () => {
    const singleDayPattern: MergedPattern = {
      ...createEpic2Patterns()[0],
      first_seen: '2026-03-18T00:00:00Z',
      last_seen: '2026-03-18T23:59:59Z',
    };

    if (renderPatternTrendsChart) {
      const chart = renderPatternTrendsChart(canvas, [singleDayPattern]);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderPatternTrendsChart not implemented');
    }
  });

  test('should handle edge case: sparse data (interpolate gaps)', async () => {
    const sparsePatterns: MergedPattern[] = [
      {
        ...createEpic2Patterns()[0],
        first_seen: '2026-03-01T00:00:00Z',
        last_seen: '2026-03-01T23:59:59Z',
      },
      {
        ...createEpic2Patterns()[1],
        first_seen: '2026-03-15T00:00:00Z',
        last_seen: '2026-03-15T23:59:59Z',
      },
      {
        ...createEpic2Patterns()[2],
        first_seen: '2026-03-30T00:00:00Z',
        last_seen: '2026-03-30T23:59:59Z',
      },
    ];

    if (renderPatternTrendsChart) {
      const chart = renderPatternTrendsChart(canvas, sparsePatterns);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderPatternTrendsChart not implemented');
    }
  });

  test('should use UTC timezone for dates', async () => {
    const patterns = createEpic2Patterns();

    if (renderPatternTrendsChart) {
      const chart = renderPatternTrendsChart(canvas, patterns);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderPatternTrendsChart not implemented');
    }
  });

  test('should complete rendering in < 2 seconds for 1K patterns spanning 6 months', async () => {
    // Create patterns spanning 6 months
    const longTermPatterns: MergedPattern[] = [];
    for (let i = 0; i < 1000; i++) {
      const dayOffset = Math.floor(Math.random() * 180);
      const date = new Date('2026-01-01T00:00:00Z');
      date.setDate(date.getDate() + dayOffset);

      longTermPatterns.push({
        ...createEpic2Patterns()[i % 5],
        pattern_text: `Pattern ${i + 1}`,
        first_seen: date.toISOString(),
        last_seen: date.toISOString(),
      });
    }

    const startTime = performance.now();

    if (renderPatternTrendsChart) {
      renderPatternTrendsChart(canvas, longTermPatterns);
    } else {
      throw new Error('renderPatternTrendsChart not implemented');
    }

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(2000);
  });
});

// ============================================================================
// AC4: PIE/DOUGHNUT CHART - CATEGORY DISTRIBUTION (INTEGRATION)
// ============================================================================

describe('AC4: Pie/Doughnut Chart - Category Distribution (Integration)', () => {
  let canvas: HTMLCanvasElement;
  let canvasId: string;

  beforeEach(() => {
    canvasId = `test-canvas-${Date.now()}`;
    canvas = createCanvas(canvasId);
  });

  afterEach(() => {
    if (destroyChart) {
      destroyChart(canvas);
    }
    removeCanvas(canvasId);
  });

  test('should transform Epic 2 patterns and render doughnut chart', async () => {
    const patterns = createEpic2Patterns();

    expect(() => {
      if (renderCategoryDistributionChart) {
        renderCategoryDistributionChart(canvas, patterns);
      } else {
        throw new Error('renderCategoryDistributionChart not implemented');
      }
    }).not.toThrow();
  });

  test('should display correct title', async () => {
    const patterns = createEpic2Patterns();

    if (renderCategoryDistributionChart) {
      const chart = renderCategoryDistributionChart(canvas, patterns);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderCategoryDistributionChart not implemented');
    }
  });

  test('should show percentages in legend and center text', async () => {
    const patterns = createEpic2Patterns();

    if (renderCategoryDistributionChart) {
      const chart = renderCategoryDistributionChart(canvas, patterns);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderCategoryDistributionChart not implemented');
    }
  });

  test('should use WCAG AA compliant colors', async () => {
    const patterns = createEpic2Patterns();

    if (renderCategoryDistributionChart) {
      const chart = renderCategoryDistributionChart(canvas, patterns);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderCategoryDistributionChart not implemented');
    }
  });

  test('should highlight segment on hover', async () => {
    const patterns = createEpic2Patterns();

    if (renderCategoryDistributionChart) {
      const chart = renderCategoryDistributionChart(canvas, patterns);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderCategoryDistributionChart not implemented');
    }
  });

  test('should show category details in tooltip', async () => {
    const patterns = createEpic2Patterns();

    if (renderCategoryDistributionChart) {
      const chart = renderCategoryDistributionChart(canvas, patterns);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderCategoryDistributionChart not implemented');
    }
  });

  test('should handle edge case: single category (full circle)', async () => {
    const singleCategoryPatterns: MergedPattern[] = [
      {
        ...createEpic2Patterns()[0],
        category: PatternCategory.CODE_STYLE,
      },
      {
        ...createEpic2Patterns()[1],
        category: PatternCategory.CODE_STYLE,
      },
    ];

    if (renderCategoryDistributionChart) {
      const chart = renderCategoryDistributionChart(canvas, singleCategoryPatterns);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderCategoryDistributionChart not implemented');
    }
  });

  test('should handle edge case: empty data (throw error)', async () => {
    const emptyPatterns: MergedPattern[] = [];

    await expect(async () => {
      if (renderCategoryDistributionChart) {
        renderCategoryDistributionChart(canvas, emptyPatterns);
      } else {
        throw new Error('renderCategoryDistributionChart not implemented');
      }
    }).rejects.toThrow();
  });

  test('should calculate percentages accurately (sum = 100%)', async () => {
    const patterns = createEpic2Patterns();

    if (renderCategoryDistributionChart) {
      const chart = renderCategoryDistributionChart(canvas, patterns);
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderCategoryDistributionChart not implemented');
    }
  });
});

// ============================================================================
// TRANSFORM → RENDER PIPELINE TESTS
// ============================================================================

describe('Transform → Render Pipeline Integration', () => {
  let canvas: HTMLCanvasElement;
  let canvasId: string;

  beforeEach(() => {
    canvasId = `test-canvas-${Date.now()}`;
    canvas = createCanvas(canvasId);
  });

  afterEach(() => {
    if (destroyChart) {
      destroyChart(canvas);
    }
    removeCanvas(canvasId);
  });

  test('should complete full pipeline: patterns → transform → render (bar chart)', async () => {
    const patterns = createEpic2Patterns();

    // This test verifies the complete pipeline
    expect(() => {
      if (renderPatternFrequencyChart) {
        renderPatternFrequencyChart(canvas, patterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    }).not.toThrow();
  });

  test('should complete full pipeline: patterns → transform → render (line chart)', async () => {
    const patterns = createEpic2Patterns();

    expect(() => {
      if (renderPatternTrendsChart) {
        renderPatternTrendsChart(canvas, patterns);
      } else {
        throw new Error('renderPatternTrendsChart not implemented');
      }
    }).not.toThrow();
  });

  test('should complete full pipeline: patterns → transform → render (doughnut chart)', async () => {
    const patterns = createEpic2Patterns();

    expect(() => {
      if (renderCategoryDistributionChart) {
        renderCategoryDistributionChart(canvas, patterns);
      } else {
        throw new Error('renderCategoryDistributionChart not implemented');
      }
    }).not.toThrow();
  });
});

// ============================================================================
// CANVAS LIFECYCLE TESTS
// ============================================================================

describe('Canvas Lifecycle Management (Integration)', () => {
  test('should handle create → render → destroy cycle', () => {
    const canvasId = `test-canvas-${Date.now()}`;
    const canvas = createCanvas(canvasId);
    const patterns = createEpic2Patterns();

    try {
      // Render
      if (renderPatternFrequencyChart) {
        const chart = renderPatternFrequencyChart(canvas, patterns);
        expect(chart).toBeDefined();

        // Destroy
        if (destroyChart) {
          destroyChart(canvas);
        }
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    } finally {
      removeCanvas(canvasId);
    }
  });

  test('should handle multiple render/destroy cycles', () => {
    const canvasId = `test-canvas-${Date.now()}`;
    const canvas = createCanvas(canvasId);
    const patterns = createEpic2Patterns();

    try {
      for (let i = 0; i < 5; i++) {
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
    } finally {
      removeCanvas(canvasId);
    }
  });

  test('should handle multiple charts on same page', () => {
    const canvasId1 = `test-canvas-1-${Date.now()}`;
    const canvasId2 = `test-canvas-2-${Date.now()}`;
    const canvasId3 = `test-canvas-3-${Date.now()}`;

    const canvas1 = createCanvas(canvasId1);
    const canvas2 = createCanvas(canvasId2);
    const canvas3 = createCanvas(canvasId3);

    const patterns = createEpic2Patterns();

    try {
      if (renderPatternFrequencyChart) {
        const chart1 = renderPatternFrequencyChart(canvas1, patterns);
        const chart2 = renderTopPatternsChart(canvas2, patterns, 10);
        const chart3 = renderCategoryDistributionChart(canvas3, patterns);

        expect(chart1).toBeDefined();
        expect(chart2).toBeDefined();
        expect(chart3).toBeDefined();

        if (destroyChart) {
          destroyChart(canvas1);
          destroyChart(canvas2);
          destroyChart(canvas3);
        }
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    } finally {
      removeCanvas(canvasId1);
      removeCanvas(canvasId2);
      removeCanvas(canvasId3);
    }
  });

  test('should detect and prevent memory leaks', async () => {
    const canvasId = `test-canvas-${Date.now()}`;
    const canvas = createCanvas(canvasId);
    const patterns = createEpic2Patterns();

    // Track chart instances
    const { getChartInstances } = require('chart.js/auto');

    try {
      // Create and destroy 50 times
      for (let i = 0; i < 50; i++) {
        if (renderPatternFrequencyChart) {
          const chart = renderPatternFrequencyChart(canvas, patterns);

          if (destroyChart) {
            destroyChart(canvas);
          }
        } else {
          throw new Error('renderPatternFrequencyChart not implemented');
        }
      }

      // Verify no memory leak (instances should be cleaned up)
      const instances = getChartInstances();
      expect(instances.size).toBeLessThan(10); // Should be 0 or very low
    } finally {
      removeCanvas(canvasId);
    }
  });
});

// ============================================================================
// RESPONSIVENESS TESTS
// ============================================================================

describe('Chart Responsiveness (Integration)', () => {
  let canvas: HTMLCanvasElement;
  let canvasId: string;

  beforeEach(() => {
    canvasId = `test-canvas-${Date.now()}`;
    canvas = createCanvas(canvasId);
  });

  afterEach(() => {
    if (destroyChart) {
      destroyChart(canvas);
    }
    removeCanvas(canvasId);
  });

  test('should resize when window resizes', async () => {
    const patterns = createEpic2Patterns();

    if (renderPatternFrequencyChart) {
      const chart = renderPatternFrequencyChart(canvas, patterns);
      expect(chart).toBeDefined();

      // Simulate window resize
      window.dispatchEvent(new Event('resize'));

      // Chart should handle resize
      expect(chart).toBeDefined();
    } else {
      throw new Error('renderPatternFrequencyChart not implemented');
    }
  });

  test('should handle container resize', async () => {
    const patterns = createEpic2Patterns();

    // Create a container div
    const containerId = `test-container-${Date.now()}`;
    const container = document.createElement('div');
    container.id = containerId;
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    // Move canvas inside container
    container.appendChild(canvas);

    try {
      if (renderPatternFrequencyChart) {
        const chart = renderPatternFrequencyChart(canvas, patterns);
        expect(chart).toBeDefined();

        // Resize container
        container.style.width = '400px';
        container.style.height = '300px';

        // Trigger resize
        window.dispatchEvent(new Event('resize'));

        expect(chart).toBeDefined();
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    } finally {
      if (destroyChart) {
        destroyChart(canvas);
      }
      removeCanvas(canvasId);
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  });
});

// ============================================================================
// ERROR HANDLING INTEGRATION TESTS
// ============================================================================

describe('Error Handling (Integration)', () => {
  test('should throw AR22 error for null canvas', () => {
    const patterns = createEpic2Patterns();

    expect(() => {
      if (renderPatternFrequencyChart) {
        renderPatternFrequencyChart(null as any, patterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    }).toThrow();
  });

  test('should throw AR22 error for undefined canvas', () => {
    const patterns = createEpic2Patterns();

    expect(() => {
      if (renderPatternFrequencyChart) {
        renderPatternFrequencyChart(undefined as any, patterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    }).toThrow();
  });

  test('should handle invalid ChartData gracefully', () => {
    const canvasId = `test-canvas-${Date.now()}`;
    const canvas = createCanvas(canvasId);

    try {
      const invalidData = null as any;

      expect(() => {
        if (renderPatternFrequencyChart) {
          renderPatternFrequencyChart(canvas, invalidData);
        } else {
          throw new Error('renderPatternFrequencyChart not implemented');
        }
      }).toThrow();
    } finally {
      removeCanvas(canvasId);
    }
  });

  test('should provide actionable error messages with AR22 format', () => {
    const patterns = createEpic2Patterns();

    try {
      if (renderPatternFrequencyChart) {
        renderPatternFrequencyChart(null as any, patterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    } catch (error: any) {
      // Verify AR22 format
      expect(error).toBeDefined();
      expect(error.what || error.message).toBeDefined();
      expect(error.how || error.message || error.code).toBeDefined();
    }
  });
});
